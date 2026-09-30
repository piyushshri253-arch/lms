import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  SUPPORTED_VIDEO_EXTENSIONS,
  MAX_VIDEO_SIZE_BYTES,
  analyzeExternalVideoSource,
  ensureVideoUploadDir
} from '@/lib/mediaStorage';
import fs from 'fs';
import os from 'os';
import path from 'path';

const ALL_SUPPORTED_EXTENSIONS = Array.from(
  new Set([
    ...SUPPORTED_VIDEO_EXTENSIONS,
    '.mp4',
    '.mov',
    '.m4v',
    '.webm',
    '.mkv',
    '.3gp',
    '.avi',
    '.ogg',
    '.pdf'
  ])
);

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const contentType = req.headers.get('content-type') || '';

    // Check if multipart form data (direct file upload from PC / Mobile Phone)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const rawLessonId = formData.get('lessonId') as string | null;
      const rawCourseId = formData.get('courseId') as string | null;
      const customTitle = formData.get('title') as string | null;
      const durationSeconds = Number(formData.get('durationSeconds')) || 600;
      const durationText =
        (formData.get('durationText') as string) ||
        `${String(Math.floor(durationSeconds / 60)).padStart(2, '0')}:${String(
          Math.floor(durationSeconds % 60)
        ).padStart(2, '0')}`;

      if (!file) {
        return NextResponse.json({ error: 'No file provided for upload.' }, { status: 400 });
      }

      if (file.size > MAX_VIDEO_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `File size (${(file.size / (1024 * 1024)).toFixed(
              1
            )}MB) exceeds maximum limit of 500MB.`
          },
          { status: 400 }
        );
      }

      const ext = (path.extname(file.name) || '.mp4').toLowerCase();
      if (!ALL_SUPPORTED_EXTENSIONS.includes(ext) && !file.type.startsWith('video/') && file.type !== 'application/pdf') {
        return NextResponse.json(
          {
            error: `Unsupported format "${ext}". Supported formats: MP4, MOV, WEBM, MKV, 3GP, PDF.`
          },
          { status: 400 }
        );
      }

      const safeRandomId = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const safeFilename = `${safeRandomId}${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      let publicVideoUrl = `/uploads/videos/${safeFilename}`;

      try {
        const uploadDir = ensureVideoUploadDir();
        const filePath = path.join(uploadDir, safeFilename);
        await fs.promises.writeFile(filePath, buffer);
      } catch {
        // On Vercel serverless, public/ is read-only (EROFS). Write to /tmp and return inline data URL if <= 3.5MB
        try {
          const tmpPath = path.join(os.tmpdir(), safeFilename);
          await fs.promises.writeFile(tmpPath, buffer);
        } catch {}

        if (buffer.length <= 3.8 * 1024 * 1024) {
          const mime =
            file.type ||
            (ext === '.pdf'
              ? 'application/pdf'
              : ext === '.mov'
              ? 'video/quicktime'
              : ext === '.webm'
              ? 'video/webm'
              : 'video/mp4');
          publicVideoUrl = `data:${mime};base64,${buffer.toString('base64')}`;
        }
      }

      const assetName = customTitle || file.name.replace(ext, '');

      // Verify whether courseId and lessonId exist in DB (ignore temporary client IDs like les-1790...)
      let validCourseId: string | null = null;
      let validLessonId: string | null = null;

      if (rawCourseId && !rawCourseId.startsWith('sec-') && !rawCourseId.startsWith('les-')) {
        const existingCourse = await prisma.course
          .findUnique({ where: { id: rawCourseId }, select: { id: true } })
          .catch(() => null);
        if (existingCourse) validCourseId = existingCourse.id;
      }

      if (rawLessonId && !rawLessonId.startsWith('les-') && !rawLessonId.startsWith('sub-')) {
        const existingLesson = await prisma.lesson
          .findUnique({
            where: { id: rawLessonId },
            include: { section: { include: { course: true } } }
          })
          .catch(() => null);

        if (existingLesson) {
          validLessonId = existingLesson.id;
          if (user.role === 'INSTRUCTOR' && existingLesson.section.course.instructorId === user.id) {
            await prisma.lesson
              .update({
                where: { id: existingLesson.id },
                data: {
                  videoUrl: publicVideoUrl.startsWith('data:') ? undefined : publicVideoUrl,
                  duration: durationText,
                  durationSeconds
                }
              })
              .catch(() => {});
          }
        }
      }

      let mediaAsset: any = null;
      try {
        mediaAsset = await prisma.mediaAsset.create({
          data: {
            name: assetName,
            url: publicVideoUrl.startsWith('data:') ? `/uploads/videos/${safeFilename}` : publicVideoUrl,
            type: ext === '.pdf' ? 'DOCUMENT' : 'VIDEO',
            provider: 'DIRECT_UPLOAD',
            format: ext.replace('.', ''),
            sizeBytes: file.size,
            durationSeconds,
            durationText,
            status: 'READY',
            uploadedBy: user.id,
            uploadedByUser: `${user.name} (${user.role})`,
            courseId: validCourseId,
            lessonId: validLessonId
          }
        });
      } catch {}

      return NextResponse.json({
        success: true,
        message: 'Video uploaded and attached successfully.',
        asset: mediaAsset,
        videoUrl: publicVideoUrl,
        durationText,
        durationSeconds
      });
    }

    // JSON payload: External Media Source / Stream URL
    const body = await req.json();
    const { url, title, lessonId, courseId, durationSeconds = 720, durationText = '12:00' } = body;

    if (!url) {
      return NextResponse.json({ error: 'Video URL or file is required.' }, { status: 400 });
    }

    const analysis = analyzeExternalVideoSource(url);
    if (!analysis.isValid) {
      return NextResponse.json({ error: analysis.errorMessage || 'Invalid video URL.' }, { status: 400 });
    }

    const assetName = title || `${analysis.provider} Lecture Asset`;

    let mediaAsset: any = null;
    try {
      mediaAsset = await prisma.mediaAsset.create({
        data: {
          name: assetName,
          url: analysis.cleanUrl,
          type: 'VIDEO',
          provider: analysis.provider,
          format: analysis.format || 'stream',
          sizeBytes: 0,
          durationSeconds: Number(durationSeconds) || 720,
          durationText: durationText || '12:00',
          status: 'READY',
          uploadedBy: user.id,
          uploadedByUser: `${user.name} (${user.role})`,
          courseId: null,
          lessonId: null
        }
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'External video source connected successfully.',
      asset: mediaAsset,
      videoUrl: analysis.cleanUrl
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to upload media asset.' },
      { status: 500 }
    );
  }
}

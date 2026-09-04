import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  SUPPORTED_VIDEO_EXTENSIONS,
  SUPPORTED_VIDEO_MIME_TYPES,
  MAX_VIDEO_SIZE_BYTES,
  analyzeExternalVideoSource,
  ensureVideoUploadDir
} from '@/lib/mediaStorage';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const contentType = req.headers.get('content-type') || '';

    // Check if multipart form data (direct file upload) or JSON (external URL)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const lessonId = formData.get('lessonId') as string | null;
      const courseId = formData.get('courseId') as string | null;
      const customTitle = formData.get('title') as string | null;
      const durationSeconds = Number(formData.get('durationSeconds')) || 720;
      const durationText = (formData.get('durationText') as string) || `${Math.floor(durationSeconds / 60)}:00`;

      if (!file) {
        return NextResponse.json({ error: 'No video file provided for upload.' }, { status: 400 });
      }

      // Validate File Size
      if (file.size > MAX_VIDEO_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 500MB.` },
          { status: 400 }
        );
      }

      // Validate MIME type & extension
      const ext = path.extname(file.name).toLowerCase();
      if (!SUPPORTED_VIDEO_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          { error: `Unsupported video format "${ext}". Supported formats: ${SUPPORTED_VIDEO_EXTENSIONS.join(', ')}` },
          { status: 400 }
        );
      }

      // Ensure directory
      const uploadDir = ensureVideoUploadDir();
      const safeRandomId = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const safeFilename = `${safeRandomId}${ext}`;
      const filePath = path.join(uploadDir, safeFilename);

      // Write file chunks to storage
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.promises.writeFile(filePath, buffer);

      const publicVideoUrl = `/uploads/videos/${safeFilename}`;
      const assetName = customTitle || file.name.replace(ext, '');

      // Create Media Asset Record in DB
      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          name: assetName,
          url: publicVideoUrl,
          type: 'VIDEO',
          provider: 'DIRECT_UPLOAD',
          format: ext.replace('.', ''),
          sizeBytes: file.size,
          durationSeconds,
          durationText,
          status: 'READY',
          uploadedBy: user.id,
          uploadedByUser: `${user.name} (${user.role})`,
          courseId: courseId || null,
          lessonId: lessonId || null
        }
      });

      // If lessonId is provided, attach to lesson
      if (lessonId) {
        const lesson = await prisma.lesson.findUnique({
          where: { id: lessonId },
          include: { section: { include: { course: true } } }
        });

        if (lesson) {
          if (user.role === 'INSTRUCTOR' && lesson.section.course.instructorId !== user.id) {
            return NextResponse.json({ error: 'Forbidden: Cannot modify courses of another instructor.' }, { status: 403 });
          }

          await prisma.lesson.update({
            where: { id: lessonId },
            data: {
              videoUrl: publicVideoUrl,
              duration: durationText,
              durationSeconds
            }
          });
        }
      }

      await prisma.auditLog.create({
        data: {
          adminId: user.id,
          adminEmail: user.email,
          action: 'UPLOAD_COURSE_VIDEO',
          entity: 'MediaAsset',
          entityId: mediaAsset.id,
          description: `${user.role} uploaded course video "${assetName}" (${(file.size / (1024 * 1024)).toFixed(1)}MB).`
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Video uploaded and processed successfully.',
        asset: mediaAsset,
        videoUrl: publicVideoUrl
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

    const mediaAsset = await prisma.mediaAsset.create({
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
        courseId: courseId || null,
        lessonId: lessonId || null
      }
    });

    if (lessonId) {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { section: { include: { course: true } } }
      });

      if (lesson) {
        if (user.role === 'INSTRUCTOR' && lesson.section.course.instructorId !== user.id) {
          return NextResponse.json({ error: 'Forbidden: Cannot modify courses of another instructor.' }, { status: 403 });
        }

        await prisma.lesson.update({
          where: { id: lessonId },
          data: {
            videoUrl: analysis.cleanUrl,
            duration: durationText || '12:00',
            durationSeconds: Number(durationSeconds) || 720
          }
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        adminEmail: user.email,
        action: 'ATTACH_EXTERNAL_VIDEO',
        entity: 'MediaAsset',
        entityId: mediaAsset.id,
        description: `${user.role} connected ${analysis.provider} video "${assetName}" to curriculum.`
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Video source configured and attached successfully.',
      asset: mediaAsset,
      videoUrl: analysis.cleanUrl
    });
  } catch (err: any) {
    const isAuth = err.message?.includes('Authentication');
    const isForbidden = err.message?.includes('forbidden') || err.message?.includes('Insufficient');
    const status = isAuth ? 401 : isForbidden ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Video upload failed.' }, { status });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { analyzeExternalVideoSource } from '@/lib/mediaStorage';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lessonId } = await params;
    const user = await requireRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const body = await req.json();
    const { videoUrl, durationText, durationSeconds } = body;

    if (!videoUrl) {
      return NextResponse.json({ error: 'videoUrl is required.' }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { include: { course: true } } }
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found.' }, { status: 404 });
    }

    if (user.role === 'INSTRUCTOR' && lesson.section.course.instructorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Cannot modify course of another instructor.' }, { status: 403 });
    }

    // Validate video source
    let cleanVideoUrl = videoUrl.trim();
    if (!cleanVideoUrl.startsWith('/uploads/videos/')) {
      const analysis = analyzeExternalVideoSource(cleanVideoUrl);
      if (analysis.isValid) {
        cleanVideoUrl = analysis.cleanUrl;
      }
    }

    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        videoUrl: cleanVideoUrl,
        duration: durationText || lesson.duration,
        durationSeconds: Number(durationSeconds) || lesson.durationSeconds
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        adminEmail: user.email,
        action: 'REPLACE_LESSON_VIDEO',
        entity: 'Lesson',
        entityId: lessonId,
        description: `${user.role} replaced video on lesson "${lesson.title}".`
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Lesson video updated successfully.',
      lesson: updated
    });
  } catch (err: any) {
    const isAuth = err.message?.includes('Authentication');
    const isForbidden = err.message?.includes('forbidden') || err.message?.includes('Insufficient');
    const status = isAuth ? 401 : isForbidden ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Failed to update video' }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lessonId } = await params;
    const user = await requireRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { include: { course: true } } }
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found.' }, { status: 404 });
    }

    if (user.role === 'INSTRUCTOR' && lesson.section.course.instructorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Cannot modify course of another instructor.' }, { status: 403 });
    }

    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        videoUrl: null
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        adminEmail: user.email,
        action: 'DETACH_LESSON_VIDEO',
        entity: 'Lesson',
        entityId: lessonId,
        description: `${user.role} removed video from lesson "${lesson.title}".`
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Video detached from lesson successfully.',
      lesson: updated
    });
  } catch (err: any) {
    const isAuth = err.message?.includes('Authentication');
    const isForbidden = err.message?.includes('forbidden') || err.message?.includes('Insufficient');
    const status = isAuth ? 401 : isForbidden ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Failed to detach video' }, { status });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const user = await requireRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const course = await prisma.course.findFirst({
      where: { OR: [{ slug }, { id: slug }] }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only modify courses authored by your account.' },
        { status: 403 }
      );
    }

    let section = null;
    if (body.sectionId) {
      section = await prisma.courseSection.findUnique({
        where: { id: body.sectionId },
        include: { lessons: true }
      });
    } else {
      // Find first section or create default section
      section = await prisma.courseSection.findFirst({
        where: { courseId: course.id },
        orderBy: { order: 'asc' },
        include: { lessons: true }
      });
      if (!section) {
        section = await prisma.courseSection.create({
          data: {
            courseId: course.id,
            title: 'Module 1: Overview & Fundamentals',
            order: 1
          },
          include: { lessons: true }
        });
      }
    }

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const order = (section.lessons?.length || 0) + 1;
    const lessonTitle = body.title?.trim() || `Lesson ${order}: New Topic`;
    const lessonType = body.type || 'VIDEO';

    const lesson = await prisma.lesson.create({
      data: {
        sectionId: section.id,
        title: lessonTitle,
        description: body.description?.trim() || null,
        type: lessonType,
        content: body.content || null,
        videoUrl: body.videoUrl?.trim() || null,
        pdfUrl: body.pdfUrl?.trim() || null,
        fileUrl: body.fileUrl?.trim() || null,
        quizData: body.quizData ? (typeof body.quizData === 'string' ? body.quizData : JSON.stringify(body.quizData)) : null,
        duration: body.duration?.trim() || '10:00',
        durationSeconds: Number(body.durationSeconds) || 600,
        isFree: !!body.isFree,
        isPublished: body.isPublished !== undefined ? !!body.isPublished : true,
        order
      }
    });

    return NextResponse.json({ lesson, message: 'Lesson created successfully.' });
  } catch (err: any) {
    const isAuth = err.message?.includes('Authentication');
    const isForbidden = err.message?.includes('forbidden') || err.message?.includes('Insufficient') || err.message?.includes('permissions');
    const status = isAuth ? 401 : isForbidden ? 403 : 400;
    return NextResponse.json({ error: err.message || 'Failed to create lesson' }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const { lessonId, ...updates } = body;

    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId is required' }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { include: { course: true } } }
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    if (user.role === 'INSTRUCTOR' && lesson.section.course.instructorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only modify courses authored by your account.' },
        { status: 403 }
      );
    }

    const cleanData: any = {};
    if (updates.title !== undefined) cleanData.title = updates.title.trim();
    if (updates.description !== undefined) cleanData.description = updates.description;
    if (updates.type !== undefined) cleanData.type = updates.type;
    if (updates.content !== undefined) cleanData.content = updates.content;
    if (updates.videoUrl !== undefined) cleanData.videoUrl = updates.videoUrl;
    if (updates.pdfUrl !== undefined) cleanData.pdfUrl = updates.pdfUrl;
    if (updates.fileUrl !== undefined) cleanData.fileUrl = updates.fileUrl;
    if (updates.quizData !== undefined) {
      cleanData.quizData = typeof updates.quizData === 'string' ? updates.quizData : JSON.stringify(updates.quizData);
    }
    if (updates.duration !== undefined) cleanData.duration = updates.duration;
    if (updates.durationSeconds !== undefined) cleanData.durationSeconds = Number(updates.durationSeconds);
    if (updates.isFree !== undefined) cleanData.isFree = !!updates.isFree;
    if (updates.isPublished !== undefined) cleanData.isPublished = !!updates.isPublished;
    if (updates.order !== undefined) cleanData.order = Number(updates.order);
    if (updates.sectionId !== undefined) cleanData.sectionId = updates.sectionId;

    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data: cleanData
    });

    return NextResponse.json({ lesson: updated, message: 'Lesson updated successfully.' });
  } catch (err: any) {
    const isAuth = err.message?.includes('Authentication');
    const isForbidden = err.message?.includes('forbidden') || err.message?.includes('Insufficient') || err.message?.includes('permissions');
    const status = isAuth ? 401 : isForbidden ? 403 : 400;
    return NextResponse.json({ error: err.message || 'Failed to update lesson' }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');

    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId is required' }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { include: { course: true } } }
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    if (user.role === 'INSTRUCTOR' && lesson.section.course.instructorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only modify courses authored by your account.' },
        { status: 403 }
      );
    }

    await prisma.lesson.delete({
      where: { id: lessonId }
    });

    return NextResponse.json({ message: 'Lesson deleted successfully.' });
  } catch (err: any) {
    const isAuth = err.message?.includes('Authentication');
    const isForbidden = err.message?.includes('forbidden') || err.message?.includes('Insufficient') || err.message?.includes('permissions');
    const status = isAuth ? 401 : isForbidden ? 403 : 400;
    return NextResponse.json({ error: err.message || 'Failed to delete lesson' }, { status });
  }
}

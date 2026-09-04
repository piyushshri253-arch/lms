import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const { type, courseId, sectionId, title, duration, videoUrl, isFree, resources } = body;

    if (type === 'SECTION') {
      if (!courseId || !title) {
        return NextResponse.json({ error: 'courseId and title are required' }, { status: 400 });
      }

      const existingCount = await prisma.courseSection.count({ where: { courseId } });
      const newSec = await prisma.courseSection.create({
        data: {
          courseId,
          title: title.trim(),
          order: existingCount + 1
        }
      });

      return NextResponse.json({
        message: 'Section created successfully.',
        section: newSec
      });
    }

    if (type === 'LESSON') {
      if (!sectionId || !title) {
        return NextResponse.json({ error: 'sectionId and title are required' }, { status: 400 });
      }

      const existingCount = await prisma.lesson.count({ where: { sectionId } });
      const newLesson = await prisma.lesson.create({
        data: {
          sectionId,
          title: title.trim(),
          duration: duration || '10:00',
          durationSeconds: 600,
          videoUrl: videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          isFree: !!isFree,
          order: existingCount + 1,
          resources: JSON.stringify(resources || [])
        }
      });

      return NextResponse.json({
        message: 'Lesson created successfully.',
        lesson: newLesson
      });
    }

    return NextResponse.json({ error: 'Invalid curriculum item type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const { type, id, title, duration, videoUrl, isFree, order } = body;

    if (!id || !type) {
      return NextResponse.json({ error: 'ID and type are required' }, { status: 400 });
    }

    if (type === 'SECTION') {
      const data: any = {};
      if (title) data.title = title.trim();
      if (order !== undefined) data.order = Number(order);

      const updated = await prisma.courseSection.update({
        where: { id },
        data
      });

      return NextResponse.json({ message: 'Section updated.', section: updated });
    }

    if (type === 'LESSON') {
      const data: any = {};
      if (title) data.title = title.trim();
      if (duration) data.duration = duration;
      if (videoUrl !== undefined) data.videoUrl = videoUrl;
      if (typeof isFree === 'boolean') data.isFree = isFree;
      if (order !== undefined) data.order = Number(order);

      const updated = await prisma.lesson.update({
        where: { id },
        data
      });

      return NextResponse.json({ message: 'Lesson updated.', lesson: updated });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!id || !type) {
      return NextResponse.json({ error: 'ID and type are required' }, { status: 400 });
    }

    if (type === 'SECTION') {
      const lessons = await prisma.lesson.findMany({ where: { sectionId: id }, select: { id: true } });
      const lessonIds = lessons.map((l) => l.id);
      await prisma.lessonProgress.deleteMany({ where: { lessonId: { in: lessonIds } } });
      await prisma.lesson.deleteMany({ where: { sectionId: id } });
      await prisma.courseSection.delete({ where: { id } });

      return NextResponse.json({ message: 'Section deleted.' });
    }

    if (type === 'LESSON') {
      await prisma.lessonProgress.deleteMany({ where: { lessonId: id } });
      await prisma.lesson.delete({ where: { id } });

      return NextResponse.json({ message: 'Lesson deleted.' });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

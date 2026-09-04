import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await requireTenantAuth();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    const whereClause: any = { userId: user.id };
    if (courseId) whereClause.courseId = courseId;

    const bookmarks = await prisma.bookmark.findMany({
      where: whereClause,
      include: {
        course: { select: { id: true, title: true, slug: true, thumbnail: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Resolve lesson titles
    const lessonIds = bookmarks.map((b) => b.lessonId);
    const lessons = await prisma.lesson.findMany({
      where: { id: { in: lessonIds } },
      select: { id: true, title: true }
    });
    const lessonMap = new Map(lessons.map((l) => [l.id, l.title]));

    const formatted = bookmarks.map((b) => {
      const minutes = Math.floor(b.timestamp / 60);
      const seconds = b.timestamp % 60;
      const formattedTimestamp = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      return {
        id: b.id,
        courseId: b.courseId,
        courseTitle: b.course.title,
        courseSlug: b.course.slug,
        lessonId: b.lessonId,
        lessonTitle: lessonMap.get(b.lessonId) || 'Lesson',
        timestamp: b.timestamp,
        formattedTimestamp,
        title: b.title,
        createdAt: b.createdAt
      };
    });

    return NextResponse.json({ bookmarks: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantAuth();
    const body = await request.json();
    const { courseId, lessonId, timestamp, title } = body;

    if (!courseId || !lessonId) {
      return NextResponse.json({ error: 'courseId and lessonId are required.' }, { status: 400 });
    }

    // Verify enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: user.id, courseId, status: 'ACTIVE' }
    });

    if (!enrollment && user.role === 'STUDENT') {
      return NextResponse.json({ error: 'Active enrollment required to bookmark.' }, { status: 403 });
    }

    const bookmark = await prisma.bookmark.upsert({
      where: {
        userId_lessonId_timestamp: {
          userId: user.id,
          lessonId,
          timestamp: Number(timestamp || 0)
        }
      },
      create: {
        organizationId: user.organizationId || null,
        userId: user.id,
        courseId,
        lessonId,
        timestamp: Number(timestamp || 0),
        title: title || ''
      },
      update: {
        title: title || ''
      }
    });

    return NextResponse.json({ success: true, bookmark, message: 'Bookmark saved.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireTenantAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Bookmark ID is required.' }, { status: 400 });
    }

    await prisma.bookmark.deleteMany({
      where: { id, userId: user.id }
    });

    return NextResponse.json({ success: true, message: 'Bookmark removed.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

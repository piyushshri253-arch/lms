import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantAuth } from '@/lib/auth';
import { createNotification } from '@/lib/notification';

export async function GET(request: Request) {
  try {
    const user = await requireTenantAuth();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const lessonId = searchParams.get('lessonId');

    const whereClause: any = {};
    if (user.organizationId) {
      whereClause.organizationId = user.organizationId;
    }
    if (courseId) {
      whereClause.courseId = courseId;
    }
    if (lessonId) {
      whereClause.lessonId = lessonId;
    }

    const discussions = await prisma.discussion.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, avatar: true, role: true } },
        replies: {
          include: {
            user: { select: { id: true, name: true, avatar: true, role: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Load discussion metadata (isResolved, isPinned, category, bestReplyId)
    const metaKeys = discussions.map((d) => `discussion_meta_${d.id}`);
    const metaRows =
      metaKeys.length > 0
        ? await prisma.platformSetting.findMany({ where: { key: { in: metaKeys } } })
        : [];
    const metaMap: Record<string, any> = {};
    for (const row of metaRows) {
      try {
        metaMap[row.key.replace('discussion_meta_', '')] = JSON.parse(row.value);
      } catch {}
    }

    const formatted = discussions
      .map((d) => {
        const meta = metaMap[d.id] || {};
        return {
          id: d.id,
          courseId: d.courseId,
          lessonId: d.lessonId,
          userId: d.userId,
          userName: d.user.name,
          userAvatar: d.user.avatar,
          userRole: d.user.role,
          title: d.title,
          text: d.content,
          isResolved: Boolean(meta.isResolved),
          isPinned: Boolean(meta.isPinned),
          category: meta.category || 'QUESTION',
          bestReplyId: meta.bestReplyId || null,
          createdAt: d.createdAt,
          replies: d.replies.map((r) => ({
            id: r.id,
            userId: r.userId,
            userName: r.user.name,
            userAvatar: r.user.avatar,
            userRole: r.user.role,
            isBestAnswer: meta.bestReplyId === r.id,
            text: r.content,
            createdAt: r.createdAt
          }))
        };
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    return NextResponse.json({ discussions: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantAuth();
    const { courseId, lessonId, text, title } = await request.json();

    if (!courseId || !text?.trim()) {
      return NextResponse.json(
        { error: 'courseId and question content are required.' },
        { status: 400 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, instructorId: true, organizationId: true }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    // Verify enrollment for students
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: user.id, courseId, status: 'ACTIVE' }
    });

    if (!enrollment && user.role === 'STUDENT') {
      return NextResponse.json({ error: 'Active enrollment required to post in course discussions.' }, { status: 403 });
    }

    const discussion = await prisma.discussion.create({
      data: {
        organizationId: course.organizationId || user.organizationId || null,
        courseId,
        lessonId: lessonId || null,
        userId: user.id,
        title: title?.trim() || 'Student Question',
        content: text.trim()
      },
      include: {
        user: { select: { id: true, name: true, avatar: true, role: true } },
        replies: true
      }
    });

    // Notify Course Instructor when a Student posts a new question
    if (course.instructorId && course.instructorId !== user.id) {
      await createNotification({
        organizationId: course.organizationId || user.organizationId || null,
        userId: course.instructorId,
        title: 'New Student Question Asked',
        message: `${user.name} asked "${discussion.title}" in ${course.title}.`,
        type: 'COMMUNITY',
        category: 'COURSES',
        link: `/instructor/questions?questionId=${discussion.id}`
      });
    }

    return NextResponse.json({
      success: true,
      discussion: {
        id: discussion.id,
        courseId: discussion.courseId,
        lessonId: discussion.lessonId,
        userId: discussion.userId,
        userName: discussion.user.name,
        userAvatar: discussion.user.avatar,
        userRole: discussion.user.role,
        title: discussion.title,
        text: discussion.content,
        isResolved: false,
        isPinned: false,
        category: 'QUESTION',
        createdAt: discussion.createdAt,
        replies: []
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


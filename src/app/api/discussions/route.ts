import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantAuth } from '@/lib/auth';

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

    const formatted = discussions.map((d) => ({
      id: d.id,
      courseId: d.courseId,
      lessonId: d.lessonId,
      userId: d.userId,
      userName: d.user.name,
      userAvatar: d.user.avatar,
      userRole: d.user.role,
      title: d.title,
      text: d.content,
      createdAt: d.createdAt,
      replies: d.replies.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.user.name,
        userAvatar: r.user.avatar,
        userRole: r.user.role,
        text: r.content,
        createdAt: r.createdAt
      }))
    }));

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

    // Verify enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: user.id, courseId, status: 'ACTIVE' }
    });

    if (!enrollment && user.role === 'STUDENT') {
      return NextResponse.json({ error: 'Active enrollment required to post in course discussions.' }, { status: 403 });
    }

    const discussion = await prisma.discussion.create({
      data: {
        organizationId: user.organizationId || null,
        courseId,
        lessonId: lessonId || null,
        userId: user.id,
        title: title || 'Discussion Query',
        content: text.trim()
      },
      include: {
        user: { select: { id: true, name: true, avatar: true, role: true } },
        replies: true
      }
    });

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
        createdAt: discussion.createdAt,
        replies: []
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

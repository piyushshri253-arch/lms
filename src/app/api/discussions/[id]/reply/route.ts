import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantAuth } from '@/lib/auth';
import { createNotification } from '@/lib/notification';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTenantAuth();
    const { id: discussionId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Reply content is required.' }, { status: 400 });
    }

    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
      include: {
        user: { select: { id: true, name: true } }
      }
    });

    if (!discussion) {
      return NextResponse.json({ error: 'Discussion thread not found.' }, { status: 404 });
    }

    const reply = await prisma.discussionReply.create({
      data: {
        discussionId,
        userId: user.id,
        content: content.trim()
      },
      include: {
        user: { select: { id: true, name: true, avatar: true, role: true } }
      }
    });

    // Notify author of the discussion thread if someone else replies
    if (discussion.userId !== user.id) {
      await createNotification({
        organizationId: user.organizationId || null,
        userId: discussion.userId,
        title: 'New Reply on Your Discussion',
        message: `${user.name} replied to your question "${discussion.title}".`,
        type: 'COMMUNITY',
        category: 'COURSES',
        link: `/learn/${discussion.courseId}`
      });
    }

    return NextResponse.json({
      success: true,
      reply: {
        id: reply.id,
        userId: reply.userId,
        userName: reply.user.name,
        userAvatar: reply.user.avatar,
        userRole: reply.user.role,
        text: reply.content,
        createdAt: reply.createdAt
      },
      message: 'Reply posted.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to post reply' }, { status: 500 });
  }
}

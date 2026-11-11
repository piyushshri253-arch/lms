import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getCourseSeoMessages, sendCourseSeoMessage } from '@/lib/seo-workflow';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    const messages = await getCourseSeoMessages(courseId);
    return NextResponse.json({ messages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { courseId, recipientId, recipientName, message } = body;

    if (!courseId || !message || !message.trim()) {
      return NextResponse.json(
        { error: 'courseId and non-empty message are required' },
        { status: 400 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { instructor: true }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const sender = user || {
      id: 'seo_team_member',
      name: 'SEO Specialist',
      role: 'SEO_SPECIALIST'
    };

    const targetRecipientId = recipientId || course.instructorId || '';
    const targetRecipientName = recipientName || course.instructor?.name || 'Instructor';

    const newMsg = await sendCourseSeoMessage(
      courseId,
      {
        senderId: sender.id,
        senderName: sender.name,
        senderRole: sender.role,
        senderAvatar: (sender as any).avatar,
        recipientId: targetRecipientId,
        recipientName: targetRecipientName,
        message: message.trim()
      },
      course.title,
      course.organizationId
    );

    return NextResponse.json({
      success: true,
      message: newMsg
    });
  } catch (err: any) {
    console.error('[SEO Messages Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

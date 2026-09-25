import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createNotification } from '@/lib/notification';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['INSTRUCTOR', 'ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'ALL';
    const categoryFilter = searchParams.get('category') || 'ALL';

    const whereClause: any = {
      userId: user.id
    };

    if (statusFilter !== 'ALL') {
      whereClause.status = statusFilter;
    }
    if (categoryFilter !== 'ALL') {
      whereClause.category = categoryFilter;
    }

    const [tickets, courses] = await Promise.all([
      prisma.supportTicket.findMany({
        where: whereClause,
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.course.findMany({
        where: { instructorId: user.id },
        select: { id: true, title: true, status: true },
        orderBy: { updatedAt: 'desc' }
      })
    ]);

    const allUserTickets = await prisma.supportTicket.findMany({
      where: { userId: user.id },
      select: { status: true }
    });

    const stats = {
      total: allUserTickets.length,
      open: allUserTickets.filter((t) => t.status === 'OPEN').length,
      inProgress: allUserTickets.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'WAITING').length,
      resolved: allUserTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length
    };

    return NextResponse.json({
      tickets,
      courses,
      stats
    });
  } catch (error) {
    console.error('GET /api/instructor/support error:', error);
    return NextResponse.json({ error: 'Failed to load instructor support tickets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['INSTRUCTOR', 'ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      subject,
      category = 'PAYMENT_ISSUE',
      priority = 'HIGH',
      courseId,
      referenceId,
      description
    } = body;

    if (!subject || !subject.trim() || !description || !description.trim()) {
      return NextResponse.json(
        { error: 'Both Ticket Subject and Issue Description are required.' },
        { status: 400 }
      );
    }

    let courseContextLine = '';
    if (courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { title: true, status: true }
      });
      if (course) {
        courseContextLine = `\n• Related Course: ${course.title} (${course.status})`;
      }
    }

    const refContextLine = referenceId?.trim()
      ? `\n• Transaction / Bank / Payout Ref: ${referenceId.trim()}`
      : '';

    const fullFirstMessage = `${description.trim()}${
      courseContextLine || refContextLine
        ? `\n\n--- Context Metadata ---${courseContextLine}${refContextLine}`
        : ''
    }`;

    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const ticketNumber = `INST-${randomCode}`;

    const createdTicket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId: user.id,
        organizationId: user.organizationId || null,
        subject: subject.trim(),
        category,
        priority,
        status: 'OPEN',
        messages: {
          create: [
            {
              senderId: user.id,
              senderName: user.name || 'Instructor',
              senderRole: 'INSTRUCTOR',
              message: fullFirstMessage
            },
            {
              senderId: 'system-support-bot',
              senderName: 'Instructor Priority Desk',
              senderRole: 'ADMIN',
              message: `Ticket #${ticketNumber} has been logged under [${category.replace(
                /_/g,
                ' '
              )}] with ${priority} priority. Our Finance, Course Audit, or Engineering team will respond shortly.`
            }
          ]
        }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    // Notify Admins / Super Admins
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'LMS_ADMIN'] } },
        select: { id: true },
        take: 5
      });
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          title: `New Instructor Ticket (${ticketNumber})`,
          message: `${user.name} raised a ${category.replace(/_/g, ' ')} ticket: "${subject.trim()}"`,
          type: 'SYSTEM'
        });
      }
    } catch {}

    return NextResponse.json({
      success: true,
      ticket: createdTicket,
      message: `Support Ticket ${ticketNumber} raised successfully.`
    });
  } catch (error) {
    console.error('POST /api/instructor/support error:', error);
    return NextResponse.json({ error: 'Failed to raise support ticket' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['INSTRUCTOR', 'ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { ticketId, replyMessage, status } = body;

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId is required' }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (user.role === 'INSTRUCTOR' && ticket.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (replyMessage && replyMessage.trim()) {
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: user.id,
          senderName: user.name || 'Instructor',
          senderRole: user.role === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'ADMIN',
          message: replyMessage.trim()
        }
      });
    }

    const nextStatus =
      status && ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)
        ? status
        : ticket.status === 'RESOLVED' && replyMessage
        ? 'OPEN'
        : ticket.status;

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: nextStatus
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return NextResponse.json({
      success: true,
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('PATCH /api/instructor/support error:', error);
    return NextResponse.json({ error: 'Failed to update support ticket' }, { status: 500 });
  }
}

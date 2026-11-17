import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notification';
import { sendEmail } from '@/lib/email';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin || !['SUPER_ADMIN', 'ADMIN', 'LMS_ADMIN', 'SALES_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const { id: ticketId } = await params;
    const body = await request.json();
    const { message, status } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 });
    }

    // Determine sender role
    const senderRole = admin.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';

    // Create message
    const msg = await prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: admin.id,
        senderName: `${admin.name} (${admin.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Support Desk'})`,
        senderRole,
        message: message.trim()
      }
    });

    // Update ticket updated date and status
    const updatedStatus = status || 'WAITING';
    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: updatedStatus,
        updatedAt: new Date()
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        user: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    const isInstructor = ticket.user?.role === 'INSTRUCTOR';
    const portalUrl = isInstructor ? '/instructor/support' : '/support';

    // Create in-app notification
    await createNotification({
      userId: ticket.userId,
      title: `Reply on Support Ticket #${ticket.ticketNumber}`,
      message: `${admin.name} replied: "${message.trim().substring(0, 100)}..."`,
      type: 'SYSTEM',
      category: 'SYSTEM',
      link: portalUrl
    }).catch(() => {});

    // Dispatch official email notification
    if (ticket.user?.email) {
      await sendEmail({
        to: ticket.user.email,
        subject: `[Support #${ticket.ticketNumber}] Official Response Received`,
        template: 'NOTIFICATION',
        data: {
          title: `Reply on Support Ticket #${ticket.ticketNumber}`,
          message: `Hello ${ticket.user.name},\n\nOur administrative support team has responded to your ticket regarding "${ticket.subject}".\n\nOfficial Response:\n"${message.trim()}"\n\nTicket Status: ${updatedStatus}`,
          actionUrl: portalUrl
        }
      }).catch((e) => console.error('[Support Reply Email Error]:', e));
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'REPLY_SUPPORT_TICKET',
        entity: 'SupportTicket',
        entityId: ticketId,
        description: `Admin replied on ticket #${ticket.ticketNumber} and updated status to "${updatedStatus}".`
      }
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Reply sent successfully.',
      ticketMessage: msg,
      ticket: updatedTicket
    });
  } catch (err: any) {
    console.error('POST /api/super-admin/support/[id]/reply error:', err);
    return NextResponse.json({ error: err.message || 'Failed to dispatch reply' }, { status: 400 });
  }
}

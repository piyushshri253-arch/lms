import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireSuperAdmin();
    const { id: ticketId } = await params;
    const body = await request.json();
    const { message, status } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { user: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 });
    }

    // Create message
    const msg = await prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: admin.id,
        senderName: admin.name,
        senderRole: 'SUPER_ADMIN',
        message: message.trim()
      }
    });

    // Update ticket updated date and status
    const updatedStatus = status || 'WAITING';
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: updatedStatus,
        updatedAt: new Date()
      }
    });

    // Create notification for student
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        title: `Reply on Support Ticket #${ticket.ticketNumber}`,
        message: `Super Administrator ${admin.name} replied to your inquiry: "${message.trim().substring(0, 80)}..."`,
        type: 'SYSTEM'
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'REPLY_SUPPORT_TICKET',
        entity: 'SupportTicket',
        entityId: ticketId,
        description: `Super Admin replied on ticket #${ticket.ticketNumber}.`
      }
    });

    return NextResponse.json({
      message: 'Reply sent successfully.',
      ticketMessage: msg
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

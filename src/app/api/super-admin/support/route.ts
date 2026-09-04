import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.toLowerCase() || '';
    const status = searchParams.get('status') || 'ALL'; // ALL, OPEN, IN_PROGRESS, WAITING, RESOLVED, CLOSED
    const ticketId = searchParams.get('id');

    if (ticketId) {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true, createdAt: true }
          },
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!ticket) {
        return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 });
      }

      return NextResponse.json({ ticket });
    }

    const where: any = {};
    if (status !== 'ALL') {
      where.status = status;
    }
    if (q) {
      where.OR = [
        { subject: { contains: q } },
        { ticketNumber: { contains: q } },
        { user: { name: { contains: q } } },
        { user: { email: { contains: q } } }
      ];
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        messages: { select: { id: true, message: true, senderRole: true, createdAt: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const formatted = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      status: t.status,
      assignedTo: t.assignedTo || 'Unassigned',
      createdAt: t.createdAt.toISOString().split('T')[0],
      updatedAt: t.updatedAt.toISOString().split('T')[0],
      user: t.user,
      messagesCount: t.messages.length,
      latestMessage: t.messages[t.messages.length - 1]?.message || ''
    }));

    return NextResponse.json({ tickets: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const { id, status, priority, assignedTo } = body;

    if (!id) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    const data: any = {};
    if (status) data.status = status;
    if (priority) data.priority = priority;
    if (assignedTo !== undefined) data.assignedTo = assignedTo;

    const updated = await prisma.supportTicket.update({
      where: { id },
      data,
      include: { user: { select: { name: true, email: true } } }
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'UPDATE_SUPPORT_TICKET',
        entity: 'SupportTicket',
        entityId: id,
        description: `Super Admin changed ticket #${updated.ticketNumber} status to "${updated.status}".`
      }
    });

    return NextResponse.json({
      message: `Ticket #${updated.ticketNumber} updated successfully.`,
      ticket: updated
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

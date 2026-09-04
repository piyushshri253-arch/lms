import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantAuth } from '@/lib/auth';
import { sendMultiChannelNotification } from '@/lib/notifications';

export async function GET() {
  try {
    const user = await requireTenantAuth();
    const where: any = {};

    if (user.role !== 'SUPER_ADMIN') {
      where.organizationId = user.organizationId;
      if (user.role === 'STUDENT') {
        where.userId = user.id;
      }
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ tickets });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireTenantAuth();
    const body = await req.json();
    const { subject, category = 'GENERAL', priority = 'MEDIUM', message } = body;

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 });
    }

    const ticketNumber = `TICK-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const ticket = await prisma.supportTicket.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        ticketNumber,
        subject: subject.trim(),
        category,
        priority,
        status: 'OPEN',
        messages: {
          create: {
            senderId: user.id,
            senderName: user.name,
            senderRole: user.role,
            message: message.trim()
          }
        }
      },
      include: { messages: true }
    });

    // Notify Super Admins
    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' }
    });

    for (const sa of superAdmins) {
      await sendMultiChannelNotification({
        userId: sa.id,
        title: `🎫 New Support Ticket: [${ticket.ticketNumber}] ${ticket.subject}`,
        message: `From ${user.name} (${user.email}) in organization "${user.organizationName || 'Tenant'}". Category: ${category}, Priority: ${priority}`,
        type: 'SYSTEM',
        category: 'SYSTEM',
        channels: ['IN_APP'],
        link: '/super-admin/support'
      });
    }

    return NextResponse.json({ success: true, ticket });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

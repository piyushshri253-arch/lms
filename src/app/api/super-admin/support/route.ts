import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notification';
import { sendEmail } from '@/lib/email';
import { ISSUE_ROUTING_CONFIGS } from '@/lib/team-notifications';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !['SUPER_ADMIN', 'ADMIN', 'LMS_ADMIN', 'SALES_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.toLowerCase() || '';
    const status = searchParams.get('status') || 'ALL';
    const category = searchParams.get('category') || 'ALL';
    const priority = searchParams.get('priority') || 'ALL';
    const role = searchParams.get('role') || 'ALL';
    const ticketId = searchParams.get('id');

    if (ticketId) {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              role: true,
              createdAt: true
            }
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
    if (category !== 'ALL') {
      where.category = category;
    }
    if (priority !== 'ALL') {
      where.priority = priority;
    }
    if (role !== 'ALL') {
      where.user = { role };
    }
    if (q) {
      where.OR = [
        { subject: { contains: q, mode: 'insensitive' } },
        { ticketNumber: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const [tickets, allTickets, instructors, students] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              role: true,
              createdAt: true
            }
          },
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.supportTicket.findMany({
        select: {
          status: true,
          category: true,
          priority: true,
          user: { select: { role: true } }
        }
      }),
      prisma.user.findMany({
        where: { role: 'INSTRUCTOR' },
        select: { id: true, name: true, email: true, phone: true },
        orderBy: { name: 'asc' }
      }),
      prisma.user.findMany({
        where: { role: 'STUDENT' },
        select: { id: true, name: true, email: true },
        take: 50,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const stats = {
      total: allTickets.length,
      open: allTickets.filter((t) => t.status === 'OPEN').length,
      inProgress: allTickets.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'WAITING').length,
      resolved: allTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
      urgent: allTickets.filter((t) => t.priority === 'URGENT').length,
      paymentIssues: allTickets.filter((t) => t.category === 'PAYMENT_ISSUE').length,
      courseApprovalIssues: allTickets.filter((t) => t.category === 'COURSE_APPROVAL_ISSUE').length,
      bankVerificationIssues: allTickets.filter((t) => t.category === 'BANK_VERIFICATION_ISSUE').length,
      technicalIssues: allTickets.filter((t) => t.category === 'TECHNICAL_ISSUE').length,
      instructorCount: allTickets.filter((t) => t.user?.role === 'INSTRUCTOR').length,
      studentCount: allTickets.filter((t) => t.user?.role === 'STUDENT').length
    };

    const formatted = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      status: t.status,
      assignedTo: t.assignedTo || 'Unassigned',
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      user: t.user,
      messages: t.messages,
      messagesCount: t.messages.length,
      latestMessage: t.messages[t.messages.length - 1]?.message || ''
    }));

    return NextResponse.json({
      tickets: formatted,
      stats,
      instructors,
      students
    });
  } catch (err: any) {
    console.error('GET /api/super-admin/support error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getCurrentUser();
    if (!admin || !['SUPER_ADMIN', 'ADMIN', 'LMS_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, subject, category = 'GENERAL', priority = 'MEDIUM', message, assignedTo } = body;

    if (!userId || !subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: 'User ID, subject, and message are required.' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, organizationId: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found.' }, { status: 404 });
    }

    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const prefix = targetUser.role === 'INSTRUCTOR' ? 'INST' : 'TICK';
    const ticketNumber = `${prefix}-${randomCode}`;

    const routingConfig = ISSUE_ROUTING_CONFIGS[category];
    const defaultAssignee = assignedTo || (routingConfig ? `${routingConfig.primaryTeam} (Primary)` : 'Super Admin');

    const createdTicket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId: targetUser.id,
        organizationId: targetUser.organizationId || admin.organizationId || null,
        subject: subject.trim(),
        category,
        priority,
        status: 'OPEN',
        assignedTo: defaultAssignee,
        messages: {
          create: [
            {
              senderId: admin.id,
              senderName: admin.name || 'Support Administrator',
              senderRole: 'ADMIN',
              message: message.trim()
            }
          ]
        }
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        messages: true
      }
    });

    // Send in-app notification
    await createNotification({
      userId: targetUser.id,
      title: `Support Ticket Initiated #${ticketNumber}`,
      message: `Administrator ${admin.name} created ticket "${subject.trim()}": ${message.trim().substring(0, 100)}...`,
      type: 'SYSTEM',
      category: 'SYSTEM',
      link: targetUser.role === 'INSTRUCTOR' ? '/instructor/support' : '/support'
    }).catch(() => {});

    // Send email
    if (targetUser.email) {
      await sendEmail({
        to: targetUser.email,
        subject: `[Support #${ticketNumber}] ${subject.trim()}`,
        template: 'NOTIFICATION',
        data: {
          title: `Support Ticket Opened: #${ticketNumber}`,
          message: `Hello ${targetUser.name},\n\nAn administrator has opened a support ticket regarding: "${subject.trim()}".\n\nMessage:\n"${message.trim()}"`,
          actionUrl: targetUser.role === 'INSTRUCTOR' ? '/instructor/support' : '/support'
        }
      }).catch(() => {});
    }

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'CREATE_SUPPORT_TICKET',
        entity: 'SupportTicket',
        entityId: createdTicket.id,
        description: `Admin created ticket #${ticketNumber} for ${targetUser.name} (${targetUser.role}).`
      }
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      ticket: createdTicket,
      message: `Ticket #${ticketNumber} created successfully.`
    });
  } catch (err: any) {
    console.error('POST /api/super-admin/support error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create ticket' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await getCurrentUser();
    if (!admin || !['SUPER_ADMIN', 'ADMIN', 'LMS_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, priority, assignedTo } = body;

    if (!id) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    const existing = await prisma.supportTicket.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true, role: true } } }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const data: any = { updatedAt: new Date() };
    if (status) data.status = status;
    if (priority) data.priority = priority;
    if (assignedTo !== undefined) data.assignedTo = assignedTo;

    const updated = await prisma.supportTicket.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });

    // Notify user if status resolved
    if (status && status !== existing.status) {
      await createNotification({
        userId: existing.userId,
        title: `Ticket #${existing.ticketNumber} Status Changed: ${status}`,
        message: `Your support ticket #${existing.ticketNumber} is now marked as "${status}".`,
        type: 'SYSTEM',
        category: 'SYSTEM',
        link: existing.user?.role === 'INSTRUCTOR' ? '/instructor/support' : '/support'
      }).catch(() => {});
    }

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'UPDATE_SUPPORT_TICKET',
        entity: 'SupportTicket',
        entityId: id,
        description: `Admin updated ticket #${updated.ticketNumber}: status=${updated.status}, priority=${updated.priority}, assignedTo=${updated.assignedTo}.`
      }
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Ticket #${updated.ticketNumber} updated successfully.`,
      ticket: updated
    });
  } catch (err: any) {
    console.error('PUT /api/super-admin/support error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update ticket' }, { status: 500 });
  }
}

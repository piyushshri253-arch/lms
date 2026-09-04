import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); // ALL, UNREAD, REGISTRATION, SYSTEM

    const where: any = { userId: admin.id };
    if (filter === 'UNREAD') {
      where.isRead = false;
    } else if (filter && filter !== 'ALL') {
      where.type = filter;
    }

    const [notifications, unreadCount, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.notification.count({
        where: { userId: admin.id, isRead: false }
      }),
      prisma.notification.count({
        where: { userId: admin.id }
      })
    ]);

    return NextResponse.json({
      notifications,
      unreadCount,
      totalCount
    });
  } catch (err: any) {
    const status = err.message?.includes('Authentication') ? 401 : 403;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    const body = await req.json();
    const { id, markAllAsRead, isRead } = body;

    if (markAllAsRead) {
      await prisma.notification.updateMany({
        where: { userId: admin.id, isRead: false },
        data: { isRead: true }
      });
      return NextResponse.json({ success: true, message: 'All notifications marked as read.' });
    }

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
    }

    const updated = await prisma.notification.update({
      where: { id, userId: admin.id },
      data: { isRead: isRead ?? true }
    });

    return NextResponse.json({ success: true, notification: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update notification' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
    }

    await prisma.notification.delete({
      where: { id, userId: admin.id }
    });

    return NextResponse.json({ success: true, message: 'Notification removed.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete notification' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const { targetAudience, specificUserId, courseId, title, message, type } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    let targetUsers: { id: string }[] = [];

    if (specificUserId) {
      targetUsers = [{ id: specificUserId }];
    } else if (courseId) {
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId },
        select: { userId: true }
      });
      targetUsers = enrollments.map((e) => ({ id: e.userId }));
    } else if (targetAudience === 'STUDENTS') {
      targetUsers = await prisma.user.findMany({ where: { role: 'STUDENT' }, select: { id: true } });
    } else if (targetAudience === 'INSTRUCTORS') {
      targetUsers = await prisma.user.findMany({ where: { role: 'INSTRUCTOR' }, select: { id: true } });
    } else if (targetAudience === 'ADMINS') {
      targetUsers = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
        select: { id: true }
      });
    } else {
      // ALL
      targetUsers = await prisma.user.findMany({ select: { id: true } });
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({ error: 'No recipients matched the audience criteria' }, { status: 400 });
    }

    const createdNotifications = await prisma.$transaction(
      targetUsers.map((u) =>
        prisma.notification.create({
          data: {
            userId: u.id,
            title: title.trim(),
            message: message.trim(),
            type: type || 'SYSTEM'
          }
        })
      )
    );

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'BROADCAST_NOTIFICATION',
        entity: 'Notification',
        description: `Super Admin broadcasted notification "${title}" to ${createdNotifications.length} users (${targetAudience || 'CUSTOM'}).`
      }
    });

    return NextResponse.json({
      message: `Notification broadcasted to ${createdNotifications.length} users.`,
      dispatchedCount: createdNotifications.length
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

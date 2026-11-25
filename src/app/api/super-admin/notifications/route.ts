import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); // ALL, UNREAD, ACCOUNT, SYSTEM, ANNOUNCEMENT, PAYMENT, STUDENT, SUPPORT

    const where: any = { userId: admin.id };
    if (filter === 'UNREAD') {
      where.isRead = false;
    } else if (filter && !['ALL', 'ANNOUNCEMENT', 'PAYMENT', 'STUDENT', 'SUPPORT', 'COURSES'].includes(filter)) {
      where.type = filter;
    }

    const [userNotifications, unreadDbCount, totalDbCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.notification.count({
        where: { userId: admin.id, isRead: false }
      }),
      prisma.notification.count({
        where: { userId: admin.id }
      })
    ]);

    // Active Announcements
    let announcementItems: any[] = [];
    const audienceList = ['ALL', 'Everyone', 'everyone', 'ADMINS', 'admins', 'staff'];
    const announcements = await prisma.announcement.findMany({
      where: {
        status: { in: ['ACTIVE', 'PUBLISHED', 'active', 'published'] },
        targetAudience: { in: audienceList }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    announcementItems = announcements.map((a) => ({
      id: `ann-${a.id}`,
      userId: admin.id,
      title: `📢 ${a.title}`,
      message: a.message,
      type: 'ANNOUNCEMENT',
      link: '/admin/notifications',
      isRead: false,
      createdAt: a.createdAt
    }));

    // Stream Real-Time LMS Activity Events across Orders, Students, Courses & Support!
    const [recentOrders, recentStudents, recentTickets, recentCourses] = await Promise.all([
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } }
      }).catch(() => []),
      prisma.user.findMany({
        where: { role: 'STUDENT' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, createdAt: true }
      }).catch(() => []),
      prisma.supportTicket.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } }
      }).catch(() => []),
      prisma.course.findMany({
        take: 6,
        orderBy: { updatedAt: 'desc' },
        include: { instructor: { select: { name: true } } }
      }).catch(() => [])
    ]);

    const liveLmsEvents: any[] = [];

    for (const o of recentOrders) {
      liveLmsEvents.push({
        id: `live-order-${o.id}`,
        userId: admin.id,
        title: `💳 Payment: ₹${(o.total || o.amount || 0).toLocaleString('en-IN')}`,
        message: `${o.user?.name || 'A learner'} enrolled in course (${o.status}). Order #${o.id.slice(-6)}`,
        type: 'PAYMENT',
        link: admin.role === 'SUPER_ADMIN' ? '/super-admin/finance/sales' : '/admin/finance/sales',
        isRead: false,
        createdAt: o.createdAt
      });
    }

    for (const s of recentStudents) {
      liveLmsEvents.push({
        id: `live-student-${s.id}`,
        userId: admin.id,
        title: `🎓 New Student Registration`,
        message: `${s.name} (${s.email}) joined Morena Teach LMS.`,
        type: 'STUDENT',
        link: admin.role === 'SUPER_ADMIN' ? '/super-admin/students' : '/admin/students',
        isRead: false,
        createdAt: s.createdAt
      });
    }

    for (const t of recentTickets) {
      liveLmsEvents.push({
        id: `live-ticket-${t.id}`,
        userId: admin.id,
        title: `🎫 Support: ${t.subject}`,
        message: `${(t as any).user?.name || (t as any).ticketNumber || 'Ticket'} (${t.category}): Status is ${t.status}.`,
        type: 'SUPPORT',
        link: admin.role === 'SUPER_ADMIN' ? '/super-admin/support' : '/admin/support',
        isRead: false,
        createdAt: t.createdAt
      });
    }

    for (const c of recentCourses) {
      liveLmsEvents.push({
        id: `live-course-${c.id}`,
        userId: admin.id,
        title: `📚 Course Catalog: ${c.title}`,
        message: `Authored by ${c.instructor?.name || 'Faculty'}. Current Status: ${c.status}`,
        type: 'COURSES',
        link: admin.role === 'SUPER_ADMIN' ? '/super-admin/courses' : '/admin/courses',
        isRead: false,
        createdAt: c.updatedAt
      });
    }

    let allNotifications = [...announcementItems, ...userNotifications, ...liveLmsEvents].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (filter === 'PAYMENT') {
      allNotifications = allNotifications.filter((n) => n.type === 'PAYMENT');
    } else if (filter === 'STUDENT') {
      allNotifications = allNotifications.filter((n) => n.type === 'STUDENT');
    } else if (filter === 'COURSES') {
      allNotifications = allNotifications.filter((n) => n.type === 'COURSES');
    } else if (filter === 'SUPPORT') {
      allNotifications = allNotifications.filter((n) => n.type === 'SUPPORT');
    }

    return NextResponse.json({
      notifications: allNotifications,
      unreadCount: unreadDbCount + announcementItems.length + liveLmsEvents.length,
      totalCount: totalDbCount + announcementItems.length + liveLmsEvents.length,
      realtimeActive: true
    });
  } catch (err: any) {
    const status = err.message?.includes('UNAUTHORIZED') || err.message?.includes('Authentication') ? 401 : 403;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin();
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

    if (String(id).startsWith('ann-') || String(id).startsWith('live-')) {
      return NextResponse.json({ success: true });
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
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
    }

    if (String(id).startsWith('ann-') || String(id).startsWith('live-')) {
      return NextResponse.json({ success: true, message: 'Notification dismissed.' });
    }

    await prisma.notification.delete({
      where: { id, userId: admin.id }
    });

    return NextResponse.json({ success: true, message: 'Notification removed.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete notification' }, { status: 400 });
  }
}

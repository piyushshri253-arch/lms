import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); // ALL, UNREAD, ACCOUNT, LEARNING, PAYMENT, MARKETING, SUPPORT, ANNOUNCEMENT

    const where: any = { userId: user.id };

    if (filter === 'UNREAD') {
      where.isRead = false;
    } else if (filter && filter !== 'ALL' && filter !== 'ANNOUNCEMENT') {
      where.type = filter;
    }

    const [userNotifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 40
      }),
      prisma.notification.count({
        where: { userId: user.id, isRead: false }
      })
    ]);

    // Fetch enrolled course IDs if student
    let enrolledCourseIds: string[] = [];
    if (user.role === 'STUDENT') {
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: user.id },
        select: { courseId: true }
      });
      enrolledCourseIds = enrollments.map((e) => e.courseId);
    }

    // Fetch active announcements matching user role
    const audienceList = ['ALL', 'Everyone', 'everyone'];
    if (user.role === 'STUDENT') audienceList.push('STUDENTS', 'ALL_STUDENTS', 'students', 'student');
    if (user.role === 'INSTRUCTOR') audienceList.push('INSTRUCTORS', 'instructors', 'faculty');
    if (user.role === 'REVIEWER') audienceList.push('REVIEWERS', 'reviewers');
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') audienceList.push('ADMINS', 'admins', 'staff');

    const audienceFilters: any[] = [{ targetAudience: { in: audienceList } }];
    if (enrolledCourseIds.length > 0) {
      audienceFilters.push({ courseId: { in: enrolledCourseIds } });
    }

    const announcements = await prisma.announcement.findMany({
      where: {
        status: { in: ['ACTIVE', 'PUBLISHED', 'active', 'published'] },
        OR: audienceFilters
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const announcementItems = announcements.map((a) => ({
      id: `ann-${a.id}`,
      userId: user.id,
      title: `📢 ${a.title}`,
      message: a.message,
      type: 'ANNOUNCEMENT',
      link:
        user.role === 'STUDENT'
          ? '/student/learning?tab=notifications'
          : user.role === 'INSTRUCTOR'
          ? '/instructor'
          : user.role === 'REVIEWER'
          ? '/reviewer'
          : user.role === 'SUPER_ADMIN'
          ? '/super-admin/notifications'
          : '/admin/notifications',
      isRead: false,
      createdAt: a.createdAt
    }));

    // For Super Admin & Admins: Stream Real-Time LMS Activity Events across Orders, Students, Courses & Support!
    let liveLmsEvents: any[] = [];
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      const [recentOrders, recentStudents, recentTickets, recentCourses] = await Promise.all([
        prisma.order.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true, email: true } } }
        }).catch(() => []),
        prisma.user.findMany({
          where: { role: 'STUDENT' },
          take: 8,
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, email: true, createdAt: true }
        }).catch(() => []),
        prisma.supportTicket.findMany({
          take: 6,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true, email: true } } }
        }).catch(() => []),
        prisma.course.findMany({
          take: 5,
          orderBy: { updatedAt: 'desc' },
          include: { instructor: { select: { name: true } } }
        }).catch(() => [])
      ]);

      for (const o of recentOrders) {
        liveLmsEvents.push({
          id: `live-order-${o.id}`,
          userId: user.id,
          title: `💳 Payment: ₹${(o.total || o.amount || 0).toLocaleString('en-IN')}`,
          message: `${o.user?.name || 'A learner'} enrolled in course (${o.status}). Order #${o.id.slice(-6)}`,
          type: 'PAYMENT',
          link: user.role === 'SUPER_ADMIN' ? '/super-admin/finance/sales' : '/admin/finance/sales',
          isRead: false,
          createdAt: o.createdAt
        });
      }

      for (const s of recentStudents) {
        liveLmsEvents.push({
          id: `live-student-${s.id}`,
          userId: user.id,
          title: `🎓 New Student Registration`,
          message: `${s.name} (${s.email}) joined Morena Teach LMS.`,
          type: 'STUDENT',
          link: user.role === 'SUPER_ADMIN' ? '/super-admin/students' : '/admin/students',
          isRead: false,
          createdAt: s.createdAt
        });
      }

      for (const t of recentTickets) {
        liveLmsEvents.push({
          id: `live-ticket-${t.id}`,
          userId: user.id,
          title: `🎫 Support: ${t.subject}`,
          message: `${(t as any).user?.name || (t as any).ticketNumber || 'Ticket'} (${t.category}): Status is ${t.status}.`,
          type: 'SUPPORT',
          link: user.role === 'SUPER_ADMIN' ? '/super-admin/support' : '/admin/support',
          isRead: false,
          createdAt: t.createdAt
        });
      }

      for (const c of recentCourses) {
        liveLmsEvents.push({
          id: `live-course-${c.id}`,
          userId: user.id,
          title: `📚 Course Catalog: ${c.title}`,
          message: `Authored by ${c.instructor?.name || 'Faculty'}. Current Status: ${c.status}`,
          type: 'COURSES',
          link: user.role === 'SUPER_ADMIN' ? '/super-admin/courses' : '/admin/courses',
          isRead: false,
          createdAt: c.updatedAt
        });
      }
    }

    // Combine and sort notifications
    let allNotifications = [...announcementItems, ...userNotifications, ...liveLmsEvents].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply filter if specified
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
      unreadCount: unreadCount + announcementItems.length + liveLmsEvents.length,
      realtimeActive: true
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { id, markAllAsRead, isRead } = body;

    if (markAllAsRead) {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true }
      });
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (!id) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    if (String(id).startsWith('ann-') || String(id).startsWith('live-')) {
      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    await prisma.notification.update({
      where: { id, userId: user.id },
      data: { isRead: isRead ?? true }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

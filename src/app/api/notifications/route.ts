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

    // Combine notifications
    const allNotifications = [...announcementItems, ...userNotifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      notifications: allNotifications,
      unreadCount: unreadCount + announcementItems.length
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
      return NextResponse.json({ success: true, message: 'All notifications marked as read.' });
    }

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
    }

    if (!id.startsWith('ann-')) {
      const updated = await prisma.notification.update({
        where: { id, userId: user.id },
        data: { isRead: isRead ?? true }
      });
      return NextResponse.json({ success: true, notification: updated });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update notification' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
    }

    if (!id.startsWith('ann-')) {
      await prisma.notification.delete({
        where: { id, userId: user.id }
      });
    }

    return NextResponse.json({ success: true, message: 'Notification removed.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete notification' }, { status: 400 });
  }
}

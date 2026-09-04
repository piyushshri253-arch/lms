import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();

    // 1. Fetch direct user notifications
    let notifs = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30
    });

    // 2. Fetch enrolled course IDs for targeted announcements
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
      select: { courseId: true }
    });
    const enrolledCourseIds = enrollments.map((e) => e.courseId);

    // 3. Fetch active announcements matching student
    const audienceFilters: any[] = [
      {
        targetAudience: {
          in: ['ALL', 'STUDENTS', 'ALL_STUDENTS', 'all', 'students', 'All', 'All Students', 'Everyone', 'everyone']
        }
      }
    ];

    if (enrolledCourseIds.length > 0) {
      audienceFilters.push({
        courseId: { in: enrolledCourseIds }
      });
    }

    const announcements = await prisma.announcement.findMany({
      where: {
        status: { in: ['ACTIVE', 'PUBLISHED', 'active', 'published'] },
        OR: audienceFilters
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Format announcements as notification items
    const announcementNotifs = announcements.map((a) => ({
      id: `ann-${a.id}`,
      userId: user.id,
      title: `📢 ${a.title}`,
      message: a.message,
      type: 'ANNOUNCEMENT',
      link: '/dashboard',
      isRead: false,
      createdAt: a.createdAt
    }));

    // If student has 0 notifications and 0 announcements, seed helpful welcome
    if (notifs.length === 0 && announcementNotifs.length === 0) {
      const welcome = await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Welcome to AADHYARA LMS! 🚀',
          message: 'Explore 120+ deep tech courses, track your real-time progress, and earn accredited diplomas.',
          type: 'SYSTEM',
          isRead: false
        }
      });
      notifs = [welcome];
    }

    // Combine and sort by createdAt descending
    const combined = [...announcementNotifs, ...notifs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ notifications: combined });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const { notificationId, markAll } = body;

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true }
      });
      return NextResponse.json({ message: 'All notifications marked as read' });
    }

    if (notificationId) {
      if (!notificationId.startsWith('ann-')) {
        await prisma.notification.updateMany({
          where: { id: notificationId, userId: user.id },
          data: { isRead: true }
        });
      }
      return NextResponse.json({ message: 'Notification marked as read' });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


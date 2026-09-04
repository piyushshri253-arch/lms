import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const enrolledCourseIds: string[] = [];

    if (user && user.role === 'STUDENT') {
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: user.id },
        select: { courseId: true }
      });
      enrollments.forEach((e) => enrolledCourseIds.push(e.courseId));
    }

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
      take: 20
    });

    return NextResponse.json({ announcements });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch announcements' }, { status: 500 });
  }
}

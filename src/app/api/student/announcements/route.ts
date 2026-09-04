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

    const where: any = {
      status: { in: ['ACTIVE', 'PUBLISHED', 'active', 'published'] },
      OR: audienceFilters
    };

    // Strict Tenant Isolation: Scope to student's organization
    if (user?.organizationId) {
      where.organizationId = user.organizationId;
    }

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const courseIds = announcements.map((a) => a.courseId).filter(Boolean) as string[];
    const courses = courseIds.length > 0
      ? await prisma.course.findMany({
          where: { id: { in: courseIds } },
          select: { id: true, title: true, slug: true }
        })
      : [];
    const courseMap = new Map(courses.map((c) => [c.id, c]));

    const mapped = announcements.map((a) => ({
      id: a.id,
      organizationId: a.organizationId,
      title: a.title,
      message: a.message,
      targetAudience: a.targetAudience,
      courseId: a.courseId,
      course: a.courseId ? courseMap.get(a.courseId) || null : null,
      status: a.status,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt
    }));

    return NextResponse.json({
      announcements: mapped,
      activeBanner: mapped.length > 0 ? mapped[0] : null
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch announcements' }, { status: 500 });
  }
}

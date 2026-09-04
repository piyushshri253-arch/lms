import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const orgId = user.organizationId;
    const { searchParams } = new URL(request.url);
    const activeDays = Number(searchParams.get('activeDays') || 30);

    const tenantFilter: any = {};
    if (user.role !== 'SUPER_ADMIN' && orgId) {
      tenantFilter.organizationId = orgId;
    }

    const activeThresholdDate = new Date();
    activeThresholdDate.setDate(activeThresholdDate.getDate() - activeDays);

    const students = await prisma.user.findMany({
      where: { ...tenantFilter, role: 'STUDENT' },
      include: {
        enrollments: {
          include: {
            course: {
              include: {
                sections: { include: { lessons: true } }
              }
            }
          }
        },
        lessonProgress: true,
        certificates: true,
        orders: { where: { status: { in: ['PAID', 'SUCCESS'] } } }
      }
    });

    let activeStudentsCount = 0;
    let inactiveStudentsCount = 0;
    let totalLearningSeconds = 0;
    let completedCoursesTotal = 0;
    let totalProgressSum = 0;
    let totalEnrollmentsCount = 0;

    students.forEach((s) => {
      // Check if student was active in last activeDays (either logged in or updated lesson progress)
      const hasRecentLogin = s.lastLoginAt && new Date(s.lastLoginAt) >= activeThresholdDate;
      const hasRecentLesson = s.lessonProgress.some((lp) => new Date(lp.updatedAt) >= activeThresholdDate);

      if (hasRecentLogin || hasRecentLesson) {
        activeStudentsCount++;
      } else {
        inactiveStudentsCount++;
      }

      // Learning time
      const studentSeconds = s.lessonProgress.reduce((sum, lp) => sum + (lp.watchedDuration || 0), 0);
      totalLearningSeconds += studentSeconds;

      // Enrollments progress
      s.enrollments.forEach((e) => {
        totalEnrollmentsCount++;
        if (e.status === 'COMPLETED') completedCoursesTotal++;

        const allLessons = e.course.sections.flatMap((sec) => sec.lessons);
        const comp = allLessons.filter((l) =>
          s.lessonProgress.some((lp) => lp.lessonId === l.id && lp.completed)
        ).length;
        const prog = allLessons.length > 0 ? (comp / allLessons.length) * 100 : 0;
        totalProgressSum += prog;
      });
    });

    const totalStudents = students.length;
    const avgProgress = totalEnrollmentsCount > 0 ? Number((totalProgressSum / totalEnrollmentsCount).toFixed(1)) : 0;
    const avgLearningHours = totalStudents > 0 ? Number((totalLearningSeconds / 3600 / totalStudents).toFixed(1)) : 0;
    const courseCompletionRate = totalEnrollmentsCount > 0 ? Number(((completedCoursesTotal / totalEnrollmentsCount) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      summary: {
        totalStudents,
        activeStudents: activeStudentsCount,
        inactiveStudents: inactiveStudentsCount,
        activeWindowDays: activeDays,
        averageProgress: avgProgress,
        averageLearningHours: avgLearningHours,
        totalCompletedCourses: completedCoursesTotal,
        courseCompletionRate
      },
      topLearners: students
        .map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          avatar: s.avatar,
          enrolledCourses: s.enrollments.length,
          completedCourses: s.certificates.length,
          totalSpent: s.orders.reduce((sum, ord) => sum + (ord.total || ord.amount), 0),
          lastActive: s.lastLoginAt || s.createdAt
        }))
        .sort((a, b) => b.completedCourses - a.completedCourses)
        .slice(0, 15)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

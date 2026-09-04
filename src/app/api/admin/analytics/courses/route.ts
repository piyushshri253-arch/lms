import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const orgId = user.organizationId;
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    const tenantFilter: any = {};
    if (user.role !== 'SUPER_ADMIN' && orgId) {
      tenantFilter.organizationId = orgId;
    }
    if (user.role === 'INSTRUCTOR') {
      tenantFilter.instructorId = user.id;
    }
    if (courseId) {
      tenantFilter.id = courseId;
    }

    const courses = await prisma.course.findMany({
      where: tenantFilter,
      include: {
        category: true,
        instructor: { select: { id: true, name: true, avatar: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                quiz: {
                  include: { attempts: true }
                }
              }
            }
          }
        },
        enrollments: true,
        orders: { where: { status: { in: ['PAID', 'SUCCESS'] } } },
        reviews: true
      }
    });

    const coursesAnalytics = await Promise.all(
      courses.map(async (c) => {
        const totalEnrollments = c.enrollments.length;
        const totalRevenue = c.orders.reduce((sum, ord) => sum + (ord.total || ord.amount), 0);
        const completedEnrollments = c.enrollments.filter((e) => e.status === 'COMPLETED').length;
        const completionRate = totalEnrollments > 0 ? Number(((completedEnrollments / totalEnrollments) * 100).toFixed(1)) : 0;

        const allLessons = c.sections.flatMap((s) => s.lessons);
        const allLessonIds = allLessons.map((l) => l.id);

        // Fetch lesson progress across all enrolled students in this course
        const allProgress = await prisma.lessonProgress.findMany({
          where: { lessonId: { in: allLessonIds } }
        });

        // Compute lesson by lesson completion & drop-off rates
        const lessonDropoffs = allLessons.map((l, idx) => {
          const compCount = allProgress.filter((p) => p.lessonId === l.id && p.completed).length;
          const compPct = totalEnrollments > 0 ? Number(((compCount / totalEnrollments) * 100).toFixed(1)) : 0;
          return {
            id: l.id,
            title: l.title,
            order: idx + 1,
            completedStudentsCount: compCount,
            completionPercent: compPct,
            isDropoffPoint: idx > 0 && compPct < 60
          };
        });

        // Quiz analytics for this course
        const quizLessons = allLessons.filter((l) => l.quiz);
        let totalQuizAttempts = 0;
        let totalQuizScoreSum = 0;

        quizLessons.forEach((ql) => {
          if (ql.quiz) {
            totalQuizAttempts += ql.quiz.attempts.length;
            totalQuizScoreSum += ql.quiz.attempts.reduce((sum, a) => sum + a.score, 0);
          }
        });

        const avgQuizScore = totalQuizAttempts > 0 ? Number((totalQuizScoreSum / totalQuizAttempts).toFixed(1)) : 0;

        return {
          id: c.id,
          slug: c.slug,
          title: c.title,
          thumbnail: c.thumbnail,
          category: c.category?.name || 'General',
          instructor: c.instructor,
          status: c.status,
          price: c.price,
          totalEnrollments,
          totalRevenue,
          completedEnrollments,
          completionRate,
          averageQuizScore: avgQuizScore,
          totalLessons: allLessons.length,
          lessonDropoffs
        };
      })
    );

    return NextResponse.json({
      courses: coursesAnalytics,
      totalCourses: coursesAnalytics.length
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

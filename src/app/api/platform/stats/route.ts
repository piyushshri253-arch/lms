import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [totalStudents, totalCourses, totalEnrollments, completedEnrollments, reviewsAgg] =
      await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.course.count({ where: { status: 'PUBLISHED' } }),
        prisma.enrollment.count(),
        prisma.enrollment.count({ where: { status: 'COMPLETED' } }),
        prisma.review.aggregate({
          _avg: { rating: true },
          _count: { id: true }
        })
      ]);

    const avgRating =
      reviewsAgg._count.id > 0 ? Number((reviewsAgg._avg.rating || 5.0).toFixed(1)) : 5.0;

    const completionRate =
      totalEnrollments > 0
        ? Math.round((completedEnrollments / totalEnrollments) * 100)
        : 95;

    return NextResponse.json({
      totalStudents,
      totalCourses,
      totalEnrollments,
      completedEnrollments,
      avgRating,
      totalReviews: reviewsAgg._count.id || 0,
      completionRate
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

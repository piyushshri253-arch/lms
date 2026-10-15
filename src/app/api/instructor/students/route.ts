import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !['INSTRUCTOR', 'SUPER_ADMIN', 'LMS_ADMIN', 'ADMIN'].includes(user.role as any)) {
      return NextResponse.json({ error: 'Unauthorized: Instructor access required.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const courseFilter = searchParams.get('courseId') || '';
    const statusFilter = (searchParams.get('status') || 'ALL').toUpperCase();

    // 1. Instructor courses filter (Strict RBAC)
    const courseWhere: any = {};
    if (user.role === 'INSTRUCTOR') {
      courseWhere.instructorId = user.id;
    } else if (user.organizationId) {
      courseWhere.organizationId = user.organizationId;
    }

    const authoredCourses = await prisma.course.findMany({
      where: courseWhere,
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        discountPrice: true,
        status: true,
        category: { select: { name: true } },
        sections: {
          select: {
            id: true,
            lessons: {
              select: { id: true }
            }
          }
        },
        _count: {
          select: { enrollments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const courseIds = authoredCourses.map((c) => c.id);
    if (courseIds.length === 0) {
      return NextResponse.json({
        success: true,
        metrics: {
          totalEnrollments: 0,
          totalUniqueStudents: 0,
          totalRevenue: 0,
          activeEnrollments: 0,
          completedEnrollments: 0
        },
        students: [],
        coursesBreakdown: []
      });
    }

    // Build filter for enrollments
    const enrollmentWhere: any = {
      courseId: { in: courseIds }
    };

    if (courseFilter && courseIds.includes(courseFilter)) {
      enrollmentWhere.courseId = courseFilter;
    }

    if (statusFilter && statusFilter !== 'ALL') {
      enrollmentWhere.status = statusFilter;
    }

    // Fetch all matching enrollments with student details
    const enrollments = await prisma.enrollment.findMany({
      where: enrollmentWhere,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            createdAt: true
          }
        },
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            discountPrice: true,
            status: true,
            category: { select: { name: true } }
          }
        }
      },
      orderBy: { enrolledAt: 'desc' }
    });

    // Collect lesson counts per course for progress calculation
    const courseLessonMap = new Map<string, string[]>();
    for (const c of authoredCourses) {
      const lessonIds: string[] = [];
      for (const sec of c.sections || []) {
        for (const les of sec.lessons || []) {
          lessonIds.push(les.id);
        }
      }
      courseLessonMap.set(c.id, lessonIds);
    }

    // Fetch lesson progresses for all enrolled users
    const enrolledUserIds = Array.from(new Set(enrollments.map((e) => e.userId)));
    const allLessonIds = Array.from(
      new Set(Array.from(courseLessonMap.values()).flat())
    );

    const completedProgresses =
      enrolledUserIds.length && allLessonIds.length
        ? await prisma.lessonProgress.findMany({
            where: {
              userId: { in: enrolledUserIds },
              lessonId: { in: allLessonIds },
              completed: true
            },
            select: {
              userId: true,
              lessonId: true
            }
          })
        : [];

    const userCompletedLessonsSet = new Set(
      completedProgresses.map((p) => `${p.userId}_${p.lessonId}`)
    );

    // Fetch related Orders or Instructor transactions for purchase price & payment status
    const orders = enrolledUserIds.length
      ? await prisma.order.findMany({
          where: {
            userId: { in: enrolledUserIds },
            courseId: { in: courseIds },
            status: { in: ['PAID', 'SUCCESS', 'COMPLETED'] }
          },
          select: {
            id: true,
            orderNumber: true,
            userId: true,
            courseId: true,
            amount: true,
            total: true,
            provider: true,
            status: true,
            createdAt: true
          }
        })
      : [];

    const orderMap = new Map<string, any>();
    for (const ord of orders) {
      if (ord.courseId && ord.userId) {
        orderMap.set(`${ord.userId}_${ord.courseId}`, ord);
      }
    }

    // Also fetch transactions for fallback
    const instructorTxns = await prisma.instructorEarningTransaction.findMany({
      where: {
        userId: user.id,
        courseId: { in: courseIds }
      },
      select: {
        transactionRef: true,
        studentId: true,
        courseId: true,
        grossAmount: true,
        netAmount: true,
        paymentMethod: true,
        status: true,
        createdAt: true
      }
    });

    const txnMap = new Map<string, any>();
    for (const txn of instructorTxns) {
      if (txn.studentId && txn.courseId) {
        txnMap.set(`${txn.studentId}_${txn.courseId}`, txn);
      }
    }

    // Format students data
    let studentsData = enrollments.map((enr) => {
      const courseLessons = courseLessonMap.get(enr.courseId) || [];
      const totalLessons = courseLessons.length;
      let completedLessons = 0;
      for (const lId of courseLessons) {
        if (userCompletedLessonsSet.has(`${enr.userId}_${lId}`)) {
          completedLessons++;
        }
      }

      const progressPercentage =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      const userCourseKey = `${enr.userId}_${enr.courseId}`;
      const matchedOrder = orderMap.get(userCourseKey);
      const matchedTxn = txnMap.get(userCourseKey);

      const fee = Number(
        matchedOrder?.total ||
        matchedOrder?.amount ||
        matchedTxn?.grossAmount ||
        enr.course.discountPrice ||
        enr.course.price ||
        0
      );

      return {
        id: enr.id,
        studentId: enr.user.id,
        studentName: enr.user.name || 'Student',
        studentEmail: enr.user.email || '',
        studentPhone: enr.user.phone || null,
        studentAvatar: enr.user.avatar || null,
        courseId: enr.course.id,
        courseTitle: enr.course.title,
        courseSlug: enr.course.slug,
        courseCategory: enr.course.category?.name || 'General',
        coursePrice: Number(enr.course.price || 0),
        amountPaid: fee,
        orderNumber:
          matchedOrder?.orderNumber ||
          (matchedTxn?.transactionRef ? matchedTxn.transactionRef : null),
        paymentMethod: matchedOrder?.provider || matchedTxn?.paymentMethod || 'RAZORPAY',
        paymentStatus: matchedOrder?.status || matchedTxn?.status || (fee > 0 ? 'PAID' : 'FREE'),
        status: enr.status || 'ACTIVE',
        enrolledAt: enr.enrolledAt.toISOString(),
        totalLessons,
        completedLessons,
        progressPercentage
      };
    });

    // Apply search filter if query is present
    if (search) {
      studentsData = studentsData.filter(
        (s) =>
          s.studentName.toLowerCase().includes(search) ||
          s.studentEmail.toLowerCase().includes(search) ||
          s.courseTitle.toLowerCase().includes(search) ||
          (s.orderNumber && s.orderNumber.toLowerCase().includes(search))
      );
    }

    // Compute metrics
    const totalEnrollments = enrollments.length;
    const uniqueStudents = new Set(enrollments.map((e) => e.userId)).size;
    const totalRevenue = studentsData.reduce((sum, s) => sum + s.amountPaid, 0);
    const activeEnrollments = enrollments.filter((e) => e.status === 'ACTIVE').length;
    const completedEnrollments = enrollments.filter((e) => e.status === 'COMPLETED').length;

    // Courses breakdown
    const coursesBreakdown = authoredCourses.map((c) => {
      const enrCount = c._count?.enrollments || 0;
      const unitPrice = Number(c.discountPrice || c.price || 0);
      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        category: c.category?.name || 'Engineering',
        status: c.status,
        price: Number(c.price || 0),
        discountPrice: c.discountPrice ? Number(c.discountPrice) : null,
        enrolledStudents: enrCount,
        grossValue: unitPrice * enrCount
      };
    });

    return NextResponse.json({
      success: true,
      metrics: {
        totalEnrollments,
        totalUniqueStudents: uniqueStudents,
        totalRevenue,
        activeEnrollments,
        completedEnrollments
      },
      students: studentsData,
      coursesBreakdown
    });
  } catch (error: any) {
    console.error('[Instructor Students API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch enrolled students.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    if (!['INSTRUCTOR', 'TEACHER', 'SUPER_ADMIN', 'LMS_ADMIN', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden: Instructor access required.' }, { status: 403 });
    }

    const user: any = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        bankAccount: true,
        coursesAuthored: {
          orderBy: { createdAt: 'desc' },
          include: {
            category: { select: { id: true, name: true } },
            _count: { select: { enrollments: true } }
          }
        },
        instructorPayouts: {
          orderBy: { requestedAt: 'desc' },
          take: 10
        },
        instructorTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 15
        },
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Instructor account not found.' }, { status: 404 });
    }

    const courseIds = user.coursesAuthored.map((c: any) => c.id);

    // Fetch total enrollments count & unique learners count across instructor courses
    const [totalEnrollmentsCount, uniqueStudentsRows, enrollments] = courseIds.length
      ? await Promise.all([
          prisma.enrollment.count({
            where: { courseId: { in: courseIds } }
          }),
          prisma.enrollment.findMany({
            where: { courseId: { in: courseIds } },
            select: { userId: true },
            distinct: ['userId']
          }),
          prisma.enrollment.findMany({
            where: { courseId: { in: courseIds } },
            include: {
              user: { select: { id: true, name: true, email: true, avatar: true } },
              course: { select: { id: true, title: true, price: true, discountPrice: true } }
            },
            orderBy: { enrolledAt: 'desc' },
            take: 25
          })
        ])
      : [0, [], []];

    const totalStudents = uniqueStudentsRows.length;

    // Idempotently sync any course sales into InstructorEarningTransaction if missing
    if (enrollments.length > 0) {
      const existingRefs = new Set(
        user.instructorTransactions.map((t: any) => t.transactionRef)
      );

      for (const enr of enrollments) {
        const ref = `TXN-${enr.id.slice(-8).toUpperCase()}`;
        if (!existingRefs.has(ref)) {
          const gross = Number(enr.course?.discountPrice ?? enr.course?.price ?? 999);
          if (gross > 0) {
            const platformFee = Math.round(gross * 0.15);
            const instructorShare = gross - platformFee;
            const taxDeduction = Math.round(instructorShare * 0.02);
            const netAmount = instructorShare - taxDeduction;

            await prisma.instructorEarningTransaction
              .upsert({
                where: { transactionRef: ref },
                create: {
                  transactionRef: ref,
                  userId: user.id,
                  courseId: enr.courseId,
                  courseTitle: enr.course?.title || 'Course Enrollment',
                  studentId: enr.userId,
                  studentName: enr.user?.name || 'Student',
                  studentEmail: enr.user?.email || '',
                  type: 'COURSE_SALE',
                  grossAmount: gross,
                  platformFee,
                  instructorShare,
                  taxDeduction,
                  netAmount,
                  paymentMethod: 'RAZORPAY',
                  status: 'PAID',
                  createdAt: enr.enrolledAt
                },
                update: {}
              })
              .catch(() => {});
            existingRefs.add(ref);
          }
        }
      }
    }

    // Re-query transactions and payouts for accurate real totals
    const [allTransactions, allPayouts] = await Promise.all([
      prisma.instructorEarningTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.instructorPayout.findMany({
        where: { userId: user.id },
        orderBy: { requestedAt: 'desc' }
      })
    ]);

    // 1. Courses Breakdown (Real DB values)
    const totalCourses = user.coursesAuthored.length;
    const activeCourses = user.coursesAuthored.filter((c: any) => {
      const s = (c.status || '').toUpperCase();
      return s === 'PUBLISHED' || s === 'APPROVED' || c.isPublished === true;
    }).length;
    const pendingApprovalCourses = user.coursesAuthored.filter((c: any) => {
      const s = (c.status || '').toUpperCase();
      return ['IN_REVIEW', 'PENDING', 'UNDER_REVIEW'].includes(s);
    }).length;
    const draftCourses = user.coursesAuthored.filter((c: any) => {
      const s = (c.status || '').toUpperCase();
      return s === 'DRAFT' || (!s && !c.isPublished);
    }).length;
    const inactiveCourses = user.coursesAuthored.filter((c: any) => {
      const s = (c.status || '').toUpperCase();
      return ['ARCHIVED', 'REJECTED', 'INACTIVE', 'DISABLED'].includes(s);
    }).length;

    // 2. Financial Breakdown (Real DB values)
    const totalEarnings = allTransactions
      .filter((t) => t.type === 'COURSE_SALE' && t.status === 'PAID')
      .reduce((sum, t) => sum + Number(t.netAmount || 0), 0);

    const grossEarnings = allTransactions
      .filter((t) => t.type === 'COURSE_SALE' && t.status === 'PAID')
      .reduce((sum, t) => sum + Number(t.grossAmount || 0), 0);

    const pendingEarnings = allTransactions
      .filter((t) => t.type === 'COURSE_SALE' && (t.status === 'PENDING' || t.status === 'PROCESSING'))
      .reduce((sum, t) => sum + Number(t.netAmount || 0), 0);

    const paidAmount = allPayouts
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const pendingPayout = allPayouts
      .filter((p) => ['REQUESTED', 'PENDING', 'APPROVED', 'PROCESSING'].includes(p.status))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const outstandingAmount = Math.max(0, totalEarnings - paidAmount - pendingPayout);

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        avatar: user.avatar || '',
        bio: user.bio || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        country: user.country || 'India',
        pincode: user.pincode || '',
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerifiedAt,
        welcomeEmailStatus: user.welcomeEmailStatus || 'SENT',
        welcomeEmailSentAt: user.welcomeEmailSentAt,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      },
      bankAccount: user.bankAccount
        ? {
            id: user.bankAccount.id,
            accountHolderName: user.bankAccount.accountHolderName,
            bankName: user.bankAccount.bankName,
            accountNumberMasked: user.bankAccount.accountNumberMasked,
            ifscCode: user.bankAccount.ifscCode,
            accountType: user.bankAccount.accountType,
            branchName: user.bankAccount.branchName || '',
            upiId: user.bankAccount.upiId || '',
            panNumber: user.bankAccount.panNumber || '',
            status: user.bankAccount.status,
            rejectionReason: user.bankAccount.rejectionReason || '',
            verifiedByName: user.bankAccount.verifiedByName || '',
            verifiedAt: user.bankAccount.verifiedAt,
            rejectedAt: user.bankAccount.rejectedAt,
            updatedAt: user.bankAccount.updatedAt
          }
        : {
            status: 'NOT_ADDED'
          },
      metrics: {
        // Courses Metrics
        totalCourses,
        activeCourses,
        publishedCourses: activeCourses,
        pendingApprovalCourses,
        draftCourses,
        inactiveCourses,
        // Students & Learners
        totalStudents,
        totalEnrollments: totalEnrollmentsCount,
        // Financial & Payouts Metrics
        totalEarnings,
        grossEarnings,
        pendingEarnings,
        paidAmount,
        outstandingAmount,
        availableBalance: outstandingAmount,
        pendingPayout,
        // Bank Status
        bankAccountStatus: user.bankAccount?.status || 'NOT_ADDED'
      },
      recentCourses: user.coursesAuthored.slice(0, 8),
      recentEnrollments: enrollments.slice(0, 8),
      recentTransactions: allTransactions.slice(0, 10),
      recentPayouts: allPayouts.slice(0, 10),
      notifications: user.notifications
    });
  } catch (err: any) {
    console.error('[Instructor Overview API Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to load instructor overview' }, { status: 500 });
  }
}

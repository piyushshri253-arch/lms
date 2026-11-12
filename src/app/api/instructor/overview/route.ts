import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    if (!['INSTRUCTOR', 'TEACHER', 'REVIEWER', 'AUDITOR', 'SUPER_ADMIN', 'LMS_ADMIN', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden: Instructor access required.' }, { status: 403 });
    }

    const [user, coursesAuthored, allTransactions, allPayouts, notifications] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.id },
        include: { bankAccount: true }
      }),
      prisma.course.findMany({
        where: { instructorId: session.id },
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          _count: { select: { enrollments: true } }
        }
      }),
      prisma.instructorEarningTransaction.findMany({
        where: { userId: session.id },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.instructorPayout.findMany({
        where: { userId: session.id },
        orderBy: { requestedAt: 'desc' },
        take: 30
      }),
      prisma.notification.findMany({
        where: { userId: session.id },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    if (!user) {
      return NextResponse.json({ error: 'Instructor account not found.' }, { status: 404 });
    }

    const courseIds = coursesAuthored.map((c: any) => c.id);

    // Fetch total enrollments count & learners across instructor courses in parallel
    const [totalEnrollmentsCount, enrollments] = courseIds.length
      ? await Promise.all([
          prisma.enrollment.count({
            where: { courseId: { in: courseIds } }
          }),
          prisma.enrollment.findMany({
            where: { courseId: { in: courseIds } },
            include: {
              user: { select: { id: true, name: true, email: true, avatar: true } },
              course: { select: { id: true, title: true, price: true, discountPrice: true } }
            },
            orderBy: { enrolledAt: 'desc' },
            take: 20
          })
        ])
      : [0, []];

    const totalStudents = totalEnrollmentsCount;

    // 1. Courses Breakdown (Real DB values)
    const totalCourses = coursesAuthored.length;
    const activeCourses = coursesAuthored.filter((c: any) => {
      const s = (c.status || '').toUpperCase();
      return s === 'PUBLISHED' || s === 'APPROVED' || c.isPublished === true;
    }).length;
    const pendingApprovalCourses = coursesAuthored.filter((c: any) => {
      const s = (c.status || '').toUpperCase();
      return ['IN_REVIEW', 'PENDING', 'UNDER_REVIEW'].includes(s);
    }).length;
    const draftCourses = coursesAuthored.filter((c: any) => {
      const s = (c.status || '').toUpperCase();
      return s === 'DRAFT' || (!s && !c.isPublished);
    }).length;
    const inactiveCourses = coursesAuthored.filter((c: any) => {
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

    const studentNameById = new Map<string, string>();
    for (const e of enrollments as any[]) {
      if (e.userId && e.user?.name) {
        studentNameById.set(e.userId, e.user.name);
      }
    }
    const sanitizedRecentTransactions = allTransactions.slice(0, 10).map((t: any) => {
      const liveName = t.studentId ? studentNameById.get(t.studentId) : undefined;
      const resolvedName =
        liveName && liveName.trim()
          ? liveName.trim()
          : t.studentName && t.studentName !== 'Student Name'
          ? t.studentName
          : 'Student';
      const { studentEmail: _omittedEmail, ...safeTxn } = t;
      return {
        ...safeTxn,
        studentName: resolvedName
      };
    });

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
      recentCourses: coursesAuthored.slice(0, 8),
      recentEnrollments: enrollments.slice(0, 8),
      recentTransactions: sanitizedRecentTransactions,
      recentPayouts: allPayouts.slice(0, 10),
      notifications: notifications
    });
  } catch (err: any) {
    console.error('[Instructor Overview API Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to load instructor overview' }, { status: 500 });
  }
}

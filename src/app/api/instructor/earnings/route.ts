import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { calculateInstructorPayout } from '@/lib/instructor-payout';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
    if (session.role !== 'INSTRUCTOR' && session.role !== 'SUPER_ADMIN' && session.role !== 'LMS_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only Instructors can access earnings and transactions.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const status = searchParams.get('status') || 'ALL';
    const courseId = searchParams.get('courseId') || 'ALL';
    const type = searchParams.get('type') || 'ALL';
    const fromDate = searchParams.get('from') || '';
    const toDate = searchParams.get('to') || '';
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(50, Math.max(5, Number(searchParams.get('limit') || 15)));

    const where: any = { userId: session.id };

    if (status && status !== 'ALL') {
      where.status = status.toUpperCase();
    }
    if (courseId && courseId !== 'ALL') {
      where.courseId = courseId;
    }
    if (type && type !== 'ALL') {
      where.type = type.toUpperCase();
    }
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Synchronize instructor course sales with accurate financial model:
    // Student: Base Price + 18% GST (e.g. 118)
    // GTF 2%: 2.36
    // Net Pool: 97.64
    // Instructor 60%: 58.58
    // Platform 40%: 39.06
    // TDS 2%: 1.17
    // Net Payout: 57.41
    const enrollments = await prisma.enrollment.findMany({
      where: {
        course: { instructorId: session.id }
      },
      include: {
        course: true,
        user: true
      }
    });

    for (const enr of enrollments) {
      const ref = `TXN-${enr.id.slice(-8).toUpperCase()}`;
      const basePrice = Number(enr.course?.discountPrice ?? enr.course?.price ?? 100);
      if (basePrice > 0) {
        const b = calculateInstructorPayout(basePrice);

        await prisma.instructorEarningTransaction
          .upsert({
            where: { transactionRef: ref },
            create: {
              transactionRef: ref,
              userId: session.id,
              courseId: enr.courseId,
              courseTitle: enr.course?.title || 'Course Enrollment',
              studentId: enr.userId,
              studentName: enr.user?.name || 'Student',
              studentEmail: enr.user?.email || '',
              type: 'COURSE_SALE',
              grossAmount: b.studentTotal,
              platformFee: b.platformShare,
              instructorShare: b.instructorGross,
              taxDeduction: b.tdsAmount,
              netAmount: b.netInstructorPayout,
              paymentMethod: 'MOCK_SIMULATOR',
              status: 'PAID',
              notes: JSON.stringify(b),
              createdAt: enr.enrolledAt
            },
            update: {
              courseTitle: enr.course?.title || 'Course Enrollment',
              studentName: enr.user?.name || 'Student',
              grossAmount: b.studentTotal,
              platformFee: b.platformShare,
              instructorShare: b.instructorGross,
              taxDeduction: b.tdsAmount,
              netAmount: b.netInstructorPayout,
              notes: JSON.stringify(b)
            }
          })
          .catch(() => {});
      }
    }

    const allForUser = await prisma.instructorEarningTransaction.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: 'desc' }
    });

    const payouts = await prisma.instructorPayout.findMany({
      where: { userId: session.id }
    });

    const courses = await prisma.course.findMany({
      where: { instructorId: session.id },
      select: { id: true, title: true }
    });

    // Calculate summary metrics
    const paidCourseSales = allForUser.filter(
      (t) => t.type === 'COURSE_SALE' && t.status === 'PAID'
    );

    const extractBasePrice = (t: any): number => {
      if (t.notes) {
        try {
          const parsed = JSON.parse(t.notes);
          if (parsed && typeof parsed.basePrice === 'number' && !isNaN(parsed.basePrice)) {
            return Number(parsed.basePrice);
          }
        } catch {}
      }
      return Number((Number(t.grossAmount || 0) / 1.18).toFixed(2));
    };

    const totalGrossSales = Number(
      paidCourseSales.reduce((s, t) => s + Number(t.grossAmount || 0), 0).toFixed(2)
    );

    const totalNetCourseValue = Number(
      paidCourseSales.reduce((s, t) => s + extractBasePrice(t), 0).toFixed(2)
    );

    const totalPlatformFees = Number(
      paidCourseSales.reduce((s, t) => s + Number(t.platformFee || 0), 0).toFixed(2)
    );

    const totalTaxDeductions = Number(
      paidCourseSales.reduce((s, t) => s + Number(t.taxDeduction || 0), 0).toFixed(2)
    );

    const totalNetEarnings = Number(
      paidCourseSales.reduce((s, t) => s + Number(t.netAmount || 0), 0).toFixed(2)
    );

    const pendingClearance = allForUser
      .filter((t) => t.type === 'COURSE_SALE' && (t.status === 'PENDING' || t.status === 'PROCESSING'))
      .reduce((s, t) => s + Number(t.netAmount || 0), 0);

    const totalPaidOut = payouts
      .filter((p) => p.status === 'PAID')
      .reduce((s, p) => s + Number(p.amount || 0), 0);

    const pendingPayoutAmount = payouts
      .filter((p) => ['REQUESTED', 'PENDING', 'APPROVED', 'PROCESSING'].includes(p.status))
      .reduce((s, p) => s + Number(p.amount || 0), 0);

    const availableBalance = Math.max(0, totalNetEarnings - totalPaidOut - pendingPayoutAmount);

    // Filter transactions for table and resolve real student names (strip student email ID)
    const rawFiltered = await prisma.instructorEarningTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const studentIds = Array.from(
      new Set(rawFiltered.map((t) => t.studentId).filter((id): id is string => Boolean(id)))
    );
    const studentUsers =
      studentIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: studentIds } },
            select: { id: true, name: true }
          })
        : [];
    const studentNameMap = new Map(studentUsers.map((u) => [u.id, u.name]));

    let filtered = rawFiltered.map((t) => {
      const liveName = t.studentId ? studentNameMap.get(t.studentId) : undefined;
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

    if (search) {
      filtered = filtered.filter(
        (t) =>
          t.transactionRef.toLowerCase().includes(search) ||
          (t.courseTitle || '').toLowerCase().includes(search) ||
          (t.studentName || '').toLowerCase().includes(search)
      );
    }

    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return NextResponse.json(
      {
        success: true,
        summary: {
          totalGrossSales,
          totalNetCourseValue,
          totalPlatformFees,
          totalTaxDeductions,
          totalNetEarnings,
          pendingClearance,
          availableBalance,
          totalPaidOut,
          pendingPayoutAmount
        },
        courses,
        transactions: paginated,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages
        }
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load earnings.' }, { status: 500 });
  }
}

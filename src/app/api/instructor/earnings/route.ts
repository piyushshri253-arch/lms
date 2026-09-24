import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

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
    const totalGrossSales = allForUser
      .filter((t) => t.type === 'COURSE_SALE' && t.status === 'PAID')
      .reduce((s, t) => s + Number(t.grossAmount || 0), 0);

    const totalPlatformFees = allForUser
      .filter((t) => t.type === 'COURSE_SALE' && t.status === 'PAID')
      .reduce((s, t) => s + Number(t.platformFee || 0), 0);

    const totalNetEarnings = allForUser
      .filter((t) => t.type === 'COURSE_SALE' && t.status === 'PAID')
      .reduce((s, t) => s + Number(t.netAmount || 0), 0);

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

    // Filter transactions for table
    let filtered = await prisma.instructorEarningTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    if (search) {
      filtered = filtered.filter(
        (t) =>
          t.transactionRef.toLowerCase().includes(search) ||
          (t.courseTitle || '').toLowerCase().includes(search) ||
          (t.studentName || '').toLowerCase().includes(search) ||
          (t.studentEmail || '').toLowerCase().includes(search)
      );
    }

    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      success: true,
      summary: {
        totalGrossSales,
        totalPlatformFees,
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
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load earnings.' }, { status: 500 });
  }
}

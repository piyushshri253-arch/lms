import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30D'; // TODAY, 7D, 30D, 3M, 6M, 1Y, ALL

    const now = new Date();
    let startDate = new Date();

    if (range === 'TODAY') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === '7D') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === '30D') {
      startDate.setDate(now.getDate() - 30);
    } else if (range === '3M') {
      startDate.setMonth(now.getMonth() - 3);
    } else if (range === '6M') {
      startDate.setMonth(now.getMonth() - 6);
    } else if (range === '1Y') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else {
      startDate = new Date(0); // ALL
    }

    const [orders, enrollments, refunds] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: startDate } },
        select: { amount: true, status: true, createdAt: true },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.enrollment.findMany({
        where: { enrolledAt: { gte: startDate } },
        select: { enrolledAt: true },
        orderBy: { enrolledAt: 'asc' }
      }),
      prisma.order.findMany({
        where: { status: 'REFUNDED', createdAt: { gte: startDate } },
        select: { amount: true, createdAt: true },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    // Build timeline buckets (7 data points for smooth charting)
    const pointsCount = range === '7D' ? 7 : range === '30D' ? 10 : 6;
    const timeStep = (now.getTime() - startDate.getTime()) / pointsCount;

    const chartData = [];
    for (let i = 0; i < pointsCount; i++) {
      const bucketStart = new Date(startDate.getTime() + i * timeStep);
      const bucketEnd = new Date(startDate.getTime() + (i + 1) * timeStep);

      const bucketOrders = orders.filter(
        (o) => new Date(o.createdAt) >= bucketStart && new Date(o.createdAt) < bucketEnd
      );
      const bucketSuccessful = bucketOrders.filter((o) => o.status === 'SUCCESS');
      const bucketRevenue = bucketSuccessful.reduce((sum, o) => sum + o.amount, 0);

      const bucketEnrollments = enrollments.filter(
        (e) => new Date(e.enrolledAt) >= bucketStart && new Date(e.enrolledAt) < bucketEnd
      );

      const bucketRefunds = refunds.filter(
        (r) => new Date(r.createdAt) >= bucketStart && new Date(r.createdAt) < bucketEnd
      );

      const label =
        range === 'TODAY'
          ? `${bucketStart.getHours()}:00`
          : `${bucketStart.getMonth() + 1}/${bucketStart.getDate()}`;

      chartData.push({
        label,
        date: bucketStart.toISOString(),
        revenue: Math.round(bucketRevenue * 100) / 100,
        orders: bucketSuccessful.length,
        enrollments: bucketEnrollments.length,
        refunds: bucketRefunds.length
      });
    }

    const totalRevenueInRange = orders
      .filter((o) => o.status === 'SUCCESS')
      .reduce((sum, o) => sum + o.amount, 0);

    return NextResponse.json({
      range,
      totalRevenue: Math.round(totalRevenueInRange * 100) / 100,
      totalOrders: orders.filter((o) => o.status === 'SUCCESS').length,
      totalEnrollments: enrollments.length,
      totalRefunds: refunds.length,
      chartData
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const orgId = user.organizationId;
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    const tenantFilter: any = {};
    if (user.role !== 'SUPER_ADMIN' && orgId) {
      tenantFilter.organizationId = orgId;
    }

    const now = new Date();
    let startDate = new Date();
    if (range === 'today') startDate.setHours(0, 0, 0, 0);
    else if (range === '7d') startDate.setDate(now.getDate() - 7);
    else if (range === '30d') startDate.setDate(now.getDate() - 30);
    else if (range === '90d') startDate.setDate(now.getDate() - 90);
    else if (range === 'this_year') startDate = new Date(now.getFullYear(), 0, 1);
    else startDate.setDate(now.getDate() - 30);

    const paidOrders = await prisma.order.findMany({
      where: {
        ...tenantFilter,
        status: { in: ['PAID', 'SUCCESS'] },
        createdAt: { gte: startDate }
      },
      include: {
        items: { include: { product: true } },
        course: true,
        refunds: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const refunds = await prisma.refund.findMany({
      where: {
        ...tenantFilter,
        status: 'COMPLETED',
        createdAt: { gte: startDate }
      }
    });

    let grossRevenue = 0;
    let discountsTotal = 0;
    let taxesTotal = 0;

    paidOrders.forEach((o) => {
      grossRevenue += o.total || o.amount;
      discountsTotal += o.discountAmount || 0;
      taxesTotal += o.tax || 0;
    });

    const refundsTotal = refunds.reduce((sum, r) => sum + r.amount, 0);
    const paymentFeesEstimated = Number((grossRevenue * 0.02).toFixed(2));
    const netRevenue = Math.max(0, grossRevenue - refundsTotal - paymentFeesEstimated);
    const totalTransactions = paidOrders.length;
    const averageOrderValue = totalTransactions > 0 ? Number((grossRevenue / totalTransactions).toFixed(2)) : 0;

    // Breakdown by Product Type
    const typeBreakdown: { [key: string]: { revenue: number; count: number } } = {
      COURSE: { revenue: 0, count: 0 },
      BUNDLE: { revenue: 0, count: 0 },
      SUBSCRIPTION: { revenue: 0, count: 0 }
    };

    paidOrders.forEach((o) => {
      const orderType = o.items[0]?.product?.type || (o.courseId ? 'COURSE' : 'COURSE');
      if (!typeBreakdown[orderType]) {
        typeBreakdown[orderType] = { revenue: 0, count: 0 };
      }
      typeBreakdown[orderType].revenue += o.total || o.amount;
      typeBreakdown[orderType].count += 1;
    });

    return NextResponse.json({
      summary: {
        grossRevenue: Number(grossRevenue.toFixed(2)),
        discounts: Number(discountsTotal.toFixed(2)),
        refunds: Number(refundsTotal.toFixed(2)),
        paymentFees: paymentFeesEstimated,
        taxes: Number(taxesTotal.toFixed(2)),
        netRevenue: Number(netRevenue.toFixed(2)),
        totalTransactions,
        averageOrderValue
      },
      productTypeBreakdown: typeBreakdown,
      transactions: paidOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        amount: o.total || o.amount,
        discount: o.discountAmount,
        tax: o.tax,
        createdAt: o.createdAt
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

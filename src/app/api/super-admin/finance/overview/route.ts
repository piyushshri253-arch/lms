import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDateFilterWhere, ensureLedgerInitialized, DateFilter } from '@/lib/finance-service';
import { calculateInstructorPayout } from '@/lib/payout-calculator';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    await ensureLedgerInitialized();

    const { searchParams } = new URL(req.url);
    const range = (searchParams.get('range') || 'all') as DateFilter['range'];
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const whereCreated = getDateFilterWhere({ range, startDate, endDate });

    // 1. Fetch completed orders in date range
    const orders = await prisma.order.findMany({
      where: {
        status: 'PAID',
        ...whereCreated
      },
      include: {
        course: { select: { id: true, title: true, instructorId: true } }
      }
    });

    // 2. Fetch refunds in date range
    const refunds = await prisma.refund.findMany({
      where: {
        ...whereCreated
      }
    });

    // 3. Fetch earnings transactions
    const earnings = await prisma.instructorEarningTransaction.findMany({
      where: {
        ...whereCreated
      }
    });

    // 4. Fetch instructor payouts
    const payouts = await prisma.instructorPayout.findMany({
      where: {
        ...whereCreated
      }
    });

    // 5. Failed transactions / payments
    const failedPayments = await prisma.payment.count({
      where: {
        status: 'FAILED',
        ...whereCreated
      }
    });

    // Calculate aggregations
    let totalGrossSales = 0;
    let totalTaxable = 0;
    let totalGst = 0;
    let totalGatewayFees = 0;
    let totalInstructorGross = 0;
    let totalTds = 0;
    let totalNetInstructorEarnings = 0;
    let totalPlatformRevenue = 0;

    for (const o of orders) {
      const gross = o.total || o.amount;
      const basePrice = o.subtotal || gross / 1.18;
      const calc = calculateInstructorPayout(basePrice);

      totalGrossSales += gross;
      totalTaxable += calc.basePrice;
      totalGst += calc.gstAmount;
      totalGatewayFees += calc.gtfAmount;
      totalInstructorGross += calc.instructorGross;
      totalTds += calc.tdsAmount;
      totalNetInstructorEarnings += calc.netInstructorPayout;
      totalPlatformRevenue += calc.platformShare;
    }

    const totalRefundsAmount = refunds
      .filter((r) => r.status === 'COMPLETED' || r.status === 'REFUNDED')
      .reduce((acc, r) => acc + (r.amount || 0), 0);

    const netSales = Math.max(0, totalGrossSales - totalRefundsAmount);

    const payoutsMade = payouts
      .filter((p) => p.status === 'PAID')
      .reduce((acc, p) => acc + (p.netAmount || p.amount || 0), 0);

    const pendingPayouts = payouts
      .filter((p) => ['REQUESTED', 'PENDING', 'APPROVED', 'PROCESSING'].includes(p.status))
      .reduce((acc, p) => acc + (p.netAmount || p.amount || 0), 0);

    // Recent activity for overview stream
    const recentLedgers = await prisma.financialLedgerEntry.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: {
        kpi: {
          totalGrossSales: Number(totalGrossSales.toFixed(2)),
          successfulPaymentsCount: orders.length,
          totalRefunds: Number(totalRefundsAmount.toFixed(2)),
          refundsCount: refunds.length,
          netSales: Number(netSales.toFixed(2)),
          instructorGrossEarnings: Number(totalInstructorGross.toFixed(2)),
          instructorPaymentsMade: Number(payoutsMade.toFixed(2)),
          pendingInstructorPayments: Number(pendingPayouts.toFixed(2)),
          totalTdsDeducted: Number(totalTds.toFixed(2)),
          totalGstCollected: Number(totalGst.toFixed(2)),
          totalGatewayFees: Number(totalGatewayFees.toFixed(2)),
          netPlatformRevenue: Number(totalPlatformRevenue.toFixed(2)),
          failedTransactionsCount: failedPayments
        },
        recentActivity: recentLedgers
      }
    });
  } catch (error: any) {
    console.error('Error fetching financial overview:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch financial overview' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}

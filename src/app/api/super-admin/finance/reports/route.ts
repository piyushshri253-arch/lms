import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateInstructorPayout } from '@/lib/payout-calculator';
import { getDateFilterWhere, DateFilter } from '@/lib/finance-service';

export async function GET(req: NextRequest) {
  try {
    await requireFinanceAdmin();

    const { searchParams } = new URL(req.url);
    const range = (searchParams.get('range') || 'all') as DateFilter['range'];
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const whereCreated = getDateFilterWhere({ range, startDate, endDate });

    const orders = await prisma.order.findMany({
      where: {
        status: 'PAID',
        ...whereCreated
      },
      include: {
        course: true
      }
    });

    const refunds = await prisma.refund.findMany({
      where: {
        status: 'REFUNDED',
        ...whereCreated
      }
    });

    const payouts = await prisma.instructorPayout.findMany({
      where: {
        status: 'PAID',
        ...whereCreated
      }
    });

    let totalGrossSales = 0;
    let totalTaxable = 0;
    let totalGst = 0;
    let totalGatewayFee = 0;
    let totalInstructorShare = 0;
    let totalTds = 0;
    let totalPlatformRevenue = 0;

    orders.forEach((o) => {
      const gross = o.total || o.amount;
      const basePrice = o.subtotal || gross / 1.18;
      const calc = calculateInstructorPayout(basePrice);

      totalGrossSales += gross;
      totalTaxable += calc.basePrice;
      totalGst += calc.gstAmount;
      totalGatewayFee += calc.gtfAmount;
      totalInstructorShare += calc.instructorGross;
      totalTds += calc.tdsAmount;
      totalPlatformRevenue += calc.platformShare;
    });

    const totalRefunds = refunds.reduce((sum, r) => sum + r.amount, 0);
    const netSales = Math.max(0, totalGrossSales - totalRefunds);
    const totalPayoutsPaid = payouts.reduce((sum, p) => sum + (p.netAmount || p.amount || 0), 0);

    const netOperatingProfit = totalPlatformRevenue - (totalRefunds * 0.4);

    const profitAndLoss = {
      grossCourseRevenue: Number(totalGrossSales.toFixed(2)),
      lessRefunds: Number(totalRefunds.toFixed(2)),
      netCourseSales: Number(netSales.toFixed(2)),
      lessGstLiability: Number(totalGst.toFixed(2)),
      netTaxableRevenue: Number(totalTaxable.toFixed(2)),
      operatingExpenses: {
        paymentGatewayFees: Number(totalGatewayFee.toFixed(2)),
        instructorShareAccrued: Number(totalInstructorShare.toFixed(2)),
        instructorPayoutsDisbursed: Number(totalPayoutsPaid.toFixed(2))
      },
      taxCompliance: {
        tdsDeducted: Number(totalTds.toFixed(2)),
        gstLiability: Number(totalGst.toFixed(2))
      },
      netPlatformOperatingSurplus: Number(netOperatingProfit.toFixed(2)),
      netMarginPercent: totalGrossSales > 0 ? Number(((netOperatingProfit / totalGrossSales) * 100).toFixed(1)) : 0
    };

    return NextResponse.json({
      success: true,
      report: profitAndLoss
    });
  } catch (error: any) {
    console.error('Error generating financial reports:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Report generation failed' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}

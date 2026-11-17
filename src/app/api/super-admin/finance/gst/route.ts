import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateInstructorPayout } from '@/lib/payout-calculator';
import { getDateFilterWhere, DateFilter } from '@/lib/finance-service';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(req.url);
    const range = (searchParams.get('range') || 'all') as DateFilter['range'];
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const whereCreated = getDateFilterWhere({ range, startDate, endDate });

    // Fetch successful orders with courses and users
    const orders = await prisma.order.findMany({
      where: {
        status: 'PAID',
        ...whereCreated
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true, slug: true } },
        payments: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch refunds
    const refunds = await prisma.refund.findMany({
      where: {
        status: 'REFUNDED',
        ...whereCreated
      },
      include: {
        order: true
      }
    });

    let totalTaxableValue = 0;
    let totalGstCollected = 0;
    let totalCgst = 0; // 9% for intra-state
    let totalSgst = 0; // 9% for intra-state
    let totalIgst = 0; // 18% for inter-state
    let totalGatewayFeeGst = 0; // 18% on payment gateway charges

    const transactionBreakdown = orders.map((o) => {
      const gross = o.total || o.amount;
      const basePrice = o.subtotal || gross / 1.18;
      const calc = calculateInstructorPayout(basePrice);

      totalTaxableValue += calc.basePrice;
      totalGstCollected += calc.gstAmount;

      const cgst = Number((calc.gstAmount / 2).toFixed(2));
      const sgst = Number((calc.gstAmount / 2).toFixed(2));
      totalCgst += cgst;
      totalSgst += sgst;

      const gtfGst = Number(((calc.gtfAmount * 18) / 100).toFixed(2));
      totalGatewayFeeGst += gtfGst;

      return {
        orderId: o.id,
        invoiceNumber: o.invoiceNumber || o.orderNumber || 'INV-' + o.id.slice(-6).toUpperCase(),
        date: o.createdAt,
        studentName: o.user?.name || 'N/A',
        courseTitle: o.course?.title || 'Course Access',
        taxableValue: calc.basePrice,
        gstRate: '18%',
        cgst,
        sgst,
        totalGst: calc.gstAmount,
        grossTotal: gross,
        gatewayFeeGst: gtfGst
      };
    });

    // Calculate GST adjustment from refunds
    let gstRefundAdjustment = 0;
    refunds.forEach((r) => {
      const baseRefund = r.amount / 1.18;
      const reversedGst = Number((r.amount - baseRefund).toFixed(2));
      gstRefundAdjustment += reversedGst;
    });

    const netGstLiability = Math.max(0, totalGstCollected - gstRefundAdjustment);

    // Monthly aggregates
    const monthsMap: Record<string, { month: string; taxable: number; gst: number; refunds: number }> = {};
    orders.forEach((o) => {
      const date = new Date(o.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const gross = o.total || o.amount;
      const base = o.subtotal || gross / 1.18;
      const gst = gross - base;

      if (!monthsMap[key]) {
        monthsMap[key] = {
          month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
          taxable: 0,
          gst: 0,
          refunds: 0
        };
      }
      monthsMap[key].taxable += base;
      monthsMap[key].gst += gst;
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalTaxableValue: Number(totalTaxableValue.toFixed(2)),
          totalGstCollected: Number(totalGstCollected.toFixed(2)),
          cgst: Number(totalCgst.toFixed(2)),
          sgst: Number(totalSgst.toFixed(2)),
          igst: Number(totalIgst.toFixed(2)),
          gstRefundAdjustment: Number(gstRefundAdjustment.toFixed(2)),
          netGstLiability: Number(netGstLiability.toFixed(2)),
          gatewayFeeGst: Number(totalGatewayFeeGst.toFixed(2))
        },
        monthlyReports: Object.values(monthsMap),
        transactions: transactionBreakdown
      }
    });
  } catch (error: any) {
    console.error('Error fetching GST data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch GST data' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}

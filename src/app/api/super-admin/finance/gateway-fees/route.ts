import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateInstructorPayout } from '@/lib/payout-calculator';

export async function GET(req: NextRequest) {
  try {
    await requireFinanceAdmin();

    const orders = await prisma.order.findMany({
      where: { status: 'PAID' },
      include: {
        user: { select: { name: true, email: true } },
        course: {
          select: {
            id: true,
            title: true,
            instructor: { select: { id: true, name: true } }
          }
        },
        payments: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    let totalGrossSettled = 0;
    let totalGatewayFee = 0;
    let totalGstOnFee = 0;
    let totalNetSettlement = 0;

    const gatewayBreakdown: Record<string, { gateway: string; count: number; volume: number; fees: number }> = {};

    const transactions = orders.map((o) => {
      const gross = o.total || o.amount;
      const basePrice = o.subtotal || gross / 1.18;
      const calc = calculateInstructorPayout(basePrice);
      const latestPayment = o.payments[0];

      const fee = calc.gtfAmount; // 2%
      const feeGst = Number(((fee * 18) / 100).toFixed(2)); // 18% GST on 2% fee
      const netSettled = Number((gross - fee - feeGst).toFixed(2));

      totalGrossSettled += gross;
      totalGatewayFee += fee;
      totalGstOnFee += feeGst;
      totalNetSettlement += netSettled;

      const gwName = o.provider || latestPayment?.provider || 'RAZORPAY';
      if (!gatewayBreakdown[gwName]) {
        gatewayBreakdown[gwName] = { gateway: gwName, count: 0, volume: 0, fees: 0 };
      }
      gatewayBreakdown[gwName].count += 1;
      gatewayBreakdown[gwName].volume += gross;
      gatewayBreakdown[gwName].fees += fee;

      // Settlement date is typically T+2 days from payment date
      const payDate = new Date(o.createdAt);
      const settlementDate = new Date(payDate.getTime() + 2 * 24 * 60 * 60 * 1000);

      return {
        transactionId: o.transactionId || o.providerPaymentId || latestPayment?.providerPaymentId || 'TXN-' + o.id.slice(-8).toUpperCase(),
        gatewayName: gwName,
        courseTitle: o.course?.title || 'Course Access',
        courseId: o.course?.id,
        instructorName: o.course?.instructor?.name || 'Platform Team',
        studentName: o.user?.name || o.user?.email || 'Student',
        grossAmount: gross,
        gatewayFee: fee,
        gstOnFee: feeGst,
        totalDeducted: Number((fee + feeGst).toFixed(2)),
        netSettlement: netSettled,
        settlementDate: settlementDate.toISOString(),
        settlementStatus: payDate < new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) ? 'SETTLED' : 'PROCESSING',
        reconciled: true
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalGrossSettled: Number(totalGrossSettled.toFixed(2)),
          totalGatewayFee: Number(totalGatewayFee.toFixed(2)),
          totalGstOnFee: Number(totalGstOnFee.toFixed(2)),
          totalNetSettlement: Number(totalNetSettlement.toFixed(2)),
          averageFeeRate: '2.00%'
        },
        gatewayBreakdown: Object.values(gatewayBreakdown),
        transactions
      }
    });
  } catch (error: any) {
    console.error('Error fetching gateway fees:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch gateway fee records' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}

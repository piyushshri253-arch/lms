import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateInstructorPayout } from '@/lib/payout-calculator';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase() || '';

    // Fetch instructors with their bank accounts, courses authored, and payouts
    const instructors = await prisma.user.findMany({
      where: {
        role: 'INSTRUCTOR',
        OR: search
          ? [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } }
            ]
          : undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        status: true,
        createdAt: true,
        bankAccount: {
          select: {
            id: true,
            accountHolderName: true,
            bankName: true,
            accountNumberMasked: true,
            ifscCode: true,
            upiId: true,
            panNumber: true,
            status: true
          }
        },
        instructorPayouts: {
          orderBy: { requestedAt: 'desc' }
        },
        instructorTransactions: {
          orderBy: { createdAt: 'desc' }
        },
        coursesAuthored: {
          select: {
            id: true,
            title: true,
            price: true,
            status: true,
            orders: {
              where: { status: 'PAID' },
              select: {
                id: true,
                total: true,
                amount: true,
                subtotal: true,
                createdAt: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const results = instructors.map((inst) => {
      let totalSold = 0;
      let grossEarnings = 0;
      let totalTds = 0;
      let totalGtf = 0;
      let netEarnings = 0;

      // Calculate from actual orders across authored courses
      inst.coursesAuthored.forEach((c) => {
        c.orders.forEach((o) => {
          totalSold += 1;
          const gross = o.total || o.amount;
          const basePrice = o.subtotal || gross / 1.18;
          const calc = calculateInstructorPayout(basePrice);

          grossEarnings += calc.instructorGross;
          totalTds += calc.tdsAmount;
          totalGtf += calc.gtfAmount * 0.6; // proportional allocation
          netEarnings += calc.netInstructorPayout;
        });
      });

      // Factor in earning transactions if recorded separately
      if (inst.instructorTransactions.length > 0 && totalSold === 0) {
        inst.instructorTransactions.forEach((e) => {
          totalSold += 1;
          grossEarnings += e.instructorShare;
          totalTds += e.taxDeduction;
          netEarnings += e.netAmount;
        });
      }

      const totalPaid = inst.instructorPayouts
        .filter((p) => p.status === 'PAID')
        .reduce((sum, p) => sum + (p.netAmount || p.amount || 0), 0);

      const pendingPayable = Math.max(0, netEarnings - totalPaid);

      const lastPaid = inst.instructorPayouts.find((p) => p.status === 'PAID');

      return {
        id: inst.id,
        name: inst.name || 'Unnamed Faculty',
        email: inst.email,
        phone: inst.phone || 'N/A',
        avatar: inst.avatar,
        status: inst.status,
        totalCourses: inst.coursesAuthored.length,
        totalCoursesSold: totalSold,
        grossEarnings: Number(grossEarnings.toFixed(2)),
        refundAdjustments: 0.0,
        tdsDeducted: Number(totalTds.toFixed(2)),
        gatewayFeeAllocation: Number(totalGtf.toFixed(2)),
        netEarnings: Number(netEarnings.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        pendingPayable: Number(pendingPayable.toFixed(2)),
        bankVerificationStatus: inst.bankAccount?.status || 'NOT_ADDED',
        bankAccount: inst.bankAccount,
        lastPaymentDate: lastPaid?.processedAt || lastPaid?.createdAt || null,
        courses: inst.coursesAuthored.map((c) => ({
          id: c.id,
          title: c.title,
          price: c.price,
          soldCount: c.orders.length
        })),
        payouts: inst.instructorPayouts
      };
    });

    return NextResponse.json({
      success: true,
      instructors: results
    });
  } catch (error: any) {
    console.error('Error fetching instructors finance:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch instructors' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}

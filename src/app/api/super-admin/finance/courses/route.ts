import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateInstructorPayout } from '@/lib/payout-calculator';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase() || '';

    const courses = await prisma.course.findMany({
      where: search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
              { instructor: { name: { contains: search, mode: 'insensitive' } } }
            ]
          }
        : undefined,
      include: {
        instructor: {
          select: { id: true, name: true, email: true }
        },
        category: {
          select: { id: true, name: true }
        },
        enrollments: {
          select: { id: true }
        },
        orders: {
          include: {
            payments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const results = courses.map((c) => {
      const successfulOrders = c.orders.filter((o) => o.status === 'PAID');
      const refundedOrders = c.orders.filter((o) => o.status === 'REFUNDED');

      let grossSales = 0;
      let totalDiscount = 0;
      let taxableValue = 0;
      let totalGst = 0;
      let gatewayFees = 0;
      let instructorShare = 0;
      let tdsDeducted = 0;
      let netInstructorEarnings = 0;
      let platformRevenue = 0;

      successfulOrders.forEach((o) => {
        const gross = o.total || o.amount;
        const basePrice = o.subtotal || gross / 1.18;
        const calc = calculateInstructorPayout(basePrice);

        grossSales += gross;
        totalDiscount += o.discount || 0;
        taxableValue += calc.basePrice;
        totalGst += calc.gstAmount;
        gatewayFees += calc.gtfAmount;
        instructorShare += calc.instructorGross;
        tdsDeducted += calc.tdsAmount;
        netInstructorEarnings += calc.netInstructorPayout;
        platformRevenue += calc.platformShare;
      });

      return {
        id: c.id,
        courseName: c.title,
        courseSlug: c.slug,
        category: c.category?.name || 'General',
        instructorId: c.instructor?.id || 'N/A',
        instructorName: c.instructor?.name || 'Unassigned',
        instructorEmail: c.instructor?.email || '',
        price: c.price,
        totalEnrollments: c.enrollments.length,
        successfulSales: successfulOrders.length,
        refundedOrders: refundedOrders.length,
        grossSales: Number(grossSales.toFixed(2)),
        discounts: Number(totalDiscount.toFixed(2)),
        taxableValue: Number(taxableValue.toFixed(2)),
        gst: Number(totalGst.toFixed(2)),
        gatewayFees: Number(gatewayFees.toFixed(2)),
        instructorShare: Number(instructorShare.toFixed(2)),
        tds: Number(tdsDeducted.toFixed(2)),
        netInstructorEarnings: Number(netInstructorEarnings.toFixed(2)),
        platformRevenue: Number(platformRevenue.toFixed(2)),
        status: c.status
      };
    });

    return NextResponse.json({
      success: true,
      courses: results
    });
  } catch (error: any) {
    console.error('Error fetching courses finance:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch courses' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}

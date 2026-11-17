import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateInstructorPayout } from '@/lib/payout-calculator';
import { getDateFilterWhere, DateFilter } from '@/lib/finance-service';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const courseId = searchParams.get('courseId') || undefined;
    const range = (searchParams.get('range') || 'all') as DateFilter['range'];
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '50', 10));
    const skip = (page - 1) * limit;

    const dateWhere = getDateFilterWhere({ range, startDate, endDate });

    const where: any = {
      status: 'PAID',
      ...dateWhere
    };

    if (courseId) {
      where.courseId = courseId;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { transactionId: { contains: search, mode: 'insensitive' } },
        { providerPaymentId: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { course: { title: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [totalCount, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          course: {
            select: {
              id: true,
              title: true,
              instructor: { select: { id: true, name: true, email: true } }
            }
          },
          payments: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    const sales = orders.map((o) => {
      const gross = o.total || o.amount;
      const basePrice = o.subtotal || gross / 1.18;
      const calc = calculateInstructorPayout(basePrice);
      const latestPayment = o.payments[0];

      return {
        id: o.id,
        orderNumber: o.orderNumber || o.id,
        transactionId: o.transactionId || o.providerPaymentId || latestPayment?.providerPaymentId || 'TXN-' + o.id.slice(-8).toUpperCase(),
        studentId: o.user?.id,
        studentName: o.user?.name || 'Student',
        studentEmail: o.user?.email || 'N/A',
        studentPhone: o.user?.phone || 'N/A',
        courseId: o.course?.id || o.courseId,
        courseTitle: o.course?.title || 'Direct Enrollment',
        instructorId: o.course?.instructor?.id || 'N/A',
        instructorName: o.course?.instructor?.name || 'Platform Team',
        coursePrice: calc.basePrice,
        discount: o.discount || 0,
        taxableValue: calc.basePrice,
        gst: calc.gstAmount,
        gatewayFee: calc.gtfAmount,
        totalPaid: gross,
        paymentMethod: o.provider || latestPayment?.provider || 'RAZORPAY',
        purchaseDate: o.createdAt,
        paymentStatus: o.status
      };
    });

    return NextResponse.json({
      success: true,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      sales
    });
  } catch (error: any) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch sales' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}

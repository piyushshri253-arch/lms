import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLedgerEntry } from '@/lib/finance-service';
import { calculateInstructorPayout } from '@/lib/payout-calculator';

export async function GET(req: NextRequest) {
  try {
    await requireFinanceAdmin();

    const refunds = await prisma.refund.findMany({
      include: {
        order: {
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
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = refunds.map((r) => {
      const gross = r.order?.total || r.order?.amount || r.amount;
      const basePrice = r.order?.subtotal || gross / 1.18;
      const calc = calculateInstructorPayout(basePrice);
      const latestPayment = r.order?.payments?.[0];

      return {
        id: r.id,
        refundNumber: 'REF-' + r.id.slice(-6).toUpperCase(),
        orderId: r.orderId,
        orderNumber: r.order?.orderNumber || r.orderId,
        studentName: r.order?.user?.name || 'N/A',
        studentEmail: r.order?.user?.email || 'N/A',
        studentPhone: r.order?.user?.phone || 'N/A',
        courseTitle: r.order?.course?.title || 'Course Package',
        courseId: r.order?.course?.id,
        instructorName: r.order?.course?.instructor?.name || 'Faculty',
        instructorId: r.order?.course?.instructor?.id,
        originalPayment: gross,
        refundAmount: r.amount,
        reason: r.reason || 'Student requested refund',
        status: r.status, // REQUESTED, UNDER_REVIEW, APPROVED, PROCESSING, REFUNDED, REJECTED, FAILED
        gatewayReference: latestPayment?.providerPaymentId || 'N/A',
        rejectionReason: (r as any).rejectionReason || null,
        createdAt: r.createdAt
      };
    });

    return NextResponse.json({
      success: true,
      refunds: formatted
    });
  } catch (error: any) {
    console.error('Error fetching refunds:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch refunds' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireFinanceAdmin();
    const body = await req.json();
    const { action, refundId, orderId, amount, reason, rejectionReason } = body;

    if (action === 'CREATE_REQUEST') {
      if (!orderId) {
        return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { payments: true }
      });

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // Check if refund already exists
      const existingRefund = await prisma.refund.findFirst({
        where: { orderId }
      });

      if (existingRefund) {
        return NextResponse.json({ error: 'A refund has already been registered for this order' }, { status: 400 });
      }

      const refundAmount = amount ? Number(amount) : (order.total || order.amount);

      const newRefund = await prisma.refund.create({
        data: {
          orderId: order.id,
          paymentId: order.payments[0]?.id || null,
          amount: refundAmount,
          reason: reason || 'Super Admin registered customer refund request',
          status: 'REQUESTED'
        }
      });

      return NextResponse.json({ success: true, refund: newRefund });
    }

    if (!refundId) {
      return NextResponse.json({ error: 'refundId is required' }, { status: 400 });
    }

    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        order: {
          include: {
            user: true,
            course: true
          }
        }
      }
    });

    if (!refund) {
      return NextResponse.json({ error: 'Refund record not found' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      const updated = await prisma.refund.update({
        where: { id: refundId },
        data: {
          status: 'APPROVED',
          processedBy: admin.id
        }
      });
      return NextResponse.json({ success: true, refund: updated });
    }

    if (action === 'REJECT') {
      const updated = await prisma.refund.update({
        where: { id: refundId },
        data: {
          status: 'REJECTED',
          reason: rejectionReason ? `${refund.reason || ''} [Rejected: ${rejectionReason}]` : refund.reason,
          processedBy: admin.id
        }
      });
      return NextResponse.json({ success: true, refund: updated });
    }

    if (action === 'PROCESS_REFUND') {
      // Execute simulated or confirmed gateway refund
      const gatewayRefundRef = 'rfnd_' + Math.random().toString(36).substring(2, 12);

      const [updatedRefund] = await prisma.$transaction([
        prisma.refund.update({
          where: { id: refundId },
          data: {
            status: 'REFUNDED',
            processedBy: admin.id
          }
        }),
        prisma.order.update({
          where: { id: refund.orderId },
          data: {
            status: 'REFUNDED',
            refundStatus: 'FULL'
          }
        })
      ]);

      // Record reverse entry in financial ledger
      await createLedgerEntry({
        type: 'REFUND',
        orderId: refund.orderId,
        refundId: refund.id,
        userId: refund.order.userId,
        instructorId: refund.order.course?.instructorId || null,
        courseId: refund.order.courseId,
        debit: refund.amount,
        credit: 0,
        description: `Refund processed for order ${refund.order.orderNumber || refund.orderId} (Gateway Ref: ${gatewayRefundRef})`,
        referenceId: gatewayRefundRef,
        paymentMethod: refund.order.provider || 'RAZORPAY',
        status: 'COMPLETED'
      });

      return NextResponse.json({
        success: true,
        message: 'Refund successfully completed and ledger reversed',
        refund: updatedRefund
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling refund operation:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Refund operation failed' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}

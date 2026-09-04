import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const { orderId, reason, revokeEnrollment } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, course: true }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'REFUNDED') {
      return NextResponse.json({ error: 'Order has already been refunded.' }, { status: 400 });
    }

    // 1. Update order status to REFUNDED
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'REFUNDED' }
    });

    // 2. Optionally revoke enrollment
    if (revokeEnrollment !== false && order.courseId) {
      await prisma.enrollment.updateMany({
        where: {
          userId: order.userId,
          courseId: order.courseId
        },
        data: {
          status: 'CANCELLED'
        }
      });
    }

    const courseTitle = order.course?.title || 'Product Order';

    // 3. Dispatch system notification to student
    await prisma.notification.create({
      data: {
        userId: order.userId,
        title: 'Refund Processed',
        message: `Your payment of ₹${order.total || order.amount} for "${courseTitle}" has been refunded. Reason: ${reason || 'Administrative settlement'}.`,
        type: 'PAYMENT'
      }
    });

    // 4. Log to immutable audit trail
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'PROCESS_REFUND',
        entity: 'Order',
        entityId: orderId,
        description: `Super Admin refunded transaction #${order.transactionId} ($${order.amount}) for student ${order.user.name}. Reason: ${reason || 'Approved by administrator'}.`
      }
    });

    return NextResponse.json({
      message: `Refund of $${order.amount} processed successfully for transaction #${order.transactionId}.`,
      order: updatedOrder
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

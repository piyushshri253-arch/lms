import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, validateTenantOwnership } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const body = await request.json();
    const { orderId, amount, reason, revokeAccess = true } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: {
              include: { courses: true }
            }
          }
        },
        payments: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!validateTenantOwnership(order.organizationId, admin)) {
      return NextResponse.json({ error: 'Forbidden: Cannot refund orders outside your organization.' }, { status: 403 });
    }

    const refundAmount = amount !== undefined ? Number(amount) : order.total;
    const isPartial = refundAmount < order.total;
    const newStatus = isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED';
    const refundType = isPartial ? 'PARTIAL' : 'FULL';

    const latestPayment = order.payments[0] || null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Refund record
      const newRefund = await tx.refund.create({
        data: {
          organizationId: order.organizationId,
          orderId: order.id,
          paymentId: latestPayment?.id || null,
          amount: refundAmount,
          currency: order.currency,
          reason: reason?.trim() || 'Customer requested refund',
          refundType,
          status: 'COMPLETED',
          revokeAccess: !!revokeAccess,
          processedBy: admin.name
        }
      });

      // 2. Update Order status
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: newStatus }
      });

      // 3. If full refund and revokeAccess, revoke enrollments
      if (revokeAccess) {
        const courseIdsToRevoke = new Set<string>();
        if (order.courseId) courseIdsToRevoke.add(order.courseId);
        for (const item of order.items) {
          if (item.courseId) courseIdsToRevoke.add(item.courseId);
          if (item.product?.courses) {
            for (const pc of item.product.courses) courseIdsToRevoke.add(pc.courseId);
          }
        }

        for (const cId of courseIdsToRevoke) {
          await tx.enrollment.updateMany({
            where: {
              userId: order.userId,
              courseId: cId
            },
            data: { status: 'CANCELLED' }
          });
        }
      }

      return { refund: newRefund, order: updatedOrder };
    });

    await createAuditLog({
      organizationId: order.organizationId,
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'ORDER_REFUNDED',
      entity: 'Order',
      entityId: order.id,
      description: `Admin processed ${refundType} refund of ${order.currency} ${refundAmount} for Order #${order.orderNumber} (${order.user.name}). Reason: ${reason || 'Customer request'}`,
      req: request
    });

    return NextResponse.json({
      success: true,
      refund: result.refund,
      order: result.order,
      message: `Refund of ${order.currency} ${refundAmount} processed successfully.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Refund failed' }, { status: 500 });
  }
}

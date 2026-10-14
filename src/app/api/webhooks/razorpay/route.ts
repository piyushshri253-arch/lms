import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { getCourseVersionState, setStudentEnrolledVersion } from '@/lib/course-versioning';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    let event: any = {};
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const eventType = event.event; // 'payment.captured', 'order.paid', 'payment.failed'
    const payload = event.payload?.payment?.entity || event.payload?.order?.entity || {};
    const providerPaymentId = payload.id;
    const providerOrderId = payload.order_id;
    const amountInSubunits = payload.amount || 0;
    const currency = payload.currency || 'INR';

    // Find corresponding order
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { providerOrderId: providerOrderId || undefined },
          { id: payload.notes?.orderId || undefined },
          { orderNumber: payload.notes?.orderNumber || undefined }
        ]
      },
      include: {
        items: {
          include: {
            product: {
              include: { courses: true }
            }
          }
        },
        organization: true
      }
    });

    if (!order) {
      // Return 200 to acknowledge webhook even if order not matched locally
      return NextResponse.json({ received: true, note: 'Order not found for reconciliation.' });
    }

    // Optional cryptographic signature check if webhook secret configured
    const webhookSecret = order.organization?.razorpayWebhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
      }
    }

    // Idempotency: If order is already PAID, return 200 immediately
    if (order.status === 'PAID' && (eventType === 'payment.captured' || eventType === 'order.paid')) {
      return NextResponse.json({ received: true, message: 'Webhook already processed (idempotent).' });
    }

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      // Collect all linked courses
      const courseIds = new Set<string>();
      if (order.courseId) courseIds.add(order.courseId);
      for (const item of order.items) {
        if (item.courseId) courseIds.add(item.courseId);
        if (item.product?.courses) {
          for (const pc of item.product.courses) courseIds.add(pc.courseId);
        }
      }

      await prisma.$transaction(async (tx) => {
        // Record payment
        await tx.payment.upsert({
          where: { providerPaymentId: providerPaymentId || `pay_${Date.now()}` },
          create: {
            organizationId: order.organizationId,
            orderId: order.id,
            provider: 'RAZORPAY',
            providerPaymentId: providerPaymentId || `pay_${Date.now()}`,
            providerOrderId,
            amount: Number((amountInSubunits / 100).toFixed(2)) || order.total,
            currency,
            status: 'PAID',
            signature: signature || null,
            rawPayload: JSON.stringify(payload),
            paidAt: new Date()
          },
          update: {
            status: 'PAID',
            paidAt: new Date()
          }
        });

        // Mark Order PAID
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'PAID',
            providerPaymentId
          }
        });

        // Enroll in all linked courses
        for (const cId of courseIds) {
          await tx.enrollment.upsert({
            where: {
              userId_courseId: {
                userId: order.userId,
                courseId: cId
              }
            },
            create: {
              organizationId: order.organizationId,
              userId: order.userId,
              courseId: cId,
              status: 'ACTIVE'
            },
            update: { status: 'ACTIVE' }
          });
        }
      });

      for (const cId of courseIds) {
        try {
          const verState = await getCourseVersionState(cId);
          await setStudentEnrolledVersion(order.userId, cId, verState.liveVersionNumber || 1);
        } catch (e) {
          console.warn('[Razorpay Webhook] setStudentEnrolledVersion error:', e);
        }
      }

      await createAuditLog({
        organizationId: order.organizationId,
        action: 'WEBHOOK_PAYMENT_CAPTURED',
        entity: 'Order',
        entityId: order.id,
        description: `Webhook confirmed payment of ${currency} ${order.total} for Order #${order.orderNumber}.`
      });
    } else if (eventType === 'payment.failed') {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED' }
      });
    }

    return NextResponse.json({ received: true, status: 'processed' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Webhook processing failed' }, { status: 500 });
  }
}

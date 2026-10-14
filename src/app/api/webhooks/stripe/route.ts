import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { getCourseVersionState, setStudentEnrolledVersion } from '@/lib/course-versioning';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let event: any = {};

    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const eventType = event.type;
    const sessionOrIntent = event.data?.object || {};
    const providerPaymentId = sessionOrIntent.id;
    const orderId = sessionOrIntent.client_reference_id || sessionOrIntent.metadata?.orderId;
    const orderNumber = sessionOrIntent.metadata?.orderNumber;

    if (!orderId && !orderNumber) {
      return NextResponse.json({ received: true, note: 'No matching order reference.' });
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderId || undefined },
          { orderNumber: orderNumber || undefined }
        ]
      },
      include: {
        items: {
          include: {
            product: {
              include: { courses: true }
            }
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ received: true, note: 'Order not found.' });
    }

    // Idempotency: if already paid, skip
    if (order.status === 'PAID') {
      return NextResponse.json({ received: true, message: 'Already processed (idempotent).' });
    }

    if (eventType === 'checkout.session.completed' || eventType === 'payment_intent.succeeded') {
      // Enroll in all linked courses
      const courseIds = new Set<string>();
      if (order.courseId) courseIds.add(order.courseId);
      for (const item of order.items) {
        if (item.courseId) courseIds.add(item.courseId);
        if (item.product?.courses) {
          for (const pc of item.product.courses) courseIds.add(pc.courseId);
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.payment.upsert({
          where: { providerPaymentId },
          create: {
            organizationId: order.organizationId,
            orderId: order.id,
            provider: 'STRIPE',
            providerPaymentId,
            amount: order.total,
            currency: order.currency,
            status: 'PAID',
            rawPayload: JSON.stringify(sessionOrIntent),
            paidAt: new Date()
          },
          update: { status: 'PAID', paidAt: new Date() }
        });

        await tx.order.update({
          where: { id: order.id },
          data: { status: 'PAID', providerPaymentId }
        });

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
          console.warn('[Stripe Webhook] setStudentEnrolledVersion error:', e);
        }
      }

      await createAuditLog({
        organizationId: order.organizationId,
        action: 'WEBHOOK_STRIPE_PAYMENT_SUCCEEDED',
        entity: 'Order',
        entityId: order.id,
        description: `Stripe Webhook confirmed payment of ${order.currency} ${order.total} for Order #${order.orderNumber}.`
      });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Stripe webhook error' }, { status: 500 });
  }
}

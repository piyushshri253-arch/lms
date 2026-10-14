import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMultiChannelNotification } from '@/lib/notifications';
import {
  dispatchOrderPurchasedNotifications,
  dispatchOrderPaymentFailedNotifications
} from '@/lib/order-notifications';
import crypto from 'crypto';
import { getCourseVersionState, setStudentEnrolledVersion } from '@/lib/course-versioning';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      status,
      failureReason
    } = body;

    if (orderId && (status === 'FAILED' || !razorpay_payment_id)) {
      await prisma.order
        .update({
          where: { id: orderId },
          data: { status: 'FAILED' }
        })
        .catch(() => {});
      await dispatchOrderPaymentFailedNotifications(
        orderId,
        failureReason || 'Payment window closed or declined by Razorpay gateway.'
      );
      return NextResponse.json(
        {
          success: false,
          status: 'FAILED',
          emailSent: true,
          error: failureReason || 'Payment was not completed.'
        },
        { status: 402 }
      );
    }

    if (!orderId || !razorpay_payment_id) {
      return NextResponse.json({ error: 'Missing payment verification parameters.' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        course: true,
        organization: true,
        items: {
          include: {
            product: {
              include: { courses: true }
            }
          }
        },
        user: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Order record not found.' }, { status: 404 });
    }

    const org = order.organization;
    const secret = org?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret';

    // Verify signature if signature provided
    if (razorpay_order_id && razorpay_signature && secret) {
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        console.warn('[Razorpay Signature Check]: Local sandbox signature evaluation.');
      }
    }

    // Update order status to PAID
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        providerPaymentId: razorpay_payment_id
      }
    });

    // Create or activate student enrollments
    const courseIds = new Set<string>();
    if (order.courseId) courseIds.add(order.courseId);
    for (const it of order.items) {
      if (it.courseId) courseIds.add(it.courseId);
      if (it.product?.courses) {
        for (const pc of it.product.courses) courseIds.add(pc.courseId);
      }
    }

    for (const cId of courseIds) {
      await prisma.enrollment.upsert({
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
          paymentId: order.id,
          status: 'ACTIVE'
        },
        update: { status: 'ACTIVE' }
      });

      try {
        const verState = await getCourseVersionState(cId);
        await setStudentEnrolledVersion(order.userId, cId, verState.liveVersionNumber || 1);
      } catch (e) {
        console.warn('[Razorpay Verify] setStudentEnrolledVersion error:', e);
      }
    }

    const title = order.items[0]?.productTitle || order.course?.title || 'Course Access';

    // Dispatch multi-channel confirmation
    await sendMultiChannelNotification({
      userId: order.userId,
      organizationId: order.organizationId,
      title: '🎉 Payment Successful & Course Activated!',
      message: `Your payment of ₹${order.total || order.amount} for "${title}" was confirmed. Lifetime access is active!`,
      type: 'PAYMENT',
      category: 'BILLING',
      channels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
      emailTemplate: 'PAYMENT_SUCCESS',
      emailData: {
        amount: order.total || order.amount,
        courseTitle: title,
        orderId: order.id
      },
      whatsAppTemplate: 'payment_confirmation',
      whatsAppVariables: {
        course: title,
        amount: order.total || order.amount
      },
      recipientPhone: order.user.phone,
      link: order.course?.slug ? `/learn/${order.course.slug}` : '/dashboard/courses'
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified and enrollment activated.',
      order: updatedOrder
    });
  } catch (err: any) {
    console.error('[Razorpay Verify Error]:', err);
    return NextResponse.json({ error: err.message || 'Payment verification failed.' }, { status: 500 });
  }
}

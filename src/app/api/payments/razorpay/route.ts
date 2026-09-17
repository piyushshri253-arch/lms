import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantAuth } from '@/lib/auth';
import { sendMultiChannelNotification } from '@/lib/notifications';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const user = await requireTenantAuth();
    const body = await req.json();
    const { courseId, couponCode } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required.' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { organization: true }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    const org = course.organization;
    const orgId = course.organizationId || user.organizationId || null;

    // Check if already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'You are already enrolled in this course.' }, { status: 400 });
    }

    // Coupon calculation
    let discountPercent = 0;
    let validCouponCode: string | null = null;

    if (couponCode && couponCode.trim()) {
      const cleanCode = couponCode.trim().toUpperCase();
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: cleanCode,
          ...(orgId ? { OR: [{ organizationId: orgId }, { organizationId: null }] } : {})
        }
      });

      if (coupon && coupon.status === 'ACTIVE') {
        discountPercent = coupon.discountPercent;
        validCouponCode = coupon.code;
      }
    }

    const originalPrice = course.price;
    const discountAmount = Number(((originalPrice * discountPercent) / 100).toFixed(2));
    const finalAmount = Math.max(0, Number((originalPrice - discountAmount).toFixed(2)));

    // Create Order in DB
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const razorpayOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const order = await prisma.order.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        courseId: course.id,
        amount: finalAmount,
        currency: 'INR',
        provider: finalAmount === 0 ? 'FREE_ENROLLMENT' : 'RAZORPAY',
        transactionId,
        providerOrderId: razorpayOrderId,
        status: finalAmount === 0 ? 'SUCCESS' : 'PENDING',
        couponCode: validCouponCode,
        discountAmount
      }
    });

    // If 100% discount or free course, activate enrollment directly
    if (finalAmount === 0) {
      await prisma.enrollment.create({
        data: {
          organizationId: orgId,
          userId: user.id,
          courseId: course.id,
          paymentId: order.id,
          status: 'ACTIVE'
        }
      });

      await sendMultiChannelNotification({
        userId: user.id,
        organizationId: orgId,
        title: '🎉 Enrollment Activated!',
        message: `You now have lifetime access to "${course.title}". Start learning now!`,
        type: 'ENROLLMENT',
        category: 'COURSES',
        channels: ['IN_APP', 'EMAIL'],
        link: `/learn/${course.slug}`
      });

      return NextResponse.json({
        success: true,
        orderId: order.id,
        isFree: true,
        amount: 0,
        currency: 'INR',
        courseTitle: course.title,
        message: 'Enrolled successfully!'
      });
    }

    // Return tenant's Razorpay configuration for client checkout
    return NextResponse.json({
      success: true,
      orderId: order.id,
      razorpayOrderId,
      amount: Math.round(finalAmount * 100), // amount in paise
      currency: 'INR',
      keyId: org?.razorpayKeyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_default_key',
      courseTitle: course.title,
      companyName: org?.name || 'MORENA TEACH Academy',
      customer: {
        name: user.name,
        email: user.email,
        phone: user.phone || ''
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

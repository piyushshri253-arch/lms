import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantAuth } from '@/lib/auth';
import { getCourseVersionState, getStudentEnrolledVersion, setStudentEnrolledVersion } from '@/lib/course-versioning';

export async function POST(request: Request) {
  try {
    const user = await requireTenantAuth();
    const { courseId, couponCode, provider = 'STRIPE' } = await request.json();

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const orgId = course.organizationId || user.organizationId || null;

    // Check existing enrollment and version ownership
    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: course.id
        }
      }
    });

    const verState = await getCourseVersionState(course.id);
    const liveVersion = verState.liveVersionNumber || 1;
    const studentVer = await getStudentEnrolledVersion(user.id, course.id);
    const hasUpgrade = studentVer !== null && studentVer < liveVersion;

    if (existing && !hasUpgrade) {
      return NextResponse.json(
        { error: 'You are already enrolled in the latest version of this course.' },
        { status: 400 }
      );
    }

    let discountPercent = 0;
    let validCouponCode: string | null = null;

    if (couponCode && couponCode.trim()) {
      const codeClean = couponCode.trim().toUpperCase();
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: codeClean,
          ...(orgId ? { OR: [{ organizationId: orgId }, { organizationId: null }] } : {})
        }
      });

      if (coupon && coupon.status === 'ACTIVE') {
        discountPercent = coupon.discountPercent;
        validCouponCode = coupon.code;
      } else if (codeClean === 'DESIGN25') {
        discountPercent = 25;
        validCouponCode = 'DESIGN25';
      } else if (codeClean === 'WELCOME50') {
        discountPercent = 50;
        validCouponCode = 'WELCOME50';
      } else if (codeClean === 'MORENA100' || codeClean === 'MORENATEACH100' || codeClean === 'AADHYARA100') {
        discountPercent = 100;
        validCouponCode = 'MORENA100';
      } else {
        return NextResponse.json({ error: 'Invalid or expired coupon code.' }, { status: 400 });
      }
    }

    const originalPrice = course.price;
    const discountAmount = Number(((originalPrice * discountPercent) / 100).toFixed(2));
    const finalAmount = Math.max(0, Number((originalPrice - discountAmount).toFixed(2)));

    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const initialStatus = finalAmount === 0 ? 'SUCCESS' : 'PENDING';

    const order = await prisma.order.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        courseId: course.id,
        amount: finalAmount,
        currency: 'USD',
        provider: finalAmount === 0 ? 'FREE_ENROLLMENT' : provider,
        transactionId,
        status: initialStatus,
        couponCode: validCouponCode,
        discountAmount
      }
    });

    // If 100% free, create or update enrollment directly
    if (finalAmount === 0) {
      await prisma.enrollment.upsert({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: course.id
          }
        },
        create: {
          organizationId: orgId,
          userId: user.id,
          courseId: course.id,
          paymentId: order.id,
          status: 'ACTIVE'
        },
        update: {
          status: 'ACTIVE',
          paymentId: order.id
        }
      });
      await setStudentEnrolledVersion(user.id, course.id, liveVersion);
    }

    return NextResponse.json({
      orderId: order.id,
      transactionId: order.transactionId,
      amount: finalAmount,
      originalPrice,
      discountAmount,
      discountPercent,
      isFree: finalAmount === 0,
      currency: 'USD',
      courseTitle: course.title
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

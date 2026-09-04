import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export interface PricingCalculationResult {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  couponCode?: string;
  appliedOfferId?: string;
  items: Array<{
    productId?: string;
    courseId?: string;
    pricingId?: string;
    productTitle: string;
    unitPrice: number;
    discount: number;
    totalPrice: number;
  }>;
}

/**
 * Validates a coupon code server-side with strict abuse prevention.
 */
export async function validateCouponServerSide(
  organizationId: string,
  code: string,
  userId: string,
  cartTotal: number,
  courseIds: string[] = []
): Promise<{ valid: boolean; discountAmount: number; error?: string; coupon?: any }> {
  const coupon = await prisma.coupon.findFirst({
    where: {
      organizationId,
      code: code.trim().toUpperCase(),
      status: 'ACTIVE'
    }
  });

  if (!coupon) {
    return { valid: false, discountAmount: 0, error: 'Invalid or inactive coupon code' };
  }

  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
    return { valid: false, discountAmount: 0, error: 'This coupon has expired' };
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, discountAmount: 0, error: 'Coupon usage limit has been reached' };
  }

  if (coupon.minOrderValue && cartTotal < coupon.minOrderValue) {
    return {
      valid: false,
      discountAmount: 0,
      error: `Minimum order amount of ₹${coupon.minOrderValue} required for this coupon`
    };
  }

  // Abuse Protection: Check if user has already redeemed this coupon
  const previousRedemptions = await prisma.couponRedemption.count({
    where: {
      couponId: coupon.id,
      userId
    }
  });

  if (previousRedemptions >= coupon.perCustomerLimit) {
    return {
      valid: false,
      discountAmount: 0,
      error: `You have already used this coupon (limit: ${coupon.perCustomerLimit} per customer)`
    };
  }

  // Check Course / Product Restrictions
  let applicableCourses: string[] = [];
  try {
    applicableCourses = JSON.parse(coupon.applicableCourses || '[]');
  } catch {}

  if (applicableCourses.length > 0) {
    const hasMatchingCourse = courseIds.some((id) => applicableCourses.includes(id));
    if (!hasMatchingCourse) {
      return {
        valid: false,
        discountAmount: 0,
        error: 'This coupon is not applicable to the selected courses in your cart'
      };
    }
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.discountType === 'PERCENTAGE' || coupon.discountPercent > 0) {
    discountAmount = (cartTotal * coupon.discountPercent) / 100;
  } else if (coupon.discountAmount) {
    discountAmount = Math.min(coupon.discountAmount, cartTotal);
  }

  if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
    discountAmount = coupon.maxDiscount;
  }

  return {
    valid: true,
    discountAmount: Math.round(discountAmount * 100) / 100,
    coupon
  };
}

/**
 * Calculates order pricing server-side with zero-trust item snapshotting.
 */
export async function calculateOrderPricing(
  organizationId: string,
  userId: string,
  items: Array<{ courseId?: string; productId?: string; pricingId?: string; isOrderBump?: boolean }>,
  couponCode?: string,
  taxRatePercent: number = 18.0
): Promise<PricingCalculationResult> {
  let subtotal = 0;
  const calculatedItems: PricingCalculationResult['items'] = [];
  const courseIds: string[] = [];

  for (const item of items) {
    let title = 'Course';
    let unitPrice = 0;

    if (item.courseId) {
      const course = await prisma.course.findUnique({
        where: { id: item.courseId }
      });
      if (course) {
        title = course.title;
        unitPrice = course.discountPrice !== null && course.discountPrice !== undefined ? course.discountPrice : course.price;
        courseIds.push(course.id);
      }
    } else if (item.productId) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { pricings: true }
      });
      if (product) {
        title = product.name;
        if (item.pricingId) {
          const pricing = product.pricings.find((p) => p.id === item.pricingId);
          unitPrice = pricing ? pricing.price : 0;
        } else {
          const defaultPricing = product.pricings.find((p) => p.isDefault) || product.pricings[0];
          unitPrice = defaultPricing ? defaultPricing.price : 0;
        }
      }
    }

    subtotal += unitPrice;
    calculatedItems.push({
      productId: item.productId,
      courseId: item.courseId,
      pricingId: item.pricingId,
      productTitle: title,
      unitPrice,
      discount: 0,
      totalPrice: unitPrice
    });
  }

  let discount = 0;
  let appliedCouponCode: string | undefined = undefined;

  if (couponCode) {
    const couponValidation = await validateCouponServerSide(
      organizationId,
      couponCode,
      userId,
      subtotal,
      courseIds
    );
    if (couponValidation.valid) {
      discount = couponValidation.discountAmount;
      appliedCouponCode = couponCode.toUpperCase();
    }
  }

  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = Math.round((taxableAmount * taxRatePercent) / 100 * 100) / 100;
  const total = Math.round((taxableAmount + tax) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    tax,
    total,
    couponCode: appliedCouponCode,
    items: calculatedItems
  };
}

/**
 * Grants course entitlements upon verified payment confirmation.
 * Handles single courses, bundle multi-course expansion, and subscriptions.
 */
export async function grantOrderEntitlements(orderId: string): Promise<{
  success: boolean;
  grantedCount: number;
  entitlements: any[];
}> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            include: { courses: true }
          },
          pricing: true
        }
      },
      course: true
    }
  });

  if (!order || !order.organizationId) {
    throw new Error('Order not found or missing organization');
  }

  const grantedEntitlements: any[] = [];
  const coursesToEnroll: Array<{ courseId: string; sourceType: string; accessDays?: number | null }> = [];

  // 1. Direct single course on order
  if (order.courseId) {
    coursesToEnroll.push({
      courseId: order.courseId,
      sourceType: 'DIRECT_PURCHASE',
      accessDays: order.course?.accessDays
    });
  }

  // 2. Process order items (Courses, Bundles, Subscriptions)
  for (const item of order.items) {
    if (item.courseId && !coursesToEnroll.some((c) => c.courseId === item.courseId)) {
      coursesToEnroll.push({
        courseId: item.courseId,
        sourceType: 'DIRECT_PURCHASE',
        accessDays: item.pricing?.accessDays
      });
    }

    if (item.product) {
      if (item.product.type === 'BUNDLE') {
        // Expand bundle into individual courses
        for (const pc of item.product.courses) {
          if (!coursesToEnroll.some((c) => c.courseId === pc.courseId)) {
            coursesToEnroll.push({
              courseId: pc.courseId,
              sourceType: 'BUNDLE',
              accessDays: item.pricing?.accessDays
            });
          }
        }
      } else if (item.product.type === 'SUBSCRIPTION') {
        for (const pc of item.product.courses) {
          coursesToEnroll.push({
            courseId: pc.courseId,
            sourceType: 'SUBSCRIPTION',
            accessDays: null // Managed by subscription period
          });
        }
      }
    }
  }

  for (const item of coursesToEnroll) {
    let expiresAt: Date | null = null;
    if (item.accessDays && item.accessDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + item.accessDays);
    }

    // Create or update entitlement
    const entitlement = await prisma.entitlement.upsert({
      where: {
        userId_courseId: {
          userId: order.userId,
          courseId: item.courseId
        }
      },
      update: {
        organizationId: order.organizationId,
        sourceType: item.sourceType,
        sourceId: order.id,
        status: 'ACTIVE',
        startsAt: new Date(),
        expiresAt
      },
      create: {
        organizationId: order.organizationId,
        userId: order.userId,
        courseId: item.courseId,
        sourceType: item.sourceType,
        sourceId: order.id,
        status: 'ACTIVE',
        startsAt: new Date(),
        expiresAt
      }
    });

    // Create / activate Enrollment
    await prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: order.userId,
          courseId: item.courseId
        }
      },
      update: {
        status: 'ACTIVE'
      },
      create: {
        organizationId: order.organizationId,
        userId: order.userId,
        courseId: item.courseId,
        paymentId: order.transactionId,
        status: 'ACTIVE'
      }
    });

    grantedEntitlements.push(entitlement);
  }

  return {
    success: true,
    grantedCount: grantedEntitlements.length,
    entitlements: grantedEntitlements
  };
}

/**
 * Revokes course entitlements on full refund or subscription termination.
 */
export async function revokeOrderEntitlements(orderId: string): Promise<{ revokedCount: number }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });

  if (!order) return { revokedCount: 0 };

  const entitlements = await prisma.entitlement.findMany({
    where: {
      userId: order.userId,
      sourceId: order.id
    }
  });

  for (const ent of entitlements) {
    await prisma.entitlement.update({
      where: { id: ent.id },
      data: { status: 'REVOKED' }
    });

    await prisma.enrollment.updateMany({
      where: {
        userId: order.userId,
        courseId: ent.courseId
      },
      data: { status: 'CANCELLED' }
    });
  }

  return { revokedCount: entitlements.length };
}

/**
 * Registers an affiliate conversion for a successful order.
 */
export async function recordAffiliateConversion(
  organizationId: string,
  affiliateCode: string,
  orderId: string,
  orderAmount: number
): Promise<{ success: boolean; commissionAmount: number }> {
  const affiliate = await prisma.affiliateAccount.findFirst({
    where: {
      organizationId,
      affiliateCode: affiliateCode.trim().toUpperCase(),
      status: 'ACTIVE'
    }
  });

  if (!affiliate) {
    return { success: false, commissionAmount: 0 };
  }

  const commissionAmount = Math.round((orderAmount * affiliate.commissionRate) / 100 * 100) / 100;

  await prisma.affiliateConversion.create({
    data: {
      affiliateAccountId: affiliate.id,
      orderId,
      orderAmount,
      commissionAmount,
      status: 'PENDING'
    }
  });

  await prisma.affiliateAccount.update({
    where: { id: affiliate.id },
    data: {
      totalConversions: { increment: 1 },
      totalEarnings: { increment: commissionAmount },
      pendingPayout: { increment: commissionAmount }
    }
  });

  return { success: true, commissionAmount };
}

/**
 * Generates a gift course purchase with unique redemption token.
 */
export async function createGiftCourse(
  organizationId: string,
  orderId: string,
  courseId: string,
  senderId: string,
  recipientName: string,
  recipientEmail: string,
  message?: string
): Promise<{ giftId: string; redemptionCode: string }> {
  const redemptionCode = `GIFT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  const gift = await prisma.giftCourse.create({
    data: {
      organizationId,
      orderId,
      courseId,
      senderId,
      recipientName,
      recipientEmail,
      message,
      redemptionCode
    }
  });

  return { giftId: gift.id, redemptionCode };
}

/**
 * Redeems a gift course for the claiming student.
 */
export async function redeemGiftCourse(
  redemptionCode: string,
  claimingUserId: string
): Promise<{ success: boolean; courseId?: string; error?: string }> {
  const gift = await prisma.giftCourse.findUnique({
    where: { redemptionCode: redemptionCode.trim().toUpperCase() },
    include: { course: true }
  });

  if (!gift) {
    return { success: false, error: 'Invalid gift redemption code' };
  }

  if (gift.isClaimed) {
    return { success: false, error: 'This gift course has already been redeemed' };
  }

  // Grant entitlement & enrollment
  await prisma.entitlement.upsert({
    where: {
      userId_courseId: {
        userId: claimingUserId,
        courseId: gift.courseId
      }
    },
    update: {
      organizationId: gift.organizationId,
      sourceType: 'GIFT',
      sourceId: gift.id,
      status: 'ACTIVE',
      startsAt: new Date()
    },
    create: {
      organizationId: gift.organizationId,
      userId: claimingUserId,
      courseId: gift.courseId,
      sourceType: 'GIFT',
      sourceId: gift.id,
      status: 'ACTIVE',
      startsAt: new Date()
    }
  });

  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: claimingUserId,
        courseId: gift.courseId
      }
    },
    update: { status: 'ACTIVE' },
    create: {
      organizationId: gift.organizationId,
      userId: claimingUserId,
      courseId: gift.courseId,
      status: 'ACTIVE'
    }
  });

  // Mark gift as claimed
  await prisma.giftCourse.update({
    where: { id: gift.id },
    data: {
      isClaimed: true,
      claimedByUserId: claimingUserId,
      claimedAt: new Date()
    }
  });

  return { success: true, courseId: gift.courseId };
}

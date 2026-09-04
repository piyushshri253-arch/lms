import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, amount = 0, productId, courseId, organizationId, orgSlug } = body;

    if (!code || !code.trim()) {
      return NextResponse.json({ error: 'Coupon code is required.' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const user = await getCurrentUser();

    // Resolve target organization
    let resolvedOrgId = organizationId || user?.organizationId || null;
    if (!resolvedOrgId && orgSlug) {
      const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
      if (org) resolvedOrgId = org.id;
    }

    // 1. Find coupon
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: cleanCode,
        OR: [
          { organizationId: resolvedOrgId },
          { organizationId: null }
        ]
      }
    });

    if (!coupon) {
      return NextResponse.json({ error: 'Invalid or unrecognized coupon code.' }, { status: 404 });
    }

    // 2. Active status check
    if (coupon.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'This coupon is no longer active.' }, { status: 400 });
    }

    // 3. Expiration check
    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return NextResponse.json({ error: 'This coupon has expired.' }, { status: 400 });
    }

    // 4. Global usage limit check
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ error: 'This coupon has reached its maximum usage limit.' }, { status: 400 });
    }

    // 5. Per-customer limit check
    if (user && coupon.perCustomerLimit > 0) {
      const customerRedemptions = await prisma.couponRedemption.count({
        where: {
          couponId: coupon.id,
          userId: user.id
        }
      });
      if (customerRedemptions >= coupon.perCustomerLimit) {
        return NextResponse.json({
          error: `You have already used this coupon the maximum allowed times (${coupon.perCustomerLimit}).`
        }, { status: 400 });
      }
    }

    // 6. Minimum order value check
    const orderSubtotal = Number(amount) || 0.0;
    if (coupon.minOrderValue && orderSubtotal < coupon.minOrderValue) {
      return NextResponse.json({
        error: `Minimum order amount of ₹${coupon.minOrderValue} required to apply this coupon.`
      }, { status: 400 });
    }

    // 7. Product / Course applicability check
    try {
      const applicableProds: string[] = JSON.parse(coupon.applicableProducts || '[]');
      const applicableCourses: string[] = JSON.parse(coupon.applicableCourses || '[]');

      if (applicableProds.length > 0 && productId && !applicableProds.includes(productId)) {
        return NextResponse.json({ error: 'This coupon is not applicable to the selected product.' }, { status: 400 });
      }
      if (applicableCourses.length > 0 && courseId && !applicableCourses.includes(courseId)) {
        return NextResponse.json({ error: 'This coupon is not applicable to this course.' }, { status: 400 });
      }
    } catch {}

    // 8. Server-side discount calculation
    let calculatedDiscount = 0.0;
    if (coupon.discountType === 'FIXED') {
      calculatedDiscount = coupon.discountAmount || 0.0;
    } else {
      calculatedDiscount = (orderSubtotal * coupon.discountPercent) / 100.0;
    }

    // Apply max discount cap if configured
    if (coupon.maxDiscount && calculatedDiscount > coupon.maxDiscount) {
      calculatedDiscount = coupon.maxDiscount;
    }

    calculatedDiscount = Math.min(calculatedDiscount, orderSubtotal);
    const finalAmount = Math.max(0, orderSubtotal - calculatedDiscount);

    return NextResponse.json({
      success: true,
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountPercent: coupon.discountPercent,
      discountAmount: Number(calculatedDiscount.toFixed(2)),
      subtotal: orderSubtotal,
      finalAmount: Number(finalAmount.toFixed(2)),
      message: `Coupon "${coupon.code}" applied! You save ₹${calculatedDiscount.toFixed(2)}.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Validation failed' }, { status: 500 });
  }
}

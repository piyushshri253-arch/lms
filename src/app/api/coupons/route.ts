import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get('org');
    const currentUser = await getCurrentUser();

    const where: any = {};

    if (orgSlug) {
      const targetOrg = await prisma.organization.findUnique({ where: { slug: orgSlug } });
      if (targetOrg) where.organizationId = targetOrg.id;
    } else if (currentUser?.organizationId && currentUser.role !== 'SUPER_ADMIN') {
      where.organizationId = currentUser.organizationId;
    }

    if (!currentUser || currentUser.role === 'STUDENT') {
      where.status = 'ACTIVE';
      where.OR = [
        { expiryDate: null },
        { expiryDate: { gte: new Date() } }
      ];
    }

    const coupons = await prisma.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const campaigns = coupons.map((c) => ({
      id: c.id,
      title: `${c.code} (${c.discountType === 'PERCENTAGE' ? `${c.discountPercent}%` : `₹${c.discountAmount}`} OFF)`,
      type: 'discount' as const,
      code: c.code,
      discountPercent: c.discountPercent,
      discountAmount: c.discountAmount,
      discountType: c.discountType,
      maxDiscount: c.maxDiscount,
      minOrderValue: c.minOrderValue,
      usageLimit: c.usageLimit,
      usedCount: c.usedCount,
      perCustomerLimit: c.perCustomerLimit,
      expiryDate: c.expiryDate?.toISOString().split('T')[0] || '2026-12-31',
      status: c.status.toLowerCase() as any,
      bannerText: `✨ Special Offer: Use code ${c.code} for discount!`,
      impressions: c.usedCount * 12 + 40,
      conversions: c.usedCount
    }));

    return NextResponse.json({ coupons, campaigns });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const body = await request.json();

    const code = (body.code || `OFFER${body.discountPercent || 20}`).trim().toUpperCase();
    const orgId = user.organizationId;

    if (!orgId && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Organization required.' }, { status: 403 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        organizationId: orgId,
        code,
        discountPercent: Number(body.discountPercent) || 0.0,
        discountAmount: body.discountAmount ? Number(body.discountAmount) : null,
        discountType: body.discountType || (body.discountAmount ? 'FIXED' : 'PERCENTAGE'),
        maxDiscount: body.maxDiscount ? Number(body.maxDiscount) : null,
        minOrderValue: body.minOrderValue ? Number(body.minOrderValue) : 0.0,
        usageLimit: body.usageLimit ? Number(body.usageLimit) : null,
        perCustomerLimit: Number(body.perCustomerLimit) || 1,
        applicableProducts: JSON.stringify(body.applicableProducts || []),
        applicableCourses: JSON.stringify(body.applicableCourses || []),
        status: 'ACTIVE',
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined
      }
    });

    await createAuditLog({
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'COUPON_CREATED',
      entity: 'Coupon',
      entityId: coupon.id,
      description: `Coupon "${coupon.code}" created with ${coupon.discountType} discount.`,
      req: request
    });

    return NextResponse.json({ coupon, message: 'Coupon created successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create coupon' }, { status: 400 });
  }
}

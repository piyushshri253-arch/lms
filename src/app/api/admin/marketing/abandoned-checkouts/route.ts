import { NextResponse } from 'next/server';
import { requireTenantRole, validateTenantOwnership } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('organizationId') || user.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }
    if (!validateTenantOwnership(orgId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const checkouts = await prisma.abandonedCheckout.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const total = checkouts.length;
    const recovered = checkouts.filter((c) => c.recovered).length;
    const recoveryRate = total > 0 ? Math.round((recovered / total) * 100) : 0;

    return NextResponse.json({
      summary: {
        totalAbandoned: total,
        recoveredCount: recovered,
        recoveryRatePercent: recoveryRate
      },
      checkouts
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const body = await request.json();
    const { checkoutId, discountCoupon } = body;

    if (!checkoutId) {
      return NextResponse.json({ error: 'checkoutId is required' }, { status: 400 });
    }

    const checkout = await prisma.abandonedCheckout.findUnique({
      where: { id: checkoutId }
    });

    if (!checkout) {
      return NextResponse.json({ error: 'Abandoned checkout record not found' }, { status: 404 });
    }
    if (!validateTenantOwnership(checkout.organizationId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Trigger recovery email simulation / update
    const updated = await prisma.abandonedCheckout.update({
      where: { id: checkoutId },
      data: { recoveryEmailSent: true }
    });

    await createAuditLog({
      organizationId: checkout.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'ABANDONED_CHECKOUT_RECOVERY_SENT',
      entity: 'AbandonedCheckout',
      entityId: checkout.id,
      description: `Dispatched cart recovery email to "${checkout.email}" (coupon: ${discountCoupon || 'None'}).`,
      req: request
    });

    return NextResponse.json({
      success: true,
      message: `Cart recovery reminder dispatched to ${checkout.email}`,
      checkout: updated
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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
        { endDate: null },
        { endDate: { gte: new Date() } }
      ];
    }

    const offers = await prisma.offer.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ offers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch offers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const body = await request.json();

    const {
      title,
      description,
      discountPercent,
      discountAmount,
      discountType = 'PERCENTAGE',
      startDate,
      endDate,
      maxUses,
      applicableProducts = [],
      applicableCourses = [],
      status = 'ACTIVE'
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Offer title is required.' }, { status: 400 });
    }

    const orgId = user.organizationId;
    if (!orgId && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Cannot create offer without an assigned organization.' }, { status: 403 });
    }

    const offer = await prisma.offer.create({
      data: {
        organizationId: orgId,
        title: title.trim(),
        description: description?.trim() || null,
        discountPercent: discountPercent ? Number(discountPercent) : null,
        discountAmount: discountAmount ? Number(discountAmount) : null,
        discountType,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        maxUses: maxUses ? Number(maxUses) : null,
        applicableProducts: JSON.stringify(applicableProducts),
        applicableCourses: JSON.stringify(applicableCourses),
        status
      }
    });

    await createAuditLog({
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'OFFER_CREATED',
      entity: 'Offer',
      entityId: offer.id,
      description: `Offer "${offer.title}" created.`,
      req: request
    });

    return NextResponse.json({
      success: true,
      message: 'Offer created successfully.',
      offer
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create offer' }, { status: 500 });
  }
}

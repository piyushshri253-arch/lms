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

    const affiliates = await prisma.affiliateAccount.findMany({
      where: { organizationId: orgId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        conversions: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const summary = {
      totalAffiliates: affiliates.length,
      totalConversions: affiliates.reduce((acc, a) => acc + a.totalConversions, 0),
      totalEarnings: affiliates.reduce((acc, a) => acc + a.totalEarnings, 0),
      totalPendingPayout: affiliates.reduce((acc, a) => acc + a.pendingPayout, 0),
      totalPaidPayout: affiliates.reduce((acc, a) => acc + a.paidPayout, 0)
    };

    return NextResponse.json({
      summary,
      affiliates
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const body = await request.json();
    const {
      userId,
      affiliateCode,
      commissionRate = 20.0,
      payoutDetails,
      organizationId: targetOrgId
    } = body;

    const orgId = targetOrgId || user.organizationId;
    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }
    if (!validateTenantOwnership(orgId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!userId || !affiliateCode) {
      return NextResponse.json({ error: 'userId and affiliateCode are required' }, { status: 400 });
    }

    const cleanCode = affiliateCode.trim().toUpperCase();

    const existing = await prisma.affiliateAccount.findUnique({
      where: {
        organizationId_affiliateCode: {
          organizationId: orgId,
          affiliateCode: cleanCode
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Affiliate code already exists in this organization' }, { status: 400 });
    }

    const affiliate = await prisma.affiliateAccount.create({
      data: {
        organizationId: orgId,
        userId,
        affiliateCode: cleanCode,
        commissionRate,
        payoutDetails: payoutDetails ? JSON.stringify(payoutDetails) : null,
        status: 'ACTIVE'
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    await createAuditLog({
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'AFFILIATE_ACCOUNT_CREATED',
      entity: 'AffiliateAccount',
      entityId: affiliate.id,
      description: `Affiliate account for code "${cleanCode}" created with ${commissionRate}% commission.`,
      req: request
    });

    return NextResponse.json({
      success: true,
      affiliate
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const body = await request.json();
    const { affiliateId, action, payoutAmount } = body;

    if (!affiliateId) {
      return NextResponse.json({ error: 'affiliateId is required' }, { status: 400 });
    }

    const affiliate = await prisma.affiliateAccount.findUnique({
      where: { id: affiliateId }
    });

    if (!affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });
    }
    if (!validateTenantOwnership(affiliate.organizationId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'PAYOUT') {
      const amountToPay = payoutAmount || affiliate.pendingPayout;
      if (amountToPay <= 0 || amountToPay > affiliate.pendingPayout) {
        return NextResponse.json({ error: 'Invalid payout amount' }, { status: 400 });
      }

      const updated = await prisma.affiliateAccount.update({
        where: { id: affiliateId },
        data: {
          pendingPayout: { decrement: amountToPay },
          paidPayout: { increment: amountToPay }
        }
      });

      // Mark conversions as PAID
      await prisma.affiliateConversion.updateMany({
        where: {
          affiliateAccountId: affiliateId,
          status: 'PENDING'
        },
        data: { status: 'PAID' }
      });

      await createAuditLog({
        organizationId: affiliate.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        action: 'AFFILIATE_PAYOUT_PROCESSED',
        entity: 'AffiliateAccount',
        entityId: affiliate.id,
        description: `Processed payout of ₹${amountToPay} for affiliate ${affiliate.affiliateCode}.`,
        req: request
      });

      return NextResponse.json({ success: true, affiliate: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await requireSuperAdmin();

    const subscriptions = await prisma.saasSubscription.findMany({
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            status: true,
            contactEmail: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const planPrices: { [key: string]: number } = {
      STARTER: 999,
      GROWTH: 2999,
      PRO: 2999,
      PROFESSIONAL: 2999,
      BUSINESS: 7999,
      ENTERPRISE: 19999
    };

    const formatted = subscriptions.map((s) => {
      const price = planPrices[s.planName.toUpperCase()] || 999;
      return {
        id: s.id,
        organizationId: s.organizationId,
        organizationName: s.organization.name,
        organizationSlug: s.organization.slug,
        contactEmail: s.organization.contactEmail,
        planName: s.planName,
        billingInterval: s.billingInterval,
        status: s.status,
        monthlyAmount: price,
        currentPeriodStart: s.currentPeriodStart,
        currentPeriodEnd: s.currentPeriodEnd,
        providerSubscriptionId: s.providerSubscriptionId,
        createdAt: s.createdAt
      };
    });

    return NextResponse.json({
      subscriptions: formatted,
      totalCount: formatted.length,
      activeCount: formatted.filter((s) => s.status === 'ACTIVE').length,
      pastDueCount: formatted.filter((s) => s.status === 'PAST_DUE').length
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

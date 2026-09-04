import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const orgId = user.organizationId;
    const body = await request.json();
    const { planSlug, billingInterval = 'MONTHLY' } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'No organization attached.' }, { status: 400 });
    }

    if (!planSlug) {
      return NextResponse.json({ error: 'planSlug is required.' }, { status: 400 });
    }

    const plan = await prisma.saaSPlan.findFirst({
      where: {
        OR: [{ slug: planSlug.toLowerCase() }, { name: planSlug }]
      }
    });

    if (!plan) {
      return NextResponse.json({ error: 'Target SaaS plan not found.' }, { status: 404 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const price = billingInterval === 'YEARLY' ? plan.yearlyPriceINR : plan.monthlyPriceINR;
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingInterval === 'YEARLY') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const invoiceNumber = `SAAS-INV-${now.getFullYear()}-${randomHex}`;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update Organization Plan & Limits
      const updatedOrg = await tx.organization.update({
        where: { id: orgId },
        data: {
          plan: plan.name.toUpperCase(),
          subscriptionStatus: 'ACTIVE',
          currentPeriodEnd: periodEnd,
          maxStudents: plan.maxStudents,
          maxCourses: plan.maxCourses,
          maxInstructors: plan.maxInstructors,
          maxStorageGB: plan.maxStorageGB
        }
      });

      // 2. Upsert SaasSubscription
      await tx.saasSubscription.upsert({
        where: { organizationId: orgId },
        create: {
          organizationId: orgId,
          planName: plan.name.toUpperCase(),
          billingInterval,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          providerSubscriptionId: `saas_sub_${Date.now()}_${randomHex}`
        },
        update: {
          planName: plan.name.toUpperCase(),
          billingInterval,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd
        }
      });

      // 3. Generate SaaS Invoice
      await tx.saasInvoice.create({
        data: {
          organizationId: orgId,
          invoiceNumber,
          amount: price,
          currency: 'INR',
          planName: plan.name.toUpperCase(),
          status: 'PAID',
          paidAt: now
        }
      });

      return updatedOrg;
    });

    await createAuditLog({
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'SAAS_PLAN_UPGRADED',
      entity: 'Organization',
      entityId: org.id,
      description: `Organization upgraded SaaS plan to "${plan.name}" (${billingInterval}). Limits updated to ${plan.maxStudents} students, ${plan.maxCourses} courses.`,
      req: request
    });

    return NextResponse.json({
      success: true,
      plan: plan.name,
      billingInterval,
      invoiceNumber,
      amount: price,
      currentPeriodEnd: periodEnd,
      message: `Successfully updated to the ${plan.name} SaaS plan!`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'SaaS checkout failed' }, { status: 500 });
  }
}

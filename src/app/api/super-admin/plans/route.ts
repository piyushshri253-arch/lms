import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';

export async function GET() {
  try {
    await requireSuperAdmin();
    let plans = await prisma.saaSPlan.findMany({
      orderBy: { monthlyPriceINR: 'asc' }
    });

    // If table empty, bootstrap default plans
    if (plans.length === 0) {
      await prisma.saaSPlan.createMany({
        data: [
          {
            name: 'Starter Workspace',
            slug: 'starter',
            description: 'Ideal for small academies and specialized teams.',
            monthlyPriceINR: 2999,
            yearlyPriceINR: 29990,
            monthlyPriceUSD: 49,
            yearlyPriceUSD: 490,
            maxStudents: 100,
            maxCourses: 10,
            maxInstructors: 2,
            maxStorageGB: 10.0,
            customDomainEnabled: false,
            customBrandingEnabled: true,
            analyticsEnabled: true,
            certificatesEnabled: true
          },
          {
            name: 'Professional LMS',
            slug: 'pro',
            description: 'For growing institutes with custom domains and advanced marketing.',
            monthlyPriceINR: 7999,
            yearlyPriceINR: 79990,
            monthlyPriceUSD: 149,
            yearlyPriceUSD: 1490,
            maxStudents: 1000,
            maxCourses: 50,
            maxInstructors: 10,
            maxStorageGB: 100.0,
            customDomainEnabled: true,
            customBrandingEnabled: true,
            analyticsEnabled: true,
            certificatesEnabled: true
          },
          {
            name: 'Enterprise Cloud',
            slug: 'enterprise',
            description: 'High-scale universities and corporate training academies.',
            monthlyPriceINR: 19999,
            yearlyPriceINR: 199990,
            monthlyPriceUSD: 399,
            yearlyPriceUSD: 3990,
            maxStudents: 10000,
            maxCourses: 500,
            maxInstructors: 50,
            maxStorageGB: 1000.0,
            customDomainEnabled: true,
            customBrandingEnabled: true,
            analyticsEnabled: true,
            certificatesEnabled: true,
            apiAccessEnabled: true
          }
        ]
      });

      plans = await prisma.saaSPlan.findMany({
        orderBy: { monthlyPriceINR: 'asc' }
      });
    }

    return NextResponse.json({ plans });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    const superAdmin = await requireSuperAdmin();
    const body = await req.json();
    const {
      name,
      slug,
      description,
      monthlyPriceINR,
      yearlyPriceINR,
      monthlyPriceUSD,
      yearlyPriceUSD,
      maxStudents,
      maxCourses,
      maxInstructors,
      maxStorageGB,
      customDomainEnabled,
      customBrandingEnabled,
      analyticsEnabled,
      certificatesEnabled,
      apiAccessEnabled
    } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Plan name and unique slug are required.' }, { status: 400 });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const plan = await prisma.saaSPlan.create({
      data: {
        name,
        slug: cleanSlug,
        description: description || '',
        monthlyPriceINR: Number(monthlyPriceINR || 0),
        yearlyPriceINR: Number(yearlyPriceINR || 0),
        monthlyPriceUSD: Number(monthlyPriceUSD || 0),
        yearlyPriceUSD: Number(yearlyPriceUSD || 0),
        maxStudents: Number(maxStudents || 100),
        maxCourses: Number(maxCourses || 10),
        maxInstructors: Number(maxInstructors || 5),
        maxStorageGB: Number(maxStorageGB || 10.0),
        customDomainEnabled: Boolean(customDomainEnabled),
        customBrandingEnabled: Boolean(customBrandingEnabled),
        analyticsEnabled: Boolean(analyticsEnabled),
        certificatesEnabled: Boolean(certificatesEnabled),
        apiAccessEnabled: Boolean(apiAccessEnabled)
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: superAdmin.id,
        adminEmail: superAdmin.email,
        action: 'CREATE_SAAS_PLAN',
        entity: 'SaaSPlan',
        entityId: plan.id,
        description: `Super Admin created SaaS plan "${plan.name}".`
      }
    });

    return NextResponse.json({ success: true, plan });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

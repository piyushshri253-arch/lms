import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    let plans = await prisma.saaSPlan.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { monthlyPriceINR: 'asc' }
    });

    // Seed standard plans if empty
    if (plans.length === 0) {
      const defaultPlans = [
        {
          name: 'Starter',
          slug: 'starter',
          description: 'Essential infrastructure for emerging academies and creators.',
          monthlyPriceINR: 999,
          yearlyPriceINR: 9990,
          monthlyPriceUSD: 19,
          yearlyPriceUSD: 190,
          maxStudents: 500,
          maxCourses: 10,
          maxInstructors: 5,
          maxStorageGB: 20.0,
          customDomainEnabled: false,
          customBrandingEnabled: true,
          analyticsEnabled: true,
          certificatesEnabled: true,
          apiAccessEnabled: false,
          status: 'ACTIVE'
        },
        {
          name: 'Growth',
          slug: 'growth',
          description: 'Scale your student community with high concurrency video delivery.',
          monthlyPriceINR: 2999,
          yearlyPriceINR: 29990,
          monthlyPriceUSD: 49,
          yearlyPriceUSD: 490,
          maxStudents: 5000,
          maxCourses: 100,
          maxInstructors: 25,
          maxStorageGB: 100.0,
          customDomainEnabled: true,
          customBrandingEnabled: true,
          analyticsEnabled: true,
          certificatesEnabled: true,
          apiAccessEnabled: true,
          status: 'ACTIVE'
        },
        {
          name: 'Business',
          slug: 'business',
          description: 'Unlimited capacity, dedicated support, and advanced enterprise architecture.',
          monthlyPriceINR: 7999,
          yearlyPriceINR: 79990,
          monthlyPriceUSD: 129,
          yearlyPriceUSD: 1290,
          maxStudents: 50000,
          maxCourses: 500,
          maxInstructors: 100,
          maxStorageGB: 500.0,
          customDomainEnabled: true,
          customBrandingEnabled: true,
          analyticsEnabled: true,
          certificatesEnabled: true,
          apiAccessEnabled: true,
          status: 'ACTIVE'
        }
      ];

      for (const p of defaultPlans) {
        await prisma.saaSPlan.create({ data: p });
      }

      plans = await prisma.saaSPlan.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { monthlyPriceINR: 'asc' }
      });
    }

    return NextResponse.json({ plans });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch SaaS plans' }, { status: 500 });
  }
}

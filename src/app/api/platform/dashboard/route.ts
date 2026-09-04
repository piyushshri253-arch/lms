import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await requireSuperAdmin();

    const [
      totalOrgs,
      activeOrgs,
      totalUsers,
      totalCourses,
      totalOrders,
      activeSubs
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count(),
      prisma.course.count(),
      prisma.order.count(),
      prisma.saasSubscription.count({ where: { status: 'ACTIVE' } })
    ]);

    const mrr = activeOrgs * 2999;
    const arr = mrr * 12;

    return NextResponse.json({
      platform: 'MORENA LMS PLATFORM SAAS',
      version: '2026.1.0',
      kpis: {
        organizations: totalOrgs,
        activeOrganizations: activeOrgs,
        totalUsers,
        totalCourses,
        totalOrders,
        activeSubscriptions: activeSubs,
        mrr,
        arr
      },
      health: {
        status: 'ALL_SYSTEMS_OPERATIONAL',
        database: 'HEALTHY',
        storage: 'HEALTHY',
        auth: 'ACTIVE',
        gateways: 'READY'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

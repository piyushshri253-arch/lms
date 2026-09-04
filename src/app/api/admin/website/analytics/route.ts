import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, resolveAdminOrganization } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const orgData = await resolveAdminOrganization(admin);
    const orgId = orgData.id;
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '30D';

    let startDate = new Date();
    if (range === 'TODAY') startDate.setHours(0, 0, 0, 0);
    else if (range === '7D') startDate.setDate(startDate.getDate() - 7);
    else if (range === '30D') startDate.setDate(startDate.getDate() - 30);
    else if (range === 'ALL') startDate = new Date(0);

    const [
      org,
      pageViews,
      courseViews,
      registrations,
      enrollments,
      orders
    ] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { websiteVisitors: true }
      }),
      prisma.websiteAnalytics.count({
        where: { organizationId: orgId, eventType: 'PAGE_VIEW', createdAt: { gte: startDate } }
      }),
      prisma.websiteAnalytics.count({
        where: { organizationId: orgId, eventType: 'COURSE_VIEW', createdAt: { gte: startDate } }
      }),
      prisma.user.count({
        where: { organizationId: orgId, role: 'STUDENT', createdAt: { gte: startDate } }
      }),
      prisma.enrollment.count({
        where: { organizationId: orgId, enrolledAt: { gte: startDate } }
      }),
      prisma.order.findMany({
        where: { organizationId: orgId, status: 'SUCCESS', createdAt: { gte: startDate } },
        select: { amount: true }
      })
    ]);

    const totalVisitors = Math.max(org?.websiteVisitors || 0, pageViews);
    const totalSales = orders.reduce((sum, o) => sum + o.amount, 0);
    const conversionRate = totalVisitors > 0 ? Number(((enrollments / totalVisitors) * 100).toFixed(1)) : 0.0;

    return NextResponse.json({
      analytics: {
        websiteVisitors: totalVisitors,
        pageViews,
        courseViews,
        registrations,
        enrollments,
        totalSales: Math.round(totalSales * 100) / 100,
        conversionRate,
        range
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';
import { sendMultiChannelNotification } from '@/lib/notifications';

// GET: List all tenant organizations with stats
export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const plan = searchParams.get('plan');
    const status = searchParams.get('status');

    const where: any = {};
    if (plan && plan !== 'ALL') where.plan = plan;
    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } }
      ];
    }

    const organizations = await prisma.organization.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            courses: true,
            enrollments: true,
            orders: true
          }
        },
        users: {
          where: { role: 'ADMIN' },
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mapped = organizations.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      subdomain: org.subdomain,
      status: org.status,
      plan: org.plan,
      subscriptionStatus: org.subscriptionStatus,
      isFreeAccess: org.isFreeAccess,
      freeUntil: org.freeUntil,
      trialEndsAt: org.trialEndsAt,
      maxStudents: org.maxStudents,
      maxCourses: org.maxCourses,
      maxStorageGB: org.maxStorageGB,
      usedStorageGB: org.usedStorageGB,
      admins: org.users,
      totalUsers: org._count.users,
      totalCourses: org._count.courses,
      totalEnrollments: org._count.enrollments,
      totalOrders: org._count.orders,
      createdAt: org.createdAt
    }));

    return NextResponse.json({ organizations: mapped });
  } catch (err: any) {
    const isForbidden = err.message?.includes('forbidden') || err.message?.includes('Super Administrator');
    return NextResponse.json({ error: err.message }, { status: isForbidden ? 403 : 500 });
  }
}

// PUT: Update Organization Status / Plan / Free Access / Limits
export async function PUT(request: Request) {
  try {
    const superAdmin = await requireSuperAdmin();
    const body = await request.json();
    const {
      organizationId,
      status,
      plan,
      isFreeAccess,
      freeUntil,
      maxStudents,
      maxCourses,
      maxStorageGB
    } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (plan !== undefined) data.plan = plan;
    if (maxStudents !== undefined) data.maxStudents = Number(maxStudents);
    if (maxCourses !== undefined) data.maxCourses = Number(maxCourses);
    if (maxStorageGB !== undefined) data.maxStorageGB = Number(maxStorageGB);

    // Free Access Logic (Section 25)
    if (isFreeAccess !== undefined) {
      data.isFreeAccess = Boolean(isFreeAccess);
      if (data.isFreeAccess) {
        data.subscriptionStatus = 'FREE';
        data.freeUntil = freeUntil ? new Date(freeUntil) : null;
      } else {
        data.subscriptionStatus = 'ACTIVE';
        data.freeUntil = null;
      }
    }

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data,
      include: {
        users: {
          where: { role: 'ADMIN' },
          select: { id: true, email: true, name: true }
        }
      }
    });

    // Log Audit Trail
    await prisma.auditLog.create({
      data: {
        organizationId: updated.id,
        adminId: superAdmin.id,
        adminEmail: superAdmin.email,
        action: isFreeAccess ? 'FREE_ACCESS_GRANTED' : 'ORGANIZATION_UPDATED',
        entity: 'Organization',
        entityId: updated.id,
        description: `Super Admin updated organization "${updated.name}" (Status: ${updated.status}, Plan: ${updated.plan}, FreeAccess: ${updated.isFreeAccess}).`
      }
    });

    // Notify Organization Owner
    if (updated.users.length > 0) {
      const owner = updated.users[0];
      await sendMultiChannelNotification({
        userId: owner.id,
        organizationId: updated.id,
        title: 'Organization Subscription Updated',
        message: `Your organization "${updated.name}" has been updated to the ${updated.plan} plan${updated.isFreeAccess ? ' with full Free Access granted.' : '.'}`,
        type: 'SYSTEM',
        category: 'BILLING',
        channels: ['IN_APP', 'EMAIL']
      });
    }

    return NextResponse.json({
      organization: updated,
      message: `Organization "${updated.name}" updated successfully.`
    });
  } catch (err: any) {
    const isForbidden = err.message?.includes('forbidden') || err.message?.includes('Super Administrator');
    return NextResponse.json({ error: err.message }, { status: isForbidden ? 403 : 500 });
  }
}

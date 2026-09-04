import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const orgId = user.organizationId;

    if (!orgId) {
      return NextResponse.json({ error: 'No organization attached.' }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        saasSubscription: true,
        saasInvoices: { orderBy: { paidAt: 'desc' }, take: 5 },
        _count: {
          select: {
            users: true,
            courses: true
          }
        }
      }
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const studentCount = await prisma.user.count({
      where: { organizationId: orgId, role: 'STUDENT' }
    });

    const instructorCount = await prisma.user.count({
      where: { organizationId: orgId, role: { in: ['INSTRUCTOR', 'ADMIN'] } }
    });

    const courseCount = await prisma.course.count({
      where: { organizationId: orgId }
    });

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        subscriptionStatus: org.subscriptionStatus,
        freeUntil: org.freeUntil,
        currentPeriodEnd: org.currentPeriodEnd
      },
      subscription: org.saasSubscription,
      invoices: org.saasInvoices,
      limits: {
        students: { used: studentCount, max: org.maxStudents, percent: Math.round((studentCount / Math.max(1, org.maxStudents)) * 100) },
        courses: { used: courseCount, max: org.maxCourses, percent: Math.round((courseCount / Math.max(1, org.maxCourses)) * 100) },
        instructors: { used: instructorCount, max: org.maxInstructors, percent: Math.round((instructorCount / Math.max(1, org.maxInstructors)) * 100) },
        storageGB: { used: org.usedStorageGB, max: org.maxStorageGB, percent: Math.round((org.usedStorageGB / Math.max(1, org.maxStorageGB)) * 100) }
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export const ALL_AVAILABLE_PERMISSIONS = [
  'courses.view',
  'courses.create',
  'courses.edit',
  'courses.publish',
  'courses.delete',
  'students.view',
  'students.create',
  'students.edit',
  'students.suspend',
  'orders.view',
  'orders.refund',
  'analytics.view',
  'analytics.revenue',
  'website.edit',
  'website.publish',
  'billing.view',
  'billing.manage',
  'media.upload',
  'media.delete',
  'announcements.send',
  'assignments.grade'
];

export async function GET() {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const orgId = user.organizationId;

    const customRoles = await prisma.customRole.findMany({
      where: { organizationId: orgId || undefined },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({
      availablePermissions: ALL_AVAILABLE_PERMISSIONS,
      customRoles: customRoles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: JSON.parse(r.permissions || '[]'),
        createdAt: r.createdAt
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const orgId = user.organizationId;
    const body = await request.json();

    const { name, description, permissions } = body;

    if (!name || !Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Role name and permissions array are required' }, { status: 400 });
    }

    const role = await prisma.customRole.upsert({
      where: { organizationId_name: { organizationId: orgId!, name } },
      create: {
        organizationId: orgId!,
        name,
        description,
        permissions: JSON.stringify(permissions)
      },
      update: {
        description,
        permissions: JSON.stringify(permissions)
      }
    });

    // Record Audit Log
    await createAuditLog({
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'CREATE_CUSTOM_ROLE',
      entity: 'CustomRole',
      entityId: role.id,
      description: `Created or updated custom role "${role.name}" with permissions: ${role.permissions}`
    });

    return NextResponse.json({
      message: 'Custom role saved successfully',
      role: {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: JSON.parse(role.permissions)
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

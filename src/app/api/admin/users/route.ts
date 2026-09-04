import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const role = searchParams.get('role');

    const where: any = {};

    // Strict Tenant Isolation
    if (admin.role !== 'SUPER_ADMIN' && admin.organizationId) {
      where.organizationId = admin.organizationId;
    }

    if (role && role !== 'ALL') {
      where.role = role;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        status: true,
        isSuspended: true,
        createdAt: true,
        organizationId: true,
        _count: {
          select: {
            enrollments: true,
            coursesAuthored: true,
            orders: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const { userId, role, isSuspended, status } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Tenant boundary check
    if (admin.role !== 'SUPER_ADMIN' && targetUser.organizationId !== admin.organizationId) {
      return NextResponse.json({ error: 'Forbidden: Cannot manage user belonging to another organization.' }, { status: 403 });
    }

    const newStatus = isSuspended ? 'SUSPENDED' : status !== undefined ? status : undefined;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        role: role !== undefined ? role : undefined,
        isSuspended: isSuspended !== undefined ? isSuspended : undefined,
        status: newStatus
      },
      select: { id: true, name: true, email: true, role: true, isSuspended: true, status: true }
    });

    // Update OrganizationMember record status/role
    if (targetUser.organizationId) {
      await prisma.organizationMember.updateMany({
        where: {
          organizationId: targetUser.organizationId,
          userId: targetUser.id
        },
        data: {
          role: role !== undefined ? role : undefined,
          status: newStatus || undefined
        }
      });
    }

    await createAuditLog({
      organizationId: admin.organizationId,
      actorId: admin.id,
      actorEmail: admin.email,
      action: isSuspended ? 'USER_SUSPENDED' : 'USER_UPDATED',
      entity: 'User',
      entityId: targetUser.id,
      description: `Admin updated user "${targetUser.name}" (${targetUser.email}). Status: ${newStatus || 'ACTIVE'}, Role: ${role || targetUser.role}`,
      req: request
    });

    return NextResponse.json({ user: updated, message: 'User updated successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (admin.role !== 'SUPER_ADMIN' && targetUser.organizationId !== admin.organizationId) {
      return NextResponse.json({ error: 'Forbidden: Cannot delete user belonging to another organization.' }, { status: 403 });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    await createAuditLog({
      organizationId: admin.organizationId,
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'USER_DELETED',
      entity: 'User',
      entityId: userId,
      description: `Admin deleted user "${targetUser.name}" (${targetUser.email}).`,
      req: request
    });

    return NextResponse.json({ message: 'User deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const orgId = user.organizationId;
    if (!orgId && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No organization scope found' }, { status: 400 });
    }

    const where: any = {};
    if (user.role !== 'SUPER_ADMIN' || orgId) {
      where.organizationId = orgId;
    }

    const licenses = await prisma.softwareLicense.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, version: true, type: true }
        },
        user: {
          select: { id: true, name: true, email: true }
        },
        activations: {
          orderBy: { activatedAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const stats = {
      total: licenses.length,
      active: licenses.filter((l) => l.status === 'ACTIVE').length,
      expired: licenses.filter((l) => l.status === 'EXPIRED').length,
      revoked: licenses.filter((l) => l.status === 'REVOKED').length,
      totalActivations: licenses.reduce((sum, l) => sum + (l.currentActivations || 0), 0)
    };

    return NextResponse.json({ licenses, stats });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch licenses' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const body = await req.json();
    const { licenseId, status, maxActivations, expiresAt } = body;

    if (!licenseId) {
      return NextResponse.json({ error: 'licenseId is required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.softwareLicense.findUnique({
      where: { id: licenseId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    if (user.role !== 'SUPER_ADMIN' && existing.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Forbidden: You cannot modify another organization license' }, { status: 403 });
    }

    const updated = await prisma.softwareLicense.update({
      where: { id: licenseId },
      data: {
        status: status || existing.status,
        maxActivations: maxActivations !== undefined ? Number(maxActivations) : existing.maxActivations,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : existing.expiresAt
      }
    });

    await logAudit({
      organizationId: existing.organizationId,
      adminId: user.id,
      adminEmail: user.email,
      action: 'LICENSE_UPDATED',
      entity: 'SoftwareLicense',
      entityId: updated.id,
      description: `Updated license ${updated.licenseKey} status to ${updated.status}`
    });

    return NextResponse.json({ success: true, license: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update license' }, { status: 500 });
  }
}

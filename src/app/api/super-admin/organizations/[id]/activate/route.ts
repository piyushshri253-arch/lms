import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireSuperAdmin();
    const { id } = await params;

    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const updatedOrg = await prisma.organization.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        subscriptionStatus: 'ACTIVE'
      }
    });

    // Reactivate tenant users
    await prisma.user.updateMany({
      where: { organizationId: id, isSuspended: true },
      data: { isSuspended: false }
    });

    await createAuditLog({
      organizationId: id,
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'ACTIVATE_ORGANIZATION',
      entity: 'Organization',
      entityId: id,
      description: `Super Admin reactivated organization "${org.name}".`
    });

    return NextResponse.json({
      success: true,
      message: `Organization "${org.name}" has been activated.`,
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        status: updatedOrg.status
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

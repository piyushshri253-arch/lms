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
    const body = await request.json();

    const { reason = 'Administrative', details } = body;

    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // 1. Update Organization Status to SUSPENDED
    const updatedOrg = await prisma.organization.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        subscriptionStatus: 'PAST_DUE'
      }
    });

    // 2. Invalidate all user sessions in the organization
    await prisma.user.updateMany({
      where: { organizationId: id },
      data: { isSuspended: true, sessionVersion: { increment: 1 } }
    });

    // 3. Record Structured Platform Audit Log
    await createAuditLog({
      organizationId: id,
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'SUSPEND_ORGANIZATION',
      entity: 'Organization',
      entityId: id,
      description: `Super Admin suspended organization "${org.name}". Reason: ${reason}. Details: ${details || 'None'}`
    });

    return NextResponse.json({
      success: true,
      message: `Organization "${org.name}" has been suspended. All active sessions invalidated.`,
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        status: updatedOrg.status,
        reason
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

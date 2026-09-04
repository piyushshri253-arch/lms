import { NextResponse } from 'next/server';
import { requireAuth, validateTenantOwnership } from '@/lib/auth';
import { exportUserDataArchive } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const currentUser = await requireAuth();
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId') || currentUser.id;

    // Student can only export their own data; Admin can export tenant student data
    if (targetUserId !== currentUser.id) {
      if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const archive = await exportUserDataArchive(targetUserId);

    if (currentUser.organizationId) {
      await createAuditLog({
        organizationId: currentUser.organizationId,
        actorId: currentUser.id,
        actorEmail: currentUser.email,
        action: 'PRIVACY_DATA_EXPORTED',
        entity: 'User',
        entityId: targetUserId,
        description: `User privacy archive exported for user ID ${targetUserId}.`,
        req: request
      });
    }

    return NextResponse.json(archive);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

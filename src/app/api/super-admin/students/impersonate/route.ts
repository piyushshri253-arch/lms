import { NextResponse } from 'next/server';
import { requireSuperAdmin, setSessionCookie, createSessionToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const superAdmin = await requireSuperAdmin();
    const body = await request.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target User ID is required' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
        platform: true,
        role: true,
        organizationId: true,
        avatar: true,
        isSuspended: true,
        organization: {
          select: { id: true, name: true, slug: true, plan: true, status: true }
        }
      }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    if (targetUser.isSuspended) {
      return NextResponse.json({ error: 'Cannot impersonate a suspended user' }, { status: 400 });
    }

    // Save super admin original token in impersonation cookie
    const cookieStore = await cookies();
    const superAdminToken = await createSessionToken(superAdmin);
    cookieStore.set('aadhyara_impersonation_token', superAdminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 2
    });

    // Set active session as target user with impersonation metadata
    await setSessionCookie({
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      platform: (targetUser.platform as any) || 'LMS',
      role: targetUser.role as any,
      organizationId: targetUser.organizationId,
      organizationName: targetUser.organization?.name,
      organizationSlug: targetUser.organization?.slug,
      organizationStatus: targetUser.organization?.status,
      plan: targetUser.organization?.plan,
      avatar: targetUser.avatar,
      impersonatedBy: {
        id: superAdmin.id,
        name: superAdmin.name,
        email: superAdmin.email
      }
    });

    // Log in ImpersonationLog & AuditLog
    await prisma.impersonationLog.create({
      data: {
        superAdminId: superAdmin.id,
        superAdminEmail: superAdmin.email,
        targetUserId: targetUser.id,
        targetUserName: targetUser.name,
        targetUserRole: targetUser.role,
        action: 'START'
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: targetUser.organizationId,
        adminId: superAdmin.id,
        adminEmail: superAdmin.email,
        action: 'START_IMPERSONATION',
        entity: 'User',
        entityId: targetUser.id,
        description: `Super Admin ${superAdmin.name} initiated support mode for ${targetUser.name} (${targetUser.email}).`
      }
    });

    const redirectUrl = targetUser.role === 'ADMIN' ? '/admin' : '/dashboard';

    return NextResponse.json({
      message: `Support Mode active for ${targetUser.name}`,
      redirectUrl,
      targetUser
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

import { NextResponse } from 'next/server';
import { verifySessionToken, setSessionCookie, getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const currentUser = await getCurrentUser();
    const cookieStore = await cookies();
    const impersonationToken =
      cookieStore.get('aadhyara_impersonation_token')?.value ||
      cookieStore.get('morena_impersonation_token')?.value;

    if (!impersonationToken) {
      // Fallback: lookup Super Admin in database
      const superAdmin = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' }
      });

      if (superAdmin) {
        await setSessionCookie({
          id: superAdmin.id,
          name: superAdmin.name,
          email: superAdmin.email,
          platform: 'LMS',
          role: 'SUPER_ADMIN',
          avatar: superAdmin.avatar
        });

        cookieStore.delete('aadhyara_impersonation_token');
        cookieStore.delete('morena_impersonation_token');

        return NextResponse.json({
          message: 'Exited support mode. Super Admin session restored.',
          redirectUrl: '/super-admin'
        });
      }

      return NextResponse.json({ error: 'No active support mode session found.' }, { status: 400 });
    }

    const superAdminSession = await verifySessionToken(impersonationToken);
    if (!superAdminSession) {
      return NextResponse.json({ error: 'Invalid super admin session token.' }, { status: 400 });
    }

    // Restore super admin cookie
    await setSessionCookie(superAdminSession);
    cookieStore.delete('aadhyara_impersonation_token');
    cookieStore.delete('morena_impersonation_token');

    // Log exit
    if (currentUser) {
      await prisma.impersonationLog.create({
        data: {
          superAdminId: superAdminSession.id,
          superAdminEmail: superAdminSession.email,
          targetUserId: currentUser.id,
          targetUserName: currentUser.name,
          targetUserRole: currentUser.role,
          action: 'END'
        }
      });

      await prisma.auditLog.create({
        data: {
          organizationId: currentUser.organizationId || null,
          adminId: superAdminSession.id,
          adminEmail: superAdminSession.email,
          action: 'EXIT_IMPERSONATION',
          entity: 'User',
          entityId: currentUser.id,
          description: `Super Admin ${superAdminSession.name} exited support mode for ${currentUser.name}.`
        }
      });
    }

    return NextResponse.json({
      message: 'Support mode exited successfully. Restored Super Administrator session.',
      redirectUrl: '/super-admin'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

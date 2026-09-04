import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, clearSessionCookie } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    // Increment sessionVersion in database to invalidate all active JWT sessions across devices
    await prisma.user.update({
      where: { id: user.id },
      data: {
        sessionVersion: { increment: 1 }
      }
    });

    // Clear current cookie
    await clearSessionCookie();

    // Log Security Event
    await logSecurityEvent({
      userId: user.id,
      email: user.email,
      eventType: 'LOGOUT_ALL',
      req,
      metadata: { reason: 'USER_INITIATED_ALL_DEVICES_LOGOUT' }
    });

    return NextResponse.json({
      success: true,
      message: 'All active sessions on all devices have been revoked.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to logout from all devices.' }, { status: 401 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, getCurrentUser } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/security';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (user) {
      // Invalidate session version in database so old JWT tokens are instantly rejected
      await prisma.user.update({
        where: { id: user.id },
        data: { sessionVersion: { increment: 1 } }
      }).catch(() => {});

      await logSecurityEvent({
        userId: user.id,
        email: user.email,
        eventType: 'LOGOUT',
        req
      });
    }

    await clearSessionCookie();
    return NextResponse.json({ success: true, message: 'Logged out successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

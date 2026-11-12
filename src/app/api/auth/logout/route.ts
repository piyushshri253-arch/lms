import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, getCurrentUser, getReviewerCurrentUser } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/security';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    let portal = req.nextUrl.searchParams.get('portal')?.toUpperCase();
    let reason = req.nextUrl.searchParams.get('reason');
    if (!portal || !reason) {
      try {
        const body = await req.json();
        if (!portal) portal = body.portal?.toUpperCase();
        if (!reason) reason = body.reason;
      } catch {}
    }

    const user = portal === 'REVIEWER'
      ? (await getReviewerCurrentUser())
      : await getCurrentUser();

    if (user) {
      await logSecurityEvent({
        userId: user.id,
        email: user.email,
        eventType: reason === 'inactivity' ? 'LOGOUT_INACTIVITY' : 'LOGOUT',
        req,
        metadata: { reason: reason || 'user_action' }
      });
    }

    await clearSessionCookie(portal);
    return NextResponse.json({ success: true, message: 'Logged out successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

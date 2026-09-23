import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, getCurrentUser, getReviewerCurrentUser } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/security';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    let portal = req.nextUrl.searchParams.get('portal')?.toUpperCase();
    if (!portal) {
      try {
        const body = await req.json();
        portal = body.portal?.toUpperCase();
      } catch {}
    }

    const user = portal === 'REVIEWER'
      ? (await getReviewerCurrentUser())
      : await getCurrentUser();

    if (user) {
      await logSecurityEvent({
        userId: user.id,
        email: user.email,
        eventType: 'LOGOUT',
        req
      });
    }

    await clearSessionCookie(portal);
    return NextResponse.json({ success: true, message: 'Logged out successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

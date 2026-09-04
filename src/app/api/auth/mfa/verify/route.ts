import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { verifyMfaTotp, logSecurityEvent } from '@/lib/security';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { code, secret } = body;

    if (!code || !secret) {
      return NextResponse.json({ error: 'MFA Code and Secret are required' }, { status: 400 });
    }

    const isValid = verifyMfaTotp(code, secret);
    if (!isValid) {
      await logSecurityEvent({
        userId: user.id,
        email: user.email,
        eventType: 'MFA_VERIFICATION_FAILED',
        req: request
      });
      return NextResponse.json({ error: 'Invalid MFA verification code' }, { status: 400 });
    }

    await logSecurityEvent({
      userId: user.id,
      email: user.email,
      eventType: 'MFA_ENABLED',
      req: request
    });

    return NextResponse.json({ success: true, message: 'Two-Factor Authentication successfully enabled' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

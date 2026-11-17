import { NextRequest, NextResponse } from 'next/server';
import {
  GOOGLE_SIGNUP_PREFILL_COOKIE,
  verifyGoogleSignupPrefillToken
} from '@/lib/google-oauth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(GOOGLE_SIGNUP_PREFILL_COOKIE)?.value;
  const payload = await verifyGoogleSignupPrefillToken(token);

  if (!payload) {
    return NextResponse.json({ verified: false }, { status: 200 });
  }

  return NextResponse.json(
    {
      verified: true,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      name: payload.name,
      avatar: payload.avatar || null
    },
    { status: 200 }
  );
}

export async function DELETE() {
  const res = NextResponse.json({ cleared: true });
  res.cookies.delete(GOOGLE_SIGNUP_PREFILL_COOKIE);
  return res;
}

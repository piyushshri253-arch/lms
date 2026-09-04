import { NextResponse } from 'next/server';
import { clearLmsSessionCookie } from '@/lib/auth';

export async function POST() {
  await clearLmsSessionCookie();
  return NextResponse.json({
    success: true,
    platform: 'LMS',
    redirectUrl: '/lms/login',
    message: 'Logged out of AADHYARA Learning successfully.'
  });
}

export async function GET(req: Request) {
  await clearLmsSessionCookie();
  const url = new URL('/lms/login', req.url);
  return NextResponse.redirect(url);
}

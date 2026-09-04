import { NextResponse } from 'next/server';
import { clearSalesSessionCookie } from '@/lib/auth';

export async function POST() {
  await clearSalesSessionCookie();
  return NextResponse.json({
    success: true,
    platform: 'SALES',
    redirectUrl: '/sales/login',
    message: 'Logged out of Sales platform successfully.'
  });
}

export async function GET(req: Request) {
  await clearSalesSessionCookie();
  const url = new URL('/sales/login', req.url);
  return NextResponse.redirect(url);
}

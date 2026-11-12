import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentUser,
  verifySessionToken,
  LMS_COOKIE_NAME,
  SALES_COOKIE_NAME,
  REVIEWER_COOKIE_NAME,
  LEGACY_COOKIE_NAME,
  SESSION_ACTIVITY_COOKIE_NAME,
  IDLE_TIMEOUT_MS
} from '@/lib/auth';

async function resolveUserFromRequest(req: NextRequest) {
  const token =
    req.cookies.get(LMS_COOKIE_NAME)?.value ||
    req.cookies.get(REVIEWER_COOKIE_NAME)?.value ||
    req.cookies.get(SALES_COOKIE_NAME)?.value ||
    req.cookies.get(LEGACY_COOKIE_NAME)?.value;

  if (token) {
    const user = await verifySessionToken(token);
    if (user) return user;
  }

  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { active: false, expired: true, error: 'Session expired. Please log in again.' },
        { status: 401 }
      );
    }

    const now = Date.now();
    const res = NextResponse.json({
      success: true,
      active: true,
      timestamp: now,
      idleTimeoutMs: IDLE_TIMEOUT_MS
    });

    res.cookies.set(SESSION_ACTIVITY_COOKIE_NAME, String(now), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update activity.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await resolveUserFromRequest(req);
    const lastActivityCookie = req.cookies.get(SESSION_ACTIVITY_COOKIE_NAME)?.value;
    const lastActivity = lastActivityCookie ? Number(lastActivityCookie) : Date.now();
    const elapsed = Math.max(0, Date.now() - lastActivity);
    const remaining = Math.max(0, IDLE_TIMEOUT_MS - elapsed);
    const isExpired = elapsed > IDLE_TIMEOUT_MS;

    return NextResponse.json({
      authenticated: !!user,
      lastActivity,
      elapsedMs: elapsed,
      remainingMs: remaining,
      idleTimeoutMs: IDLE_TIMEOUT_MS,
      isExpired
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to check activity.' }, { status: 500 });
  }
}

import { SignJWT, jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'morena-teach-saas-production-secure-jwt-key-2026'
);

export const GOOGLE_OAUTH_STATE_COOKIE = 'mt_google_oauth_state';
export const GOOGLE_SIGNUP_PREFILL_COOKIE = 'mt_google_signup_token';

export type GoogleOAuthPortal = 'INSTRUCTOR' | 'STUDENT' | 'SEO';

export interface GoogleOAuthStatePayload {
  nonce: string;
  intent: 'signin' | 'signup';
  portal: GoogleOAuthPortal;
  callbackUrl: string;
}

export interface GoogleSignupPrefillPayload {
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  avatar: string | null;
  googleSub: string;
  verified: true;
}

export function getRequestOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  if (forwardedHost) {
    return `${forwardedProto || 'https'}://${forwardedHost}`;
  }
  const host = req.headers.get('host');
  if (host) {
    const isLocal = host.includes('localhost') || host.startsWith('127.0.0.1');
    return `${isLocal ? 'http' : forwardedProto || 'https'}://${host}`;
  }
  return req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export function getGoogleOAuthConfig(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || '';
  const origin = getRequestOrigin(req);
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() || `${origin}/api/auth/google/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    origin,
    isConfigured: Boolean(clientId && clientSecret)
  };
}

export function sanitizeInternalPath(rawPath: string | null | undefined, fallback: string): string {
  if (!rawPath) return fallback;
  const trimmed = rawPath.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) {
    return fallback;
  }
  return trimmed;
}

export async function createGoogleOAuthStateToken(payload: GoogleOAuthStatePayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(JWT_SECRET);
}

export async function verifyGoogleOAuthStateToken(
  token?: string
): Promise<GoogleOAuthStatePayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as GoogleOAuthStatePayload;
  } catch {
    return null;
  }
}

export async function createGoogleSignupPrefillToken(
  payload: GoogleSignupPrefillPayload
): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(JWT_SECRET);
}

export async function verifyGoogleSignupPrefillToken(
  token?: string
): Promise<GoogleSignupPrefillPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload || payload.verified !== true || typeof payload.email !== 'string') {
      return null;
    }
    return payload as unknown as GoogleSignupPrefillPayload;
  } catch {
    return null;
  }
}

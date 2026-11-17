import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  GoogleOAuthPortal,
  createGoogleOAuthStateToken,
  getGoogleOAuthConfig,
  sanitizeInternalPath
} from '@/lib/google-oauth';

export async function GET(req: NextRequest) {
  const { clientId, redirectUri, origin, isConfigured } = getGoogleOAuthConfig(req);
  const intentParam = req.nextUrl.searchParams.get('intent');
  const portalParam = req.nextUrl.searchParams.get('portal');
  const intent: 'signin' | 'signup' = intentParam === 'signup' ? 'signup' : 'signin';
  const portalParamUpper = portalParam?.toUpperCase();
  const portal: GoogleOAuthPortal =
    portalParamUpper === 'STUDENT'
      ? 'STUDENT'
      : portalParamUpper === 'SEO'
      ? 'SEO'
      : 'INSTRUCTOR';

  const defaultCallback =
    portal === 'STUDENT'
      ? '/student/learning'
      : portal === 'SEO'
      ? '/seo'
      : '/instructor/dashboard';
  const callbackUrl = sanitizeInternalPath(
    req.nextUrl.searchParams.get('callbackUrl'),
    defaultCallback
  );

  if (!isConfigured) {
    const targetLoginPath =
      portal === 'STUDENT'
        ? intent === 'signup'
          ? '/register'
          : '/login'
        : '/instructor/login';
    const fallbackUrl = new URL(targetLoginPath, origin);
    if (portal === 'INSTRUCTOR' && intent === 'signup') {
      fallbackUrl.searchParams.set('mode', 'signup');
    }
    fallbackUrl.searchParams.set('googleError', 'NOT_CONFIGURED');
    return NextResponse.redirect(fallbackUrl);
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const stateToken = await createGoogleOAuthStateToken({
    nonce,
    intent,
    portal,
    callbackUrl
  });

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  if (portal === 'SEO') {
    authUrl.searchParams.set(
      'scope',
      'openid email profile https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly'
    );
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent select_account');
  } else {
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('prompt', 'select_account');
  }
  authUrl.searchParams.set('state', stateToken);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, stateToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10
  });
  return response;
}

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  AuthSessionUser,
  IMPERSONATION_COOKIE,
  LEGACY_COOKIE_NAME,
  LEGACY_IMPERSONATION_COOKIE,
  LMS_COOKIE_NAME,
  SALES_COOKIE_NAME,
  SESSION_ACTIVITY_COOKIE_NAME,
  createSessionToken
} from '@/lib/auth';
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_SIGNUP_PREFILL_COOKIE,
  GoogleOAuthPortal,
  createGoogleSignupPrefillToken,
  getGoogleOAuthConfig,
  sanitizeInternalPath,
  verifyGoogleOAuthStateToken
} from '@/lib/google-oauth';
import { DEFAULT_ROLE_PERMISSIONS, UserRole } from '@/lib/permissions';
import { hashPassword, logSecurityEvent } from '@/lib/security';
import { createAuditLog } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { finalizeVerifiedSignup } from '@/lib/signup-finalizer';

function buildLoginErrorRedirect(
  origin: string,
  code: string,
  portal: GoogleOAuthPortal = 'INSTRUCTOR',
  intent: 'signin' | 'signup' = 'signin',
  email?: string
) {
  const path =
    portal === 'STUDENT'
      ? intent === 'signup'
        ? '/register'
        : '/login'
      : '/instructor/login';
  const url = new URL(path, origin);
  if (portal === 'INSTRUCTOR' && intent === 'signup') {
    url.searchParams.set('mode', 'signup');
  }
  url.searchParams.set('googleError', code);
  if (email) url.searchParams.set('email', email);
  const res = NextResponse.redirect(url);
  res.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
  return res;
}

async function createLmsLoginRedirectResponse(params: {
  req: NextRequest;
  origin: string;
  user: any;
  avatar: string | null;
  targetPath: string;
  skipLoginSideEffects?: boolean;
}) {
  const { req, origin, user, avatar, targetPath, skipLoginSideEffects } = params;
  const email = user.email;

  let parsedPermissions: string[] = [];
  try {
    parsedPermissions = JSON.parse(user.permissions || '[]');
    if (parsedPermissions.length === 0) {
      parsedPermissions = DEFAULT_ROLE_PERMISSIONS[user.role as UserRole] || [];
    }
  } catch {
    parsedPermissions = DEFAULT_ROLE_PERMISSIONS[user.role as UserRole] || [];
  }

  const sessionUser: AuthSessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    platform: 'LMS',
    role: user.role as UserRole,
    organizationId: user.organizationId || null,
    organizationName: user.organization?.name || null,
    organizationSlug: user.organization?.slug || null,
    organizationStatus: user.organization?.status || null,
    plan: user.organization?.plan || null,
    avatar: user.avatar || avatar,
    phone: user.phone,
    customRole: user.customRole,
    permissions: parsedPermissions,
    status: user.status,
    emailVerified: true,
    sessionVersion: user.sessionVersion
  };

  const token = await createSessionToken(sessionUser);
  const res = NextResponse.redirect(new URL(targetPath, origin));

  res.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
  res.cookies.delete(SALES_COOKIE_NAME);
  res.cookies.delete(IMPERSONATION_COOKIE);
  res.cookies.delete(LEGACY_IMPERSONATION_COOKIE);

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  };
  res.cookies.set(LMS_COOKIE_NAME, token, cookieOpts);
  res.cookies.set(LEGACY_COOKIE_NAME, token, cookieOpts);
  res.cookies.set(SESSION_ACTIVITY_COOKIE_NAME, String(Date.now()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24
  });

  if (!skipLoginSideEffects) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    await logSecurityEvent({
      userId: user.id,
      email,
      eventType: 'LOGIN_SUCCESS',
      req,
      metadata: { role: user.role, method: 'GOOGLE_OAUTH' }
    }).catch(() => {});

    if (user.organizationId) {
      await createAuditLog({
        organizationId: user.organizationId,
        actorId: user.id,
        actorEmail: email,
        action: 'USER_LOGIN',
        entity: 'User',
        entityId: user.id,
        description: `User "${user.name}" (${user.role}) logged in via Google OAuth.`,
        req
      }).catch(() => {});
    }

    sendEmail({
      to: email,
      subject: 'New Google Sign-In to your Morena Teach account',
      template: 'LOGIN_ALERT',
      userId: user.id,
      data: {
        name: user.name,
        ipAddress: ip,
        userAgent: req.headers.get('user-agent') || 'Browser'
      }
    }).catch(() => {});
  }

  return res;
}

export async function GET(req: NextRequest) {
  const { clientId, clientSecret, redirectUri, origin, isConfigured } = getGoogleOAuthConfig(req);
  const stateCookie = req.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const stateParam = req.nextUrl.searchParams.get('state');
  const oauthError = req.nextUrl.searchParams.get('error');
  const code = req.nextUrl.searchParams.get('code');

  const verifiedState = await verifyGoogleOAuthStateToken(stateParam || undefined);
  const intent: 'signin' | 'signup' = verifiedState?.intent === 'signup' ? 'signup' : 'signin';
  const portal: GoogleOAuthPortal =
    verifiedState?.portal === 'STUDENT'
      ? 'STUDENT'
      : verifiedState?.portal === 'SEO'
      ? 'SEO'
      : 'INSTRUCTOR';

  if (!isConfigured) {
    return buildLoginErrorRedirect(origin, 'NOT_CONFIGURED', portal, intent);
  }

  if (oauthError) {
    return buildLoginErrorRedirect(
      origin,
      oauthError === 'access_denied' ? 'CANCELLED' : 'OAUTH_FAILED',
      portal,
      intent
    );
  }

  if (!code || !stateParam || !stateCookie || stateCookie !== stateParam || !verifiedState) {
    return buildLoginErrorRedirect(origin, 'INVALID_STATE', portal, intent);
  }

  try {
    // 1. Exchange authorization code for Google tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }),
      cache: 'no-store'
    });

    if (!tokenRes.ok) {
      return buildLoginErrorRedirect(origin, 'TOKEN_EXCHANGE_FAILED', portal, intent);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData?.access_token;
    if (!accessToken) {
      return buildLoginErrorRedirect(origin, 'TOKEN_EXCHANGE_FAILED', portal, intent);
    }

    // 2. Retrieve verified Google profile
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store'
    });

    if (!userInfoRes.ok) {
      return buildLoginErrorRedirect(origin, 'PROFILE_FETCH_FAILED', portal, intent);
    }

    const googleUser = await userInfoRes.json();
    const email = typeof googleUser?.email === 'string' ? googleUser.email.toLowerCase().trim() : '';
    const isEmailVerified = googleUser?.email_verified === true || googleUser?.email_verified === 'true';

    if (!email || !isEmailVerified) {
      return buildLoginErrorRedirect(origin, 'UNVERIFIED_EMAIL', portal, intent);
    }

    const fullName =
      typeof googleUser?.name === 'string' && googleUser.name.trim()
        ? googleUser.name.trim()
        : email.split('@')[0];
    const givenName =
      typeof googleUser?.given_name === 'string' && googleUser.given_name.trim()
        ? googleUser.given_name.trim()
        : fullName.split(' ')[0] || '';
    const familyName =
      typeof googleUser?.family_name === 'string' && googleUser.family_name.trim()
        ? googleUser.family_name.trim()
        : fullName.split(' ').slice(1).join(' ') || '';
    const avatar = typeof googleUser?.picture === 'string' ? googleUser.picture : null;
    const googleSub = typeof googleUser?.sub === 'string' ? googleUser.sub : email;

    // Special handler: If Google OAuth was initiated from SEO Portal to connect Search Console & GA4
    if (portal === 'SEO') {
      const refreshToken = tokenData?.refresh_token;
      if (refreshToken) {
        await prisma.platformSetting.upsert({
          where: { key: 'seo_google_refresh_token' },
          update: { value: refreshToken },
          create: { key: 'seo_google_refresh_token', value: refreshToken }
        });
      }
      if (accessToken) {
        await prisma.platformSetting.upsert({
          where: { key: 'seo_google_access_token' },
          update: { value: accessToken },
          create: { key: 'seo_google_access_token', value: accessToken }
        });
      }
      if (email) {
        await prisma.platformSetting.upsert({
          where: { key: 'seo_google_connected_email' },
          update: { value: email },
          create: { key: 'seo_google_connected_email', value: email }
        });
      }

      const targetUrl = new URL('/seo', origin);
      targetUrl.searchParams.set('tab', 'Integrations');
      targetUrl.searchParams.set('googleSuccess', 'true');
      const seoRedirect = NextResponse.redirect(targetUrl);
      seoRedirect.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
      return seoRedirect;
    }

    // 3. Look up verified accounts for this email & clean up stale unverified rows
    const matchingUsers: any[] = await prisma.user.findMany({
      where: { email },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            status: true,
            plan: true,
            subscriptionStatus: true,
            onboardingCompleted: true
          }
        }
      }
    });

    const validUsers: any[] = [];
    for (const u of matchingUsers) {
      if (!u.emailVerified && ['INSTRUCTOR', 'REVIEWER', 'STUDENT'].includes(u.role)) {
        await prisma.emailVerificationToken.deleteMany({ where: { userId: u.id } }).catch(() => {});
        await prisma.notificationPreference.deleteMany({ where: { userId: u.id } }).catch(() => {});
        await prisma.organizationMember.deleteMany({ where: { userId: u.id } }).catch(() => {});
        await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
      } else {
        validUsers.push(u);
      }
    }

    // 4. STUDENT PORTAL FLOW (/login & /register)
    if (portal === 'STUDENT') {
      const targetPath = sanitizeInternalPath(verifiedState.callbackUrl, '/student/learning');
      const studentUser = validUsers.find((u) => u.role === 'STUDENT');

      if (studentUser) {
        if (studentUser.isSuspended || studentUser.status === 'SUSPENDED') {
          return buildLoginErrorRedirect(origin, 'SUSPENDED', 'STUDENT', intent, email);
        }
        if (['INACTIVE', 'DISABLED', 'REJECTED'].includes(studentUser.status)) {
          return buildLoginErrorRedirect(origin, 'INACTIVE', 'STUDENT', intent, email);
        }

        await prisma.user
          .update({
            where: { id: studentUser.id },
            data: {
              lastLoginAt: new Date(),
              ...(studentUser.avatar ? {} : avatar ? { avatar } : {})
            }
          })
          .catch(() => {});

        return createLmsLoginRedirectResponse({
          req,
          origin,
          user: studentUser,
          avatar,
          targetPath
        });
      }

      // First-time Google login or signup for a Student -> create verified Student account immediately
      const randomPasswordHash = await hashPassword(crypto.randomBytes(32).toString('hex'));
      const finalized = await finalizeVerifiedSignup({
        userData: {
          name: fullName,
          firstName: givenName,
          lastName: familyName,
          email,
          password: randomPasswordHash,
          avatar,
          role: 'STUDENT',
          platform: 'LMS'
        },
        verificationMethod: 'GOOGLE_OAUTH',
        req,
        sendInstructorConfirmationEmail: false
      });

      return createLmsLoginRedirectResponse({
        req,
        origin,
        user: finalized.updatedUser,
        avatar,
        targetPath,
        skipLoginSideEffects: true
      });
    }

    // 5. INSTRUCTOR PORTAL FLOW (/instructor/login)
    const instructorUser = validUsers.find(
      (u) => u.role === 'INSTRUCTOR' || u.role === 'TEACHER'
    );

    if (instructorUser) {
      if (instructorUser.isSuspended || instructorUser.status === 'SUSPENDED') {
        return buildLoginErrorRedirect(origin, 'SUSPENDED', 'INSTRUCTOR', 'signin', email);
      }
      if (instructorUser.status === 'PENDING_APPROVAL') {
        return buildLoginErrorRedirect(origin, 'PENDING_AUDITOR', 'INSTRUCTOR', 'signin', email);
      }
      if (['INACTIVE', 'DISABLED', 'REJECTED'].includes(instructorUser.status)) {
        return buildLoginErrorRedirect(origin, 'INACTIVE', 'INSTRUCTOR', 'signin', email);
      }

      await prisma.user
        .update({
          where: { id: instructorUser.id },
          data: {
            lastLoginAt: new Date(),
            ...(instructorUser.avatar ? {} : avatar ? { avatar } : {})
          }
        })
        .catch(() => {});

      const targetPath = sanitizeInternalPath(verifiedState.callbackUrl, '/instructor/dashboard');
      return createLmsLoginRedirectResponse({
        req,
        origin,
        user: instructorUser,
        avatar,
        targetPath
      });
    }

    // No Instructor account yet -> route to 4-Step Create Account Step 1 pre-filled & verified via signed HttpOnly cookie
    const prefillToken = await createGoogleSignupPrefillToken({
      email,
      firstName: givenName,
      lastName: familyName,
      name: fullName,
      avatar,
      googleSub,
      verified: true
    });

    const signupRedirect = new URL('/instructor/login', origin);
    signupRedirect.searchParams.set('mode', 'signup');
    signupRedirect.searchParams.set('googleVerified', '1');
    if (intent === 'signin') {
      signupRedirect.searchParams.set('fromSignin', '1');
    }

    const res = NextResponse.redirect(signupRedirect);
    res.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    res.cookies.set(GOOGLE_SIGNUP_PREFILL_COOKIE, prefillToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 30
    });
    return res;
  } catch (err) {
    console.error('[Google OAuth Callback Error]:', err);
    return buildLoginErrorRedirect(origin, 'OAUTH_FAILED', portal, intent);
  }
}

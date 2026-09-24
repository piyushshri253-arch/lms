import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  setReviewerSessionCookie,
  clearReviewerSessionCookie,
  setLmsSessionCookie,
  clearLmsSessionCookie,
  setSalesSessionCookie,
  clearSalesSessionCookie,
  AuthSessionUser
} from '@/lib/auth';
import { checkRateLimit, logSecurityEvent, generateOtp } from '@/lib/security';
import { sendEmail } from '@/lib/email';
import { createAuditLog } from '@/lib/audit';
import { DEFAULT_ROLE_PERMISSIONS, UserRole } from '@/lib/permissions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, requestedPortal, productPortal } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Rate Limiting for Brute Force Protection (5 attempts per 15 minutes)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rateLimit = checkRateLimit(`login_${normalizedEmail}_${ip}`, 5, 900);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Please wait ${Math.ceil(
            rateLimit.retryAfterSeconds / 60
          )} minutes before trying again.`
        },
        { status: 429 }
      );
    }

    // 2. Lookup User with Organization Relation and Memberships
    const user: any = await prisma.user.findFirst({
      where: { email: normalizedEmail },
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
        },
        organizationMemberships: true
      }
    });

    if (!user) {
      await logSecurityEvent({
        email: normalizedEmail,
        eventType: 'LOGIN_FAILED',
        req,
        metadata: { reason: 'USER_NOT_FOUND' }
      });

      return NextResponse.json(
        {
          error: 'This email is not registered. Please sign up first.',
          code: 'USER_NOT_FOUND'
        },
        { status: 401 }
      );
    }

    // 3. Check Account Suspension
    if (user.isSuspended || user.status === 'SUSPENDED') {
      await logSecurityEvent({
        userId: user.id,
        email: normalizedEmail,
        eventType: 'LOGIN_BLOCKED',
        req,
        metadata: { reason: 'ACCOUNT_SUSPENDED' }
      });

      return NextResponse.json(
        { error: 'Your account has been suspended. Please contact platform support.' },
        { status: 403 }
      );
    }

    // 4. Verify Password Hash
    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      await logSecurityEvent({
        userId: user.id,
        email: normalizedEmail,
        eventType: 'LOGIN_FAILED',
        req,
        metadata: { reason: 'PASSWORD_MISMATCH' }
      });

      return NextResponse.json(
        {
          error: 'Please enter correct email or password.',
          code: 'INVALID_CREDENTIALS'
        },
        { status: 401 }
      );
    }

    // 5. Optional Portal-Specific Checks (only when logging in from a dedicated sub-portal like /admin/login or /instructor/login)
    // Unified /login (when requestedPortal is omitted or 'UNIFIED') automatically detects the role from DB and redirects!
    const effectivePortal = requestedPortal ? String(requestedPortal).toUpperCase() : 'UNIFIED';

    if (effectivePortal === 'ADMIN' && !['ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN', 'REVIEWER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'This account does not have Administrator access.' },
        { status: 403 }
      );
    }

    if (effectivePortal === 'INSTRUCTOR' && !['INSTRUCTOR', 'TEACHER', 'SUPER_ADMIN', 'LMS_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'This account is not registered as an Instructor.' },
        { status: 403 }
      );
    }

    if (effectivePortal === 'REVIEWER' && !['REVIEWER', 'ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'This account does not have Reviewer / Auditor access.' },
        { status: 403 }
      );
    }

    // 6. Check Email Verification Status (Unverified users cannot access dashboards!)
    if (!user.emailVerified || user.status === 'PENDING_VERIFICATION') {
      const { otp, hash: otpHash } = generateOtp(6);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.emailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() }
      });

      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          email: normalizedEmail,
          otpHash,
          expiresAt
        }
      });

      await sendEmail({
        to: normalizedEmail,
        subject: `${otp} is your Morena Teach Verification Code`,
        template: 'OTP_VERIFY',
        userId: user.id,
        data: {
          name: user.name,
          otp,
          expiresInMinutes: 10
        }
      }).catch(() => {});

      await logSecurityEvent({
        userId: user.id,
        email: normalizedEmail,
        eventType: 'LOGIN_CHALLENGED_UNVERIFIED',
        req
      });

      return NextResponse.json(
        {
          requiresEmailVerification: true,
          email: user.email,
          role: user.role,
          previewOtp: otp,
          redirectUrl: `/verify-email?email=${encodeURIComponent(user.email)}`,
          message: 'Please verify your email address via the 6-digit OTP sent to your inbox before accessing your dashboard.'
        },
        { status: 403 }
      );
    }

    if (user.status === 'INACTIVE' || user.status === 'DISABLED' || user.status === 'REJECTED') {
      return NextResponse.json(
        { error: `Your account is currently ${user.status}. Please contact administration.` },
        { status: 403 }
      );
    }

    // Update lastLoginAt timestamp in DB
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    }).catch(() => {});

    // 7. Automatic Role-Based Redirection determined strictly from Database Account Role
    let redirectUrl = '/student/dashboard';

    if (productPortal === 'SALES') {
      if (!user.organizationId || !user.organization?.onboardingCompleted) {
        redirectUrl = '/sales/onboarding';
      } else {
        redirectUrl = '/sales/dashboard';
      }
    } else if (user.role === 'SUPER_ADMIN') {
      redirectUrl = '/super-admin/dashboard';
    } else if (user.role === 'ADMIN' || user.role === 'LMS_ADMIN') {
      redirectUrl = '/admin/dashboard';
    } else if (user.role === 'INSTRUCTOR' || user.role === 'TEACHER') {
      redirectUrl = '/instructor/dashboard';
    } else if (user.role === 'REVIEWER') {
      redirectUrl = '/reviewer/dashboard';
    } else {
      redirectUrl = '/student/dashboard';
    }

    // 8. Build Complete Cryptographic Session with Tenant Metadata
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
      platform: (user.platform as any) || 'LMS',
      role: user.role as any,
      organizationId: user.organizationId || null,
      organizationName: user.organization?.name || null,
      organizationSlug: user.organization?.slug || null,
      organizationStatus: user.organization?.status || null,
      plan: user.organization?.plan || null,
      avatar: user.avatar,
      phone: user.phone,
      customRole: user.customRole,
      permissions: parsedPermissions,
      status: user.status,
      emailVerified: user.emailVerified,
      sessionVersion: user.sessionVersion
    };

    // Set portal-isolated session cookie so Reviewer Studio and Instructor/Student dashboards
    // can run simultaneously in separate tabs of the same browser without clearing each other's session
    if (effectivePortal === 'REVIEWER' || requestedPortal === 'REVIEWER' || user.role === 'REVIEWER') {
      await clearReviewerSessionCookie();
      await setReviewerSessionCookie(sessionUser);
    } else if (productPortal === 'SALES' || user.platform === 'SALES') {
      await clearSalesSessionCookie();
      await setSalesSessionCookie(sessionUser);
    } else {
      // Standard LMS (Student / Instructor / Admin)
      await clearLmsSessionCookie();
      await setLmsSessionCookie(sessionUser);
    }

    // 9. Record Audit Log & Security Events
    await logSecurityEvent({
      userId: user.id,
      email: normalizedEmail,
      eventType: 'LOGIN_SUCCESS',
      req,
      metadata: { role: user.role, organizationId: user.organizationId, productPortal }
    });

    if (user.organizationId) {
      await createAuditLog({
        organizationId: user.organizationId,
        actorId: user.id,
        actorEmail: normalizedEmail,
        action: 'USER_LOGIN',
        entity: 'User',
        entityId: user.id,
        description: `User "${user.name}" (${user.role}) logged in successfully via ${productPortal || 'Standard Portal'}.`,
        req
      });
    }

    const userAgent = req.headers.get('user-agent') || 'Browser';
    sendEmail({
      to: normalizedEmail,
      subject: 'New login to your Morena Teach account',
      template: 'LOGIN_ALERT',
      userId: user.id,
      data: {
        name: user.name,
        ipAddress: ip,
        userAgent
      }
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      user: sessionUser,
      redirectUrl,
      message: 'Logged in successfully.'
    });
  } catch (err: any) {
    console.error('[Login API Error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

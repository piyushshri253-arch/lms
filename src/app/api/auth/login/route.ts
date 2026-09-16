import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, setSessionCookie, AuthSessionUser } from '@/lib/auth';
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
        { error: 'Invalid email or password.' },
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
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // 5. Enforce Strict Portal Intent Boundaries:
    // Landing page /login is strictly reserved for Students only.
    if (requestedPortal === 'STUDENT' && user.role !== 'STUDENT') {
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        return NextResponse.json(
          {
            error:
              'Administrative accounts are not permitted on the Student storefront. Please sign in through the Admin Backend Portal at /admin/login.'
          },
          { status: 403 }
        );
      }

      if (user.role === 'INSTRUCTOR' || user.role === 'TEACHER') {
        return NextResponse.json(
          {
            error:
              'Instructor accounts are not permitted on the Student storefront. Please sign in through the Instructor Portal at /instructor/login.'
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: 'This portal is strictly for Students. Please sign in through your designated portal.'
        },
        { status: 403 }
      );
    }

    if (requestedPortal === 'ADMIN' && user.role === 'STUDENT') {
      return NextResponse.json(
        {
          error:
            'Student accounts cannot access the Administrator Backend. Please sign in through the Student portal at /login.'
        },
        { status: 403 }
      );
    }

    if (requestedPortal === 'INSTRUCTOR' && user.role !== 'INSTRUCTOR' && user.role !== 'TEACHER') {
      return NextResponse.json(
        {
          error:
            'This portal is reserved for Instructors. Students please sign in at /login, and Admins please use /admin/login.'
        },
        { status: 403 }
      );
    }

    // 6. Check Email Verification Status
    if (!user.emailVerified) {
      if (user.role === 'STUDENT') {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: true, status: 'ACTIVE' }
        });
        user.emailVerified = true;
      } else {
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
          subject: 'Verify your Morena Teach account',
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
            message: 'Please verify your email before accessing your account.'
          },
          { status: 403 }
        );
      }
    }

    // 6. Role & Portal Validation (if portal specified)
    const portal = (requestedPortal || (body as any).selectedRole)?.toUpperCase();
    if (portal) {
      const dbRole = user.role;
      if (portal === 'STUDENT') {
        if (dbRole !== 'STUDENT') {
          return NextResponse.json(
            { error: 'This account is not registered as a Student. Please select the correct login type.' },
            { status: 403 }
          );
        }
      } else if (portal === 'INSTRUCTOR') {
        if (dbRole !== 'INSTRUCTOR') {
          return NextResponse.json(
            { error: 'This account is not registered as an Instructor. Please select the correct login type.' },
            { status: 403 }
          );
        }
      } else if (portal === 'ADMIN' || portal === 'LMS_ADMIN') {
        const isAuthorizedAdmin =
          dbRole === 'ADMIN' ||
          dbRole === 'LMS_ADMIN' ||
          dbRole === 'SUPER_ADMIN';

        if (!isAuthorizedAdmin) {
          return NextResponse.json(
            { error: 'This account does not have LMS Admin access.' },
            { status: 403 }
          );
        }
      }
    }

    // 7. Determine Centralized Redirect URL based on Product Portal & Role
    let redirectUrl = '/learning/dashboard';

    if (productPortal === 'LEARNING') {
      redirectUrl = '/learning/dashboard';
    } else if (productPortal === 'SALES') {
      if (!user.organizationId || !user.organization?.onboardingCompleted) {
        redirectUrl = '/sales/onboarding';
      } else {
        redirectUrl = '/sales/dashboard';
      }
    } else {
      // General fallback based on database role
      if (user.role === 'SUPER_ADMIN') {
        redirectUrl = '/super-admin';
      } else if (user.role === 'ADMIN') {
        if (!user.organizationId || !user.organization?.onboardingCompleted) {
          redirectUrl = '/sales/onboarding';
        } else {
          redirectUrl = '/sales/dashboard';
        }
      } else if (user.role === 'INSTRUCTOR') {
        redirectUrl = '/instructor';
      } else {
        redirectUrl = '/learning/dashboard';
      }
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

    await setSessionCookie(sessionUser);

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

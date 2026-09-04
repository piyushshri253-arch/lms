import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, setSalesSessionCookie, AuthSessionUser } from '@/lib/auth';
import { checkRateLimit, logSecurityEvent, generateOtp } from '@/lib/security';
import { sendEmail } from '@/lib/email';
import { createAuditLog } from '@/lib/audit';
import { DEFAULT_ROLE_PERMISSIONS, UserRole } from '@/lib/permissions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    // Rate Limiting (5 attempts per 15 min)
    const rateLimit = checkRateLimit(`sales_login_${normalizedEmail}_${ip}`, 5, 900);
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

    // 1. Look up User strictly on SALES platform
    const user = await prisma.user.findUnique({
      where: {
        email_platform: {
          email: normalizedEmail,
          platform: 'SALES'
        }
      },
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

    if (!user) {
      // Check if user has an LMS account to give helpful message
      const lmsUser = await prisma.user.findUnique({
        where: {
          email_platform: {
            email: normalizedEmail,
            platform: 'LMS'
          }
        }
      });

      if (lmsUser) {
        return NextResponse.json(
          {
            error:
              'No Sales account found with this email. You have an LMS account, but Sales requires a separate registration. Please click "Register for Sales" to create your Sales account.'
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid Sales email or password. Please verify your credentials or register.' },
        { status: 401 }
      );
    }

    // 2. Check suspension
    if (user.isSuspended || user.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Your Sales account has been suspended. Please contact platform support.' },
        { status: 403 }
      );
    }

    // 3. Verify Password
    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      await logSecurityEvent({
        userId: user.id,
        email: normalizedEmail,
        platform: 'SALES',
        eventType: 'SALES_LOGIN_FAILED',
        req,
        metadata: { reason: 'PASSWORD_MISMATCH' }
      });

      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // 4. Check Email Verification
    if (!user.emailVerified) {
      const { otp, hash: otpHash } = generateOtp(6);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.emailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() }
      });

      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          email: normalizedEmail,
          platform: 'SALES',
          otpHash,
          expiresAt
        }
      });

      await sendEmail({
        to: normalizedEmail,
        subject: 'Verify your AADHYARA Sales account',
        template: 'OTP_VERIFY',
        userId: user.id,
        data: {
          name: user.name,
          otp,
          expiresInMinutes: 15
        }
      }).catch(() => {});

      return NextResponse.json(
        {
          requiresEmailVerification: true,
          email: user.email,
          message: 'Please verify your work email before accessing your Sales dashboard.'
        },
        { status: 403 }
      );
    }

    // 5. Determine Redirect
    const redirectUrl =
      !user.organizationId || !user.organization?.onboardingCompleted
        ? '/sales/onboarding'
        : '/sales/dashboard';

    // 6. Build Permissions
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
      platform: 'SALES',
      role: (user.role as UserRole) || 'SALES_ADMIN',
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

    // 7. Set Sales Session Cookie ONLY (never touches LMS session)
    await setSalesSessionCookie(sessionUser);

    await logSecurityEvent({
      userId: user.id,
      email: normalizedEmail,
      platform: 'SALES',
      eventType: 'SALES_LOGIN_SUCCESS',
      req
    });

    if (user.organizationId) {
      await createAuditLog({
        organizationId: user.organizationId,
        actorId: user.id,
        actorEmail: normalizedEmail,
        action: 'SALES_USER_LOGIN',
        entity: 'User',
        entityId: user.id,
        description: `Sales administrator "${user.name}" logged into Sales platform.`,
        req
      });
    }

    return NextResponse.json({
      success: true,
      platform: 'SALES',
      user: sessionUser,
      redirectUrl,
      message: 'Sales login successful.'
    });
  } catch (err: any) {
    console.error('[Sales Login Error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

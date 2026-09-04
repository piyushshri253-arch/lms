import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, setLmsSessionCookie, AuthSessionUser } from '@/lib/auth';
import { checkRateLimit, logSecurityEvent, generateOtp } from '@/lib/security';
import { sendEmail } from '@/lib/email';
import { createAuditLog } from '@/lib/audit';
import { DEFAULT_ROLE_PERMISSIONS, UserRole } from '@/lib/permissions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, requestedPortal, callbackUrl } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    const rateLimit = checkRateLimit(`lms_login_${normalizedEmail}_${ip}`, 5, 900);
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

    // 1. Look up User strictly on LMS platform (or Super Admin)
    let user = await prisma.user.findUnique({
      where: {
        email_platform: {
          email: normalizedEmail,
          platform: 'LMS'
        }
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            plan: true
          }
        }
      }
    });

    // Also support global SUPER_ADMIN
    if (!user) {
      const superAdminUser = await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          role: 'SUPER_ADMIN'
        }
      });
      if (superAdminUser) {
        user = superAdminUser as any;
      }
    }

    if (!user) {
      // Check if user has a Sales account
      const salesUser = await prisma.user.findUnique({
        where: {
          email_platform: {
            email: normalizedEmail,
            platform: 'SALES'
          }
        }
      });

      if (salesUser) {
        return NextResponse.json(
          {
            error:
              'No LMS account found with this email. You have a Sales account, but the Learning Management System requires a separate LMS registration. Please register for LMS to create your student/instructor account.'
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid LMS email or password. Please verify your credentials or register.' },
        { status: 401 }
      );
    }

    // 2. Check suspension
    if (user.isSuspended || user.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Your LMS account has been suspended. Please contact support.' },
        { status: 403 }
      );
    }

    // 3. Verify Password
    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      await logSecurityEvent({
        userId: user.id,
        email: normalizedEmail,
        platform: 'LMS',
        eventType: 'LMS_LOGIN_FAILED',
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
          platform: 'LMS',
          otpHash,
          expiresAt
        }
      });

      await sendEmail({
        to: normalizedEmail,
        subject: 'Verify your AADHYARA Learning account',
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
          message: 'Please verify your email before accessing your learning dashboard.'
        },
        { status: 403 }
      );
    }

    // 5. Server-Side Role & Portal Validation (Database role is source of truth)
    const portal = String(requestedPortal || (body as any).selectedRole || 'STUDENT').toUpperCase();
    const dbRole = user.role;

    if (portal === 'STUDENT') {
      if (dbRole !== 'STUDENT') {
        await logSecurityEvent({
          userId: user.id,
          email: normalizedEmail,
          platform: 'LMS',
          eventType: 'LMS_LOGIN_PORTAL_MISMATCH',
          req,
          metadata: { requestedPortal: portal, actualRole: dbRole }
        }).catch(() => {});

        return NextResponse.json(
          { error: 'This account is not registered as a Student. Please select the correct login type.' },
          { status: 403 }
        );
      }
    } else if (portal === 'INSTRUCTOR') {
      if (dbRole !== 'INSTRUCTOR') {
        await logSecurityEvent({
          userId: user.id,
          email: normalizedEmail,
          platform: 'LMS',
          eventType: 'LMS_LOGIN_PORTAL_MISMATCH',
          req,
          metadata: { requestedPortal: portal, actualRole: dbRole }
        }).catch(() => {});

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
        await logSecurityEvent({
          userId: user.id,
          email: normalizedEmail,
          platform: 'LMS',
          eventType: 'LMS_LOGIN_PORTAL_MISMATCH',
          req,
          metadata: { requestedPortal: portal, actualRole: dbRole }
        }).catch(() => {});

        return NextResponse.json(
          { error: 'This account does not have LMS Admin access.' },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid login portal selected.' },
        { status: 400 }
      );
    }

    // 6. Determine LMS Redirect URL based on REAL database role
    let redirectUrl = '/lms/dashboard';
    const isSuperAdmin = dbRole === 'SUPER_ADMIN';
    const isAdmin = dbRole === 'ADMIN' || dbRole === 'LMS_ADMIN';
    const isInstructor = dbRole === 'INSTRUCTOR';

    if (isSuperAdmin) {
      redirectUrl = '/super-admin';
    } else if (isAdmin) {
      redirectUrl = '/lms/admin';
    } else if (isInstructor) {
      redirectUrl = '/instructor/dashboard';
    }

    // Safely evaluate callbackUrl if provided
    if (
      callbackUrl &&
      typeof callbackUrl === 'string' &&
      callbackUrl.startsWith('/') &&
      !callbackUrl.startsWith('//')
    ) {
      if (callbackUrl.startsWith('/admin')) {
        if (isSuperAdmin || isAdmin) {
          redirectUrl = callbackUrl;
        } else if (isInstructor && callbackUrl.startsWith('/admin/courses/builder')) {
          redirectUrl = '/instructor/courses/builder';
        }
      } else if (callbackUrl.startsWith('/instructor')) {
        if (isSuperAdmin || isAdmin || isInstructor) {
          redirectUrl = callbackUrl;
        }
      } else if (callbackUrl.startsWith('/super-admin')) {
        if (isSuperAdmin) {
          redirectUrl = callbackUrl;
        }
      } else {
        redirectUrl = callbackUrl;
      }
    }

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
      platform: 'LMS',
      role: user.role as UserRole,
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

    // 7. Set LMS Session Cookie ONLY (never touches Sales session)
    await setLmsSessionCookie(sessionUser);

    await logSecurityEvent({
      userId: user.id,
      email: normalizedEmail,
      platform: 'LMS',
      eventType: 'LMS_LOGIN_SUCCESS',
      req
    });

    if (user.organizationId) {
      await createAuditLog({
        organizationId: user.organizationId,
        actorId: user.id,
        actorEmail: normalizedEmail,
        action: 'LMS_USER_LOGIN',
        entity: 'User',
        entityId: user.id,
        description: `LMS user "${user.name}" (${user.role}) logged in.`,
        req
      });
    }

    return NextResponse.json({
      success: true,
      platform: 'LMS',
      user: sessionUser,
      redirectUrl,
      message: 'Logged into AADHYARA Learning successfully.'
    });
  } catch (err: any) {
    console.error('[LMS Login Error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

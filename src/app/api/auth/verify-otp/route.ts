import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashToken, logSecurityEvent, checkRateLimit } from '@/lib/security';
import {
  setSessionCookie,
  clearSessionCookie,
  setReviewerSessionCookie,
  clearReviewerSessionCookie,
  setLmsSessionCookie,
  clearLmsSessionCookie,
  AuthSessionUser
} from '@/lib/auth';
import { EmailService } from '@/lib/email';
import { createAuditLog } from '@/lib/audit';
import { DEFAULT_ROLE_PERMISSIONS, UserRole } from '@/lib/permissions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp, skipSessionCookie } = body;

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return NextResponse.json(
        { error: 'Please enter a valid 6-digit numeric OTP code.' },
        { status: 400 }
      );
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rateLimit = checkRateLimit(`verify_otp_${normalizedEmail}_${ip}`, 8, 900);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many verification attempts. Please wait ${Math.ceil(
            rateLimit.retryAfterSeconds / 60
          )} minutes before trying again.`
        },
        { status: 429 }
      );
    }

    // 1. Find user by email
    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail },
      include: { organization: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email address. Please register.' },
        { status: 404 }
      );
    }

    if (user.isSuspended || user.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'This account has been suspended. Please contact platform support.' },
        { status: 403 }
      );
    }

    // 2. Fetch the latest active verification token
    const tokenRecord = await prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { error: 'No active verification code found. Please click "Resend OTP".' },
        { status: 400 }
      );
    }

    // 3. Check expiration (15 minutes)
    if (new Date() > new Date(tokenRecord.expiresAt)) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please click "Resend OTP" for a new code.' },
        { status: 400 }
      );
    }

    // 4. Check max attempts (5)
    if (tokenRecord.attempts >= 5) {
      return NextResponse.json(
        {
          error: 'Maximum verification attempts exceeded for this code. Please request a new code.'
        },
        { status: 429 }
      );
    }

    // 5. Compare OTP hash
    const inputHash = hashToken(cleanOtp);
    const isValid = inputHash === tokenRecord.otpHash;

    if (!isValid) {
      await prisma.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { attempts: { increment: 1 } }
      });

      const remaining = 4 - tokenRecord.attempts;
      return NextResponse.json(
        {
          error:
            remaining > 0
              ? `Invalid verification code. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`
              : 'Invalid verification code. Please request a new code.'
        },
        { status: 400 }
      );
    }

    // OTP Verified Successfully!
    // 1. Mark token as used
    await prisma.emailVerificationToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() }
    });

    // 2. Mark user emailVerified = true, emailVerifiedAt = now, and status = ACTIVE
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
        lastLoginAt: new Date()
      },
      include: { organization: true }
    });

    // 3. If user has an organization, ensure OrganizationMember record exists
    if (user.organizationId) {
      const userRole = (user.role as UserRole) || 'STUDENT';
      const perms = DEFAULT_ROLE_PERMISSIONS[userRole] || [];

      await prisma.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: user.organizationId,
            userId: user.id
          }
        },
        create: {
          organizationId: user.organizationId,
          userId: user.id,
          role: userRole,
          permissions: JSON.stringify(perms),
          status: 'ACTIVE'
        },
        update: {
          role: userRole,
          status: 'ACTIVE'
        }
      });
    }

    // 4. Create Welcome In-App Notification
    const roleDashUrl =
      updatedUser.role === 'SUPER_ADMIN'
        ? '/super-admin/dashboard'
        : updatedUser.role === 'LMS_ADMIN' || updatedUser.role === 'ADMIN'
        ? '/admin/dashboard'
        : updatedUser.role === 'INSTRUCTOR'
        ? '/instructor/dashboard'
        : updatedUser.role === 'REVIEWER'
        ? '/reviewer/dashboard'
        : '/student/dashboard';

    await prisma.notification.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId || null,
        title: `Welcome to Morena Teach!`,
        message: `Your ${updatedUser.role === 'INSTRUCTOR' ? 'Instructor' : updatedUser.role === 'REVIEWER' ? 'Reviewer / Auditor' : ''} account email has been verified and activated.`,
        type: 'ACCOUNT',
        link: roleDashUrl
      }
    }).catch(() => {});

    // 5. Send Welcome Email ONLY upon Email OTP Verification!
    // If welcome email fails, account remains verified & active, failure is recorded on User & EmailLog.
    const welcomeResult = await EmailService.sendWelcomeEmail({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      organizationId: updatedUser.organizationId
    });

    // 6. Log Security Event & Audit Log
    await logSecurityEvent({
      userId: user.id,
      email: normalizedEmail,
      eventType: 'OTP_VERIFIED',
      req,
      metadata: {
        role: updatedUser.role,
        welcomeEmailSent: welcomeResult.success,
        welcomeEmailError: welcomeResult.error || null
      }
    });

    await createAuditLog({
      organizationId: user.organizationId || null,
      actorId: user.id,
      actorEmail: normalizedEmail,
      action: 'USER_VERIFIED_EMAIL',
      entity: 'User',
      entityId: user.id,
      description: `User "${user.name}" (${updatedUser.role}) verified email via OTP. Welcome email status: ${welcomeResult.success ? 'SENT' : 'FAILED'}.`,
      req
    }).catch(() => {});

    // 7. Determine exact role-based redirect URL
    const redirectUrl = roleDashUrl;

    const sessionPayload: AuthSessionUser = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      platform: (updatedUser.platform as any) || 'LMS',
      role: updatedUser.role as any,
      organizationId: updatedUser.organizationId || undefined,
      organizationName: updatedUser.organization?.name || undefined,
      organizationSlug: updatedUser.organization?.slug || undefined,
      organizationStatus: updatedUser.organization?.status || undefined,
      plan: updatedUser.organization?.plan || undefined,
      avatar: updatedUser.avatar,
      phone: updatedUser.phone,
      customRole: updatedUser.customRole,
      status: updatedUser.status,
      emailVerified: true,
      sessionVersion: updatedUser.sessionVersion
    };

    // 8. Only set session cookie if not verifying on behalf of another user (e.g. Admin/SuperAdmin modal)
    if (!skipSessionCookie) {
      if (updatedUser.role === 'REVIEWER') {
        await clearReviewerSessionCookie();
        await setReviewerSessionCookie(sessionPayload);
      } else if (updatedUser.role === 'INSTRUCTOR') {
        await clearLmsSessionCookie();
        await setLmsSessionCookie(sessionPayload);
      } else {
        await clearSessionCookie();
        await setSessionCookie(sessionPayload);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! Your account is now active.',
      welcomeEmailSent: welcomeResult.success,
      redirectUrl,
      hasOrganization: !!user.organizationId,
      user: sessionPayload
    });
  } catch (err: any) {
    console.error('[Verify OTP API Error]:', err);
    return NextResponse.json({ error: err.message || 'OTP verification failed.' }, { status: 500 });
  }
}

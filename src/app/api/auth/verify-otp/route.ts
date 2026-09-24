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

    // 1. Check if this is a Pending Signup (Deferred User Creation — not saved in prisma.user until OTP verified!)
    const pendingKey = `pending_signup_${normalizedEmail}`;
    const pendingSetting = await prisma.platformSetting.findUnique({
      where: { key: pendingKey }
    });

    let updatedUser: any = null;

    if (pendingSetting) {
      let pendingPayload: any = null;
      try {
        pendingPayload = JSON.parse(pendingSetting.value);
      } catch {
        return NextResponse.json(
          { error: 'Invalid pending registration state. Please click "Resend OTP" or sign up again.' },
          { status: 400 }
        );
      }

      // Check expiration (10 minutes)
      if (new Date() > new Date(pendingPayload.expiresAt)) {
        return NextResponse.json(
          { error: 'Verification code has expired. Please click "Resend OTP" for a new code.' },
          { status: 400 }
        );
      }

      // Check max attempts (5)
      const currentAttempts = Number(pendingPayload.attempts || 0);
      if (currentAttempts >= 5) {
        return NextResponse.json(
          {
            error: 'Maximum verification attempts exceeded for this code. Please request a new code.'
          },
          { status: 429 }
        );
      }

      // Compare OTP hash
      const inputHash = hashToken(cleanOtp);
      const isValid = inputHash === pendingPayload.otpHash;

      if (!isValid) {
        pendingPayload.attempts = currentAttempts + 1;
        await prisma.platformSetting.update({
          where: { key: pendingKey },
          data: { value: JSON.stringify(pendingPayload) }
        });

        const remaining = 4 - currentAttempts;
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

      // OTP Verified! Now create the User in prisma.user for the very first time!
      const uData = pendingPayload.userData || {};
      const userRole = (uData.role as UserRole) || 'STUDENT';
      const perms = uData.permissions
        ? uData.permissions
        : JSON.stringify(DEFAULT_ROLE_PERMISSIONS[userRole] || []);

      // Clean up any stale unverified row if one existed
      const existingCheck = await prisma.user.findFirst({ where: { email: normalizedEmail } });
      if (existingCheck && !existingCheck.emailVerified) {
        await prisma.user.delete({ where: { id: existingCheck.id } }).catch(() => {});
      }

      if (existingCheck && existingCheck.emailVerified) {
        updatedUser = await prisma.user.findUnique({
          where: { id: existingCheck.id },
          include: { organization: true }
        });
      } else {
        updatedUser = await prisma.user.create({
          data: {
            organizationId: uData.organizationId || null,
            name: uData.name || normalizedEmail.split('@')[0],
            email: normalizedEmail,
            password: uData.password,
            phone: uData.phone || null,
            address: uData.address || null,
            city: uData.city || null,
            state: uData.state || null,
            country: uData.country || null,
            pincode: uData.pincode || null,
            bio: uData.bio || null,
            avatar: uData.avatar || null,
            role: userRole,
            customRole:
              uData.customRole ||
              (userRole === 'REVIEWER'
                ? 'Course Auditor'
                : userRole === 'INSTRUCTOR'
                ? 'Instructor'
                : null),
            platform: uData.platform || 'LMS',
            permissions: perms,
            status: 'ACTIVE',
            emailVerified: true,
            emailVerifiedAt: new Date(),
            lastLoginAt: new Date(),
            welcomeEmailStatus: 'NOT_SENT',
            sessionVersion: 1
          },
          include: { organization: true }
        });
      }

      await prisma.notificationPreference.create({
        data: { userId: updatedUser.id }
      }).catch(() => {});

      if (updatedUser.organizationId) {
        await prisma.organizationMember.upsert({
          where: {
            organizationId_userId: {
              organizationId: updatedUser.organizationId,
              userId: updatedUser.id
            }
          },
          create: {
            organizationId: updatedUser.organizationId,
            userId: updatedUser.id,
            role: userRole,
            permissions: perms,
            status: 'ACTIVE'
          },
          update: {
            role: userRole,
            status: 'ACTIVE'
          }
        }).catch(() => {});
      }

      // Delete temporary pending_signup record now that User is saved in DB
      await prisma.platformSetting.delete({
        where: { key: pendingKey }
      }).catch(() => {});

      // Notify Super Admins that a verified Instructor / Reviewer has joined
      if (updatedUser.role === 'INSTRUCTOR' || updatedUser.role === 'REVIEWER') {
        try {
          const superAdmins = await prisma.user.findMany({
            where: { role: 'SUPER_ADMIN' },
            select: { id: true }
          });

          for (const sa of superAdmins) {
            await prisma.notification.create({
              data: {
                userId: sa.id,
                title: `New Verified ${updatedUser.role === 'REVIEWER' ? 'Reviewer / Auditor' : 'Instructor'}: ${updatedUser.name}`,
                message: `${updatedUser.name} (${updatedUser.email}) verified their email via OTP and activated their ${updatedUser.role} account.`,
                type: 'ACCOUNT',
                link: '/super-admin/users'
              }
            });
          }
        } catch {}
      }
    } else {
      // Fallback: Existing user record in prisma.user
      const user = await prisma.user.findFirst({
        where: { email: normalizedEmail },
        include: { organization: true }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'No pending registration or account found with this email address. Please sign up first.' },
          { status: 404 }
        );
      }

      if (user.isSuspended || user.status === 'SUSPENDED') {
        return NextResponse.json(
          { error: 'This account has been suspended. Please contact platform support.' },
          { status: 403 }
        );
      }

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

      if (new Date() > new Date(tokenRecord.expiresAt)) {
        return NextResponse.json(
          { error: 'Verification code has expired. Please click "Resend OTP" for a new code.' },
          { status: 400 }
        );
      }

      if (tokenRecord.attempts >= 5) {
        return NextResponse.json(
          {
            error: 'Maximum verification attempts exceeded for this code. Please request a new code.'
          },
          { status: 429 }
        );
      }

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

      await prisma.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() }
      });

      updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
          status: 'ACTIVE',
          lastLoginAt: new Date()
        },
        include: { organization: true }
      });

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
    }

    const user = updatedUser;

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

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashToken, logSecurityEvent } from '@/lib/security';
import { setSessionCookie, clearSessionCookie, AuthSessionUser } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { createAuditLog } from '@/lib/audit';
import { DEFAULT_ROLE_PERMISSIONS, UserRole } from '@/lib/permissions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

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

    // 2. Mark user emailVerified = true and status = ACTIVE
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        status: 'ACTIVE'
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
    await prisma.notification.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId || null,
        title: 'Welcome to MORENA TEACH!',
        message: 'Your email address has been verified. Welcome aboard!',
        type: 'ACCOUNT',
        link: user.role === 'ADMIN' ? '/sales/dashboard' : user.role === 'INSTRUCTOR' ? '/instructor' : '/student/learning'
      }
    }).catch(() => {});

    // 5. Send Welcome Email
    await sendEmail({
      to: normalizedEmail,
      subject: 'Welcome to MORENA TEACH! 🚀',
      template: 'WELCOME',
      userId: user.id,
      data: {
        name: user.name
      }
    }).catch(() => {});

    // 6. Log Security Event & Audit Log
    await logSecurityEvent({
      userId: user.id,
      email: normalizedEmail,
      eventType: 'OTP_VERIFIED',
      req
    });

    if (user.organizationId) {
      await createAuditLog({
        organizationId: user.organizationId,
        actorId: user.id,
        actorEmail: normalizedEmail,
        action: 'USER_VERIFIED_EMAIL',
        entity: 'User',
        entityId: user.id,
        description: `User "${user.name}" verified email address via OTP.`,
        req
      });
    }

    // 7. Determine correct redirect URL - Students ALWAYS redirect to /student/learning
    let redirectUrl = '/student/learning';
    if (updatedUser.role === 'SUPER_ADMIN') {
      redirectUrl = '/super-admin';
    } else if (updatedUser.role === 'ADMIN' || updatedUser.role === 'SALES_ADMIN') {
      redirectUrl = updatedUser.organization?.onboardingCompleted ? '/sales/dashboard' : '/sales/onboarding';
    } else if (updatedUser.role === 'INSTRUCTOR') {
      redirectUrl = '/instructor';
    } else if (updatedUser.role === 'STUDENT') {
      redirectUrl = '/student/learning';
    } else {
      redirectUrl = '/student/learning';
    }

    // 8. Create Authenticated Session Cookie (Clean state: purge any prior admin/sales session)
    await clearSessionCookie();

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

    await setSessionCookie(sessionPayload);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully!',
      redirectUrl,
      hasOrganization: !!user.organizationId,
      user: sessionPayload
    });
  } catch (err: any) {
    console.error('[Verify OTP API Error]:', err);
    return NextResponse.json({ error: err.message || 'OTP verification failed.' }, { status: 500 });
  }
}

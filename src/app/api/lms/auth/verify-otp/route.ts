import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashToken, logSecurityEvent } from '@/lib/security';
import { setLmsSessionCookie, AuthSessionUser } from '@/lib/auth';
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

    // 1. Find user by email on LMS platform
    const user = await prisma.user.findUnique({
      where: {
        email_platform: {
          email: normalizedEmail,
          platform: 'LMS'
        }
      },
      include: { organization: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No LMS account found with this email. Please register for LMS.' },
        { status: 404 }
      );
    }

    // 2. Fetch active verification token for LMS
    const tokenRecord = await prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        platform: 'LMS',
        usedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { error: 'No active verification code found. Please request a new code.' },
        { status: 400 }
      );
    }

    if (new Date() > new Date(tokenRecord.expiresAt)) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    const inputHash = hashToken(cleanOtp);
    if (inputHash !== tokenRecord.otpHash) {
      return NextResponse.json({ error: 'Invalid verification code. Please try again.' }, { status: 400 });
    }

    // Mark token used & user verified
    await prisma.emailVerificationToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() }
    });

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        status: 'ACTIVE'
      },
      include: { organization: true }
    });

    let redirectUrl = '/lms/dashboard';
    if (updatedUser.role === 'SUPER_ADMIN') {
      redirectUrl = '/super-admin';
    } else if (updatedUser.role === 'ADMIN' || updatedUser.role === 'LMS_ADMIN') {
      redirectUrl = '/lms/admin';
    } else if (updatedUser.role === 'INSTRUCTOR') {
      redirectUrl = '/instructor/dashboard';
    }

    let parsedPermissions: string[] = [];
    try {
      parsedPermissions = JSON.parse(updatedUser.permissions || '[]');
      if (parsedPermissions.length === 0) {
        parsedPermissions = DEFAULT_ROLE_PERMISSIONS[updatedUser.role as UserRole] || [];
      }
    } catch {
      parsedPermissions = DEFAULT_ROLE_PERMISSIONS[updatedUser.role as UserRole] || [];
    }

    const sessionPayload: AuthSessionUser = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      platform: 'LMS',
      role: updatedUser.role as UserRole,
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

    // Set LMS Session Cookie ONLY
    await setLmsSessionCookie(sessionPayload);

    await logSecurityEvent({
      userId: user.id,
      email: normalizedEmail,
      platform: 'LMS',
      eventType: 'LMS_OTP_VERIFIED',
      req
    });

    return NextResponse.json({
      success: true,
      platform: 'LMS',
      message: 'LMS account verified successfully!',
      redirectUrl,
      user: sessionPayload
    });
  } catch (err: any) {
    console.error('[LMS Verify OTP Error]:', err);
    return NextResponse.json({ error: err.message || 'OTP verification failed.' }, { status: 500 });
  }
}

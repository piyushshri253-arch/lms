import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateOtp, logSecurityEvent, checkRateLimit } from '@/lib/security';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, email, password, confirmPassword, role = 'STUDENT', phone, organizationId, orgSlug } = body;

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rateLimit = checkRateLimit(`lms_register_${ip}`, 15, 900);
    if (!rateLimit.allowed) {
      console.warn(`[LMS Register Rate Limit]: Blocked IP ${ip}`);
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    if (!name || !name.trim()) {
      console.warn('[LMS Register 400]: Missing full name');
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    }

    if (!email || !email.includes('@')) {
      console.warn('[LMS Register 400]: Invalid email address', email);
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!password) {
      console.warn('[LMS Register 400]: Missing password for', normalizedEmail);
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
    }

    if (confirmPassword && password !== confirmPassword) {
      console.warn('[LMS Register 400]: Passwords mismatch for', normalizedEmail);
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    if (password.length < 8) {
      console.warn('[LMS Register 400]: Password too short for', normalizedEmail);
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    let effectiveOrgId = organizationId || null;
    let orgBrandingName = 'MORENA TEACH Learning';

    if (!effectiveOrgId && orgSlug) {
      const org = await prisma.organization.findUnique({
        where: { slug: String(orgSlug).trim().toLowerCase() },
        select: { id: true, name: true }
      });
      if (org) {
        effectiveOrgId = org.id;
        orgBrandingName = org.name;
      }
    }

    console.log(`[LMS Register Processing]: ${normalizedEmail} (Role: ${role})`);

    // Check if account already exists strictly on LMS platform
    const existingLmsUser = await prisma.user.findUnique({
      where: {
        email_platform: {
          email: normalizedEmail,
          platform: 'LMS'
        }
      }
    });

    if (existingLmsUser) {
      if (!existingLmsUser.emailVerified) {
        console.log(`[LMS Register]: Resending unverified OTP for ${normalizedEmail}`);
        const { otp, hash: otpHash } = generateOtp(6);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await prisma.emailVerificationToken.create({
          data: {
            userId: existingLmsUser.id,
            email: normalizedEmail,
            platform: 'LMS',
            otpHash,
            expiresAt,
            attempts: 0
          }
        });

        await sendEmail({
          to: normalizedEmail,
          subject: `Verify your ${orgBrandingName} account`,
          template: 'OTP_VERIFY',
          userId: existingLmsUser.id,
          organizationId: existingLmsUser.organizationId || effectiveOrgId,
          data: {
            name: existingLmsUser.name,
            otp,
            expiresInMinutes: 15
          }
        }).catch((err) => {
          console.error('[LMS Register Email Dispatch Error]:', err.message);
        });

        return NextResponse.json({
          success: true,
          email: normalizedEmail,
          platform: 'LMS',
          previewOtp: otp,
          requiresEmailVerification: true,
          message: 'LMS account exists but is unverified. A new verification code has been dispatched!'
        });
      }

      console.warn(`[LMS Register 409]: Verified LMS account already exists for ${normalizedEmail}`);
      return NextResponse.json(
        { error: 'An LMS account with this email already exists. Please log in to MORENA TEACH Learning.' },
        { status: 409 }
      );
    }

    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'LMS_ADMIN') {
      return NextResponse.json(
        {
          error:
            'Administrator accounts cannot be self-registered through public registration. Please create an academy workspace or request an administrator invitation.'
        },
        { status: 403 }
      );
    }

    const passwordHash = await hashPassword(password);
    const assignedRole = role === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'STUDENT';

    const user = await prisma.user.create({
      data: {
        organizationId: effectiveOrgId,
        name: name.trim(),
        email: normalizedEmail,
        platform: 'LMS',
        password: passwordHash,
        phone: phone?.trim() || null,
        role: assignedRole,
        status: 'PENDING_VERIFICATION',
        emailVerified: false,
        sessionVersion: 1
      }
    });

    await prisma.notificationPreference.create({
      data: { userId: user.id }
    }).catch(() => {});

    const { otp, hash: otpHash } = generateOtp(6);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        platform: 'LMS',
        otpHash,
        expiresAt,
        attempts: 0
      }
    });

    await sendEmail({
      to: normalizedEmail,
      subject: `Verify your ${orgBrandingName} account`,
      template: 'OTP_VERIFY',
      userId: user.id,
      organizationId: user.organizationId,
      data: {
        name: user.name,
        otp,
        expiresInMinutes: 15
      }
    }).catch((err) => {
      console.error('[LMS Register Email Dispatch Error]:', err.message);
    });

    await logSecurityEvent({
      userId: user.id,
      email: normalizedEmail,
      platform: 'LMS',
      eventType: 'LMS_REGISTER_OTP_SENT',
      req
    }).catch(() => {});

    console.log(`[LMS Register Success]: Created user ${user.id} (${normalizedEmail})`);

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      platform: 'LMS',
      previewOtp: otp,
      requiresEmailVerification: true,
      message: 'LMS account created! Please enter the 6-digit verification code sent to your email.'
    });
  } catch (err: any) {
    console.error('[LMS Register Error]:', err);
    return NextResponse.json({ error: err.message || 'Registration failed.' }, { status: 500 });
  }
}

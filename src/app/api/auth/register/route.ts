import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateOtp, evaluatePasswordStrength, logSecurityEvent, checkRateLimit } from '@/lib/security';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, confirmPassword, phone, avatar, organizationId, orgSlug } = body;

    // Resolve tenant organization if applicable
    let effectiveOrgId = organizationId || null;
    let orgBrandingName = 'AADHYARA';

    if (!effectiveOrgId && orgSlug) {
      const org = await prisma.organization.findUnique({
        where: { slug: String(orgSlug).trim().toLowerCase() },
        select: { id: true, name: true }
      });
      if (org) {
        effectiveOrgId = org.id;
        orgBrandingName = org.name;
      }
    } else if (effectiveOrgId) {
      const org = await prisma.organization.findUnique({
        where: { id: effectiveOrgId },
        select: { name: true }
      });
      if (org) orgBrandingName = org.name;
    }

    // Rate Limiting on Registrations (max 10 per 15 minutes per IP)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rateLimit = checkRateLimit(`register_${ip}`, 10, 900);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!password) {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    // Password Strength Policy
    const strength = evaluatePasswordStrength(password);
    if (!strength.isValid) {
      return NextResponse.json(
        {
          error:
            'Password must be at least 8 characters long and contain uppercase, lowercase, and numeric characters.'
        },
        { status: 400 }
      );
    }

    // Check for existing account on LMS
    const existingUser = await prisma.user.findFirst({
      where: { email: normalizedEmail, platform: 'LMS' }
    });

    if (existingUser) {
      if (!existingUser.emailVerified) {
        // If user already registered but unverified, generate a fresh OTP and allow them to verify!
        const { otp, hash: otpHash } = generateOtp(6);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.emailVerificationToken.create({
          data: {
            userId: existingUser.id,
            email: normalizedEmail,
            otpHash,
            expiresAt,
            attempts: 0
          }
        });

        await sendEmail({
          to: normalizedEmail,
          subject: `Verify your ${orgBrandingName} account`,
          template: 'OTP_VERIFY',
          userId: existingUser.id,
          organizationId: existingUser.organizationId || effectiveOrgId,
          data: {
            name: existingUser.name,
            otp,
            expiresInMinutes: 10
          }
        });

        return NextResponse.json({
          success: true,
          email: normalizedEmail,
          previewOtp: otp,
          requiresEmailVerification: true,
          message: 'Account exists but is unverified. A new verification code has been generated!'
        });
      }

      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 400 }
      );
    }

    // Secure Password Hashing
    const passwordHash = await hashPassword(password);

    // Create Unverified Student in Database
    const user = await prisma.user.create({
      data: {
        organizationId: effectiveOrgId,
        name: name.trim(),
        email: normalizedEmail,
        password: passwordHash,
        phone: phone?.trim() || null,
        avatar: avatar || null,
        role: 'STUDENT',
        status: 'PENDING_VERIFICATION',
        emailVerified: false,
        sessionVersion: 1
      }
    });

    // Create default notification preferences for student
    await prisma.notificationPreference.create({
      data: {
        userId: user.id
      }
    }).catch(() => {});

    // Generate Secure 6-Digit OTP
    const { otp, hash: otpHash } = generateOtp(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store secure OTP hash in database
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        otpHash,
        expiresAt,
        attempts: 0
      }
    });

    // Dispatch Email OTP through appropriate tenant/platform SMTP
    await sendEmail({
      to: normalizedEmail,
      subject: `Verify your ${orgBrandingName} account`,
      template: 'OTP_VERIFY',
      userId: user.id,
      organizationId: user.organizationId,
      data: {
        name: user.name,
        otp,
        expiresInMinutes: 10
      }
    });

    // Log Security Events
    await logSecurityEvent({
      userId: user.id,
      email: normalizedEmail,
      eventType: 'REGISTER',
      req,
      metadata: { role: 'STUDENT', status: 'PENDING_VERIFICATION' }
    });

    await logSecurityEvent({
      userId: user.id,
      email: normalizedEmail,
      eventType: 'OTP_SENT',
      req,
      metadata: { purpose: 'EMAIL_VERIFICATION' }
    });

    // Automatically Notify All Super Admins of New Registration (Non-blocking)
    try {
      const superAdmins = await prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' },
        select: { id: true }
      });

      for (const sa of superAdmins) {
        await prisma.notification.create({
          data: {
            userId: sa.id,
            title: `New User Registered: ${user.name}`,
            message: `A new student account has been registered for ${user.email} (${user.name}). Registration Date: ${new Date().toLocaleString()}. Status: PENDING_VERIFICATION.`,
            type: 'ACCOUNT',
            link: '/super-admin/students'
          }
        });
      }
    } catch (notifError) {
      console.error('[Super Admin Registration Notification Failed]:', notifError);
    }

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      previewOtp: otp,
      requiresEmailVerification: true,
      message: 'Account created! Please enter the 6-digit verification code sent to your email.'
    });
  } catch (err: any) {
    console.error('[Register API Error]:', err);
    return NextResponse.json({ error: err.message || 'Registration failed.' }, { status: 500 });
  }
}


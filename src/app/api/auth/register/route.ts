import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateOtp, logSecurityEvent, checkRateLimit } from '@/lib/security';
import { validateStrongPassword } from '@/lib/auth';
import { EmailService } from '@/lib/email';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      role: rawRole,
      name,
      email,
      password,
      confirmPassword,
      phone,
      address,
      city,
      state,
      country,
      pincode,
      bio,
      avatar,
      organizationId,
      orgSlug
    } = body;

    // 1. Determine Registration Mode:
    // - If called from Student /register (rawRole omitted or 'STUDENT'), preserve 100% original Student signup behavior!
    // - If called from Partner / Instructor / Auditor signup (rawRole is 'INSTRUCTOR', 'REVIEWER', or 'AUDITOR'), enforce Instructor/Auditor rules!
    const requestedRole = String(rawRole || 'STUDENT').trim().toUpperCase();
    const normalizedRole =
      requestedRole === 'AUDITOR' || requestedRole === 'REVIEWER'
        ? 'REVIEWER'
        : requestedRole === 'INSTRUCTOR'
        ? 'INSTRUCTOR'
        : requestedRole;

    if (['SUPER_ADMIN', 'ADMIN', 'LMS_ADMIN', 'SALES_ADMIN'].includes(normalizedRole)) {
      return NextResponse.json(
        {
          error: `Self-registration as ${normalizedRole} is prohibited.`
        },
        { status: 403 }
      );
    }

    const isPartnerSignup = normalizedRole === 'INSTRUCTOR' || normalizedRole === 'REVIEWER';

    // Resolve tenant organization if applicable
    let effectiveOrgId = organizationId || null;
    if (!effectiveOrgId && orgSlug) {
      const org = await prisma.organization.findUnique({
        where: { slug: String(orgSlug).trim().toLowerCase() },
        select: { id: true }
      });
      if (org) effectiveOrgId = org.id;
    }

    // Rate Limiting on Registrations (max 15 per 15 minutes per IP)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rateLimit = checkRateLimit(`register_${ip}`, 15, 900);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    // 2. Field Validations
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Full Name is required.' }, { status: 400 });
    }

    if (!email || !String(email).includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const cleanPhone = String(phone || '').trim();

    if (isPartnerSignup) {
      // Mobile Number Validation (Mandatory for Instructor/Auditor, stored in profile, NO mobile OTP)
      const digitsOnlyPhone = cleanPhone.replace(/\D/g, '');
      if (!cleanPhone || digitsOnlyPhone.length < 10 || digitsOnlyPhone.length > 15) {
        return NextResponse.json(
          { error: 'A valid Mobile Number (10–15 digits) is mandatory.' },
          { status: 400 }
        );
      }

      // Address Details Validation (Mandatory for Instructor/Auditor)
      if (!address || !String(address).trim()) {
        return NextResponse.json({ error: 'Complete Address is required.' }, { status: 400 });
      }
      if (!city || !String(city).trim()) {
        return NextResponse.json({ error: 'City is required.' }, { status: 400 });
      }
      if (!state || !String(state).trim()) {
        return NextResponse.json({ error: 'State is required.' }, { status: 400 });
      }
      if (!country || !String(country).trim()) {
        return NextResponse.json({ error: 'Country is required.' }, { status: 400 });
      }
      if (!pincode || !String(pincode).trim()) {
        return NextResponse.json({ error: 'Pincode / Postal Code is required.' }, { status: 400 });
      }
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return NextResponse.json({ error: 'Password and Confirm Password do not match.' }, { status: 400 });
    }

    if (isPartnerSignup) {
      // Strong Password Policy (5 rules) for Instructor / Auditor
      const passwordCheck = validateStrongPassword(password);
      if (!passwordCheck.isValid) {
        return NextResponse.json(
          {
            error: passwordCheck.error,
            passwordChecks: passwordCheck.checks
          },
          { status: 400 }
        );
      }
    } else if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    // 3. Check for existing account in prisma.user
    const existingUser = await prisma.user.findFirst({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      if (!existingUser.emailVerified) {
        // Clean up any legacy unverified user row so database never holds unverified accounts
        await prisma.emailVerificationToken.deleteMany({ where: { userId: existingUser.id } }).catch(() => {});
        await prisma.notificationPreference.deleteMany({ where: { userId: existingUser.id } }).catch(() => {});
        await prisma.organizationMember.deleteMany({ where: { userId: existingUser.id } }).catch(() => {});
        await prisma.user.delete({ where: { id: existingUser.id } }).catch(() => {});
      } else {
        return NextResponse.json(
          {
            error: 'An account with this email address already exists. Please log in instead.',
            code: 'ALREADY_REGISTERED'
          },
          { status: 400 }
        );
      }
    }

    // 4. Hash Password & Store Pending Registration (DO NOT save in prisma.user until OTP is verified!)
    const passwordHash = await hashPassword(password);
    const { otp, hash: otpHash } = generateOtp(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const pendingKey = `pending_signup_${normalizedEmail}`;
    const pendingPayload = {
      otpHash,
      expiresAt: expiresAt.toISOString(),
      attempts: 0,
      createdAt: new Date().toISOString(),
      userData: {
        organizationId: effectiveOrgId,
        name: String(name).trim(),
        email: normalizedEmail,
        password: passwordHash,
        phone: cleanPhone || null,
        address: address ? String(address).trim() : null,
        city: city ? String(city).trim() : null,
        state: state ? String(state).trim() : null,
        country: country ? String(country).trim() : null,
        pincode: pincode ? String(pincode).trim() : null,
        bio: bio ? String(bio).trim() : null,
        avatar: avatar || null,
        role: normalizedRole,
        customRole:
          normalizedRole === 'REVIEWER'
            ? 'Course Auditor'
            : normalizedRole === 'INSTRUCTOR'
            ? 'Instructor'
            : null,
        platform: 'LMS'
      }
    };

    await prisma.platformSetting.upsert({
      where: { key: pendingKey },
      create: {
        key: pendingKey,
        value: JSON.stringify(pendingPayload)
      },
      update: {
        value: JSON.stringify(pendingPayload)
      }
    });

    // 5. Send 6-Digit Email OTP (User is NOT created in prisma.user yet — only after OTP verification!)
    await EmailService.sendVerificationOTP({
      to: normalizedEmail,
      name: String(name).trim(),
      otp,
      userId: undefined,
      organizationId: effectiveOrgId,
      expiresInMinutes: 10
    });

    // 6. Log Security Events
    await logSecurityEvent({
      userId: undefined,
      email: normalizedEmail,
      eventType: 'OTP_SENT',
      req,
      metadata: { purpose: 'PENDING_SIGNUP_EMAIL_VERIFICATION', role: normalizedRole }
    });

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      role: normalizedRole,
      requiresEmailVerification: true,
      message: 'Verification code sent! Please enter the 6-digit OTP sent to your email address to create and activate your account.'
    });
  } catch (err: any) {
    console.error('[Register API Error]:', err);
    return NextResponse.json({ error: err.message || 'Registration failed.' }, { status: 500 });
  }
}



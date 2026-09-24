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

    // 1. Strict Role Restriction on Self-Registration (/signup)
    const requestedRole = String(rawRole || 'INSTRUCTOR').trim().toUpperCase();
    const normalizedRole =
      requestedRole === 'AUDITOR' || requestedRole === 'REVIEWER'
        ? 'REVIEWER'
        : requestedRole;

    if (['SUPER_ADMIN', 'ADMIN', 'LMS_ADMIN', 'SALES_ADMIN', 'STUDENT'].includes(normalizedRole)) {
      return NextResponse.json(
        {
          error: `Self-registration as ${normalizedRole} is prohibited. Only Instructor and Reviewer / Auditor accounts can self-register on /signup.`
        },
        { status: 403 }
      );
    }

    if (!['INSTRUCTOR', 'REVIEWER'].includes(normalizedRole)) {
      return NextResponse.json(
        {
          error: 'Please select a valid account role: Instructor or Reviewer / Auditor.'
        },
        { status: 400 }
      );
    }

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

    // Mobile Number Validation (Mandatory, stored in profile, NO mobile OTP)
    const cleanPhone = String(phone || '').trim();
    const digitsOnlyPhone = cleanPhone.replace(/\D/g, '');
    if (!cleanPhone || digitsOnlyPhone.length < 10 || digitsOnlyPhone.length > 15) {
      return NextResponse.json(
        { error: 'A valid Mobile Number (10–15 digits) is mandatory.' },
        { status: 400 }
      );
    }

    // Address Details Validation
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

    if (!password) {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Password and Confirm Password do not match.' }, { status: 400 });
    }

    // Strong Password Policy (5 rules)
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

    // 3. Check for existing account
    const existingUser = await prisma.user.findFirst({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      if (!existingUser.emailVerified) {
        // Update unverified account details and issue a fresh 6-digit Email OTP
        const passwordHash = await hashPassword(password);
        const updatedUnverified = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: String(name).trim(),
            password: passwordHash,
            phone: cleanPhone,
            address: String(address).trim(),
            city: String(city).trim(),
            state: String(state).trim(),
            country: String(country).trim(),
            pincode: String(pincode).trim(),
            bio: bio ? String(bio).trim() : existingUser.bio,
            role: normalizedRole,
            status: 'PENDING_VERIFICATION',
            emailVerified: false
          }
        });

        const { otp, hash: otpHash } = generateOtp(6);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.emailVerificationToken.create({
          data: {
            userId: updatedUnverified.id,
            email: normalizedEmail,
            otpHash,
            expiresAt,
            attempts: 0
          }
        });

        await EmailService.sendVerificationOTP({
          to: normalizedEmail,
          name: updatedUnverified.name,
          otp,
          userId: updatedUnverified.id,
          organizationId: updatedUnverified.organizationId || effectiveOrgId,
          expiresInMinutes: 10
        });

        return NextResponse.json({
          success: true,
          email: normalizedEmail,
          role: normalizedRole,
          previewOtp: otp,
          requiresEmailVerification: true,
          message: 'Verification code sent to your email. Please verify your email to activate your account.'
        });
      }

      return NextResponse.json(
        {
          error: 'An account with this email address already exists. Please log in instead.',
          code: 'ALREADY_REGISTERED'
        },
        { status: 400 }
      );
    }

    // 4. Hash Password & Create User with PENDING_VERIFICATION (emailVerified: false)
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        organizationId: effectiveOrgId,
        name: String(name).trim(),
        email: normalizedEmail,
        password: passwordHash,
        phone: cleanPhone,
        address: String(address).trim(),
        city: String(city).trim(),
        state: String(state).trim(),
        country: String(country).trim(),
        pincode: String(pincode).trim(),
        bio: bio ? String(bio).trim() : null,
        avatar: avatar || null,
        role: normalizedRole,
        customRole: normalizedRole === 'REVIEWER' ? 'Course Auditor' : 'Instructor',
        status: 'PENDING_VERIFICATION',
        emailVerified: false,
        welcomeEmailStatus: 'NOT_SENT',
        sessionVersion: 1
      }
    });

    await prisma.notificationPreference.create({
      data: { userId: user.id }
    }).catch(() => {});

    // 5. Generate & Send 6-Digit Email OTP (Welcome Email is NOT sent yet — only after OTP verification!)
    const { otp, hash: otpHash } = generateOtp(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        otpHash,
        expiresAt,
        attempts: 0
      }
    });

    await EmailService.sendVerificationOTP({
      to: normalizedEmail,
      name: user.name,
      otp,
      userId: user.id,
      organizationId: user.organizationId,
      expiresInMinutes: 10
    });

    // 6. Log Security Events & Audit Log
    await logSecurityEvent({
      userId: user.id,
      email: normalizedEmail,
      eventType: 'REGISTER',
      req,
      metadata: { role: normalizedRole, status: 'PENDING_VERIFICATION', phone: cleanPhone }
    });

    await logSecurityEvent({
      userId: user.id,
      email: normalizedEmail,
      eventType: 'OTP_SENT',
      req,
      metadata: { purpose: 'EMAIL_VERIFICATION', role: normalizedRole }
    });

    await createAuditLog({
      organizationId: effectiveOrgId,
      actorId: user.id,
      actorEmail: normalizedEmail,
      action: 'USER_SELF_REGISTERED',
      entity: 'User',
      entityId: user.id,
      description: `${normalizedRole} "${user.name}" (${normalizedEmail}) registered and awaits Email OTP verification.`,
      req
    }).catch(() => {});

    // 7. Notify Super Admins
    try {
      const superAdmins = await prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' },
        select: { id: true }
      });

      for (const sa of superAdmins) {
        await prisma.notification.create({
          data: {
            userId: sa.id,
            title: `New ${normalizedRole === 'REVIEWER' ? 'Reviewer / Auditor' : 'Instructor'} Registered: ${user.name}`,
            message: `${user.name} (${user.email}, Mobile: ${cleanPhone}) registered as ${normalizedRole} and is pending Email OTP verification.`,
            type: 'ACCOUNT',
            link: '/super-admin/users'
          }
        });
      }
    } catch {}

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      role: normalizedRole,
      previewOtp: otp,
      requiresEmailVerification: true,
      message: 'Account created! Please enter the 6-digit verification code sent to your email address.'
    });
  } catch (err: any) {
    console.error('[Register API Error]:', err);
    return NextResponse.json({ error: err.message || 'Registration failed.' }, { status: 500 });
  }
}



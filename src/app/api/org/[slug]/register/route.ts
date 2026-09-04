import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateOtp, evaluatePasswordStrength, checkRateLimit, logSecurityEvent } from '@/lib/security';
import { sendEmail } from '@/lib/email';
import { enforceTenantPlanLimits } from '@/lib/auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    const rateLimit = checkRateLimit(`org_reg_${ip}_${slug}`, 5, 900);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please retry in ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const org = await prisma.organization.findUnique({
      where: { slug }
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });
    }

    if (org.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'This organization is currently suspended.' }, { status: 403 });
    }

    if (!org.allowStudentRegistration) {
      return NextResponse.json(
        { error: 'Direct self-registration is disabled by this academy administrator. Please request an invitation.' },
        { status: 403 }
      );
    }

    // Check plan capacity limits
    const limitCheck = await enforceTenantPlanLimits(org.id, 'STUDENTS');
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: 'This academy has reached maximum student capacity. Please contact support.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password, phone } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already registered in this organization
    const existing = await prisma.user.findFirst({
      where: { email: normalizedEmail, organizationId: org.id }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email address already exists in this academy. Please sign in.' },
        { status: 409 }
      );
    }

    const pwCheck = evaluatePasswordStrength(password);
    if (!pwCheck.isValid) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long and contain uppercase, lowercase, and a number.' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const { otp, hash: otpHash } = generateOtp(6);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Create user in PENDING_VERIFICATION state
    const user = await prisma.user.create({
      data: {
        organizationId: org.id,
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone?.trim() || null,
        role: 'STUDENT',
        status: 'PENDING_VERIFICATION',
        emailVerified: false
      }
    });

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        otpHash,
        expiresAt
      }
    });

    // Send Verification Email
    await sendEmail({
      to: normalizedEmail,
      subject: `Verify your account for ${org.name}`,
      template: 'OTP_VERIFY',
      data: {
        name: user.name,
        companyName: org.name,
        otp,
        expiresInMinutes: 15
      },
      userId: user.id
    });

    await logSecurityEvent({
      userId: user.id,
      email: normalizedEmail,
      eventType: 'STUDENT_REGISTER_PENDING_OTP',
      req,
      metadata: { organizationId: org.id }
    });

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${normalizedEmail}.`,
      userId: user.id,
      email: normalizedEmail
    });
  } catch (err: any) {
    console.error('[Org Student Register Error]:', err);
    return NextResponse.json({ error: err.message || 'Registration failed.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateOtp, checkRateLimit, logSecurityEvent } from '@/lib/security';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Rate Limiting: Max 5 OTP resends per 15 minutes (900 seconds)
    const rateLimit = checkRateLimit(`resend_otp_${normalizedEmail}`, 5, 900);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many OTP requests. Please wait ${Math.ceil(
            rateLimit.retryAfterSeconds / 60
          )} minutes before requesting another code.`
        },
        { status: 429 }
      );
    }

    // 2. Cooldown check: 15-second cooldown between consecutive requests
    const cooldown = checkRateLimit(`cooldown_otp_${normalizedEmail}`, 1, 15);
    if (!cooldown.allowed) {
      return NextResponse.json(
        {
          error: `Please wait ${cooldown.retryAfterSeconds} seconds before requesting a new code.`
        },
        { status: 429 }
      );
    }

    // 3. First check if there is a Pending Signup (not yet saved in prisma.user)
    const pendingKey = `pending_signup_${normalizedEmail}`;
    const pendingSetting = await prisma.platformSetting.findUnique({
      where: { key: pendingKey }
    });

    if (pendingSetting) {
      let pendingPayload: any = {};
      try {
        pendingPayload = JSON.parse(pendingSetting.value);
      } catch {
        pendingPayload = {};
      }

      const { otp, hash: otpHash } = generateOtp(6);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      pendingPayload.otpHash = otpHash;
      pendingPayload.expiresAt = expiresAt.toISOString();
      pendingPayload.attempts = 0;

      await prisma.platformSetting.update({
        where: { key: pendingKey },
        data: { value: JSON.stringify(pendingPayload) }
      });

      const recipientName = pendingPayload?.userData?.name || normalizedEmail.split('@')[0];
      const orgId = pendingPayload?.userData?.organizationId || null;

      await sendEmail({
        to: normalizedEmail,
        subject: 'Verify your account',
        template: 'OTP_VERIFY',
        userId: undefined,
        organizationId: orgId,
        data: {
          name: recipientName,
          otp,
          expiresInMinutes: 10
        }
      });

      await logSecurityEvent({
        userId: undefined,
        email: normalizedEmail,
        eventType: 'OTP_SENT',
        req,
        metadata: { reason: 'RESEND_REQUEST_PENDING_SIGNUP' }
      });

      return NextResponse.json({
        success: true,
        message: 'A new 6-digit verification code has been dispatched to your email.'
      });
    }

    // 4. Fallback: Find existing User in prisma.user
    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If your account requires verification, a new code has been sent.'
      });
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'This email is already verified. You can proceed to login.' },
        { status: 400 }
      );
    }

    // 5. Invalidate all previous unused verification tokens
    await prisma.emailVerificationToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null
      },
      data: {
        usedAt: new Date()
      }
    });

    // 6. Generate fresh 6-digit OTP
    const { otp, hash: otpHash } = generateOtp(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 7. Save new token in database
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        email: normalizedEmail,
        otpHash,
        expiresAt,
        attempts: 0
      }
    });

    // 8. Dispatch Email
    await sendEmail({
      to: normalizedEmail,
      subject: 'Verify your account',
      template: 'OTP_VERIFY',
      userId: user.id,
      organizationId: user.organizationId,
      data: {
        name: user.name,
        otp,
        expiresInMinutes: 10
      }
    });

    // 9. Log Security Event
    await logSecurityEvent({
      userId: user.id,
      email: normalizedEmail,
      eventType: 'OTP_SENT',
      req,
      metadata: { reason: 'RESEND_REQUEST' }
    });

    return NextResponse.json({
      success: true,
      message: 'A new 6-digit verification code has been dispatched to your email.'
    });
  } catch (err: any) {
    console.error('[Resend OTP Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to resend OTP.' }, { status: 500 });
  }
}


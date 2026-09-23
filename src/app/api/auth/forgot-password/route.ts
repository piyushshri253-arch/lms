import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSecureToken, checkRateLimit, logSecurityEvent } from '@/lib/security';
import { sendEmail } from '@/lib/email';
import { getBaseUrl } from '@/lib/base-url';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Rate Limiting: Max 3 password reset requests per 15 minutes
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rateLimit = checkRateLimit(`forgot_pass_${normalizedEmail}_${ip}`, 3, 900);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many password reset requests. Please wait ${Math.ceil(
            rateLimit.retryAfterSeconds / 60
          )} minutes before trying again.`
        },
        { status: 429 }
      );
    }

    // 2. Lookup User
    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return NextResponse.json(
        {
          error: 'This email is not registered. Please sign up first.',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    if (user.isSuspended) {
      return NextResponse.json(
        {
          error: 'Your account has been suspended. Please contact platform support.',
          code: 'ACCOUNT_SUSPENDED'
        },
        { status: 403 }
      );
    }

    // Generate 32-byte crypto token (tokens expire after 1 hour or upon successful password reset)
    const { token, hash: tokenHash } = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    // Dynamically resolve canonical base URL so email reset links always work in Gmail / mail clients
    const baseUrl = getBaseUrl();
    const resetUrl = `${baseUrl}/reset-password/${token}`;

    // Dispatch Email
    await sendEmail({
      to: normalizedEmail,
      subject: 'Reset Your Account Password',
      template: 'PASSWORD_RESET',
      userId: user.id,
      organizationId: user.organizationId,
      data: {
        name: user.name,
        resetUrl
      }
    });

    await logSecurityEvent({
      userId: user.id,
      email: normalizedEmail,
      eventType: 'PASSWORD_RESET_REQUEST',
      req
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset link has been sent to your email address.'
    });
  } catch (err: any) {
    console.error('[Forgot Password Error]:', err);
    const isDbQuota = String(err.message || '').includes('quota') || String(err.message || '').includes('exceeded the quota');
    const userMessage = isDbQuota
      ? 'Database quota exceeded. Please check your Neon PostgreSQL console.'
      : err.message || 'Failed to process password reset request.';
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}


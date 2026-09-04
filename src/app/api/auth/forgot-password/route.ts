import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSecureToken, checkRateLimit, logSecurityEvent } from '@/lib/security';
import { sendEmail } from '@/lib/email';

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

    if (user && !user.isSuspended) {
      // Invalidate previous unused reset tokens
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() }
      });

      // Generate 32-byte crypto token
      const { token, hash: tokenHash } = generateSecureToken(32);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt
        }
      });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
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
    }

    // Generic safe response to prevent email enumeration
    return NextResponse.json({
      success: true,
      message:
        'If an account exists for this email, you will receive a secure password reset link shortly.'
    });
  } catch (err: any) {
    console.error('[Forgot Password Error]:', err);
    return NextResponse.json({ error: 'Failed to process password reset request.' }, { status: 500 });
  }
}


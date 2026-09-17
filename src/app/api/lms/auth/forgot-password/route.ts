import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashToken, logSecurityEvent, checkRateLimit } from '@/lib/security';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    const rateLimit = checkRateLimit(`lms_forgot_pw_${ip}`, 5, 900);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many password reset attempts. Please retry in 15 minutes.' },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email_platform: {
          email: normalizedEmail,
          platform: 'LMS'
        }
      }
    });

    if (user) {
      // Invalidate existing reset tokens for this user
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() }
      });

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          platform: 'LMS',
          tokenHash,
          expiresAt
        }
      });

      const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/lms/reset-password/${rawToken}`;

      await sendEmail({
        to: normalizedEmail,
        subject: 'Reset your MORENA TEACH Learning password',
        template: 'PASSWORD_RESET',
        userId: user.id,
        data: {
          name: user.name,
          resetUrl,
          expiresInMinutes: 60
        }
      }).catch(() => {});

      await logSecurityEvent({
        userId: user.id,
        email: normalizedEmail,
        platform: 'LMS',
        eventType: 'LMS_PASSWORD_RESET_REQUEST',
        req
      });
    }

    return NextResponse.json({
      success: true,
      message: 'If an LMS account exists with this email address, a password reset link has been dispatched.'
    });
  } catch (err: any) {
    console.error('[LMS Forgot Password Error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

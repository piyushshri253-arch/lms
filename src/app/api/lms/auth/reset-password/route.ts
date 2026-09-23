import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, hashToken, logSecurityEvent } from '@/lib/security';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and new password are required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const tokenHash = hashToken(token.trim());

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.platform !== 'LMS' || resetRecord.user.platform !== 'LMS') {
      return NextResponse.json({ error: 'Invalid or expired LMS password reset link.' }, { status: 400 });
    }

    if (new Date() > new Date(resetRecord.expiresAt)) {
      return NextResponse.json({ error: 'Password reset link has expired. Please request a new one.' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: {
          password: hashedPassword,
          sessionVersion: { increment: 1 }
        }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() }
      })
    ]);

    await sendEmail({
      to: resetRecord.user.email,
      subject: 'Your Morena Teach password was changed successfully',
      template: 'PASSWORD_CHANGED',
      userId: resetRecord.userId,
      data: {
        name: resetRecord.user.name,
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://lms-phi-plum.vercel.app'}/login`
      }
    }).catch(() => {});

    await logSecurityEvent({
      userId: resetRecord.userId,
      email: resetRecord.user.email,
      platform: 'LMS',
      eventType: 'LMS_PASSWORD_RESET_SUCCESS',
      req
    });

    return NextResponse.json({
      success: true,
      redirectUrl: '/lms/login',
      message: 'LMS account password updated successfully. Please log in with your new password.'
    });
  } catch (err: any) {
    console.error('[LMS Reset Password Error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

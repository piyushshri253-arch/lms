import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashToken, hashPassword, evaluatePasswordStrength, logSecurityEvent } from '@/lib/security';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, newPassword, confirmPassword } = body;

    if (!token) {
      return NextResponse.json({ error: 'Password reset token is required.' }, { status: 400 });
    }

    if (!newPassword) {
      return NextResponse.json({ error: 'New password is required.' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    // Evaluate password strength
    const strength = evaluatePasswordStrength(newPassword);
    if (!strength.isValid) {
      return NextResponse.json(
        {
          error:
            'Password must be at least 8 characters and contain uppercase, lowercase, and numeric characters.'
        },
        { status: 400 }
      );
    }

    // Lookup token hash in database
    const tokenHash = hashToken(token);
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!resetRecord || resetRecord.usedAt !== null) {
      return NextResponse.json(
        { error: 'Invalid or already used password reset link.' },
        { status: 400 }
      );
    }

    if (new Date() > resetRecord.expiresAt) {
      return NextResponse.json(
        { error: 'This password reset link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Hash new password and update user
    const newPasswordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      // 1. Update user password and rotate session version (invalidating old sessions)
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: {
          password: newPasswordHash,
          sessionVersion: { increment: 1 }
        }
      }),
      // 2. Invalidate reset token
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() }
      })
    ]);

    // Send Password Changed Alert Email
    await sendEmail({
      to: resetRecord.user.email,
      subject: 'Your AADHYARA password was changed',
      template: 'PASSWORD_CHANGED',
      userId: resetRecord.user.id,
      data: {
        name: resetRecord.user.name
      }
    });

    // Log Security Event
    await logSecurityEvent({
      userId: resetRecord.userId,
      email: resetRecord.user.email,
      eventType: 'PASSWORD_RESET_SUCCESS',
      req
    });

    return NextResponse.json({
      success: true,
      message: 'Your password has been successfully updated. You can now log in with your new password.'
    });
  } catch (err: any) {
    console.error('[Reset Password Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to reset password.' }, { status: 500 });
  }
}


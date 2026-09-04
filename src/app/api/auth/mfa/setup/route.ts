import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { generateMfaSecret } from '@/lib/security';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const user = await requireAuth();

    const mfaData = generateMfaSecret(user.email);

    // Save temporary secret to user metadata or return for setup
    return NextResponse.json({
      success: true,
      secret: mfaData.secret,
      otpAuthUrl: mfaData.otpAuthUrl,
      recoveryCodes: mfaData.recoveryCodes
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

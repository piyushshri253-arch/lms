import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, getLmsCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    let admin = await getCurrentUser();
    if (!admin) {
      admin = await getLmsCurrentUser();
    }
    if (!admin || !['SUPER_ADMIN', 'ADMIN', 'LMS_ADMIN'].includes(admin.role)) {
      return NextResponse.json(
        { error: 'Unauthorized: Super Admin or Admin access required to generate auditor invite link.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const customHours = 2; // Fixed strictly at 2 hours per user requirement
    const expiresAt = new Date(Date.now() + customHours * 60 * 60 * 1000);
    const token = `aud_inv_${crypto.randomBytes(18).toString('hex')}`;

    const invitePayload = {
      token,
      role: 'REVIEWER',
      createdBy: admin.id,
      creatorEmail: admin.email,
      creatorName: admin.name,
      notes: body.notes || 'Auditor 2-Hour Onboarding Invitation',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      used: false,
      usedAt: null
    };

    await prisma.platformSetting.create({
      data: {
        key: `auditor_invite_${token}`,
        value: JSON.stringify(invitePayload)
      }
    });

    const host = request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const inviteUrl = `${proto}://${host}/signup?inviteToken=${token}&role=AUDITOR`;

    return NextResponse.json({
      success: true,
      token,
      expiresAt: expiresAt.toISOString(),
      expiresInHours: customHours,
      inviteUrl
    });
  } catch (err: any) {
    console.error('[Auditor Invite POST Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate auditor invite link.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token')?.trim();

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Invitation token is missing.' }, { status: 400 });
    }

    const row = await prisma.platformSetting.findUnique({
      where: { key: `auditor_invite_${token}` }
    });

    if (!row) {
      return NextResponse.json(
        { valid: false, error: 'Invalid invitation link. Please request a new invite from Super Admin.' },
        { status: 404 }
      );
    }

    const parsed = JSON.parse(row.value);
    const now = Date.now();
    const expiryTime = new Date(parsed.expiresAt).getTime();

    if (parsed.used) {
      return NextResponse.json(
        {
          valid: false,
          expired: true,
          error: 'This invitation link has already been used. Please request a new invite link from Super Admin.'
        },
        { status: 410 }
      );
    }

    if (now > expiryTime) {
      return NextResponse.json(
        {
          valid: false,
          expired: true,
          error: 'This invitation link has expired (valid for 2 hours only). Please contact Super Admin for a fresh invite link.'
        },
        { status: 410 }
      );
    }

    return NextResponse.json({
      valid: true,
      role: 'REVIEWER',
      expiresAt: parsed.expiresAt,
      creatorName: parsed.creatorName
    });
  } catch (err: any) {
    console.error('[Auditor Invite GET Error]:', err);
    return NextResponse.json(
      { valid: false, error: 'Failed to verify invitation link.' },
      { status: 500 }
    );
  }
}

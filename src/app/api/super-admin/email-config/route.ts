import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encryptSecret, maskSecret, decryptSecret } from '@/lib/security';
import { logAudit } from '@/lib/audit';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
  }

  const config = await prisma.platformEmailConfig.findFirst();
  if (!config) {
    return NextResponse.json({
      config: {
        smtpHost: '',
        smtpPort: 587,
        smtpEncryption: 'TLS',
        smtpUsername: '',
        hasPassword: false,
        maskedPassword: '',
        fromName: 'AADHYARA',
        fromEmail: 'support@aadhyara.com',
        replyTo: '',
        authEnabled: true,
        isEnabled: false,
        lastTestedAt: null,
        lastTestStatus: null,
        lastTestError: null
      }
    });
  }

  return NextResponse.json({
    config: {
      id: config.id,
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpEncryption: config.smtpEncryption,
      smtpUsername: config.smtpUsername,
      hasPassword: Boolean(config.smtpPasswordEncrypted),
      maskedPassword: maskSecret(config.smtpPasswordEncrypted),
      fromName: config.fromName,
      fromEmail: config.fromEmail,
      replyTo: config.replyTo || '',
      authEnabled: config.authEnabled,
      isEnabled: config.isEnabled,
      lastTestedAt: config.lastTestedAt,
      lastTestStatus: config.lastTestStatus,
      lastTestError: config.lastTestError,
      updatedAt: config.updatedAt
    }
  });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
  }

  const body = await req.json();
  const {
    smtpHost,
    smtpPort,
    smtpEncryption,
    smtpUsername,
    smtpPassword,
    fromName,
    fromEmail,
    replyTo,
    authEnabled,
    isEnabled
  } = body;

  const existing = await prisma.platformEmailConfig.findFirst();
  let encryptedPassword = existing?.smtpPasswordEncrypted || null;

  if (smtpPassword && smtpPassword !== '••••••••') {
    encryptedPassword = encryptSecret(smtpPassword);
  }

  const portNum = Number(smtpPort) || 587;
  let savedConfig;

  if (existing) {
    savedConfig = await prisma.platformEmailConfig.update({
      where: { id: existing.id },
      data: {
        smtpHost: smtpHost || '',
        smtpPort: portNum,
        smtpEncryption: smtpEncryption || 'TLS',
        smtpUsername: smtpUsername || '',
        smtpPasswordEncrypted: encryptedPassword,
        fromName: fromName || 'AADHYARA',
        fromEmail: fromEmail || 'support@aadhyara.com',
        replyTo: replyTo || null,
        authEnabled: authEnabled ?? true,
        isEnabled: Boolean(isEnabled)
      }
    });
  } else {
    savedConfig = await prisma.platformEmailConfig.create({
      data: {
        smtpHost: smtpHost || '',
        smtpPort: portNum,
        smtpEncryption: smtpEncryption || 'TLS',
        smtpUsername: smtpUsername || '',
        smtpPasswordEncrypted: encryptedPassword,
        fromName: fromName || 'AADHYARA',
        fromEmail: fromEmail || 'support@aadhyara.com',
        replyTo: replyTo || null,
        authEnabled: authEnabled ?? true,
        isEnabled: Boolean(isEnabled)
      }
    });
  }

  await logAudit({
    adminId: user.id,
    adminEmail: user.email,
    action: 'SMTP_CONFIGURATION_UPDATED',
    entity: 'PlatformEmailConfig',
    entityId: savedConfig.id,
    description: 'Super Admin updated platform SMTP configuration'
  });

  return NextResponse.json({
    success: true,
    message: 'Platform email configuration saved successfully'
  });
}
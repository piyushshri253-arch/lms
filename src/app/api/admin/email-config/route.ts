import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { encryptSecret, maskSecret } from '@/lib/security';
import { logAudit } from '@/lib/audit';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  const orgId = user.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization found in session' }, { status: 400 });
  }

  const config = await prisma.organizationEmailConfig.findUnique({
    where: { organizationId: orgId }
  });

  if (!config) {
    return NextResponse.json({
      config: {
        organizationId: orgId,
        smtpHost: '',
        smtpPort: 587,
        smtpEncryption: 'TLS',
        smtpUsername: '',
        hasPassword: false,
        maskedPassword: '',
        fromName: user.organizationName || 'Academy',
        fromEmail: user.email || 'support@example.com',
        replyTo: '',
        authEnabled: true,
        isEnabled: false,
        fallbackToPlatform: true,
        lastTestedAt: null,
        lastTestStatus: null,
        lastTestError: null
      }
    });
  }

  return NextResponse.json({
    config: {
      id: config.id,
      organizationId: config.organizationId,
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
      fallbackToPlatform: config.fallbackToPlatform,
      lastTestedAt: config.lastTestedAt,
      lastTestStatus: config.lastTestStatus,
      lastTestError: config.lastTestError,
      updatedAt: config.updatedAt
    }
  });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  const orgId = user.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization found' }, { status: 400 });
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
    isEnabled,
    fallbackToPlatform
  } = body;

  const existing = await prisma.organizationEmailConfig.findUnique({
    where: { organizationId: orgId }
  });

  let encryptedPassword = existing?.smtpPasswordEncrypted || null;
  if (smtpPassword && smtpPassword !== '••••••••') {
    encryptedPassword = encryptSecret(smtpPassword);
  }

  const portNum = Number(smtpPort) || 587;

  const saved = await prisma.organizationEmailConfig.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      smtpHost: smtpHost || '',
      smtpPort: portNum,
      smtpEncryption: smtpEncryption || 'TLS',
      smtpUsername: smtpUsername || '',
      smtpPasswordEncrypted: encryptedPassword,
      fromName: fromName || user.organizationName || 'Academy',
      fromEmail: fromEmail || user.email || 'support@example.com',
      replyTo: replyTo || null,
      authEnabled: authEnabled ?? true,
      isEnabled: Boolean(isEnabled),
      fallbackToPlatform: fallbackToPlatform ?? true
    },
    update: {
      smtpHost: smtpHost || '',
      smtpPort: portNum,
      smtpEncryption: smtpEncryption || 'TLS',
      smtpUsername: smtpUsername || '',
      smtpPasswordEncrypted: encryptedPassword,
      fromName: fromName || user.organizationName || 'Academy',
      fromEmail: fromEmail || user.email || 'support@example.com',
      replyTo: replyTo || null,
      authEnabled: authEnabled ?? true,
      isEnabled: Boolean(isEnabled),
      fallbackToPlatform: fallbackToPlatform ?? true
    }
  });

  await logAudit({
    organizationId: orgId,
    adminId: user.id,
    adminEmail: user.email,
    action: 'SMTP_CONFIGURATION_UPDATED',
    entity: 'OrganizationEmailConfig',
    entityId: saved.id,
    description: `Company Admin updated SMTP configuration for ${user.organizationName || orgId}`
  });

  return NextResponse.json({
    success: true,
    message: 'Company email configuration saved successfully'
  });
}
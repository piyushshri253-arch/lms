const fs = require('fs');
const path = require('path');

function write(p, content) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, content.trim(), 'utf8');
  console.log(`[Created] ${p}`);
}

// 1. Super Admin Email Config Route
write('src/app/api/super-admin/email-config/route.ts', `
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
`);

// 2. Super Admin Email Test Route
write('src/app/api/super-admin/email-config/test/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/email';
import { decryptSecret } from '@/lib/security';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
  }

  const body = await req.json();
  let password = body.smtpPassword;

  // If password was omitted or masked, load existing encrypted password
  if (!password || password === '••••••••') {
    const existing = await prisma.platformEmailConfig.findFirst();
    if (existing?.smtpPasswordEncrypted) {
      password = decryptSecret(existing.smtpPasswordEncrypted);
    }
  }

  const result = await EmailService.testConnection({
    smtpHost: body.smtpHost,
    smtpPort: Number(body.smtpPort) || 587,
    smtpEncryption: body.smtpEncryption || 'TLS',
    smtpUsername: body.smtpUsername,
    smtpPassword: password,
    authEnabled: body.authEnabled !== false,
    fromName: body.fromName || 'AADHYARA',
    fromEmail: body.fromEmail || 'support@aadhyara.com'
  });

  const existing = await prisma.platformEmailConfig.findFirst();
  if (existing) {
    await prisma.platformEmailConfig.update({
      where: { id: existing.id },
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: result.success ? 'SUCCESS' : 'FAILED',
        lastTestError: result.success ? null : result.message
      }
    });
  }

  await logAudit({
    adminId: user.id,
    adminEmail: user.email,
    action: 'SMTP_CONNECTION_TESTED',
    entity: 'PlatformEmailConfig',
    description: \`Super Admin tested platform SMTP: \${result.success ? 'SUCCESS' : 'FAILED'}\`
  });

  return NextResponse.json(result);
}
`);

// 3. Super Admin Email Send-Test Route
write('src/app/api/super-admin/email-config/send-test/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/email';
import { decryptSecret } from '@/lib/security';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
  }

  const body = await req.json();
  const { recipientEmail, smtpHost, smtpPort, smtpEncryption, smtpUsername, smtpPassword, fromName, fromEmail, replyTo, authEnabled } = body;

  if (!recipientEmail || !recipientEmail.includes('@')) {
    return NextResponse.json({ error: 'A valid recipient email is required' }, { status: 400 });
  }

  let pass = smtpPassword;
  if (!pass || pass === '••••••••') {
    const existing = await prisma.platformEmailConfig.findFirst();
    if (existing?.smtpPasswordEncrypted) {
      pass = decryptSecret(existing.smtpPasswordEncrypted);
    }
  }

  const result = await EmailService.sendTestEmail(
    {
      smtpHost,
      smtpPort: Number(smtpPort) || 587,
      smtpEncryption: smtpEncryption || 'TLS',
      smtpUsername,
      smtpPassword: pass,
      fromName: fromName || 'AADHYARA Platform',
      fromEmail: fromEmail || 'support@aadhyara.com',
      replyTo: replyTo || fromEmail,
      authEnabled: authEnabled !== false
    },
    recipientEmail,
    { isPlatform: true, organizationName: 'AADHYARA Master Platform' }
  );

  if (result.success) {
    await logAudit({
      adminId: user.id,
      adminEmail: user.email,
      action: 'TEST_EMAIL_SENT',
      entity: 'PlatformEmailConfig',
      description: \`Platform test email sent to \${recipientEmail}\`
    });
    return NextResponse.json({ success: true, message: 'Test email sent successfully' });
  }

  return NextResponse.json({ error: result.error || 'Failed to send test email' }, { status: 500 });
}
`);

// 4. Super Admin Email Logs Route
write('src/app/api/super-admin/email-config/logs/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const template = searchParams.get('template');
  const limit = Number(searchParams.get('limit')) || 50;

  const where: any = {};
  if (status) where.status = status;
  if (template) where.template = template;

  const logs = await prisma.emailLog.findMany({
    where,
    orderBy: { sentAt: 'desc' },
    take: limit,
    include: {
      organization: { select: { id: true, name: true, slug: true } }
    }
  });

  return NextResponse.json({ logs });
}
`);

// 5. Company Admin Email Config Route
write('src/app/api/admin/email-config/route.ts', `
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
    description: \`Company Admin updated SMTP configuration for \${user.organizationName || orgId}\`
  });

  return NextResponse.json({
    success: true,
    message: 'Company email configuration saved successfully'
  });
}
`);

// 6. Company Admin Email Test Route
write('src/app/api/admin/email-config/test/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/email';
import { decryptSecret } from '@/lib/security';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  const orgId = user.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization found' }, { status: 400 });
  }

  const body = await req.json();
  let password = body.smtpPassword;

  if (!password || password === '••••••••') {
    const existing = await prisma.organizationEmailConfig.findUnique({
      where: { organizationId: orgId }
    });
    if (existing?.smtpPasswordEncrypted) {
      password = decryptSecret(existing.smtpPasswordEncrypted);
    }
  }

  const result = await EmailService.testConnection({
    smtpHost: body.smtpHost,
    smtpPort: Number(body.smtpPort) || 587,
    smtpEncryption: body.smtpEncryption || 'TLS',
    smtpUsername: body.smtpUsername,
    smtpPassword: password,
    authEnabled: body.authEnabled !== false,
    fromName: body.fromName || user.organizationName || 'Academy',
    fromEmail: body.fromEmail || 'support@example.com'
  });

  const existing = await prisma.organizationEmailConfig.findUnique({
    where: { organizationId: orgId }
  });

  if (existing) {
    await prisma.organizationEmailConfig.update({
      where: { organizationId: orgId },
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: result.success ? 'SUCCESS' : 'FAILED',
        lastTestError: result.success ? null : result.message
      }
    });
  }

  await logAudit({
    organizationId: orgId,
    adminId: user.id,
    adminEmail: user.email,
    action: 'SMTP_CONNECTION_TESTED',
    entity: 'OrganizationEmailConfig',
    description: \`Company Admin tested SMTP: \${result.success ? 'SUCCESS' : 'FAILED'}\`
  });

  return NextResponse.json(result);
}
`);

// 7. Company Admin Email Send-Test Route
write('src/app/api/admin/email-config/send-test/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/email';
import { decryptSecret } from '@/lib/security';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  const orgId = user.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization found' }, { status: 400 });
  }

  const body = await req.json();
  const { recipientEmail, smtpHost, smtpPort, smtpEncryption, smtpUsername, smtpPassword, fromName, fromEmail, replyTo, authEnabled } = body;

  if (!recipientEmail || !recipientEmail.includes('@')) {
    return NextResponse.json({ error: 'A valid recipient email is required' }, { status: 400 });
  }

  let pass = smtpPassword;
  if (!pass || pass === '••••••••') {
    const existing = await prisma.organizationEmailConfig.findUnique({
      where: { organizationId: orgId }
    });
    if (existing?.smtpPasswordEncrypted) {
      pass = decryptSecret(existing.smtpPasswordEncrypted);
    }
  }

  const result = await EmailService.sendTestEmail(
    {
      smtpHost,
      smtpPort: Number(smtpPort) || 587,
      smtpEncryption: smtpEncryption || 'TLS',
      smtpUsername,
      smtpPassword: pass,
      fromName: fromName || user.organizationName || 'Academy',
      fromEmail: fromEmail || user.email || 'support@example.com',
      replyTo: replyTo || fromEmail,
      authEnabled: authEnabled !== false
    },
    recipientEmail,
    { organizationId: orgId, organizationName: user.organizationName || 'Company Academy' }
  );

  if (result.success) {
    await logAudit({
      organizationId: orgId,
      adminId: user.id,
      adminEmail: user.email,
      action: 'TEST_EMAIL_SENT',
      entity: 'OrganizationEmailConfig',
      description: \`Company test email sent to \${recipientEmail}\`
    });
    return NextResponse.json({ success: true, message: 'Test email sent successfully' });
  }

  return NextResponse.json({ error: result.error || 'Failed to send test email' }, { status: 500 });
}
`);

// 8. Company Admin Email Logs Route
write('src/app/api/admin/email-config/logs/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
  }

  const orgId = user.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization found' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const template = searchParams.get('template');
  const limit = Number(searchParams.get('limit')) || 50;

  const where: any = {
    organizationId: orgId
  };
  if (status) where.status = status;
  if (template) where.template = template;

  const logs = await prisma.emailLog.findMany({
    where,
    orderBy: { sentAt: 'desc' },
    take: limit
  });

  return NextResponse.json({ logs });
}
`);
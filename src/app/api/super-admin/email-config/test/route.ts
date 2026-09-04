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
    description: `Super Admin tested platform SMTP: ${result.success ? 'SUCCESS' : 'FAILED'}`
  });

  return NextResponse.json(result);
}
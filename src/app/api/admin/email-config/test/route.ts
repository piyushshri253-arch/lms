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
    description: `Company Admin tested SMTP: ${result.success ? 'SUCCESS' : 'FAILED'}`
  });

  return NextResponse.json(result);
}
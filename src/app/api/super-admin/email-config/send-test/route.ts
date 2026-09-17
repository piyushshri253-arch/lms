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
      fromName: fromName || 'MORENA TEACH Platform',
      fromEmail: fromEmail || 'morena@morenateach.com',
      replyTo: replyTo || fromEmail,
      authEnabled: authEnabled !== false
    },
    recipientEmail,
    { isPlatform: true, organizationName: 'MORENA TEACH Master Platform' }
  );

  if (result.success) {
    await logAudit({
      adminId: user.id,
      adminEmail: user.email,
      action: 'TEST_EMAIL_SENT',
      entity: 'PlatformEmailConfig',
      description: `Platform test email sent to ${recipientEmail}`
    });
    return NextResponse.json({ success: true, message: 'Test email sent successfully' });
  }

  return NextResponse.json({ error: result.error || 'Failed to send test email' }, { status: 400 });
}
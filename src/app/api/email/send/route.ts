import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { EmailService } from '@/lib/email';
import { checkRateLimit } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required to send emails' }, { status: 401 });
    }

    // Rate limiting: 20 dispatch requests per minute per user
    const rateLimit = checkRateLimit(`email_send_api_${user.id}`, 20, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Please wait ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { to, subject, template = 'NOTIFICATION', data = {}, html, text, organizationId } = body;

    if (!to || !subject) {
      return NextResponse.json({ error: 'Missing required parameters: "to" and "subject" are mandatory' }, { status: 400 });
    }

    // Tenant Isolation Check: Non-SuperAdmins cannot spoof another company's organizationId
    let effectiveOrgId = user.organizationId || null;
    if (user.role === 'SUPER_ADMIN' && organizationId) {
      effectiveOrgId = organizationId;
    } else if (organizationId && organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot dispatch emails on behalf of another organization' },
        { status: 403 }
      );
    }

    const result = await EmailService.sendEmail({
      to,
      subject,
      template,
      data,
      html,
      text,
      userId: user.id,
      organizationId: effectiveOrgId
    });

    return NextResponse.json({
      success: result.success,
      provider: result.provider,
      messageId: result.messageId,
      error: result.error || null
    });
  } catch (err: any) {
    console.error('[API /api/email/send Error]:', err);
    return NextResponse.json({ error: err.message || 'Internal error dispatching email' }, { status: 500 });
  }
}

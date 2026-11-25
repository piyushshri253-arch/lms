import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  try {
    await requireFinanceAdmin();

    // Fetch email logs related to finance, payouts, invoices, bank verification
    const logs = await prisma.emailLog.findMany({
      where: {
        OR: [
          { subject: { contains: 'Payout', mode: 'insensitive' } },
          { subject: { contains: 'Bank', mode: 'insensitive' } },
          { subject: { contains: 'TDS', mode: 'insensitive' } },
          { subject: { contains: '16A', mode: 'insensitive' } },
          { subject: { contains: 'Payment', mode: 'insensitive' } },
          { subject: { contains: 'Refund', mode: 'insensitive' } },
          { subject: { contains: 'Invoice', mode: 'insensitive' } },
          { template: { in: ['PAYMENT_SUCCESS', 'PAYOUT_APPROVED', 'BANK_ACCOUNT_VERIFIED'] } }
        ]
      },
      orderBy: { sentAt: 'desc' },
      take: 50
    });

    return NextResponse.json({
      success: true,
      communications: logs
    });
  } catch (error: any) {
    console.error('Error fetching communications:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch communication logs' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireFinanceAdmin();
    const body = await req.json();
    const { recipientEmail, recipientName, subject, message, communicationType } = body;

    if (!recipientEmail || !subject || !message) {
      return NextResponse.json({ error: 'recipientEmail, subject, and message are required' }, { status: 400 });
    }

    await sendEmail({
      to: recipientEmail,
      subject: `[Finance Notice] ${subject}`,
      template: 'NOTIFICATION',
      data: {
        title: subject,
        message,
        name: recipientName
      },
      html: `
        <div style="font-family:sans-serif;line-height:1.6;color:#1e293b;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;padding:24px;border-radius:12px;">
          <h2 style="color:#4338ca;margin-top:0;">Morena Teach LMS - Finance Communication</h2>
          <p>Dear ${recipientName || 'Partner / Student'},</p>
          <div style="background:#f8fafc;padding:16px;border-left:4px solid #4338ca;border-radius:4px;margin:16px 0;">
            ${message.replace(/\n/g, '<br />')}
          </div>
          <p style="font-size:12px;color:#64748b;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px;">
            Sent by Finance &amp; Accounts Department &bull; Authorized by ${admin.name || admin.email}<br />
            Morena Teach LMS Platform &bull; All rights reserved
          </p>
        </div>
      `
    });

    return NextResponse.json({
      success: true,
      message: `Finance dispatch successfully delivered to ${recipientEmail}`
    });
  } catch (error: any) {
    console.error('Error sending communication:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Communication dispatch failed' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}

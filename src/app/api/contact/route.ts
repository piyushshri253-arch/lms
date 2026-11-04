import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, subject, message, organizationType, organizationName } = body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Please provide your name.' }, { status: 400 });
    }
    if (!email || typeof email !== 'string' || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Please provide a valid email address.' }, { status: 400 });
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ success: false, error: 'Please provide your message.' }, { status: 400 });
    }

    // Resolve or fallback default organization
    let org = await prisma.organization.findFirst({
      where: {
        OR: [{ subdomain: 'main' }, { slug: 'morena-teach' }]
      }
    });

    if (!org) {
      org = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
    }

    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: 'Morena Teach',
          slug: 'morena-teach',
        }
      });
    }

    const cleanSubject = subject?.trim() || (organizationType ? `[${organizationType}] Inquiry` : 'General Inquiry');
    const extraDetails = [
      organizationType ? `Type: ${organizationType}` : null,
      organizationName ? `Organization: ${organizationName}` : null,
    ].filter(Boolean).join(' | ');

    const fullMessage = extraDetails ? `${extraDetails}\n\n${message.trim()}` : message.trim();

    // 1. Create ContactSubmission
    const submission = await prisma.contactSubmission.create({
      data: {
        organizationId: org.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? String(phone).trim() : null,
        subject: cleanSubject,
        message: fullMessage,
        status: 'NEW',
      }
    });

    // 2. Also register in Lead for LMS lead tracking
    try {
      await prisma.lead.create({
        data: {
          organizationId: org.id,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone ? String(phone).trim() : null,
          sourceForm: organizationType === 'School / Institution' ? 'APPLICATION' : 'CONTACT',
          message: fullMessage,
          status: 'NEW',
          notes: organizationName ? `Org: ${organizationName}` : null,
        }
      });
    } catch (leadErr) {
      console.warn('Could not mirror contact submission to Lead table:', leadErr);
    }

    // 3. Dispatch Email to Morena Teach official address
    try {
      const recipientEmail = process.env.ADMIN_EMAIL || 'morena@morenateach.com';
      const formattedTimestamp = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      const leadEmailHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="background: linear-gradient(135deg, #183257 0%, #202230 100%); padding: 22px 24px; border-radius: 8px; margin-bottom: 24px;">
    <h2 style="color: #ffffff; margin: 0 0 6px 0; font-size: 20px; font-weight: 800; letter-spacing: -0.01em;">New Contact Lead Received 📩</h2>
    <p style="color: #cbd5e1; margin: 0; font-size: 13px;">Morena Teach Website Inbound Lead</p>
  </div>
  
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 10px 0; color: #64748b; width: 140px; font-weight: 600;">Sender Name:</td>
      <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">${name.trim()}</td>
    </tr>
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Email Address:</td>
      <td style="padding: 10px 0; color: #0f172a;"><a href="mailto:${email.trim().toLowerCase()}" style="color: #5022c3; font-weight: 600; text-decoration: underline;">${email.trim().toLowerCase()}</a></td>
    </tr>
    ${phone ? `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Phone Number:</td>
      <td style="padding: 10px 0; color: #0f172a; font-weight: 600;"><a href="tel:${phone.trim()}" style="color: #0f172a; text-decoration: none;">${phone.trim()}</a></td>
    </tr>` : ''}
    ${organizationType ? `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Inquiry Type:</td>
      <td style="padding: 10px 0; color: #0f172a;">${organizationType}</td>
    </tr>` : ''}
    ${organizationName ? `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Organization:</td>
      <td style="padding: 10px 0; color: #0f172a;">${organizationName}</td>
    </tr>` : ''}
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Subject:</td>
      <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">${cleanSubject}</td>
    </tr>
    <tr>
      <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Received At:</td>
      <td style="padding: 10px 0; color: #64748b;">${formattedTimestamp}</td>
    </tr>
  </table>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #5022c3; padding: 16px; margin-bottom: 24px; border-radius: 6px;">
    <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Message Body:</p>
    <p style="margin: 0; color: #1e293b; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message.trim()}</p>
  </div>

  <div style="text-align: center; padding-top: 10px;">
    <a href="mailto:${email.trim().toLowerCase()}?subject=Re: ${encodeURIComponent(cleanSubject)}" style="display: inline-block; background: #5022c3; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 10px 20px; border-radius: 6px;">Reply to ${name.trim()}</a>
  </div>
</div>
`;

      await EmailService.sendEmail({
        to: recipientEmail,
        subject: `[Morena Teach Lead] ${cleanSubject} - from ${name.trim()}`,
        template: 'NOTIFICATION',
        html: leadEmailHtml,
        organizationId: org.id
      });
    } catch (emailErr) {
      console.warn('Could not dispatch lead email notification to morena@morenateach.com:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your message has been sent successfully. An advisor will reach out to you shortly.',
      id: submission.id,
    });
  } catch (error: any) {
    console.error('Error submitting contact form:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit contact message. Please try again later.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

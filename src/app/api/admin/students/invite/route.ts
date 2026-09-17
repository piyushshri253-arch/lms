import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, enforceTenantPlanLimits } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const body = await req.json();
    const { email, role = 'STUDENT', courseId, phone } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid student email address is required.' }, { status: 400 });
    }

    if (!admin.organizationId) {
      return NextResponse.json({ error: 'No organization assigned to this administrator.' }, { status: 403 });
    }

    // 1. Enforce SaaS Plan limits on student seats
    const limitCheck = await enforceTenantPlanLimits(admin.organizationId, 'STUDENTS');
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.message }, { status: 403 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Check if user is already enrolled in this organization
    const existingUser = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        organizationId: admin.organizationId
      }
    });

    if (existingUser) {
      // If user exists, enroll in course if specified
      if (courseId) {
        await prisma.enrollment.upsert({
          where: {
            userId_courseId: {
              userId: existingUser.id,
              courseId
            }
          },
          create: {
            organizationId: admin.organizationId,
            userId: existingUser.id,
            courseId,
            status: 'ACTIVE'
          },
          update: { status: 'ACTIVE' }
        });
      }
      return NextResponse.json({
        success: true,
        message: `Student ${existingUser.name} is already registered in this organization and has been enrolled.`
      });
    }

    // 3. Generate secure cryptographic invitation token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId: admin.organizationId,
        email: normalizedEmail,
        role: role.toUpperCase(),
        courseId: courseId || null,
        tokenHash: rawToken,
        invitedBy: admin.id,
        status: 'PENDING',
        expiresAt
      }
    });

    // 4. Fetch Organization metadata for branding
    const org = await prisma.organization.findUnique({
      where: { id: admin.organizationId },
      select: { name: true, slug: true }
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${rawToken}`;

    // 5. Send Email Invitation
    await sendEmail({
      to: normalizedEmail,
      subject: `You have been invited to join ${org?.name || 'Academy'} on MORENA TEACH`,
      template: 'COMPANY_INVITE',
      organizationId: admin.organizationId,
      data: {
        companyName: org?.name || 'Your Academy',
        inviteUrl,
        adminName: admin.name,
        expiresInDays: 7
      }
    });

    // 6. Optional WhatsApp Invitation
    if (phone) {
      await sendWhatsAppMessage({
        recipientPhone: phone,
        templateName: 'student_invitation',
        variables: {
          organization: org?.name || 'Academy',
          invite_link: inviteUrl
        },
        organizationId: admin.organizationId
      });
    }

    // 7. Log Audit Event
    await prisma.auditLog.create({
      data: {
        organizationId: admin.organizationId,
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'STUDENT_INVITED',
        entity: 'OrganizationInvitation',
        entityId: invitation.id,
        description: `Admin ${admin.name} sent student invitation to ${normalizedEmail}.`
      }
    });

    return NextResponse.json({
      success: true,
      message: `Invitation successfully dispatched to ${normalizedEmail}.`,
      invitationId: invitation.id,
      inviteUrl
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to send invitation.' }, { status: 500 });
  }
}

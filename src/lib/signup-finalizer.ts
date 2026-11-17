import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/email';
import { createAuditLog } from '@/lib/audit';
import { logSecurityEvent } from '@/lib/security';
import { DEFAULT_ROLE_PERMISSIONS, UserRole } from '@/lib/permissions';

export interface PendingUserData {
  organizationId?: string | null;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  bio?: string | null;
  avatar?: string | null;
  qualification?: string | null;
  additionalQualifications?: string | null;
  linkedinUrl?: string | null;
  qualificationsList?: any[];
  experience?: string | null;
  experienceYears?: string | null;
  resumeDataUrl?: string | null;
  resumeFileName?: string | null;
  resumeMimeType?: string | null;
  resumeSize?: number | null;
  inviteToken?: string | null;
  role?: string;
  customRole?: string | null;
  platform?: string;
  permissions?: string;
}

interface FinalizeSignupOptions {
  userData: PendingUserData;
  verificationMethod: 'OTP' | 'GOOGLE_OAUTH';
  req: NextRequest;
  pendingKeyToDelete?: string;
  sendInstructorConfirmationEmail?: boolean;
}

const INSTRUCTOR_REVIEW_CONFIRMATION_HTML = `
  <div style="margin-bottom: 16px;">
    <span style="display: inline-block; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 800;">
      ⏳ Submitted for Review
    </span>
  </div>
  <p style="color: #0f172a; font-size: 15px; font-weight: 700; line-height: 1.5; margin: 0 0 12px 0;">
    Your application has been successfully submitted for review.
  </p>
  <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;">
    Our team will review your profile, qualifications, experience, and resume and will contact you within <strong>24 - 48 hours</strong> with the next steps.
  </p>
  <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
    You will be guided through the verification and instructor onboarding process once your application has been reviewed.
  </p>
  <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 18px 20px; margin: 18px 0; color: #1e293b;">
    <div style="font-size: 15px; font-weight: 800; color: #5b21b6; margin-bottom: 6px;">
      What Happens in the Next:
    </div>
    <p style="margin: 0 0 14px 0; font-size: 13px; line-height: 1.5; color: #475569;">
      Thank you for submitting your instructor profile and documents. Here’s what happens next:
    </p>
    <div style="margin-bottom: 12px;">
      <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 3px;">1. Profile &amp; Resume Review</div>
      <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #334155;">
        Our team will review your profile, educational qualifications, experience, and resume.
      </p>
    </div>
    <div style="margin-bottom: 12px;">
      <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 3px;">2. Review &amp; Interview Decision</div>
      <p style="margin: 0 0 4px 0; font-size: 13px; line-height: 1.5; color: #334155;">
        Based on the information provided, our team may either:
      </p>
      <ul style="margin: 4px 0 0 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #334155;">
        <li>Approve your profile for direct onboarding, or</li>
        <li>Invite you for a short interview to learn more about your experience and expertise.</li>
      </ul>
    </div>
    <div>
      <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 3px;">3. Instructor Onboarding</div>
      <p style="margin: 0 0 4px 0; font-size: 13px; line-height: 1.5; color: #334155;">
        Once your profile is approved, you will receive an onboarding email.
      </p>
      <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #334155;">
        You can then access the Instructor Portal and start creating and managing your courses.
      </p>
    </div>
  </div>
`;

export async function finalizeVerifiedSignup({
  userData,
  verificationMethod,
  req,
  pendingKeyToDelete,
  sendInstructorConfirmationEmail = true
}: FinalizeSignupOptions) {
  const normalizedEmail = userData.email.toLowerCase().trim();
  const userRole = (userData.role as UserRole) || 'STUDENT';
  const perms = userData.permissions
    ? userData.permissions
    : JSON.stringify(DEFAULT_ROLE_PERMISSIONS[userRole] || []);

  // Clean up any stale unverified row for this specific role if one existed
  const existingCheck = await prisma.user.findFirst({
    where: { email: normalizedEmail, role: userRole }
  });
  if (existingCheck && !existingCheck.emailVerified) {
    await prisma.user.delete({ where: { id: existingCheck.id } }).catch(() => {});
  }

  let updatedUser: any = null;
  if (existingCheck && existingCheck.emailVerified) {
    updatedUser = await prisma.user.findUnique({
      where: { id: existingCheck.id },
      include: { organization: true }
    });
  } else {
    const targetPlatform =
      userRole === 'INSTRUCTOR'
        ? 'INSTRUCTOR'
        : userRole === 'REVIEWER'
        ? 'REVIEWER'
        : 'LMS';

    // Migrate another role row occupying targetPlatform so @@unique([email, platform]) never collides
    const platformConflict = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        platform: targetPlatform,
        NOT: { role: userRole }
      }
    });
    if (platformConflict) {
      const movedPlatform =
        platformConflict.role === 'INSTRUCTOR'
          ? 'INSTRUCTOR'
          : platformConflict.role === 'REVIEWER'
          ? 'REVIEWER'
          : `${platformConflict.role}_PORTAL`;
      await prisma.user
        .update({
          where: { id: platformConflict.id },
          data: { platform: movedPlatform }
        })
        .catch(() => {});
    }

    const initialStatus = userRole === 'INSTRUCTOR' ? 'PENDING_APPROVAL' : 'ACTIVE';
    updatedUser = await prisma.user.create({
      data: {
        organizationId: userData.organizationId || null,
        name: userData.name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        password: userData.password,
        phone: userData.phone || null,
        address: userData.address || null,
        city: userData.city || null,
        state: userData.state || null,
        country: userData.country || null,
        pincode: userData.pincode || null,
        bio: userData.bio || null,
        avatar: userData.avatar || null,
        role: userRole,
        customRole:
          userData.customRole ||
          (userRole === 'REVIEWER'
            ? 'Course Auditor'
            : userRole === 'INSTRUCTOR'
            ? 'Instructor'
            : null),
        platform: targetPlatform,
        permissions: perms,
        status: initialStatus,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
        welcomeEmailStatus: 'NOT_SENT',
        sessionVersion: 1
      },
      include: { organization: true }
    });
  }

  // Persist Instructor Application & Resume payload for Auditor Review & Interview
  if (userRole === 'INSTRUCTOR' && updatedUser) {
    const appKey = `instructor_application_${updatedUser.id}`;
    const applicationPayload = {
      userId: updatedUser.id,
      firstName: userData.firstName || updatedUser.name.split(' ')[0] || '',
      lastName: userData.lastName || updatedUser.name.split(' ').slice(1).join(' ') || '',
      fullName: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone || userData.phone || '',
      address: updatedUser.address || userData.address || '',
      city: updatedUser.city || userData.city || '',
      state: updatedUser.state || userData.state || '',
      country: updatedUser.country || userData.country || 'India',
      pincode: updatedUser.pincode || userData.pincode || '',
      qualification: userData.qualification || 'Not specified',
      additionalQualifications: userData.additionalQualifications || '',
      linkedinUrl: userData.linkedinUrl || '',
      qualificationsList: Array.isArray(userData.qualificationsList)
        ? userData.qualificationsList
        : [],
      experience: userData.experience || 'Not specified',
      experienceYears: userData.experienceYears || '',
      resumeDataUrl: userData.resumeDataUrl || null,
      resumeFileName: userData.resumeFileName || 'Instructor_Resume.pdf',
      resumeMimeType: userData.resumeMimeType || 'application/pdf',
      resumeSize: userData.resumeSize || 0,
      verifiedVia: verificationMethod,
      applicationStatus: 'PENDING_REVIEW',
      interviewDecision: 'PENDING',
      interviewStatus: 'NOT_SCHEDULED',
      interviewDate: null,
      interviewMeetingLink: '',
      interviewNotes: '',
      auditorNotes: '',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await prisma.platformSetting
      .upsert({
        where: { key: appKey },
        create: {
          key: appKey,
          value: JSON.stringify(applicationPayload)
        },
        update: {
          value: JSON.stringify(applicationPayload)
        }
      })
      .catch(() => {});
  }

  if (userData.inviteToken) {
    const inviteKey = `auditor_invite_${userData.inviteToken}`;
    const row = await prisma.platformSetting.findUnique({ where: { key: inviteKey } }).catch(() => null);
    if (row) {
      try {
        const parsed = JSON.parse(row.value);
        parsed.used = true;
        parsed.usedAt = new Date().toISOString();
        parsed.registeredUserId = updatedUser.id;
        await prisma.platformSetting
          .update({
            where: { key: inviteKey },
            data: { value: JSON.stringify(parsed) }
          })
          .catch(() => {});
      } catch {}
    }
  }

  await prisma.notificationPreference
    .create({
      data: { userId: updatedUser.id }
    })
    .catch(() => {});

  if (updatedUser.organizationId) {
    await prisma.organizationMember
      .upsert({
        where: {
          organizationId_userId: {
            organizationId: updatedUser.organizationId,
            userId: updatedUser.id
          }
        },
        create: {
          organizationId: updatedUser.organizationId,
          userId: updatedUser.id,
          role: userRole,
          permissions: perms,
          status: userRole === 'INSTRUCTOR' ? 'PENDING_APPROVAL' : 'ACTIVE'
        },
        update: {
          role: userRole,
          status: userRole === 'INSTRUCTOR' ? 'PENDING_APPROVAL' : 'ACTIVE'
        }
      })
      .catch(() => {});
  }

  if (pendingKeyToDelete) {
    await prisma.platformSetting
      .delete({
        where: { key: pendingKeyToDelete }
      })
      .catch(() => {});
  }

  const isPendingInstructorOnboarding =
    updatedUser.role === 'INSTRUCTOR' && updatedUser.status === 'PENDING_APPROVAL';

  if (sendInstructorConfirmationEmail && isPendingInstructorOnboarding) {
    await EmailService.sendCustomNotificationEmail({
      to: updatedUser.email,
      subject: '⏳ Submitted for Review — Your Instructor Application Has Been Submitted',
      title: 'Submitted for Review',
      message: INSTRUCTOR_REVIEW_CONFIRMATION_HTML,
      userId: updatedUser.id
    }).catch(() => {});
  }

  // Notify Course Auditors (REVIEWER) & Admins about new Instructor Application
  if (updatedUser.role === 'INSTRUCTOR' || updatedUser.role === 'REVIEWER') {
    try {
      const recipients = await prisma.user.findMany({
        where: {
          role: { in: ['REVIEWER', 'SUPER_ADMIN', 'ADMIN', 'LMS_ADMIN'] },
          isSuspended: false
        },
        select: { id: true, name: true, email: true, role: true }
      });

      for (const rec of recipients) {
        if (updatedUser.role === 'INSTRUCTOR') {
          await prisma.notification
            .create({
              data: {
                userId: rec.id,
                title: `📋 New Instructor Application: ${updatedUser.name}`,
                message: `${updatedUser.name} (${updatedUser.email}) submitted their Instructor Signup with Qualification (${userData.qualification || 'N/A'}), Experience (${userData.experience || 'N/A'}), and Resume. Please review, decide on interview, and onboard.`,
                type: 'ACCOUNT',
                link: '/reviewer/instructors'
              }
            })
            .catch(() => {});

          if (
            (rec.role === 'REVIEWER' || rec.role === 'SUPER_ADMIN') &&
            !rec.email.toLowerCase().endsWith('@morenateach.com')
          ) {
            await EmailService.sendCustomNotificationEmail({
              to: rec.email,
              subject: `📋 New Instructor Application for Auditor Review: ${updatedUser.name}`,
              title: 'New Instructor Application & Resume Received',
              message: `Instructor applicant <strong>${updatedUser.name}</strong> (${updatedUser.email}) has completed email verification (${verificationMethod === 'GOOGLE_OAUTH' ? 'Verified via Google' : 'OTP Verified'}) and uploaded their Resume & Qualification details.<br/><br/>
              <strong>First & Last Name:</strong> ${userData.firstName || ''} ${userData.lastName || ''}<br/>
              <strong>Primary Qualification:</strong> ${userData.qualification || 'N/A'}<br/>
              <strong>Additional Qualifications:</strong> ${userData.additionalQualifications || 'None'}<br/>
              <strong>Experience:</strong> ${userData.experience || 'N/A'}<br/>
              <strong>Resume File:</strong> ${userData.resumeFileName || 'Attached in Auditor Portal'}<br/><br/>
              Please open the Auditor Instructor Onboarding Studio to download their resume, decide whether to take an interview, and complete onboarding.`,
              actionUrl: '/reviewer/instructors',
              actionText: 'Review Instructor & Download Resume →',
              userId: rec.id
            }).catch(() => {});
          }
        } else {
          await prisma.notification
            .create({
              data: {
                userId: rec.id,
                title: `New Verified Reviewer / Auditor: ${updatedUser.name}`,
                message: `${updatedUser.name} (${updatedUser.email}) verified their email and activated their Reviewer account.`,
                type: 'ACCOUNT',
                link: '/super-admin/users'
              }
            })
            .catch(() => {});
        }
      }
    } catch {}
  }

  const roleDashUrl =
    updatedUser.role === 'SUPER_ADMIN'
      ? '/super-admin/dashboard'
      : updatedUser.role === 'LMS_ADMIN' || updatedUser.role === 'ADMIN'
      ? '/admin/dashboard'
      : updatedUser.role === 'INSTRUCTOR'
      ? '/instructor/dashboard'
      : updatedUser.role === 'REVIEWER'
      ? '/reviewer/dashboard'
      : '/student/dashboard';

  await prisma.notification
    .create({
      data: {
        userId: updatedUser.id,
        organizationId: updatedUser.organizationId || null,
        title: isPendingInstructorOnboarding
          ? 'Application Submitted for Auditor Review 📋'
          : 'Welcome to Morena Teach!',
        message: isPendingInstructorOnboarding
          ? 'Your Instructor email is verified and your profile, qualifications, experience & resume have been forwarded to our Course Auditor. Once your interview/onboarding is approved, you will receive an email with your Login button.'
          : `Your ${
              updatedUser.role === 'INSTRUCTOR'
                ? 'Instructor'
                : updatedUser.role === 'REVIEWER'
                ? 'Reviewer / Auditor'
                : ''
            } account email has been verified and activated.`,
        type: 'ACCOUNT',
        link: roleDashUrl
      }
    })
    .catch(() => {});

  let welcomeResult: { success: boolean; error?: string | null } = { success: true, error: null };
  if (!isPendingInstructorOnboarding) {
    welcomeResult = await EmailService.sendWelcomeEmail({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      organizationId: updatedUser.organizationId
    });
  }

  await logSecurityEvent({
    userId: updatedUser.id,
    email: normalizedEmail,
    eventType: verificationMethod === 'GOOGLE_OAUTH' ? 'GOOGLE_SIGNUP_VERIFIED' : 'OTP_VERIFIED',
    req,
    metadata: {
      role: updatedUser.role,
      status: updatedUser.status,
      verificationMethod,
      welcomeEmailSent: welcomeResult.success,
      welcomeEmailError: welcomeResult.error || null
    }
  });

  await createAuditLog({
    organizationId: updatedUser.organizationId || null,
    actorId: updatedUser.id,
    actorEmail: normalizedEmail,
    action: 'USER_VERIFIED_EMAIL',
    entity: 'User',
    entityId: updatedUser.id,
    description: isPendingInstructorOnboarding
      ? `Instructor applicant "${updatedUser.name}" verified email via ${
          verificationMethod === 'GOOGLE_OAUTH' ? 'Google OAuth' : 'OTP'
        }. Application & Resume routed to Auditor (24 - 48 hrs onboarding SLA).`
      : `User "${updatedUser.name}" (${updatedUser.role}) verified email via ${verificationMethod}. Welcome email status: ${
          welcomeResult.success ? 'SENT' : 'FAILED'
        }.`,
    req
  }).catch(() => {});

  return {
    updatedUser,
    isPendingInstructorOnboarding,
    roleDashUrl,
    welcomeResult
  };
}

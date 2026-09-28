import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashToken, logSecurityEvent, checkRateLimit } from '@/lib/security';
import {
  setSessionCookie,
  clearSessionCookie,
  setReviewerSessionCookie,
  clearReviewerSessionCookie,
  setLmsSessionCookie,
  clearLmsSessionCookie,
  getLmsCurrentUser,
  AuthSessionUser
} from '@/lib/auth';
import { EmailService } from '@/lib/email';
import { createAuditLog } from '@/lib/audit';
import { DEFAULT_ROLE_PERMISSIONS, UserRole } from '@/lib/permissions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp, skipSessionCookie } = body;

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return NextResponse.json(
        { error: 'Please enter a valid 6-digit numeric OTP code.' },
        { status: 400 }
      );
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rateLimit = checkRateLimit(`verify_otp_${normalizedEmail}_${ip}`, 8, 900);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many verification attempts. Please wait ${Math.ceil(
            rateLimit.retryAfterSeconds / 60
          )} minutes before trying again.`
        },
        { status: 429 }
      );
    }

    // 1. Check if this is a Pending Signup (Deferred User Creation — not saved in prisma.user until OTP verified!)
    const pendingKey = `pending_signup_${normalizedEmail}`;
    const pendingSetting = await prisma.platformSetting.findUnique({
      where: { key: pendingKey }
    });

    let updatedUser: any = null;

    if (pendingSetting) {
      let pendingPayload: any = null;
      try {
        pendingPayload = JSON.parse(pendingSetting.value);
      } catch {
        return NextResponse.json(
          { error: 'Invalid pending registration state. Please click "Resend OTP" or sign up again.' },
          { status: 400 }
        );
      }

      // Check expiration (10 minutes)
      if (new Date() > new Date(pendingPayload.expiresAt)) {
        return NextResponse.json(
          { error: 'Verification code has expired. Please click "Resend OTP" for a new code.' },
          { status: 400 }
        );
      }

      // Check max attempts (5)
      const currentAttempts = Number(pendingPayload.attempts || 0);
      if (currentAttempts >= 5) {
        return NextResponse.json(
          {
            error: 'Maximum verification attempts exceeded for this code. Please request a new code.'
          },
          { status: 429 }
        );
      }

      // Compare OTP hash
      const inputHash = hashToken(cleanOtp);
      const isValid = inputHash === pendingPayload.otpHash;

      if (!isValid) {
        pendingPayload.attempts = currentAttempts + 1;
        await prisma.platformSetting.update({
          where: { key: pendingKey },
          data: { value: JSON.stringify(pendingPayload) }
        });

        const remaining = 4 - currentAttempts;
        return NextResponse.json(
          {
            error:
              remaining > 0
                ? `Invalid verification code. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`
                : 'Invalid verification code. Please request a new code.'
          },
          { status: 400 }
        );
      }

      // OTP Verified! Now create the User in prisma.user for the very first time!
      const uData = pendingPayload.userData || {};
      const userRole = (uData.role as UserRole) || 'STUDENT';
      const perms = uData.permissions
        ? uData.permissions
        : JSON.stringify(DEFAULT_ROLE_PERMISSIONS[userRole] || []);

      // Clean up any stale unverified row FOR THIS SPECIFIC ROLE if one existed
      const existingCheck = await prisma.user.findFirst({
        where: { email: normalizedEmail, role: userRole }
      });
      if (existingCheck && !existingCheck.emailVerified) {
        await prisma.user.delete({ where: { id: existingCheck.id } }).catch(() => {});
      }

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

        // If another role row currently occupies targetPlatform for this email, move it to its role-specific platform so @@unique([email, platform]) never collides
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
            organizationId: uData.organizationId || null,
            name: uData.name || normalizedEmail.split('@')[0],
            email: normalizedEmail,
            password: uData.password,
            phone: uData.phone || null,
            address: uData.address || null,
            city: uData.city || null,
            state: uData.state || null,
            country: uData.country || null,
            pincode: uData.pincode || null,
            bio: uData.bio || null,
            avatar: uData.avatar || null,
            role: userRole,
            customRole:
              uData.customRole ||
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

      // If INSTRUCTOR, store full Instructor Application & Resume payload for Auditor Review & Interview
      if (userRole === 'INSTRUCTOR' && updatedUser) {
        const appKey = `instructor_application_${updatedUser.id}`;
        const applicationPayload = {
          userId: updatedUser.id,
          firstName: uData.firstName || updatedUser.name.split(' ')[0] || '',
          lastName: uData.lastName || updatedUser.name.split(' ').slice(1).join(' ') || '',
          fullName: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone || uData.phone || '',
          address: updatedUser.address || uData.address || '',
          city: updatedUser.city || uData.city || '',
          state: updatedUser.state || uData.state || '',
          country: updatedUser.country || uData.country || 'India',
          pincode: updatedUser.pincode || uData.pincode || '',
          qualification: uData.qualification || 'Not specified',
          additionalQualifications: uData.additionalQualifications || '',
          linkedinUrl: uData.linkedinUrl || '',
          qualificationsList: Array.isArray(uData.qualificationsList) ? uData.qualificationsList : [],
          experience: uData.experience || 'Not specified',
          experienceYears: uData.experienceYears || '',
          resumeDataUrl: uData.resumeDataUrl || null,
          resumeFileName: uData.resumeFileName || 'Instructor_Resume.pdf',
          resumeMimeType: uData.resumeMimeType || 'application/pdf',
          resumeSize: uData.resumeSize || 0,
          applicationStatus: 'PENDING_REVIEW', // PENDING_REVIEW | INTERVIEW_SCHEDULED | INTERVIEW_COMPLETED | ONBOARDED | REJECTED
          interviewDecision: 'PENDING', // PENDING | TAKE_INTERVIEW | SKIP_INTERVIEW
          interviewStatus: 'NOT_SCHEDULED', // NOT_SCHEDULED | SCHEDULED | COMPLETED | SKIPPED
          interviewDate: null,
          interviewMeetingLink: '',
          interviewNotes: '',
          auditorNotes: '',
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await prisma.platformSetting.upsert({
          where: { key: appKey },
          create: {
            key: appKey,
            value: JSON.stringify(applicationPayload)
          },
          update: {
            value: JSON.stringify(applicationPayload)
          }
        }).catch(() => {});
      }

      await prisma.notificationPreference.create({
        data: { userId: updatedUser.id }
      }).catch(() => {});

      if (updatedUser.organizationId) {
        await prisma.organizationMember.upsert({
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
        }).catch(() => {});
      }

      // Delete temporary pending_signup record now that User is saved in DB
      await prisma.platformSetting.delete({
        where: { key: pendingKey }
      }).catch(() => {});

      // Notify Course Auditors (REVIEWER) & Admins about new Instructor Application (or Reviewer signup)
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
              await prisma.notification.create({
                data: {
                  userId: rec.id,
                  title: `📋 New Instructor Application: ${updatedUser.name}`,
                  message: `${updatedUser.name} (${updatedUser.email}) submitted their Instructor Signup with Qualification (${uData.qualification || 'N/A'}), Experience (${uData.experience || 'N/A'}), and Resume. Please review, decide on interview, and onboard.`,
                  type: 'ACCOUNT',
                  link: '/reviewer/instructors'
                }
              }).catch(() => {});

              // Also send email alert to Auditors (REVIEWER) so they know right away
              if (rec.role === 'REVIEWER' || rec.role === 'SUPER_ADMIN') {
                EmailService.sendCustomNotificationEmail({
                  to: rec.email,
                  subject: `📋 New Instructor Application for Auditor Review: ${updatedUser.name}`,
                  title: `New Instructor Application & Resume Received`,
                  message: `Instructor applicant <strong>${updatedUser.name}</strong> (${updatedUser.email}) has completed email verification and uploaded their Resume & Qualification details.<br/><br/>
                  <strong>First & Last Name:</strong> ${uData.firstName || ''} ${uData.lastName || ''}<br/>
                  <strong>Primary Qualification:</strong> ${uData.qualification || 'N/A'}<br/>
                  <strong>Additional Qualifications:</strong> ${uData.additionalQualifications || 'None'}<br/>
                  <strong>Experience:</strong> ${uData.experience || 'N/A'}<br/>
                  <strong>Resume File:</strong> ${uData.resumeFileName || 'Attached in Auditor Portal'}<br/><br/>
                  Please open the Auditor Instructor Onboarding Studio to download their resume, decide whether to take an interview, and complete onboarding.`,
                  actionUrl: '/reviewer/instructors',
                  actionText: 'Review Instructor & Download Resume →',
                  userId: rec.id
                }).catch(() => {});
              }
            } else {
              await prisma.notification.create({
                data: {
                  userId: rec.id,
                  title: `New Verified Reviewer / Auditor: ${updatedUser.name}`,
                  message: `${updatedUser.name} (${updatedUser.email}) verified their email via OTP and activated their Reviewer account.`,
                  type: 'ACCOUNT',
                  link: '/super-admin/users'
                }
              }).catch(() => {});
            }
          }
        } catch {}
      }
    } else {
      // Fallback: Existing user record in prisma.user
      const user = await prisma.user.findFirst({
        where: { email: normalizedEmail },
        include: { organization: true }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'No pending registration or account found with this email address. Please sign up first.' },
          { status: 404 }
        );
      }

      if (user.isSuspended || user.status === 'SUSPENDED') {
        return NextResponse.json(
          { error: 'This account has been suspended. Please contact platform support.' },
          { status: 403 }
        );
      }

      const tokenRecord = await prisma.emailVerificationToken.findFirst({
        where: {
          userId: user.id,
          usedAt: null
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!tokenRecord) {
        return NextResponse.json(
          { error: 'No active verification code found. Please click "Resend OTP".' },
          { status: 400 }
        );
      }

      if (new Date() > new Date(tokenRecord.expiresAt)) {
        return NextResponse.json(
          { error: 'Verification code has expired. Please click "Resend OTP" for a new code.' },
          { status: 400 }
        );
      }

      if (tokenRecord.attempts >= 5) {
        return NextResponse.json(
          {
            error: 'Maximum verification attempts exceeded for this code. Please request a new code.'
          },
          { status: 429 }
        );
      }

      const inputHash = hashToken(cleanOtp);
      const isValid = inputHash === tokenRecord.otpHash;

      if (!isValid) {
        await prisma.emailVerificationToken.update({
          where: { id: tokenRecord.id },
          data: { attempts: { increment: 1 } }
        });

        const remaining = 4 - tokenRecord.attempts;
        return NextResponse.json(
          {
            error:
              remaining > 0
                ? `Invalid verification code. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`
                : 'Invalid verification code. Please request a new code.'
          },
          { status: 400 }
        );
      }

      await prisma.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() }
      });

      updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
          status: 'ACTIVE',
          lastLoginAt: new Date()
        },
        include: { organization: true }
      });

      if (user.organizationId) {
        const userRole = (user.role as UserRole) || 'STUDENT';
        const perms = DEFAULT_ROLE_PERMISSIONS[userRole] || [];

        await prisma.organizationMember.upsert({
          where: {
            organizationId_userId: {
              organizationId: user.organizationId,
              userId: user.id
            }
          },
          create: {
            organizationId: user.organizationId,
            userId: user.id,
            role: userRole,
            permissions: JSON.stringify(perms),
            status: 'ACTIVE'
          },
          update: {
            role: userRole,
            status: 'ACTIVE'
          }
        });
      }
    }

    const user = updatedUser;

    const isPendingInstructorOnboarding =
      updatedUser.role === 'INSTRUCTOR' && updatedUser.status === 'PENDING_APPROVAL';

    // 4. Create Welcome / Application Received In-App Notification
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

    await prisma.notification.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId || null,
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
    }).catch(() => {});

    // 5. If Instructor is pending Auditor approval, send an Application Received (24-48 Hours Onboarding) email; otherwise send Welcome Email
    let welcomeResult: { success: boolean; error?: string | null } = { success: true, error: null };
    if (isPendingInstructorOnboarding) {
      await EmailService.sendCustomNotificationEmail({
        to: updatedUser.email,
        subject: '⏳ Your Morena Teach Instructor Application is Under Review (24–48 Hours Onboarding Process)',
        title: 'Application Under Review — 24 to 48 Hours Onboarding Process',
        message: `Hello <strong>${updatedUser.name}</strong>,<br/><br/>
        Thank you for registering as an Instructor on <strong>Morena Teach</strong>! Your email address is verified and your complete profile, qualifications, experience, and resume have been submitted for <strong>Auditor Review &amp; Onboarding</strong>.<br/><br/>
        <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 14px 18px; margin: 14px 0; color: #4c1d95;">
          <strong>⏱️ Estimated Onboarding &amp; Review Timeline: 24 – 48 Hours</strong><br/>
          Your profile is currently in our Auditor Review Queue. The complete verification, interview decision, and onboarding process takes <strong>24 to 48 hours</strong>.
        </div>
        <strong>What happens next?</strong><br/>
        1. <strong>Profile &amp; Resume Review (Within 24–48 Hours):</strong> Our Course Auditor will verify your qualifications, experience, LinkedIn profile, and uploaded resume.<br/>
        2. <strong>Interview Decision:</strong> If an interview is required, you will receive an interview schedule email.<br/>
        3. <strong>Final Onboarding &amp; Login Link:</strong> Once your onboarding is approved by the Auditor, you will receive an <strong>Onboarding Confirmation Email</strong> containing a direct <strong>Log In to Instructor Portal →</strong> button so you can sign in and publish courses.`,
        userId: updatedUser.id
      }).catch(() => {});
    } else {
      welcomeResult = await EmailService.sendWelcomeEmail({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        organizationId: updatedUser.organizationId
      });
    }

    // 6. Log Security Event & Audit Log
    await logSecurityEvent({
      userId: user.id,
      email: normalizedEmail,
      eventType: 'OTP_VERIFIED',
      req,
      metadata: {
        role: updatedUser.role,
        status: updatedUser.status,
        welcomeEmailSent: welcomeResult.success,
        welcomeEmailError: welcomeResult.error || null
      }
    });

    await createAuditLog({
      organizationId: user.organizationId || null,
      actorId: user.id,
      actorEmail: normalizedEmail,
      action: 'USER_VERIFIED_EMAIL',
      entity: 'User',
      entityId: user.id,
      description: isPendingInstructorOnboarding
        ? `Instructor applicant "${user.name}" verified email via OTP. Application & Resume routed to Auditor (24-48 hrs onboarding SLA).`
        : `User "${user.name}" (${updatedUser.role}) verified email via OTP. Welcome email status: ${welcomeResult.success ? 'SENT' : 'FAILED'}.`,
      req
    }).catch(() => {});

    // If Instructor is awaiting Auditor onboarding, do NOT issue an active Instructor session cookie yet (preserve active Student session if they signed up as Instructor with the same email)
    if (isPendingInstructorOnboarding) {
      const existingLmsUser = await getLmsCurrentUser();
      if (!existingLmsUser || existingLmsUser.role !== 'STUDENT') {
        await clearLmsSessionCookie();
      }
      return NextResponse.json({
        success: true,
        pendingAuditorApproval: true,
        email: updatedUser.email,
        name: updatedUser.name,
        message:
          'Your profile is now Under Review! The Auditor Onboarding process takes 24–48 hours, and a confirmation email has been sent to your inbox.',
        redirectUrl: `/instructor/login?email=${encodeURIComponent(updatedUser.email)}&pending=auditor`
      });
    }

    // 7. Determine exact role-based redirect URL
    const redirectUrl = roleDashUrl;

    const sessionPayload: AuthSessionUser = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      platform: (updatedUser.platform as any) || 'LMS',
      role: updatedUser.role as any,
      organizationId: updatedUser.organizationId || undefined,
      organizationName: updatedUser.organization?.name || undefined,
      organizationSlug: updatedUser.organization?.slug || undefined,
      organizationStatus: updatedUser.organization?.status || undefined,
      plan: updatedUser.organization?.plan || undefined,
      avatar: updatedUser.avatar,
      phone: updatedUser.phone,
      customRole: updatedUser.customRole,
      status: updatedUser.status,
      emailVerified: true,
      sessionVersion: updatedUser.sessionVersion
    };

    // 8. Only set session cookie if not verifying on behalf of another user (e.g. Admin/SuperAdmin modal)
    if (!skipSessionCookie) {
      if (updatedUser.role === 'REVIEWER') {
        await clearReviewerSessionCookie();
        await setReviewerSessionCookie(sessionPayload);
      } else if (updatedUser.role === 'INSTRUCTOR') {
        await clearLmsSessionCookie();
        await setLmsSessionCookie(sessionPayload);
      } else {
        await clearSessionCookie();
        await setSessionCookie(sessionPayload);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! Your account is now active.',
      welcomeEmailSent: welcomeResult.success,
      redirectUrl,
      hasOrganization: !!user.organizationId,
      user: sessionPayload
    });
  } catch (err: any) {
    console.error('[Verify OTP API Error]:', err);
    return NextResponse.json({ error: err.message || 'OTP verification failed.' }, { status: 500 });
  }
}

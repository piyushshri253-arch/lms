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
import { finalizeVerifiedSignup } from '@/lib/signup-finalizer';

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

      // OTP Verified! Finalize user creation, application record, notifications & logs via shared helper
      const finalized = await finalizeVerifiedSignup({
        userData: pendingPayload.userData || {},
        verificationMethod: 'OTP',
        req,
        pendingKeyToDelete: pendingKey,
        sendInstructorConfirmationEmail: true
      });
      updatedUser = finalized.updatedUser;

      const user = updatedUser;
      const isPendingInstructorOnboarding = finalized.isPendingInstructorOnboarding;
      const roleDashUrl = finalized.roleDashUrl;
      const welcomeResult = finalized.welcomeResult;

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
            'Your profile is now Under Review! The Auditor Onboarding process takes 24 - 48 hours, and a confirmation email has been sent to your inbox.',
          redirectUrl: `/instructor/login?email=${encodeURIComponent(updatedUser.email)}&pending=auditor`
        });
      }

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

    // 5. If Instructor is pending Auditor approval (and wasn't already emailed in step 1), send the exact "Under Review • 24–48 Hours Onboarding Process" email; otherwise send Welcome Email
    let welcomeResult: { success: boolean; error?: string | null } = { success: true, error: null };
    if (isPendingInstructorOnboarding) {
      if (!pendingSetting) {
        await EmailService.sendCustomNotificationEmail({
          to: updatedUser.email,
          subject: '⏳ Submitted for Review — Your Instructor Application Has Been Submitted',
          title: 'Submitted for Review',
          message: `
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
          </div>`,
          userId: updatedUser.id
        }).catch(() => {});
      }
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
        ? `Instructor applicant "${user.name}" verified email via OTP. Application & Resume routed to Auditor (24 - 48 hrs onboarding SLA).`
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
          'Your profile is now Under Review! The Auditor Onboarding process takes 24 - 48 hours, and a confirmation email has been sent to your inbox.',
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

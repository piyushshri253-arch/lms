import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireReviewerAuth } from '@/lib/auth';
import { sendEmail, EmailService } from '@/lib/email';
import { getBaseUrl } from '@/lib/base-url';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const auditor = await requireReviewerAuth();

    // Fetch all INSTRUCTOR accounts and all instructor_application_* platform settings
    const [instructors, appSettings, unreadNotifications] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'INSTRUCTOR' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          country: true,
          pincode: true,
          bio: true,
          avatar: true,
          status: true,
          emailVerified: true,
          createdAt: true
        }
      }),
      prisma.platformSetting.findMany({
        where: {
          key: { startsWith: 'instructor_application_' }
        }
      }),
      prisma.notification.findMany({
        where: {
          userId: auditor.id,
          isRead: false
        },
        orderBy: { createdAt: 'desc' },
        take: 15
      })
    ]);

    const appMap = new Map<string, any>();
    for (const s of appSettings) {
      const userId = s.key.replace('instructor_application_', '');
      try {
        appMap.set(userId, JSON.parse(s.value));
      } catch {}
    }

    // Strictly include ONLY real Instructor Signup applications (exclude seeded @morenateach.com demo accounts and legacy accounts without an application submission)
    const realApplicantInstructors = instructors.filter(
      (u) => appMap.has(u.id) && !u.email.toLowerCase().endsWith('@morenateach.com')
    );

    const items = realApplicantInstructors.map((u) => {
      const app = appMap.get(u.id) || {};
      const nameParts = (u.name || '').trim().split(' ');
      const firstName = app.firstName || nameParts[0] || '';
      const lastName = app.lastName || nameParts.slice(1).join(' ') || '';

      const effectiveAppStatus =
        u.status === 'ACTIVE' && (!app.applicationStatus || app.applicationStatus === 'PENDING_REVIEW')
          ? 'ONBOARDED'
          : u.status === 'REJECTED'
          ? 'REJECTED'
          : app.applicationStatus || (u.status === 'PENDING_APPROVAL' ? 'PENDING_REVIEW' : 'ONBOARDED');

      return {
        userId: u.id,
        firstName,
        lastName,
        fullName: u.name,
        email: u.email,
        phone: u.phone || app.phone || '',
        address: u.address || app.address || '',
        city: u.city || app.city || '',
        state: u.state || app.state || '',
        country: u.country || app.country || '',
        pincode: u.pincode || app.pincode || '',
        userStatus: u.status,
        emailVerified: u.emailVerified,
        createdAt: u.createdAt,
        qualification: app.qualification || '',
        additionalQualifications: app.additionalQualifications || '',
        linkedinUrl: app.linkedinUrl || '',
        qualificationsList: Array.isArray(app.qualificationsList) ? app.qualificationsList : [],
        experience: app.experience || '',
        experienceYears: app.experienceYears || '',
        resumeFileName: app.resumeFileName || null,
        resumeDataUrl: app.resumeDataUrl || null,
        resumeMimeType: app.resumeMimeType || 'application/pdf',
        resumeSize: app.resumeSize || 0,
        applicationStatus: effectiveAppStatus,
        interviewDecision: app.interviewDecision || 'PENDING',
        interviewStatus: app.interviewStatus || 'NOT_SCHEDULED',
        interviewDate: app.interviewDate || '',
        interviewMeetingLink: app.interviewMeetingLink || '',
        interviewNotes: app.interviewNotes || '',
        auditorNotes: app.auditorNotes || '',
        onboardedAt: app.onboardedAt || null,
        onboardedBy: app.onboardedBy || null,
        submittedAt: app.submittedAt || u.createdAt
      };
    });

    const summary = {
      total: items.length,
      pendingOnboarding: items.filter(
        (i) => i.userStatus === 'PENDING_APPROVAL' || ['PENDING_REVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED'].includes(i.applicationStatus)
      ).length,
      interviewStage: items.filter((i) => i.interviewDecision === 'TAKE_INTERVIEW' && i.applicationStatus !== 'ONBOARDED').length,
      onboarded: items.filter((i) => i.userStatus === 'ACTIVE' && i.applicationStatus === 'ONBOARDED').length,
      rejected: items.filter((i) => i.userStatus === 'REJECTED' || i.applicationStatus === 'REJECTED').length
    };

    return NextResponse.json({
      success: true,
      summary,
      instructors: items,
      unreadNotifications
    });
  } catch (err: any) {
    const status = err.message === 'UNAUTHORIZED' ? 401 : err.message === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Failed to load instructor applications' }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auditor = await requireReviewerAuth();
    const body = await req.json();
    const {
      userId,
      action,
      interviewDecision,
      interviewDate,
      interviewMeetingLink,
      interviewNotes,
      auditorNotes,
      sendInviteEmail
    } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'userId and action are required.' }, { status: 400 });
    }

    const instructor = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!instructor) {
      return NextResponse.json({ error: 'Instructor applicant not found.' }, { status: 404 });
    }

    const appKey = `instructor_application_${userId}`;
    const existingSetting = await prisma.platformSetting.findUnique({ where: { key: appKey } });
    let appData: any = {};
    if (existingSetting) {
      try {
        appData = JSON.parse(existingSetting.value);
      } catch {}
    }

    const baseUrl = getBaseUrl();

    if (action === 'DECIDE_INTERVIEW') {
      const decision = interviewDecision === 'SKIP_INTERVIEW' ? 'SKIP_INTERVIEW' : 'TAKE_INTERVIEW';
      appData = {
        ...appData,
        userId,
        fullName: instructor.name,
        email: instructor.email,
        interviewDecision: decision,
        interviewStatus: decision === 'TAKE_INTERVIEW' ? 'SCHEDULED' : 'SKIPPED',
        applicationStatus: decision === 'TAKE_INTERVIEW' ? 'INTERVIEW_SCHEDULED' : 'INTERVIEW_COMPLETED',
        interviewDate: interviewDate ?? appData.interviewDate ?? '',
        interviewMeetingLink: interviewMeetingLink ?? appData.interviewMeetingLink ?? '',
        interviewNotes: interviewNotes ?? appData.interviewNotes ?? '',
        auditorNotes: auditorNotes ?? appData.auditorNotes ?? '',
        updatedAt: new Date().toISOString()
      };

      await prisma.platformSetting.upsert({
        where: { key: appKey },
        create: { key: appKey, value: JSON.stringify(appData) },
        update: { value: JSON.stringify(appData) }
      });

      if (decision === 'TAKE_INTERVIEW' && sendInviteEmail) {
        const rawMeetingLink = String(appData.interviewMeetingLink || '').trim();
        const validMeetingUrl = rawMeetingLink
          ? rawMeetingLink.startsWith('http://') || rawMeetingLink.startsWith('https://')
            ? rawMeetingLink
            : `https://${rawMeetingLink}`
          : undefined;

        await EmailService.sendCustomNotificationEmail({
          to: instructor.email,
          subject: `🎙️ Interview Scheduled for Your Morena Teach Instructor Application`,
          title: `Instructor Onboarding Interview Scheduled`,
          message: `Hello <strong>${instructor.name}</strong>,<br/><br/>
          Our Course Auditor (<strong>${auditor.name}</strong>) has reviewed your Instructor application and resume and scheduled an onboarding interview.<br/><br/>
          ${appData.interviewDate ? `<strong>Scheduled Date &amp; Time:</strong> ${appData.interviewDate}<br/>` : ''}
          ${validMeetingUrl ? `<strong>Interview Link:</strong> <a href="${validMeetingUrl}" target="_blank" rel="noopener noreferrer">${validMeetingUrl}</a><br/>` : ''}
          ${appData.interviewNotes ? `<strong>Instructions / Notes:</strong> ${appData.interviewNotes}<br/>` : ''}<br/>
          Once the interview is completed and approved by the Auditor, you will receive your final Onboarding Confirmation Email with your direct Login button.`,
          actionUrl: validMeetingUrl,
          actionText: validMeetingUrl ? 'Join Interview Link →' : undefined,
          userId: instructor.id
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message:
          decision === 'TAKE_INTERVIEW'
            ? 'Interview decision saved as "Take Interview".'
            : 'Interview decision saved as "No Interview Required — Ready to Onboard".',
        application: appData
      });
    }

    if (action === 'COMPLETE_INTERVIEW') {
      appData = {
        ...appData,
        interviewStatus: 'COMPLETED',
        applicationStatus: 'INTERVIEW_COMPLETED',
        interviewNotes: interviewNotes ?? appData.interviewNotes ?? 'Interview completed successfully.',
        auditorNotes: auditorNotes ?? appData.auditorNotes ?? '',
        updatedAt: new Date().toISOString()
      };

      await prisma.platformSetting.upsert({
        where: { key: appKey },
        create: { key: appKey, value: JSON.stringify(appData) },
        update: { value: JSON.stringify(appData) }
      });

      return NextResponse.json({
        success: true,
        message: 'Interview marked as completed! You can now click "Onboard Instructor" to activate their account and send the login email.',
        application: appData
      });
    }

    if (action === 'ONBOARD_INSTRUCTOR') {
      // 1. Activate Instructor in prisma.user
      const updatedUser = await prisma.user.update({
        where: { id: instructor.id },
        data: {
          status: 'ACTIVE',
          emailVerified: true,
          welcomeEmailStatus: 'SENT',
          welcomeEmailSentAt: new Date()
        }
      });

      if (updatedUser.organizationId) {
        await prisma.organizationMember.updateMany({
          where: { userId: updatedUser.id },
          data: { status: 'ACTIVE' }
        }).catch(() => {});
      }

      // 2. Update application record to ONBOARDED
      appData = {
        ...appData,
        userId: instructor.id,
        fullName: instructor.name,
        email: instructor.email,
        applicationStatus: 'ONBOARDED',
        interviewStatus:
          appData.interviewDecision === 'TAKE_INTERVIEW' ? 'COMPLETED' : appData.interviewStatus || 'SKIPPED',
        auditorNotes: auditorNotes ?? appData.auditorNotes ?? 'Approved & Onboarded by Course Auditor.',
        onboardedAt: new Date().toISOString(),
        onboardedBy: auditor.name || auditor.email,
        updatedAt: new Date().toISOString()
      };

      await prisma.platformSetting.upsert({
        where: { key: appKey },
        create: { key: appKey, value: JSON.stringify(appData) },
        update: { value: JSON.stringify(appData) }
      });

      const loginUrl = `${baseUrl}/instructor/login?email=${encodeURIComponent(instructor.email)}`;

      // 3. Create In-App Notification for Instructor
      await prisma.notification.create({
        data: {
          userId: instructor.id,
          title: '🎉 Instructor Onboarding Approved! You Can Now Log In',
          message: `Congratulations ${instructor.name}! Course Auditor ${auditor.name} has completed your onboarding. Your Instructor Studio account is now active.`,
          type: 'ACCOUNT',
          link: '/instructor/dashboard'
        }
      }).catch(() => {});

      // 4. Send Official Onboarding Complete Email with Login Button -> /instructor/login
      const emailResult = await sendEmail({
        to: instructor.email,
        subject: '🎉 Congratulations! Your Morena Teach Instructor Onboarding is Complete — Log In Now',
        template: 'INSTRUCTOR_ONBOARDED',
        userId: instructor.id,
        data: {
          name: instructor.name,
          email: instructor.email,
          qualification: appData.qualification || '',
          experience: appData.experience || '',
          interviewDecision: appData.interviewDecision || 'SKIP_INTERVIEW',
          auditorNotes: appData.auditorNotes || '',
          loginUrl
        }
      });

      await createAuditLog({
        actorId: auditor.id,
        actorEmail: auditor.email,
        action: 'AUDITOR_ONBOARDED_INSTRUCTOR',
        entity: 'User',
        entityId: instructor.id,
        description: `Auditor "${auditor.name}" onboarded Instructor "${instructor.name}" (${instructor.email}). Login email sent: ${emailResult.success}.`,
        req
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        emailSent: emailResult.success,
        loginUrl,
        message: `Instructor "${instructor.name}" has been onboarded! An Onboarding Complete Email with a direct "Log In to Instructor Portal" button has been sent to ${instructor.email}.`,
        application: appData
      });
    }

    if (action === 'REJECT_INSTRUCTOR') {
      await prisma.user.update({
        where: { id: instructor.id },
        data: { status: 'REJECTED' }
      });

      appData = {
        ...appData,
        applicationStatus: 'REJECTED',
        auditorNotes: auditorNotes || 'Application was not approved during Auditor review.',
        updatedAt: new Date().toISOString()
      };

      await prisma.platformSetting.upsert({
        where: { key: appKey },
        create: { key: appKey, value: JSON.stringify(appData) },
        update: { value: JSON.stringify(appData) }
      });

      await EmailService.sendCustomNotificationEmail({
        to: instructor.email,
        subject: 'Update Regarding Your Morena Teach Instructor Application',
        title: 'Instructor Application Status Update',
        message: `Hello <strong>${instructor.name}</strong>,<br/><br/>
        Thank you for applying to become an Instructor on Morena Teach. After reviewing your application details${
          auditorNotes ? ` (<strong>Auditor Feedback:</strong> ${auditorNotes})` : ''
        }, we are unable to proceed with onboarding at this time.`,
        userId: instructor.id
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Instructor application for "${instructor.name}" has been marked as Rejected.`,
        application: appData
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    const status = err.message === 'UNAUTHORIZED' ? 401 : err.message === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Failed to update instructor application' }, { status });
  }
}

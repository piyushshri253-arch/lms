import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, hashToken, verifyPendingOtp, checkRateLimit, logSecurityEvent } from '@/lib/security';
import { setSalesSessionCookie, setLmsSessionCookie, setSessionCookie, AuthSessionUser, UserRole } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    const rateLimit = checkRateLimit(`company_verify_${ip}`, 15, 900);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many verification attempts. Please retry in ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, otp, companyName, slug, adminName, password, plan = 'STARTER', businessType = 'ACADEMY' } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email address and verification code are required.' },
        { status: 400 }
      );
    }

    const platform = (body.platform || (businessType.toUpperCase().includes('ACADEMY') || businessType.toUpperCase().includes('MASTERCLASS') ? 'LMS' : 'SALES')).toUpperCase();
    const normalizedEmail = email.toLowerCase().trim();
    const plainOtp = String(otp).trim();
    const otpHash = hashToken(plainOtp);

    // 1. Verify OTP against database verification token first, then fallback to pending setting
    let isOtpValid = false;
    const tokenRecord = await prisma.emailVerificationToken.findFirst({
      where: {
        email: normalizedEmail,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (tokenRecord && tokenRecord.otpHash === otpHash) {
      isOtpValid = true;
      await prisma.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() }
      });
    } else {
      const fallback = await verifyPendingOtp(normalizedEmail, plainOtp);
      if (fallback.success) {
        isOtpValid = true;
      }
    }

    if (!isOtpValid) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code. Please check your code or request a new one.' },
        { status: 400 }
      );
    }

    // 2. Find pre-created unverified user & organization from signup step
    const existingUser = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        platform: platform as any
      },
      include: { organization: true }
    });

    let orgRecord: any = null;
    let userRecord: any = null;

    if (existingUser && existingUser.organization) {
      // Activate existing organization and user
      orgRecord = await prisma.organization.update({
        where: { id: existingUser.organization.id },
        data: {
          status: 'ACTIVE',
          subscriptionStatus: 'TRIAL',
          plan: plan || existingUser.organization.plan
        }
      });

      userRecord = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          status: 'ACTIVE',
          emailVerified: true
        }
      });
    } else {
      // Fallback: create fresh organization and admin user
      const generatedSlug = (slug || companyName || 'workspace')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      let uniqueSlug = generatedSlug;
      const slugCheck = await prisma.organization.findUnique({ where: { slug: uniqueSlug } });
      if (slugCheck) {
        uniqueSlug = `${uniqueSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const hashedPassword = password ? await hashPassword(password) : await hashPassword('AdminPass@123');

      const created = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: companyName || (platform === 'LMS' ? 'My LMS Academy' : 'My Business Workspace'),
            slug: uniqueSlug,
            subdomain: uniqueSlug,
            plan,
            status: 'ACTIVE',
            subscriptionStatus: 'TRIAL',
            trialEndsAt,
            maxStudents: 1000,
            maxCourses: 50,
            maxStorageGB: 100.0,
            primaryColor: '#4f46e5'
          }
        });

        const user = await tx.user.create({
          data: {
            organizationId: org.id,
            name: adminName || 'Admin User',
            email: normalizedEmail,
            platform: platform as any,
            password: hashedPassword,
            role: platform === 'LMS' ? 'LMS_ADMIN' : 'SALES_ADMIN',
            customRole: platform === 'LMS' ? 'Academy Owner & Administrator' : 'Business Owner & Administrator',
            permissions: JSON.stringify(['ALL']),
            status: 'ACTIVE',
            emailVerified: true,
            sessionVersion: 1
          }
        });

        await tx.category.create({
          data: {
            organizationId: org.id,
            name: platform === 'LMS' ? 'Masterclasses & Engineering' : 'General Business',
            slug: `biz-${org.id.slice(-6)}`,
            description: 'Core organizational masterclasses and courses.'
          }
        }).catch(() => {});

        return { org, user };
      });

      orgRecord = created.org;
      userRecord = created.user;
    }

    // 3. Set authenticated session
    const sessionPayload: AuthSessionUser = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      platform: platform as any,
      role: (userRecord.role || (platform === 'LMS' ? 'LMS_ADMIN' : 'SALES_ADMIN')) as UserRole,
      organizationId: orgRecord.id,
      organizationName: orgRecord.name,
      organizationSlug: orgRecord.slug,
      organizationStatus: orgRecord.status,
      plan: orgRecord.plan,
      customRole: userRecord.customRole,
      permissions: ['ALL'],
      status: 'ACTIVE',
      emailVerified: true,
      sessionVersion: userRecord.sessionVersion || 1
    };

    if (platform === 'LMS') {
      await setLmsSessionCookie(sessionPayload);
    } else {
      await setSalesSessionCookie(sessionPayload);
    }
    await setSessionCookie(sessionPayload).catch(() => {});

    // 4. Send Welcome Email
    await sendEmail({
      to: normalizedEmail,
      subject: `Welcome to AADHYARA — Your ${platform === 'LMS' ? 'LMS Academy' : 'Sales'} workspace is ready!`,
      template: 'COMPANY_WELCOME',
      data: {
        adminName: userRecord.name,
        companyName: orgRecord.name,
        plan: orgRecord.plan,
        slug: orgRecord.slug
      },
      userId: userRecord.id
    }).catch(() => {});

    // 5. Security Event
    await logSecurityEvent({
      userId: userRecord.id,
      email: normalizedEmail,
      platform,
      eventType: 'COMPANY_SIGNUP_VERIFIED',
      req,
      metadata: {
        organizationId: orgRecord.id,
        companyName: orgRecord.name,
        plan: orgRecord.plan,
        platform
      }
    }).catch(() => {});

    const destination = platform === 'LMS' ? '/lms/admin' : '/sales/onboarding';

    return NextResponse.json({
      success: true,
      message: `${platform === 'LMS' ? 'LMS Academy' : 'Organization'} provisioned successfully.`,
      redirectUrl: destination,
      data: {
        redirectUrl: destination,
        organization: {
          id: orgRecord.id,
          name: orgRecord.name,
          slug: orgRecord.slug,
          plan: orgRecord.plan
        },
        user: {
          id: userRecord.id,
          name: userRecord.name,
          email: userRecord.email,
          role: userRecord.role
        }
      }
    });
  } catch (error: any) {
    console.error('[Company Verification Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete organization provisioning.' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateOtp, savePendingOtp, checkRateLimit, logSecurityEvent } from '@/lib/security';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    // Rate Limiting (10 requests per 15 minutes per IP)
    const rateLimit = checkRateLimit(`company_signup_${ip}`, 10, 900);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please retry in ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const companyName = (body.companyName || body.businessName || '').trim();
    const adminName = (body.adminName || body.name || '').trim();
    const email = (body.email || body.adminEmail || '').toLowerCase().trim();
    const password = body.password || '';
    const plan = body.plan || 'STARTER';
    const businessType = body.businessType || 'ACADEMY';
    const phone = body.adminPhone || body.phone || null;
    const platform = (body.platform || (businessType.toUpperCase().includes('ACADEMY') || businessType.toUpperCase().includes('MASTERCLASS') ? 'LMS' : 'SALES')).toUpperCase();

    let slug = (body.slug || companyName)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Validation
    if (!companyName || !adminName || !email || !password) {
      return NextResponse.json(
        { error: 'All fields (companyName, adminName, email, password) are required.' },
        { status: 400 }
      );
    }

    if (!slug || slug.length < 2) {
      slug = `workspace-${Math.random().toString(36).substring(2, 8)}`;
    }

    // Check if company workspace slug is taken - if taken, auto-append short unique suffix
    const existingOrg = await prisma.organization.findUnique({
      where: { slug }
    });
    if (existingOrg) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Check if user already exists on this platform
    const existingUser = await prisma.user.findFirst({
      where: { email, platform: platform as any },
      include: { organization: true }
    });

    if (existingUser && existingUser.emailVerified) {
      return NextResponse.json(
        { error: `An account with this email address already exists on ${platform === 'LMS' ? 'AADHYARA Learning' : 'AADHYARA Sales'}. Please log in.` },
        { status: 409 }
      );
    }

    // Password length check
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14-day trial
    const { otp, hash: otpHash } = generateOtp(6);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create or update unverified Organization and User in atomic transaction
    let userRecord: any = existingUser;
    let orgRecord: any = null;

    if (existingUser && !existingUser.emailVerified) {
      userRecord = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: adminName,
          password: hashedPassword,
          phone
        }
      });
      orgRecord = existingUser.organization;
    } else {
      const created = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: companyName,
            slug,
            subdomain: slug,
            plan,
            businessType,
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
            name: adminName,
            email,
            platform: platform as any,
            password: hashedPassword,
            phone,
            role: platform === 'LMS' ? 'LMS_ADMIN' : 'SALES_ADMIN',
            customRole: platform === 'LMS' ? 'Academy Owner & Administrator' : 'Business Owner & Administrator',
            permissions: JSON.stringify(['ALL']),
            status: 'PENDING_VERIFICATION',
            emailVerified: false,
            sessionVersion: 1
          }
        });

        // Initialize wallet for new organization
        await tx.wallet.create({
          data: {
            organizationId: org.id,
            currency: 'INR'
          }
        }).catch(() => {});

        return { org, user };
      });

      orgRecord = created.org;
      userRecord = created.user;
    }

    // Invalidate prior unused tokens
    await prisma.emailVerificationToken.updateMany({
      where: { userId: userRecord.id, usedAt: null },
      data: { usedAt: new Date() }
    });

    // Store cryptographic token
    await prisma.emailVerificationToken.create({
      data: {
        userId: userRecord.id,
        email,
        platform: platform as any,
        otpHash,
        expiresAt,
        attempts: 0
      }
    });

    // Also store pending OTP for standalone company verify endpoint
    await savePendingOtp(email, otpHash, 15);

    // Dispatch verification OTP email
    await sendEmail({
      to: email,
      subject: `Verify your AADHYARA workspace for ${companyName}`,
      template: 'OTP_VERIFY',
      userId: userRecord.id,
      organizationId: orgRecord?.id,
      data: {
        name: adminName,
        companyName,
        otp,
        expiresInMinutes: 15
      }
    });

    // Log security event
    await logSecurityEvent({
      userId: userRecord.id,
      email,
      eventType: 'COMPANY_SIGNUP_OTP_SENT',
      req,
      metadata: { companyName, slug, plan, businessType }
    });

    return NextResponse.json({
      success: true,
      email,
      previewOtp: otp,
      message: `Verification code sent to ${email}.`,
      data: {
        companyName,
        slug,
        adminName,
        email,
        plan,
        businessType
      }
    });
  } catch (error: any) {
    console.error('[Company Signup Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate company signup. Please check server logs.' },
      { status: 500 }
    );
  }
}

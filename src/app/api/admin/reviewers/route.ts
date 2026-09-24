import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, hashPassword } from '@/lib/auth';
import { generateOtp } from '@/lib/security';
import { sendEmail } from '@/lib/email';
import { createAuditLog } from '@/lib/audit';
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions';

export async function GET(request: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'LMS_ADMIN', 'SALES_ADMIN']);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase();

    const where: any = {
      role: 'REVIEWER'
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (admin.role !== 'SUPER_ADMIN' && admin.organizationId) {
      where.OR = [
        ...(where.OR || []),
        { organizationId: admin.organizationId },
        { organizationId: null }
      ];
    }

    const reviewers = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        bio: true,
        status: true,
        emailVerified: true,
        role: true,
        customRole: true,
        lastLoginAt: true,
        createdAt: true,
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    // Count courses audited by each auditor
    const reviewerIds = reviewers.map((r) => r.id);
    const reviewCounts = await prisma.course.groupBy({
      by: ['reviewedById'],
      where: {
        reviewedById: { in: reviewerIds }
      },
      _count: { id: true }
    });

    const countMap: Record<string, number> = {};
    for (const item of reviewCounts) {
      if (item.reviewedById) {
        countMap[item.reviewedById] = item._count.id;
      }
    }

    const formattedReviewers = reviewers.map((rev) => ({
      ...rev,
      coursesReviewed: countMap[rev.id] || 0
    }));

    return NextResponse.json({
      success: true,
      reviewers: formattedReviewers
    });
  } catch (err: any) {
    console.error('[Admin Auditors GET Error]:', err);
    return NextResponse.json({ error: err.message || 'Unauthorized or server error' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'LMS_ADMIN', 'SALES_ADMIN']);
    const body = await request.json();
    const { name, email, password, phone, bio } = body;

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const assignedPassword = (password || '').trim() || 'Auditor@123';

    if (assignedPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // Check for duplicate account
    const existing = await prisma.user.findFirst({
      where: { email: normalizedEmail }
    });

    if (existing) {
      return NextResponse.json(
        { error: `An account with email "${normalizedEmail}" already exists in the system.` },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(assignedPassword);
    const orgId = admin.role === 'SUPER_ADMIN' ? null : admin.organizationId;

    const reviewer = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone?.trim() || null,
        bio: bio?.trim() || 'Official Quality Assurance & Course Auditor',
        role: 'REVIEWER',
        customRole: 'Course Auditor',
        platform: 'LMS',
        status: 'ACTIVE',
        emailVerified: false,
        permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS.REVIEWER),
        organizationId: orgId
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        customRole: true,
        status: true,
        emailVerified: true,
        createdAt: true
      }
    });

    if (orgId) {
      await prisma.organizationMember.create({
        data: {
          organizationId: orgId,
          userId: reviewer.id,
          role: 'REVIEWER',
          permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS.REVIEWER),
          status: 'ACTIVE'
        }
      }).catch(() => {});
    }

    // Generate 6-digit OTP and send verification email
    const { otp, hash: otpHash } = generateOtp(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.emailVerificationToken.create({
      data: {
        userId: reviewer.id,
        email: normalizedEmail,
        otpHash,
        expiresAt,
        attempts: 0
      }
    });

    await sendEmail({
      to: normalizedEmail,
      subject: 'Verify Your Course Auditor Account — Morena Teach',
      template: 'OTP_VERIFY',
      userId: reviewer.id,
      organizationId: orgId,
      data: {
        name: reviewer.name,
        otp,
        expiresInMinutes: 10
      }
    }).catch((err) => {
      console.error('[Auditor OTP Email Error]:', err);
    });

    await createAuditLog({
      organizationId: orgId || undefined,
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'CREATE_COURSE_AUDITOR',
      entity: 'User',
      entityId: reviewer.id,
      description: `Admin appointed new Course Auditor "${reviewer.name}" (${reviewer.email}) and dispatched email verification OTP.`
    });

    return NextResponse.json({
      success: true,
      reviewer,
      requiresOtpVerification: true,
      email: reviewer.email,
      previewOtp: otp,
      credentials: {
        email: reviewer.email,
        password: assignedPassword
      },
      message: `Course Auditor "${reviewer.name}" created! A 6-digit verification OTP has been sent to ${reviewer.email}.`
    });
  } catch (err: any) {
    console.error('[Admin Auditors POST Error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

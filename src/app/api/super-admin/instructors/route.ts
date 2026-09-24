import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateOtp } from '@/lib/security';
import { sendEmail } from '@/lib/email';
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    await requireSuperAdmin();

    const users = await prisma.user.findMany({
      where: {
        role: { in: ['INSTRUCTOR', 'REVIEWER', 'SUPER_ADMIN', 'ADMIN'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        bio: true,
        role: true,
        customRole: true,
        status: true,
        emailVerified: true,
        isSuspended: true,
        createdAt: true,
        bankAccount: true,
        instructorPayouts: {
          orderBy: { requestedAt: 'desc' }
        },
        coursesAuthored: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            status: true,
            enrollments: { select: { id: true } },
            reviews: { select: { rating: true } },
            orders: { select: { amount: true, status: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const reviewerIds = users.filter((u) => u.role === 'REVIEWER').map((u) => u.id);
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

    const instructors = users
      .filter((u) => u.role === 'INSTRUCTOR' || u.role === 'SUPER_ADMIN' || u.role === 'ADMIN')
      .map((inst) => {
        const courses = inst.coursesAuthored;
        const totalStudents = courses.reduce((sum, c) => sum + c.enrollments.length, 0);

        const allReviews = courses.flatMap((c) => c.reviews);
        const avgRating =
          allReviews.length > 0
            ? Math.round((allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length) * 10) / 10
            : 5.0;

        const totalRevenue = courses
          .flatMap((c) => c.orders)
          .filter((o) => o.status === 'SUCCESS')
          .reduce((sum, o) => sum + o.amount, 0);

        return {
          id: inst.id,
          name: inst.name,
          email: inst.email,
          phone: inst.phone,
          avatar: inst.avatar,
          bio: inst.bio,
          role: inst.role,
          customRole: inst.customRole || 'Faculty Instructor',
          status: inst.status || 'ACTIVE',
          emailVerified: inst.emailVerified,
          isSuspended: inst.isSuspended,
          createdAt: inst.createdAt.toISOString().split('T')[0],
          courseCount: courses.length,
          courses: courses.map((c) => ({ id: c.id, title: c.title, status: c.status })),
          studentCount: totalStudents,
          avgRating,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          bankAccount: inst.bankAccount
            ? {
                id: inst.bankAccount.id,
                accountHolderName: inst.bankAccount.accountHolderName,
                bankName: inst.bankAccount.bankName,
                accountNumber: inst.bankAccount.accountNumber,
                accountNumberMasked: inst.bankAccount.accountNumberMasked,
                ifscCode: inst.bankAccount.ifscCode,
                accountType: inst.bankAccount.accountType,
                branchName: inst.bankAccount.branchName || '',
                upiId: inst.bankAccount.upiId || '',
                panNumber: inst.bankAccount.panNumber || '',
                status: inst.bankAccount.status,
                rejectionReason: inst.bankAccount.rejectionReason || '',
                verifiedByName: inst.bankAccount.verifiedByName || '',
                verifiedAt: inst.bankAccount.verifiedAt
              }
            : { status: 'NOT_ADDED' },
          payouts: inst.instructorPayouts || []
        };
      });

    const auditors = users
      .filter((u) => u.role === 'REVIEWER')
      .map((aud) => ({
        id: aud.id,
        name: aud.name,
        email: aud.email,
        phone: aud.phone,
        avatar: aud.avatar,
        bio: aud.bio || 'Quality Assurance & Course Auditor',
        role: aud.role,
        customRole: aud.customRole || 'Course Auditor',
        status: aud.status || 'ACTIVE',
        emailVerified: aud.emailVerified,
        isSuspended: aud.isSuspended,
        coursesReviewed: countMap[aud.id] || 0,
        createdAt: aud.createdAt.toISOString().split('T')[0]
      }));

    return NextResponse.json({ instructors, auditors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const superAdmin = await requireSuperAdmin();
    const body = await request.json();
    const { name, email, password, bio, customRole, phone, role = 'INSTRUCTOR' } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findFirst({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: `User with email "${normalizedEmail}" already exists` }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const isAuditor = role === 'REVIEWER' || role === 'AUDITOR';
    const targetRole = isAuditor ? 'REVIEWER' : 'INSTRUCTOR';
    const roleLabel = isAuditor ? 'Course Auditor' : 'Faculty Instructor';

    const newAccount = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: passwordHash,
        phone: phone?.trim() || null,
        role: targetRole,
        customRole: customRole?.trim() || roleLabel,
        bio: bio?.trim() || (isAuditor ? 'Official Quality Assurance & Course Auditor' : 'Distinguished Faculty Instructor'),
        platform: 'LMS',
        status: 'ACTIVE',
        emailVerified: false,
        permissions: JSON.stringify(isAuditor ? DEFAULT_ROLE_PERMISSIONS.REVIEWER : DEFAULT_ROLE_PERMISSIONS.INSTRUCTOR)
      }
    });

    // Generate 6-digit OTP and send verification email
    const { otp, hash: otpHash } = generateOtp(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: {
        userId: newAccount.id,
        email: normalizedEmail,
        otpHash,
        expiresAt,
        attempts: 0
      }
    });

    await sendEmail({
      to: normalizedEmail,
      subject: `Verify Your ${roleLabel} Account — Morena Teach`,
      template: 'OTP_VERIFY',
      userId: newAccount.id,
      data: {
        name: newAccount.name,
        otp,
        expiresInMinutes: 10
      }
    }).catch((err) => {
      console.error(`[SuperAdmin ${roleLabel} OTP Email Error]:`, err);
    });

    await prisma.auditLog.create({
      data: {
        adminId: superAdmin.id,
        adminEmail: superAdmin.email,
        action: isAuditor ? 'CREATE_COURSE_AUDITOR' : 'CREATE_INSTRUCTOR',
        entity: 'User',
        entityId: newAccount.id,
        description: `Super Admin appointed new ${roleLabel}: ${newAccount.name} (${newAccount.email}) and dispatched OTP verification email.`
      }
    });

    return NextResponse.json({
      success: true,
      requiresOtpVerification: true,
      email: newAccount.email,
      previewOtp: otp,
      credentials: {
        email: newAccount.email,
        password
      },
      message: `${roleLabel} ${newAccount.name} created! A 6-digit verification OTP has been sent to ${newAccount.email}.`,
      instructor: newAccount
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const superAdmin = await requireSuperAdmin();
    const body = await request.json();
    const { id, name, email, bio, customRole, isSuspended, newPassword, reassignCourseIds } = body;

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    const data: any = {};
    if (name) data.name = name.trim();
    if (email) data.email = email.trim().toLowerCase();
    if (bio !== undefined) data.bio = bio.trim();
    if (customRole) data.customRole = customRole.trim();
    if (typeof isSuspended === 'boolean') data.isSuspended = isSuspended;
    if (newPassword && newPassword.length >= 6) {
      data.password = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, isSuspended: true, customRole: true }
    });

    if (Array.isArray(reassignCourseIds) && reassignCourseIds.length > 0) {
      await prisma.course.updateMany({
        where: { id: { in: reassignCourseIds } },
        data: { instructorId: id }
      });
    }

    await prisma.auditLog.create({
      data: {
        adminId: superAdmin.id,
        adminEmail: superAdmin.email,
        action: 'UPDATE_INSTRUCTOR',
        entity: 'User',
        entityId: id,
        description: `Super Admin updated account ${updated.name}.`
      }
    });

    return NextResponse.json({
      message: `Account ${updated.name} updated successfully.`,
      instructor: updated
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const superAdmin = await requireSuperAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      include: { coursesAuthored: true }
    });

    if (!target) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (target.coursesAuthored.length > 0) {
      // Reassign courses to Super Admin before deletion
      await prisma.course.updateMany({
        where: { instructorId: id },
        data: { instructorId: superAdmin.id }
      });
    }

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: superAdmin.id,
        adminEmail: superAdmin.email,
        action: 'DELETE_INSTRUCTOR',
        entity: 'User',
        entityId: id,
        description: `Super Admin removed ${target.name} (${target.role}).`
      }
    });

    return NextResponse.json({ message: `${target.name} removed successfully.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

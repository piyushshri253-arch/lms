import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, hashPassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions';

export async function GET(request: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
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
      where.organizationId = admin.organizationId;
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
        role: true,
        customRole: true,
        lastLoginAt: true,
        createdAt: true,
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    // Count courses reviewed by each reviewer
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
    console.error('[Admin Reviewers GET Error]:', err);
    return NextResponse.json({ error: err.message || 'Unauthorized or server error' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const body = await request.json();
    const { name, email, password, phone, bio } = body;

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const assignedPassword = (password || '').trim() || 'Reviewer@123';

    if (assignedPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // Check for duplicate account
    const existing = await prisma.user.findFirst({
      where: { email: normalizedEmail, platform: 'LMS' }
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
        bio: bio?.trim() || 'Official Quality Assurance & Course Reviewer',
        role: 'REVIEWER',
        customRole: 'Course Reviewer',
        platform: 'LMS',
        status: 'ACTIVE',
        emailVerified: true,
        permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS.REVIEWER),
        organizationId: orgId
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
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

    await createAuditLog({
      organizationId: orgId || undefined,
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'CREATE_COURSE_REVIEWER',
      entity: 'User',
      entityId: reviewer.id,
      description: `Admin created new Course Reviewer "${reviewer.name}" (${reviewer.email}).`
    });

    return NextResponse.json({
      success: true,
      reviewer,
      credentials: {
        email: reviewer.email,
        password: assignedPassword
      },
      message: `Course Reviewer "${reviewer.name}" successfully appointed.`
    });
  } catch (err: any) {
    console.error('[Admin Reviewers POST Error]:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

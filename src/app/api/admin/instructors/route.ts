import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, requireTenantPermission } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { generateOtp, hashPassword } from '@/lib/security';
import { sendEmail } from '@/lib/email';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS } from '@/lib/permissions';

export async function GET(request: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();

    const where: any = {
      role: 'INSTRUCTOR'
    };

    // Strict Tenant Isolation
    if (admin.role !== 'SUPER_ADMIN' && admin.organizationId) {
      where.organizationId = admin.organizationId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const instructors = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        coursesAuthored: {
          include: {
            orders: { where: { status: 'SUCCESS' }, select: { amount: true } },
            reviews: { select: { rating: true } },
            _count: { select: { enrollments: true, reviews: true } }
          }
        },
        organizationMemberships: {
          where: admin.organizationId ? { organizationId: admin.organizationId } : undefined
        }
      }
    });

    const mapped = instructors.map((inst) => {
      const allOrders = inst.coursesAuthored.flatMap((c) => c.orders);
      const totalRevenue = allOrders.reduce((sum, o) => sum + o.amount, 0);
      const totalStudents = inst.coursesAuthored.reduce((sum, c) => sum + c._count.enrollments, 0);
      const allReviews = inst.coursesAuthored.flatMap((c) => c.reviews);
      const totalRatings = allReviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = allReviews.length > 0 ? Number((totalRatings / allReviews.length).toFixed(1)) : 5.0;

      const membership = inst.organizationMemberships[0];

      // Extract title and department if formatted in bio
      let title = 'Senior Educator';
      let department = 'Early Childhood Education';
      if (inst.bio) {
        const parts = inst.bio.split(' - ');
        if (parts.length > 1) {
          title = parts[0].trim();
          const deptPart = parts[1].split('.')[0].trim();
          if (deptPart) department = deptPart;
        }
      }

      const assignedCourses = inst.coursesAuthored.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        price: c.price,
        students: c._count.enrollments || 0,
        rating: avgRating,
        status: c.status
      }));

      return {
        id: inst.id,
        name: inst.name,
        email: inst.email,
        avatar: inst.avatar,
        bio: inst.bio || 'Faculty Instructor',
        role: inst.role,
        title,
        department,
        status: membership?.status || inst.status || 'ACTIVE',
        isSuspended: inst.isSuspended || membership?.status === 'SUSPENDED',
        createdAt: inst.createdAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        coursesCount: inst.coursesAuthored.length,
        studentsCount: totalStudents,
        totalStudents,
        totalRevenue: Math.round(totalRevenue),
        avgRating,
        rating: avgRating,
        courses: assignedCourses,
        assignedCourses
      };
    });

    // Also fetch pending invitations for instructors
    const pendingInvitations = admin.organizationId
      ? await prisma.organizationInvitation.findMany({
          where: {
            organizationId: admin.organizationId,
            role: 'INSTRUCTOR',
            status: 'PENDING'
          },
          orderBy: { createdAt: 'desc' }
        })
      : [];

    return NextResponse.json({
      instructors: mapped,
      pendingInvitations: pendingInvitations.map((p) => ({
        id: p.id,
        email: p.email,
        role: p.role,
        status: p.status,
        expiresAt: p.expiresAt,
        createdAt: p.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const body = await request.json();
    const { name, email, password, bio, avatar, inviteOnly = false } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid instructor email is required.' }, { status: 400 });
    }

    let orgId = admin.organizationId;
    if (!orgId) {
      let companyOrg = await prisma.organization.findFirst();
      if (!companyOrg) {
        companyOrg = await prisma.organization.create({
          data: { name: 'MORENA TEACH LMS', slug: 'morena-teach' }
        });
      }
      orgId = companyOrg.id;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // If invite-only flow
    if (inviteOnly || !password) {
      const { otp: inviteToken, hash: tokenHash } = generateOtp(12);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invitation = await prisma.organizationInvitation.create({
        data: {
          organizationId: orgId!,
          email: normalizedEmail,
          role: 'INSTRUCTOR',
          tokenHash,
          invitedBy: admin.id,
          expiresAt,
          status: 'PENDING'
        }
      });

      await sendEmail({
        to: normalizedEmail,
        subject: `You have been invited to join ${admin.organizationName || 'our Academy'} as an Instructor`,
        template: 'COMPANY_INVITE',
        data: {
          organizationName: admin.organizationName || 'Academy',
          inviterName: admin.name,
          role: 'INSTRUCTOR',
          inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${inviteToken}`
        }
      }).catch(() => {});

      await createAuditLog({
        organizationId: orgId,
        actorId: admin.id,
        actorEmail: admin.email,
        action: 'INVITE_INSTRUCTOR',
        entity: 'OrganizationInvitation',
        entityId: invitation.id,
        description: `Admin invited instructor ${normalizedEmail} to organization.`,
        req: request
      });

      return NextResponse.json({
        success: true,
        message: `Invitation successfully sent to ${normalizedEmail}.`,
        inviteToken,
        invitation
      });
    }

    // Direct account creation flow
    if (!name || !password) {
      return NextResponse.json({ error: 'Name and password are required for direct creation.' }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({ where: { email: normalizedEmail } });
    if (existing) {
      // If user already exists, add membership to this org
      await prisma.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: orgId!,
            userId: existing.id
          }
        },
        create: {
          organizationId: orgId!,
          userId: existing.id,
          role: 'INSTRUCTOR',
          permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS.INSTRUCTOR),
          status: 'ACTIVE'
        },
        update: {
          role: 'INSTRUCTOR',
          permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS.INSTRUCTOR),
          status: 'ACTIVE'
        }
      });

      await createAuditLog({
        organizationId: orgId,
        actorId: admin.id,
        actorEmail: admin.email,
        action: 'ADD_INSTRUCTOR_MEMBERSHIP',
        entity: 'OrganizationMember',
        entityId: existing.id,
        description: `Added instructor membership for existing user ${existing.email}.`,
        req: request
      });

      return NextResponse.json({
        success: true,
        message: `Instructor membership assigned to ${existing.email}.`,
        instructor: existing
      });
    }

    const hashedPassword = await hashPassword(password);
    const result = await prisma.$transaction(async (tx) => {
      const instructor = await tx.user.create({
        data: {
          organizationId: orgId,
          name: name.trim(),
          email: normalizedEmail,
          password: hashedPassword,
          bio: bio || 'Professional Instructor & Educator.',
          avatar: avatar || null,
          role: 'INSTRUCTOR',
          permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS.INSTRUCTOR),
          status: 'ACTIVE',
          emailVerified: true
        }
      });

      if (orgId) {
        await tx.organizationMember.create({
          data: {
            organizationId: orgId,
            userId: instructor.id,
            role: 'INSTRUCTOR',
            permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS.INSTRUCTOR),
            status: 'ACTIVE'
          }
        });
      }

      return instructor;
    });

    await createAuditLog({
      organizationId: orgId,
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'CREATE_INSTRUCTOR',
      entity: 'User',
      entityId: result.id,
      description: `Admin created instructor account for ${result.name} (${result.email}).`,
      req: request
    });

    return NextResponse.json({
      success: true,
      message: 'Instructor account created successfully.',
      instructor: result
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

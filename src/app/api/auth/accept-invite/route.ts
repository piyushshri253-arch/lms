import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, logSecurityEvent } from '@/lib/security';
import { setSessionCookie } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { DEFAULT_ROLE_PERMISSIONS, UserRole } from '@/lib/permissions';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Invitation token is required.' }, { status: 400 });
    }

    const invitation = await prisma.organizationInvitation.findUnique({
      where: { tokenHash: token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            primaryColor: true
          }
        }
      }
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found or invalid.' }, { status: 404 });
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json({ error: 'This invitation has already been accepted or revoked.' }, { status: 400 });
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      return NextResponse.json({ error: 'This invitation has expired. Please ask your administrator for a new invite.' }, { status: 400 });
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        organizationName: invitation.organization.name,
        organizationSlug: invitation.organization.slug,
        organizationLogo: invitation.organization.logo,
        primaryColor: invitation.organization.primaryColor
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, name, password } = body;

    if (!token || !name || !password) {
      return NextResponse.json({ error: 'Token, name, and password are required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    // 1. Verify invitation token in database
    const invitation = await prisma.organizationInvitation.findUnique({
      where: { tokenHash: token },
      include: { organization: true }
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid or nonexistent invitation token.' }, { status: 404 });
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json({ error: 'This invitation has already been accepted or revoked.' }, { status: 400 });
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      return NextResponse.json({ error: 'This invitation has expired. Please ask your administrator to re-invite you.' }, { status: 400 });
    }

    const assignedRole = (invitation.role === 'ADMIN' ? 'ADMIN' : invitation.role === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'STUDENT') as UserRole;
    const permissions = DEFAULT_ROLE_PERMISSIONS[assignedRole] || [];
    const hashedPassword = await hashPassword(password);
    const normalizedEmail = invitation.email.toLowerCase().trim();

    // 2. Transaction: Create/Update User, create OrganizationMember, mark invitation accepted
    const result = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findFirst({
        where: { email: normalizedEmail }
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            organizationId: invitation.organizationId,
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: assignedRole,
            permissions: JSON.stringify(permissions),
            status: 'ACTIVE',
            emailVerified: true
          }
        });
      } else {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            organizationId: invitation.organizationId,
            name: name.trim(),
            role: assignedRole,
            permissions: JSON.stringify(permissions),
            status: 'ACTIVE',
            emailVerified: true
          }
        });
      }

      // Upsert Organization Membership
      await tx.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId: user.id
          }
        },
        create: {
          organizationId: invitation.organizationId,
          userId: user.id,
          role: assignedRole,
          permissions: JSON.stringify(permissions),
          status: 'ACTIVE'
        },
        update: {
          role: assignedRole,
          permissions: JSON.stringify(permissions),
          status: 'ACTIVE'
        }
      });

      // Auto-enroll if course was assigned
      if (invitation.courseId) {
        await tx.enrollment.create({
          data: {
            organizationId: invitation.organizationId,
            userId: user.id,
            courseId: invitation.courseId,
            status: 'ACTIVE'
          }
        }).catch(() => {});
      }

      // Mark invitation as accepted
      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' }
      });

      // Welcome Notification
      await tx.notification.create({
        data: {
          userId: user.id,
          organizationId: invitation.organizationId,
          title: `Welcome to ${invitation.organization.name}!`,
          message: `Your ${assignedRole} account is active. Explore your dashboard and start collaborating.`,
          type: 'SYSTEM',
          category: 'SYSTEM'
        }
      });

      return { user, org: invitation.organization };
    });

    // 3. Determine centralized redirect URL based on assigned role
    let redirectUrl = '/student/dashboard';
    if (assignedRole === 'ADMIN') {
      redirectUrl = '/admin';
    } else if (assignedRole === 'INSTRUCTOR') {
      redirectUrl = '/instructor';
    }

    // 4. Set authenticated session cookie
    await setSessionCookie({
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: assignedRole,
      organizationId: result.org.id,
      organizationName: result.org.name,
      organizationSlug: result.org.slug,
      organizationStatus: result.org.status,
      plan: result.org.plan,
      permissions: permissions as any,
      status: 'ACTIVE',
      emailVerified: true
    });

    // 5. Log Audit Log & Security Events
    await createAuditLog({
      organizationId: result.org.id,
      actorId: result.user.id,
      actorEmail: result.user.email,
      action: 'TEAM_INVITATION_ACCEPTED',
      entity: 'OrganizationMember',
      entityId: result.user.id,
      description: `User "${result.user.name}" (${result.user.email}) accepted invitation and joined as role: ${assignedRole}.`,
      req
    });

    await logSecurityEvent({
      userId: result.user.id,
      email: result.user.email,
      eventType: 'INVITATION_ACCEPTED',
      req,
      metadata: { organizationId: result.org.id, role: assignedRole }
    });

    return NextResponse.json({
      success: true,
      message: `Account activated successfully as ${assignedRole}!`,
      redirectUrl,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: assignedRole,
        organizationId: result.org.id
      }
    });
  } catch (err: any) {
    console.error('[Accept Invite Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to accept invitation.' }, { status: 500 });
  }
}

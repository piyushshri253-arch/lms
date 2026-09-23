import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, setSessionCookie, AuthSessionUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { generateOtp, hashToken } from '@/lib/security';
import { sendEmail } from '@/lib/email';
import { getBaseUrl } from '@/lib/base-url';
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions';

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const {
      name,
      description,
      country = 'India',
      timezone = 'Asia/Kolkata',
      currency = 'INR',
      logo,
      favicon,
      primaryColor = '#4f46e5',
      secondaryColor = '#10b981',
      slug,
      teamInvites = [], // array of { email: string, role: string }
      plan = 'STARTER'
    } = body;

    // 1. Validation
    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'School/Organization name is required.' }, { status: 400 });
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!cleanSlug || cleanSlug.length < 2) {
      return NextResponse.json({ error: 'A valid school URL slug is required.' }, { status: 400 });
    }

    // Check slug uniqueness
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: cleanSlug }
    });

    if (existingOrg && existingOrg.id !== user.organizationId) {
      return NextResponse.json(
        { error: `The school URL "${cleanSlug}.morenalms.com" is already taken. Please choose another.` },
        { status: 409 }
      );
    }

    // Plan limits
    let maxStudents = 100;
    let maxCourses = 10;
    let maxInstructors = 5;
    let maxStorageGB = 10.0;

    if (plan === 'PRO') {
      maxStudents = 1000;
      maxCourses = 50;
      maxInstructors = 20;
      maxStorageGB = 100.0;
    } else if (plan === 'ENTERPRISE') {
      maxStudents = 10000;
      maxCourses = 500;
      maxInstructors = 100;
      maxStorageGB = 1000.0;
    }

    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14-day trial

    // 2. Transaction: Create Organization, Membership, Default Categories, Invitations
    const result = await prisma.$transaction(async (tx) => {
      let org;
      if (user.organizationId) {
        org = await tx.organization.update({
          where: { id: user.organizationId },
          data: {
            name: name.trim(),
            slug: cleanSlug,
            subdomain: cleanSlug,
            description: description?.trim() || null,
            country,
            timezone,
            logo: logo || null,
            favicon: favicon || null,
            primaryColor,
            secondaryColor,
            onboardingCompleted: true,
            onboardingStep: 5
          }
        });
      } else {
        org = await tx.organization.create({
          data: {
            name: name.trim(),
            slug: cleanSlug,
            subdomain: cleanSlug,
            description: description?.trim() || null,
            country,
            timezone,
            logo: logo || null,
            favicon: favicon || null,
            primaryColor,
            secondaryColor,
            plan,
            status: 'ACTIVE',
            subscriptionStatus: 'TRIAL',
            trialEndsAt,
            maxStudents,
            maxCourses,
            maxInstructors,
            maxStorageGB,
            onboardingCompleted: true,
            onboardingStep: 5
          }
        });
      }

      // Update user role to ADMIN and associate organization
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          organizationId: org.id,
          role: user.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN',
          permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS.ADMIN)
        }
      });

      // Upsert Organization Membership record
      await tx.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: org.id,
            userId: user.id
          }
        },
        create: {
          organizationId: org.id,
          userId: user.id,
          role: 'ADMIN',
          permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS.ADMIN),
          status: 'ACTIVE'
        },
        update: {
          role: 'ADMIN',
          permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS.ADMIN),
          status: 'ACTIVE'
        }
      });

      // Create default curriculum category
      await tx.category.create({
        data: {
          organizationId: org.id,
          name: 'Core Curriculum',
          slug: `core-curriculum-${org.id.slice(-6)}`,
          description: 'Default master curriculum category.'
        }
      }).catch(() => {});

      // Process optional Team / Instructor Invitations from Step 4
      const createdInvites: any[] = [];
      if (Array.isArray(teamInvites) && teamInvites.length > 0) {
        for (const invite of teamInvites) {
          if (!invite.email || !invite.email.includes('@')) continue;
          const cleanEmail = invite.email.toLowerCase().trim();
          const inviteRole = invite.role === 'ADMIN' ? 'ADMIN' : 'INSTRUCTOR';
          const { otp: inviteToken, hash: tokenHash } = generateOtp(12);
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

          const invRecord = await tx.organizationInvitation.create({
            data: {
              organizationId: org.id,
              email: cleanEmail,
              role: inviteRole,
              tokenHash,
              invitedBy: user.id,
              expiresAt,
              status: 'PENDING'
            }
          });

          createdInvites.push({
            id: invRecord.id,
            email: cleanEmail,
            role: inviteRole,
            token: inviteToken
          });
        }
      }

      return { org, user: updatedUser, createdInvites };
    });

    // 3. Dispatch invitation emails asynchronously
    for (const inv of result.createdInvites) {
      sendEmail({
        to: inv.email,
        subject: `You have been invited to join ${result.org.name}`,
        template: 'COMPANY_INVITE',
        data: {
          organizationName: result.org.name,
          inviterName: user.name,
          role: inv.role,
          inviteUrl: `${getBaseUrl()}/invite/${inv.token}`
        }
      }).catch(() => {});
    }

    // 4. Record Audit Log
    await createAuditLog({
      organizationId: result.org.id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'ORGANIZATION_SETUP_COMPLETED',
      entity: 'Organization',
      entityId: result.org.id,
      description: `Organization "${result.org.name}" (${result.org.slug}) created and onboarding completed by ${user.name}.`,
      req
    });

    // 5. Update session cookie
    const sessionPayload: AuthSessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      platform: (user.platform as any) || 'SALES',
      role: (user.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN') as any,
      organizationId: result.org.id,
      organizationName: result.org.name,
      organizationSlug: result.org.slug,
      organizationStatus: result.org.status,
      plan: result.org.plan,
      permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN as any,
      status: 'ACTIVE',
      emailVerified: true
    };

    await setSessionCookie(sessionPayload);

    return NextResponse.json({
      success: true,
      message: 'Organization setup completed successfully!',
      organization: {
        id: result.org.id,
        name: result.org.name,
        slug: result.org.slug,
        plan: result.org.plan
      },
      redirectUrl: '/admin'
    });
  } catch (error: any) {
    console.error('[Organization Setup Error]:', error);
    return NextResponse.json({ error: error.message || 'Setup failed' }, { status: 500 });
  }
}

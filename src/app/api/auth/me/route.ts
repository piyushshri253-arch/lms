import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ user: null });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        bio: true,
        phone: true,
        customRole: true,
        permissions: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            plan: true,
            status: true
          }
        }
      }
    });

    if (!dbUser) {
      return NextResponse.json({ user: null });
    }

    // Fetch user-specific stats
    const [enrollmentsCount, wishlistCount, coursesAuthoredCount] = await Promise.all([
      prisma.enrollment.count({ where: { userId: dbUser.id } }),
      prisma.wishlist.count({ where: { userId: dbUser.id } }),
      prisma.course.count({ where: { instructorId: dbUser.id } })
    ]);

    // Check if same email also has an Onboarded Instructor account
    // STRICT REQUIREMENT: Only show the onboarded banner if the user explicitly registered
    // as an Instructor with this email AND was verified/approved ('ONBOARDED') by the Course Auditor.
    let linkedInstructorAccount: { id: string; status: string; name: string } | null = null;
    let instructorApplicationStatus: string | null = null;
    let hasOnboardedInstructorAccount = false;

    if (dbUser.role === 'STUDENT') {
      linkedInstructorAccount = await prisma.user.findFirst({
        where: {
          id: { not: dbUser.id },
          email: { equals: dbUser.email.trim(), mode: 'insensitive' },
          role: 'INSTRUCTOR',
          status: 'ACTIVE',
          emailVerified: true,
          isSuspended: false
        },
        select: {
          id: true,
          status: true,
          name: true
        }
      });

      if (linkedInstructorAccount) {
        const appSetting = await prisma.platformSetting.findUnique({
          where: { key: `instructor_application_${linkedInstructorAccount.id}` }
        });
        if (appSetting?.value) {
          try {
            const parsedApp = JSON.parse(appSetting.value);
            instructorApplicationStatus = parsedApp.applicationStatus || null;
          } catch {}
        }

        // Must strictly have an application record that is 'ONBOARDED'
        if (
          linkedInstructorAccount.status === 'ACTIVE' &&
          instructorApplicationStatus === 'ONBOARDED'
        ) {
          hasOnboardedInstructorAccount = true;
        }
      }
    }

    let permissions: string[] = [];
    try {
      permissions = JSON.parse(dbUser.permissions || '[]');
    } catch {}

    return NextResponse.json({
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        organizationId: dbUser.organizationId || null,
        organizationName: dbUser.organization?.name || null,
        organizationSlug: dbUser.organization?.slug || null,
        organizationLogo: dbUser.organization?.logo || null,
        plan: dbUser.organization?.plan || null,
        avatar: dbUser.avatar,
        bio: dbUser.bio,
        phone: dbUser.phone,
        customRole: dbUser.customRole,
        permissions,
        status: dbUser.status,
        emailVerified: dbUser.emailVerified,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
        enrollmentsCount,
        wishlistCount,
        coursesAuthoredCount,
        hasOnboardedInstructorAccount,
        instructorApplicationStatus,
        instructorLoginUrl: hasOnboardedInstructorAccount
          ? `/instructor/login?email=${encodeURIComponent(dbUser.email)}`
          : null,
        impersonatedBy: session.impersonatedBy || null
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

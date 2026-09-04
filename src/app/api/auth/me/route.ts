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
        impersonatedBy: session.impersonatedBy || null
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

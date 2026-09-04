import { NextResponse } from 'next/server';
import { requireAuth, setSessionCookie, AuthSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await requireAuth();

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
        country: true,
        timezone: true,
        privacyHideProfile: true,
        customRole: true,
        status: true,
        emailVerified: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            plan: true
          }
        },
        createdAt: true,
        updatedAt: true
      }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found in database.' }, { status: 404 });
    }

    return NextResponse.json({ user: dbUser });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { name, avatar, bio, phone, country, timezone, privacyHideProfile } = body;

    if (name && name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Full name must be at least 2 characters.' },
        { status: 400 }
      );
    }

    const cleanAvatar = avatar && typeof avatar === 'string' && avatar.trim().length > 0 ? avatar.trim() : undefined;
    const cleanBio = bio !== undefined ? (typeof bio === 'string' ? bio.trim() : null) : undefined;
    const cleanPhone = phone !== undefined ? (typeof phone === 'string' ? phone.trim() : null) : undefined;
    const cleanCountry = country !== undefined ? (typeof country === 'string' ? country.trim() : null) : undefined;
    const cleanTimezone = timezone !== undefined ? (typeof timezone === 'string' ? timezone.trim() : null) : undefined;
    const cleanPrivacy = privacyHideProfile !== undefined ? Boolean(privacyHideProfile) : undefined;

    const updated = await prisma.user.update({
      where: { id: session.id },
      data: {
        name: name ? name.trim() : undefined,
        avatar: cleanAvatar,
        bio: cleanBio,
        phone: cleanPhone,
        country: cleanCountry,
        timezone: cleanTimezone,
        privacyHideProfile: cleanPrivacy
      },
      select: {
        id: true,
        name: true,
        email: true,
        platform: true,
        role: true,
        avatar: true,
        bio: true,
        phone: true,
        country: true,
        timezone: true,
        privacyHideProfile: true,
        customRole: true,
        status: true,
        emailVerified: true,
        sessionVersion: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            plan: true
          }
        },
        createdAt: true,
        updatedAt: true
      }
    });

    const sessionUser: AuthSessionUser = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      platform: (updated.platform as any) || 'LMS',
      role: updated.role as any,
      organizationId: updated.organizationId || null,
      organizationName: updated.organization?.name || null,
      organizationSlug: updated.organization?.slug || null,
      organizationStatus: updated.organization?.status || null,
      plan: updated.organization?.plan || null,
      avatar: updated.avatar,
      phone: updated.phone,
      customRole: updated.customRole,
      status: updated.status,
      emailVerified: updated.emailVerified,
      sessionVersion: updated.sessionVersion
    };

    await setSessionCookie(sessionUser);

    return NextResponse.json({
      user: updated,
      message: 'Profile updated successfully.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Profile update failed' }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80';

export async function GET() {
  try {
    const session = await getCurrentUser();

    // Check if customized profile is saved in PlatformSetting
    let customProfile: any = null;
    try {
      const row = await prisma.platformSetting.findUnique({
        where: { key: 'seo_admin_profile' }
      });
      if (row?.value) {
        customProfile = JSON.parse(row.value);
      }
    } catch {}

    const name = customProfile?.name || session?.name || 'Piyush AI';
    const email = customProfile?.email || session?.email || 'seo@morenateach.com';
    const avatar = customProfile?.avatar || session?.avatar || DEFAULT_AVATAR;
    const roleTitle = customProfile?.roleTitle || 'SEO Admin';

    return NextResponse.json({
      success: true,
      profile: {
        id: session?.id || 'seo-admin',
        name,
        email,
        avatar,
        roleTitle
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch SEO profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, avatar, roleTitle, email } = body;

    const trimmedName = String(name || '').trim() || 'Piyush AI';
    const trimmedAvatar = String(avatar || '').trim() || DEFAULT_AVATAR;
    const trimmedRole = String(roleTitle || '').trim() || 'SEO Admin';
    const trimmedEmail = String(email || '').trim() || 'seo@morenateach.com';

    // 1. Persist in PlatformSetting for global reliability
    const payload = {
      name: trimmedName,
      avatar: trimmedAvatar,
      roleTitle: trimmedRole,
      email: trimmedEmail,
      updatedAt: new Date().toISOString()
    };

    await prisma.platformSetting.upsert({
      where: { key: 'seo_admin_profile' },
      update: { value: JSON.stringify(payload) },
      create: { key: 'seo_admin_profile', value: JSON.stringify(payload) }
    });

    // 2. Also update User record in DB if session exists
    const session = await getCurrentUser();
    if (session?.id) {
      try {
        await prisma.user.update({
          where: { id: session.id },
          data: {
            name: trimmedName,
            avatar: trimmedAvatar
          }
        });
      } catch {}
    } else {
      // Also update the seed SEO user if exists
      try {
        await prisma.user.updateMany({
          where: { email: 'seo@morenateach.com' },
          data: {
            name: trimmedName,
            avatar: trimmedAvatar
          }
        });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      profile: payload
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update SEO profile' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getReviewerCurrentUser, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await getReviewerCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        bio: true,
        phone: true,
        customRole: true,
        organizationId: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      user: dbUser || {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        customRole: user.customRole || 'Course Reviewer',
        organizationId: user.organizationId,
        organizationName: user.organizationName
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getReviewerCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, avatar, bio, phone, password } = body;

    const dataToUpdate: any = {};
    if (name && typeof name === 'string' && name.trim().length >= 2) {
      dataToUpdate.name = name.trim();
    }
    if (avatar !== undefined) {
      dataToUpdate.avatar = typeof avatar === 'string' && avatar.trim() ? avatar.trim() : null;
    }
    if (bio !== undefined) {
      dataToUpdate.bio = typeof bio === 'string' ? bio.trim() : null;
    }
    if (phone !== undefined) {
      dataToUpdate.phone = typeof phone === 'string' ? phone.trim() : null;
    }
    if (password && typeof password === 'string' && password.trim().length >= 6) {
      dataToUpdate.password = await hashPassword(password.trim());
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        bio: true,
        phone: true,
        customRole: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updated
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update profile' }, { status: 500 });
  }
}

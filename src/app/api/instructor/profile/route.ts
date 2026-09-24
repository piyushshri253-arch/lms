import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession, verifyPassword, validateStrongPassword } from '@/lib/auth';
import { hashPassword } from '@/lib/security';
import { EmailService } from '@/lib/email';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: { bankAccount: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        avatar: user.avatar || '',
        bio: user.bio || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        country: user.country || 'India',
        pincode: user.pincode || '',
        role: user.role,
        customRole: user.customRole || '',
        status: user.status,
        emailVerified: user.emailVerified,
        emailVerifiedAt: user.emailVerifiedAt,
        welcomeEmailStatus: user.welcomeEmailStatus || 'SENT',
        welcomeEmailSentAt: user.welcomeEmailSentAt,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch profile.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      phone,
      avatar,
      bio,
      address,
      city,
      state,
      country,
      pincode,
      currentPassword,
      newPassword,
      confirmNewPassword
    } = body;

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    // Handle Change Password if requested
    let updatedPasswordHash: string | undefined;
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to set a new password.' }, { status: 400 });
      }
      const isCurrentValid = await verifyPassword(currentPassword, user.password);
      if (!isCurrentValid) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
      }
      if (newPassword !== confirmNewPassword) {
        return NextResponse.json({ error: 'New password and confirm password do not match.' }, { status: 400 });
      }
      const pwCheck = validateStrongPassword(newPassword);
      if (!pwCheck.isValid) {
        return NextResponse.json({ error: pwCheck.error }, { status: 400 });
      }
      updatedPasswordHash = await hashPassword(newPassword);
    }

    if (phone !== undefined) {
      const digits = String(phone).replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) {
        return NextResponse.json({ error: 'Please provide a valid 10–15 digit Mobile Number.' }, { status: 400 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name !== undefined ? String(name).trim() : user.name,
        phone: phone !== undefined ? String(phone).trim() : user.phone,
        avatar: avatar !== undefined ? avatar : user.avatar,
        bio: bio !== undefined ? String(bio).trim() : user.bio,
        address: address !== undefined ? String(address).trim() : user.address,
        city: city !== undefined ? String(city).trim() : user.city,
        state: state !== undefined ? String(state).trim() : user.state,
        country: country !== undefined ? String(country).trim() : user.country,
        pincode: pincode !== undefined ? String(pincode).trim() : user.pincode,
        ...(updatedPasswordHash ? { password: updatedPasswordHash } : {})
      }
    });

    if (updatedPasswordHash) {
      await EmailService.sendEmail({
        to: updated.email,
        userId: updated.id,
        subject: 'Your Morena Teach Password Was Changed',
        template: 'PASSWORD_CHANGED',
        data: { name: updated.name }
      }).catch(() => {});
    }

    await createAuditLog({
      organizationId: updated.organizationId || null,
      actorId: updated.id,
      actorEmail: updated.email,
      action: updatedPasswordHash ? 'USER_CHANGED_PASSWORD' : 'USER_UPDATED_PROFILE',
      entity: 'User',
      entityId: updated.id,
      description: `User "${updated.name}" updated their profile${updatedPasswordHash ? ' and password' : ''}.`,
      req
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: updatedPasswordHash ? 'Profile and password updated successfully!' : 'Profile updated successfully!',
      profile: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone || '',
        avatar: updated.avatar || '',
        bio: updated.bio || '',
        address: updated.address || '',
        city: updated.city || '',
        state: updated.state || '',
        country: updated.country || 'India',
        pincode: updated.pincode || '',
        role: updated.role,
        status: updated.status,
        emailVerified: updated.emailVerified,
        createdAt: updated.createdAt,
        lastLoginAt: updated.lastLoginAt
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update profile.' }, { status: 500 });
  }
}

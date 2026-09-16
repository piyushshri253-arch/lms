import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApiGuard } from '@/lib/api-guard';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const { errorResponse, sessionData } = await requireAdminApiGuard();
    if (errorResponse || !sessionData) {
      return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (sessionData.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin privileges required to manage administrator roles.' }, { status: 403 });
    }

    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN', 'LMS_ADMIN', 'SALES_ADMIN'] }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        customRole: true,
        permissions: true,
        createdAt: true
      }
    });

    const formatted = admins.map((adm) => {
      let perms: string[] = [];
      if (typeof adm.permissions === 'string') {
        try {
          perms = JSON.parse(adm.permissions);
        } catch {
          perms = [];
        }
      } else if (Array.isArray(adm.permissions)) {
        perms = adm.permissions;
      }

      return {
        id: adm.id,
        name: adm.name,
        email: adm.email,
        role: adm.role,
        customRole: adm.customRole || (adm.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'),
        permissions: perms,
        createdAt: adm.createdAt
      };
    });

    return NextResponse.json({ admins: formatted });
  } catch (error: any) {
    console.error('Error fetching admins:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { errorResponse, sessionData } = await requireAdminApiGuard();
    if (errorResponse || !sessionData) {
      return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (sessionData.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin privileges required to create administrator roles.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, customRole, permissions = [] } = body;

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase() }
    });

    if (existing) {
      return NextResponse.json({ error: 'A user with this email address already exists.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: 'ADMIN',
        customRole: customRole?.trim() || 'Admin',
        permissions: JSON.stringify(permissions),
        platform: 'LMS'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        customRole: true,
        permissions: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      admin: {
        ...newAdmin,
        permissions
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating admin:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { errorResponse, sessionData } = await requireAdminApiGuard();
    if (errorResponse || !sessionData) {
      return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (sessionData.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin privileges required to update administrator permissions.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, customRole, permissions, name, password } = body;

    if (!id) {
      return NextResponse.json({ error: 'Admin user ID is required' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (customRole !== undefined) updateData.customRole = customRole;
    if (name !== undefined) updateData.name = name.trim();
    if (permissions !== undefined) {
      updateData.permissions = JSON.stringify(permissions);
    }
    if (password && password.trim().length >= 6) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        customRole: true,
        permissions: true,
        createdAt: true
      }
    });

    let parsedPerms: string[] = [];
    try {
      parsedPerms = JSON.parse(updated.permissions || '[]');
    } catch {
      parsedPerms = [];
    }

    return NextResponse.json({
      admin: {
        ...updated,
        permissions: parsedPerms
      }
    });
  } catch (error: any) {
    console.error('Error updating admin:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { errorResponse, sessionData } = await requireAdminApiGuard();
    if (errorResponse || !sessionData) {
      return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (sessionData.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin privileges required to remove administrator accounts.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Admin user ID is required' }, { status: 400 });
    }

    if (id === sessionData.user.id) {
      return NextResponse.json({ error: 'You cannot delete your own Super Admin account.' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Admin account removed successfully.' });
  } catch (error: any) {
    console.error('Error deleting admin:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

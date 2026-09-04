import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    await requireSuperAdmin();

    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        customRole: true,
        permissions: true,
        avatar: true,
        isSuspended: true,
        createdAt: true,
        coursesAuthored: {
          select: { id: true, title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = admins.map((a) => {
      let parsedPerms: string[] = [];
      try {
        parsedPerms = JSON.parse(a.permissions || '[]');
      } catch {}

      return {
        id: a.id,
        name: a.name,
        email: a.email,
        role: a.role,
        customRole: a.customRole || (a.role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Administrator'),
        permissions: parsedPerms,
        avatar: a.avatar,
        isSuspended: a.isSuspended,
        createdAt: a.createdAt.toISOString().split('T')[0],
        managedCoursesCount: a.coursesAuthored.length
      };
    });

    return NextResponse.json({ admins: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const superAdmin = await requireSuperAdmin();
    const body = await request.json();
    const { name, email, password, role, customRole, permissions } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const permsJson = JSON.stringify(permissions || ['courses.all', 'students.all']);

    const newAdmin = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: passwordHash,
        role: role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN',
        customRole: customRole?.trim() || 'Platform Administrator',
        permissions: permsJson
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        customRole: true
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: superAdmin.id,
        adminEmail: superAdmin.email,
        action: 'CREATE_ADMIN',
        entity: 'User',
        entityId: newAdmin.id,
        description: `Super Admin created new admin account: ${newAdmin.name} (${newAdmin.email}) with role ${newAdmin.customRole}.`
      }
    });

    return NextResponse.json({
      message: `Administrator ${newAdmin.name} created successfully.`,
      admin: newAdmin
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const superAdmin = await requireSuperAdmin();
    const body = await request.json();
    const { id, name, email, customRole, permissions, isSuspended, newPassword } = body;

    if (!id) {
      return NextResponse.json({ error: 'Admin User ID is required' }, { status: 400 });
    }

    const data: any = {};
    if (name) data.name = name.trim();
    if (email) data.email = email.trim().toLowerCase();
    if (customRole) data.customRole = customRole.trim();
    if (permissions) data.permissions = JSON.stringify(permissions);
    if (typeof isSuspended === 'boolean') data.isSuspended = isSuspended;
    if (newPassword && newPassword.length >= 6) {
      data.password = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, customRole: true, isSuspended: true }
    });

    await prisma.auditLog.create({
      data: {
        adminId: superAdmin.id,
        adminEmail: superAdmin.email,
        action: 'UPDATE_ADMIN_PERMISSIONS',
        entity: 'User',
        entityId: id,
        description: `Super Admin updated administrator ${updated.name} permissions and profile.`
      }
    });

    return NextResponse.json({
      message: `Admin ${updated.name} updated successfully.`,
      admin: updated
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const superAdmin = await requireSuperAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Admin User ID is required' }, { status: 400 });
    }

    if (id === superAdmin.id) {
      return NextResponse.json({ error: 'Cannot delete your own Super Admin account' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: superAdmin.id,
        adminEmail: superAdmin.email,
        action: 'DELETE_ADMIN',
        entity: 'User',
        entityId: id,
        description: `Super Admin deleted administrator ${target.name} (${target.email}).`
      }
    });

    return NextResponse.json({ message: `Admin ${target.name} deleted successfully.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

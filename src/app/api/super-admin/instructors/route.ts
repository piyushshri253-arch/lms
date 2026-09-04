import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    await requireSuperAdmin();

    const instructors = await prisma.user.findMany({
      where: { role: 'INSTRUCTOR' },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        customRole: true,
        isSuspended: true,
        createdAt: true,
        coursesAuthored: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            status: true,
            enrollments: { select: { id: true } },
            reviews: { select: { rating: true } },
            orders: { select: { amount: true, status: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = instructors.map((inst) => {
      const courses = inst.coursesAuthored;
      const totalStudents = courses.reduce((sum, c) => sum + c.enrollments.length, 0);

      const allReviews = courses.flatMap((c) => c.reviews);
      const avgRating =
        allReviews.length > 0
          ? Math.round((allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length) * 10) / 10
          : 5.0;

      const totalRevenue = courses
        .flatMap((c) => c.orders)
        .filter((o) => o.status === 'SUCCESS')
        .reduce((sum, o) => sum + o.amount, 0);

      return {
        id: inst.id,
        name: inst.name,
        email: inst.email,
        avatar: inst.avatar,
        bio: inst.bio,
        customRole: inst.customRole || 'Faculty Instructor',
        isSuspended: inst.isSuspended,
        createdAt: inst.createdAt.toISOString().split('T')[0],
        courseCount: courses.length,
        courses: courses.map((c) => ({ id: c.id, title: c.title, status: c.status })),
        studentCount: totalStudents,
        avgRating,
        totalRevenue: Math.round(totalRevenue * 100) / 100
      };
    });

    return NextResponse.json({ instructors: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const superAdmin = await requireSuperAdmin();
    const body = await request.json();
    const { name, email, password, bio, customRole } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newInst = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: passwordHash,
        role: 'INSTRUCTOR',
        customRole: customRole?.trim() || 'Distinguished Faculty',
        bio: bio?.trim() || ''
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: superAdmin.id,
        adminEmail: superAdmin.email,
        action: 'CREATE_INSTRUCTOR',
        entity: 'User',
        entityId: newInst.id,
        description: `Super Admin appointed new faculty instructor: ${newInst.name} (${newInst.email}).`
      }
    });

    return NextResponse.json({
      message: `Instructor ${newInst.name} created successfully.`,
      instructor: newInst
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const superAdmin = await requireSuperAdmin();
    const body = await request.json();
    const { id, name, email, bio, customRole, isSuspended, newPassword, reassignCourseIds } = body;

    if (!id) {
      return NextResponse.json({ error: 'Instructor ID is required' }, { status: 400 });
    }

    const data: any = {};
    if (name) data.name = name.trim();
    if (email) data.email = email.trim().toLowerCase();
    if (bio !== undefined) data.bio = bio.trim();
    if (customRole) data.customRole = customRole.trim();
    if (typeof isSuspended === 'boolean') data.isSuspended = isSuspended;
    if (newPassword && newPassword.length >= 6) {
      data.password = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, isSuspended: true, customRole: true }
    });

    if (Array.isArray(reassignCourseIds) && reassignCourseIds.length > 0) {
      await prisma.course.updateMany({
        where: { id: { in: reassignCourseIds } },
        data: { instructorId: id }
      });
    }

    await prisma.auditLog.create({
      data: {
        adminId: superAdmin.id,
        adminEmail: superAdmin.email,
        action: 'UPDATE_INSTRUCTOR',
        entity: 'User',
        entityId: id,
        description: `Super Admin updated faculty instructor ${updated.name}.`
      }
    });

    return NextResponse.json({
      message: `Instructor ${updated.name} updated successfully.`,
      instructor: updated
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
      return NextResponse.json({ error: 'Instructor ID is required' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      include: { coursesAuthored: true }
    });

    if (!target) {
      return NextResponse.json({ error: 'Instructor not found' }, { status: 404 });
    }

    if (target.coursesAuthored.length > 0) {
      // Reassign courses to Super Admin before deletion
      await prisma.course.updateMany({
        where: { instructorId: id },
        data: { instructorId: superAdmin.id }
      });
    }

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: superAdmin.id,
        adminEmail: superAdmin.email,
        action: 'DELETE_INSTRUCTOR',
        entity: 'User',
        entityId: id,
        description: `Super Admin removed instructor ${target.name} and reassigned courses to primary administrator.`
      }
    });

    return NextResponse.json({ message: `Instructor ${target.name} removed successfully.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

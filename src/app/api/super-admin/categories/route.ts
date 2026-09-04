import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await requireSuperAdmin();
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { courses: true } }
      },
      orderBy: { name: 'asc' }
    });

    const formatted = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: c.image,
      coursesCount: c._count.courses
    }));

    return NextResponse.json({ categories: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const { name, description, image } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const existing = await prisma.category.findFirst({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'Category with this name/slug already exists' }, { status: 400 });
    }

    const cat = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || '',
        image: image?.trim() || null
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'CREATE_CATEGORY',
        entity: 'Category',
        entityId: cat.id,
        description: `Super Admin created category "${cat.name}".`
      }
    });

    return NextResponse.json({ message: `Category "${cat.name}" created successfully.`, category: cat });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const { id, name, description, image } = body;

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const data: any = {};
    if (name) {
      data.name = name.trim();
      data.slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }
    if (description !== undefined) data.description = description.trim();
    if (image !== undefined) data.image = image ? image.trim() : null;

    const updated = await prisma.category.update({ where: { id }, data });

    return NextResponse.json({ message: `Category "${updated.name}" updated.`, category: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const count = await prisma.course.count({ where: { categoryId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `Cannot delete category: ${count} active courses are assigned to it.` },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ message: 'Category deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

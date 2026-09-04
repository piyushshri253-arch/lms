import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, resolveAdminOrganization } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const org = await resolveAdminOrganization(admin);

    let pages = await prisma.websitePage.findMany({
      where: { organizationId: org.id },
      include: { _count: { select: { sections: true } } },
      orderBy: { createdAt: 'asc' }
    });

    // Auto-bootstrap default pages if none exist
    if (pages.length === 0) {
      const defaultPages = [
        { title: 'Home', slug: 'home', status: 'PUBLISHED', seoTitle: 'Home' },
        { title: 'Courses Catalog', slug: 'courses', status: 'PUBLISHED', seoTitle: 'Masterclasses & Curricula' },
        { title: 'About Us', slug: 'about', status: 'PUBLISHED', seoTitle: 'About Our Academy' },
        { title: 'Contact', slug: 'contact', status: 'PUBLISHED', seoTitle: 'Contact Support' }
      ];

      for (const p of defaultPages) {
        await prisma.websitePage.create({
          data: {
            organizationId: org.id,
            title: p.title,
            slug: p.slug,
            status: p.status,
            seoTitle: p.seoTitle
          }
        });
      }

      pages = await prisma.websitePage.findMany({
        where: { organizationId: org.id },
        include: { _count: { select: { sections: true } } },
        orderBy: { createdAt: 'asc' }
      });
    }

    return NextResponse.json({ pages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const org = await resolveAdminOrganization(admin);

    const body = await req.json();
    const { title, slug, seoTitle, seoDescription } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'Page title and slug are required.' }, { status: 400 });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const page = await prisma.websitePage.create({
      data: {
        organizationId: org.id,
        title: title.trim(),
        slug: cleanSlug,
        status: 'PUBLISHED',
        seoTitle: seoTitle || title,
        seoDescription: seoDescription || ''
      }
    });

    return NextResponse.json({ success: true, page });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const org = await resolveAdminOrganization(admin);

    const body = await req.json();
    const { id, title, status, seoTitle, seoDescription, ogImage } = body;

    if (!id) {
      return NextResponse.json({ error: 'Page id is required.' }, { status: 400 });
    }

    const page = await prisma.websitePage.findFirst({
      where: { id, organizationId: org.id }
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found.' }, { status: 404 });
    }

    const updated = await prisma.websitePage.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        status: status !== undefined ? status : undefined,
        seoTitle: seoTitle !== undefined ? seoTitle : undefined,
        seoDescription: seoDescription !== undefined ? seoDescription : undefined,
        ogImage: ogImage !== undefined ? ogImage : undefined
      }
    });

    return NextResponse.json({ success: true, page: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, resolveAdminOrganization } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const org = await resolveAdminOrganization(admin);

    const { searchParams } = new URL(req.url);
    const pageSlug = searchParams.get('page') || 'home';

    // 1. Find or create page
    let page = await prisma.websitePage.findFirst({
      where: { organizationId: org.id, slug: pageSlug },
      include: { sections: { orderBy: { order: 'asc' } } }
    });

    if (!page) {
      page = await prisma.websitePage.create({
        data: {
          organizationId: org.id,
          title: pageSlug.toUpperCase(),
          slug: pageSlug,
          status: 'PUBLISHED'
        },
        include: { sections: true }
      });
    }

    return NextResponse.json({
      page,
      sections: page?.sections || []
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const org = await resolveAdminOrganization(admin);

    const body = await req.json();
    const { pageId, type, title, subtitle, content, draftContent, order } = body;

    if (!pageId || !type) {
      return NextResponse.json({ error: 'pageId and type are required.' }, { status: 400 });
    }

    // Verify page ownership
    const page = await prisma.websitePage.findFirst({
      where: { id: pageId, organizationId: org.id }
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found in this organization.' }, { status: 404 });
    }

    const contentStr = typeof content === 'object' ? JSON.stringify(content) : content || '{}';
    const draftStr = draftContent ? (typeof draftContent === 'object' ? JSON.stringify(draftContent) : draftContent) : contentStr;

    const section = await prisma.websiteSection.create({
      data: {
        pageId,
        type: type.toUpperCase(),
        title: title || '',
        subtitle: subtitle || '',
        content: contentStr,
        draftContent: draftStr,
        order: Number(order || 0),
        enabled: true,
        status: 'PUBLISHED'
      }
    });

    await createAuditLog({
      organizationId: org.id,
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'WEBSITE_SECTION_CREATED',
      entity: 'WebsiteSection',
      entityId: section.id,
      description: `Added "${section.type}" section to "${page.title}" page.`,
      req
    });

    return NextResponse.json({ success: true, section });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const org = await resolveAdminOrganization(admin);

    const body = await req.json();
    const { sections, section, publishAll, pageId } = body;

    // Publish all draft changes to live content
    if (publishAll && pageId) {
      const pageSections = await prisma.websiteSection.findMany({
        where: { pageId, page: { organizationId: org.id } }
      });

      for (const s of pageSections) {
        if (s.draftContent) {
          await prisma.websiteSection.update({
            where: { id: s.id },
            data: {
              content: s.draftContent,
              status: 'PUBLISHED'
            }
          });
        }
      }

      await createAuditLog({
        organizationId: org.id,
        actorId: admin.id,
        actorEmail: admin.email,
        action: 'PAGE_PUBLISHED',
        entity: 'WebsitePage',
        entityId: pageId,
        description: 'Published live changes for page.',
        req
      });

      return NextResponse.json({ success: true, message: 'All draft sections published live!' });
    }

    // Batch reorder / batch update
    if (Array.isArray(sections)) {
      for (const s of sections) {
        if (s.id) {
          await prisma.websiteSection.updateMany({
            where: {
              id: s.id,
              page: { organizationId: org.id }
            },
            data: {
              order: s.order !== undefined ? Number(s.order) : undefined,
              enabled: s.enabled !== undefined ? Boolean(s.enabled) : undefined
            }
          });
        }
      }
      return NextResponse.json({ success: true, message: 'Sections reordered successfully.' });
    }

    // Single section update
    if (section && section.id) {
      const draftStr = section.draftContent !== undefined 
        ? (typeof section.draftContent === 'object' ? JSON.stringify(section.draftContent) : section.draftContent)
        : undefined;

      const contentStr = section.content !== undefined 
        ? (typeof section.content === 'object' ? JSON.stringify(section.content) : section.content)
        : undefined;

      const updated = await prisma.websiteSection.updateMany({
        where: {
          id: section.id,
          page: { organizationId: org.id }
        },
        data: {
          title: section.title !== undefined ? section.title : undefined,
          subtitle: section.subtitle !== undefined ? section.subtitle : undefined,
          content: contentStr,
          draftContent: draftStr,
          order: section.order !== undefined ? Number(section.order) : undefined,
          enabled: section.enabled !== undefined ? Boolean(section.enabled) : undefined,
          status: section.status !== undefined ? section.status : undefined
        }
      });
      return NextResponse.json({ success: true, count: updated.count });
    }

    return NextResponse.json({ error: 'Invalid section payload.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const org = await resolveAdminOrganization(admin);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Section id is required.' }, { status: 400 });
    }

    await prisma.websiteSection.deleteMany({
      where: {
        id,
        page: { organizationId: org.id }
      }
    });

    return NextResponse.json({ success: true, message: 'Section deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

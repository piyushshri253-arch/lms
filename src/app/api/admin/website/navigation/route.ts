import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, resolveAdminOrganization } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const org = await resolveAdminOrganization(admin);

    let items = await prisma.navigationItem.findMany({
      where: { organizationId: org.id },
      orderBy: { order: 'asc' }
    });

    if (items.length === 0) {
      const defaultNav = [
        { label: 'Home', url: '/', order: 0 },
        { label: 'Courses', url: '/courses', order: 1 },
        { label: 'About', url: '/about', order: 2 },
        { label: 'Contact', url: '/contact', order: 3 }
      ];

      for (const n of defaultNav) {
        await prisma.navigationItem.create({
          data: {
            organizationId: org.id,
            label: n.label,
            url: n.url,
            order: n.order,
            enabled: true
          }
        });
      }

      items = await prisma.navigationItem.findMany({
        where: { organizationId: org.id },
        orderBy: { order: 'asc' }
      });
    }

    const orgDetails = await prisma.organization.findUnique({
      where: { id: org.id },
      select: { footerText: true, socialLinks: true, name: true, contactEmail: true, contactPhone: true }
    });

    return NextResponse.json({
      navigationItems: items,
      footer: {
        footerText: orgDetails?.footerText || `© ${new Date().getFullYear()} ${orgDetails?.name || 'Academy'}. All rights reserved.`,
        contactEmail: orgDetails?.contactEmail || '',
        contactPhone: orgDetails?.contactPhone || '',
        socialLinks: orgDetails?.socialLinks ? JSON.parse(orgDetails.socialLinks) : {}
      }
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
    const { label, url, order, isExternal } = body;

    if (!label || !url) {
      return NextResponse.json({ error: 'Label and URL are required.' }, { status: 400 });
    }

    const item = await prisma.navigationItem.create({
      data: {
        organizationId: org.id,
        label: label.trim(),
        url: url.trim(),
        order: Number(order || 0),
        isExternal: Boolean(isExternal),
        enabled: true
      }
    });

    return NextResponse.json({ success: true, item });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const org = await resolveAdminOrganization(admin);

    const body = await req.json();
    const { items, footerText, socialLinks } = body;

    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.id) {
          await prisma.navigationItem.updateMany({
            where: { id: item.id, organizationId: org.id },
            data: {
              label: item.label !== undefined ? item.label.trim() : undefined,
              url: item.url !== undefined ? item.url.trim() : undefined,
              order: item.order !== undefined ? Number(item.order) : undefined,
              enabled: item.enabled !== undefined ? Boolean(item.enabled) : undefined,
              isExternal: item.isExternal !== undefined ? Boolean(item.isExternal) : undefined
            }
          });
        }
      }
    }

    if (footerText !== undefined || socialLinks !== undefined) {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          footerText: footerText !== undefined ? footerText : undefined,
          socialLinks: socialLinks !== undefined ? JSON.stringify(socialLinks) : undefined
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Navigation & Footer updated successfully.' });
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
      return NextResponse.json({ error: 'Item ID is required.' }, { status: 400 });
    }

    await prisma.navigationItem.deleteMany({
      where: { id, organizationId: org.id }
    });

    return NextResponse.json({ success: true, message: 'Navigation link deleted.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

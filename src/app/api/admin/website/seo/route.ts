import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, resolveAdminOrganization } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const org = await resolveAdminOrganization(user);
    const orgId = org.id;

    const orgData = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        seoTitle: true,
        seoDescription: true,
        ogImage: true,
        twitterHandle: true,
        googleAnalyticsId: true,
        facebookPixelId: true,
        sitemapEnabled: true,
        robotsTxt: true
      }
    });

    return NextResponse.json({ seo: orgData });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch SEO settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const org = await resolveAdminOrganization(user);
    const orgId = org.id;
    const body = await request.json();

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: {
        seoTitle: body.seoTitle !== undefined ? body.seoTitle : undefined,
        seoDescription: body.seoDescription !== undefined ? body.seoDescription : undefined,
        ogImage: body.ogImage !== undefined ? body.ogImage : undefined,
        twitterHandle: body.twitterHandle !== undefined ? body.twitterHandle : undefined,
        googleAnalyticsId: body.googleAnalyticsId !== undefined ? body.googleAnalyticsId : undefined,
        facebookPixelId: body.facebookPixelId !== undefined ? body.facebookPixelId : undefined,
        sitemapEnabled: body.sitemapEnabled !== undefined ? Boolean(body.sitemapEnabled) : undefined,
        robotsTxt: body.robotsTxt !== undefined ? body.robotsTxt : undefined
      }
    });

    await createAuditLog({
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'SEO_SETTINGS_UPDATED',
      entity: 'Organization',
      entityId: orgId,
      description: 'Updated school website SEO and Open Graph metadata.',
      req: request
    });

    return NextResponse.json({
      success: true,
      message: 'SEO metadata updated successfully.',
      seo: updated
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update SEO' }, { status: 500 });
  }
}

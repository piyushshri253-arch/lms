import { NextResponse } from 'next/server';
import { requireTenantRole, validateTenantOwnership, resolveAdminOrganization } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(request.url);
    let targetOrgId = searchParams.get('organizationId') || user.organizationId;
    if (!targetOrgId) {
      const resolvedOrg = await resolveAdminOrganization(user);
      targetOrgId = resolvedOrg.id;
    }
    const orgId = targetOrgId;

    if (!validateTenantOwnership(orgId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const versions = await prisma.websiteVersion.findMany({
      where: { organizationId: orgId || undefined },
      orderBy: { versionNumber: 'desc' },
      take: 20
    });

    return NextResponse.json({
      versions: versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        changelog: v.changelog,
        publishedBy: v.publishedBy,
        publishedAt: v.publishedAt
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const body = await request.json();
    const { versionId, organizationId: targetOrgParam } = body;

    let targetOrgId = targetOrgParam || user.organizationId;
    if (!targetOrgId) {
      const resolvedOrg = await resolveAdminOrganization(user);
      targetOrgId = resolvedOrg.id;
    }
    const orgId = targetOrgId;

    if (!validateTenantOwnership(orgId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!versionId) {
      return NextResponse.json({ error: 'versionId is required' }, { status: 400 });
    }

    const version = await prisma.websiteVersion.findUnique({
      where: { id: versionId }
    });

    if (!version || version.organizationId !== orgId) {
      return NextResponse.json({ error: 'Website version not found' }, { status: 404 });
    }

    const snapshotData = JSON.parse(version.snapshot);

    // Restore pages and sections from snapshot
    await prisma.$transaction(async (tx) => {
      // 1. Delete current pages
      await tx.websitePage.deleteMany({ where: { organizationId: orgId } });

      // 2. Re-create pages and sections
      if (Array.isArray(snapshotData.pages)) {
        for (const page of snapshotData.pages) {
          const newPage = await tx.websitePage.create({
            data: {
              organizationId: orgId,
              title: page.title,
              slug: page.slug,
              status: page.status || 'PUBLISHED',
              seoTitle: page.seoTitle,
              seoDescription: page.seoDescription
            }
          });

          if (Array.isArray(page.sections)) {
            for (const section of page.sections) {
              await tx.websiteSection.create({
                data: {
                  pageId: newPage.id,
                  type: section.type,
                  title: section.title,
                  subtitle: section.subtitle,
                  content: typeof section.content === 'string' ? section.content : JSON.stringify(section.content || {}),
                  draftContent: typeof section.draftContent === 'string' ? section.draftContent : JSON.stringify(section.draftContent || section.content || {}),
                  order: section.order || 0,
                  enabled: section.enabled !== false,
                  status: 'PUBLISHED'
                }
              });
            }
          }
        }
      }

      // Record Audit Log
      await createAuditLog({
        organizationId: orgId,
        actorId: user.id,
        actorEmail: user.email,
        action: 'RESTORE_WEBSITE_VERSION',
        entity: 'WebsiteVersion',
        entityId: version.id,
        description: `Restored website to Version #${version.versionNumber} (published at ${version.publishedAt.toISOString()}).`
      });
    });

    return NextResponse.json({
      message: `Website successfully restored to Version #${version.versionNumber}`,
      versionNumber: version.versionNumber
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

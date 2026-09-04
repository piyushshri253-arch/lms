import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, resolveAdminOrganization } from '@/lib/auth';
import { STARTER_THEMES, applyThemeToOrganization } from '@/lib/themes';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const org = await resolveAdminOrganization(user);

    const themeOrg = await prisma.organization.findUnique({
      where: { id: org.id },
      select: {
        id: true,
        name: true,
        slug: true,
        themeId: true,
        logo: true,
        favicon: true,
        logoHeight: true,
        primaryColor: true,
        secondaryColor: true,
        fontFamily: true,
        buttonStyle: true,
        borderRadius: true,
        headerStyle: true,
        headerSticky: true,
        headerCtaText: true,
        headerCtaUrl: true,
        heroBackgroundType: true,
        heroBackgroundImage: true,
        heroBackgroundVideo: true,
        heroOverlayOpacity: true,
        footerText: true,
        socialLinks: true,
        customCss: true,
        customJs: true
      }
    });

    return NextResponse.json({
      theme: themeOrg,
      availableThemes: Object.values(STARTER_THEMES)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch theme' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const org = await resolveAdminOrganization(user);
    const orgId = org.id;
    const body = await request.json();

    // 1. If applying a starter theme template
    if (body.action === 'APPLY_THEME' && body.themeId) {
      const applied = await applyThemeToOrganization(orgId, body.themeId);
      
      await createAuditLog({
        organizationId: orgId,
        actorId: user.id,
        actorEmail: user.email,
        action: 'THEME_APPLIED',
        entity: 'Organization',
        entityId: orgId,
        description: `Applied "${applied.name}" theme template to school website.`,
        req: request
      });

      return NextResponse.json({
        success: true,
        message: `Theme "${applied.name}" applied successfully!`,
        theme: applied
      });
    }

    // 2. Otherwise update custom theme branding attributes
    const updatedOrg = await prisma.organization.update({
      where: { id: orgId },
      data: {
        themeId: body.themeId !== undefined ? body.themeId : undefined,
        logo: body.logo !== undefined ? body.logo : undefined,
        favicon: body.favicon !== undefined ? body.favicon : undefined,
        logoHeight: body.logoHeight ? Number(body.logoHeight) : undefined,
        primaryColor: body.primaryColor !== undefined ? body.primaryColor : undefined,
        secondaryColor: body.secondaryColor !== undefined ? body.secondaryColor : undefined,
        fontFamily: body.fontFamily !== undefined ? body.fontFamily : undefined,
        buttonStyle: body.buttonStyle !== undefined ? body.buttonStyle : undefined,
        borderRadius: body.borderRadius !== undefined ? body.borderRadius : undefined,
        headerStyle: body.headerStyle !== undefined ? body.headerStyle : undefined,
        headerSticky: body.headerSticky !== undefined ? Boolean(body.headerSticky) : undefined,
        headerCtaText: body.headerCtaText !== undefined ? body.headerCtaText : undefined,
        headerCtaUrl: body.headerCtaUrl !== undefined ? body.headerCtaUrl : undefined,
        heroBackgroundType: body.heroBackgroundType !== undefined ? body.heroBackgroundType : undefined,
        heroBackgroundImage: body.heroBackgroundImage !== undefined ? body.heroBackgroundImage : undefined,
        heroBackgroundVideo: body.heroBackgroundVideo !== undefined ? body.heroBackgroundVideo : undefined,
        heroOverlayOpacity: body.heroOverlayOpacity !== undefined ? Number(body.heroOverlayOpacity) : undefined,
        footerText: body.footerText !== undefined ? body.footerText : undefined,
        socialLinks: body.socialLinks !== undefined ? JSON.stringify(body.socialLinks) : undefined,
        customCss: body.customCss !== undefined ? body.customCss : undefined,
        customJs: body.customJs !== undefined ? body.customJs : undefined
      }
    });

    await createAuditLog({
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'BRANDING_UPDATED',
      entity: 'Organization',
      entityId: orgId,
      description: 'Updated school website branding and theme styling.',
      req: request
    });

    return NextResponse.json({
      success: true,
      message: 'Website branding updated successfully.',
      theme: updatedOrg
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update theme' }, { status: 500 });
  }
}

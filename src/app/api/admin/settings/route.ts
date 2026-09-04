import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, resolveAdminOrganization } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const org = await resolveAdminOrganization(admin);

    return NextResponse.json({
      settings: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        subdomain: org.subdomain,
        customDomain: org.customDomain,
        logo: org.logo || '',
        favicon: org.favicon || '',
        logoHeight: org.logoHeight || 36,
        primaryColor: org.primaryColor || '#4f46e5',
        secondaryColor: org.secondaryColor || '#10b981',
        description: org.description || '',
        contactEmail: org.contactEmail || '',
        contactPhone: org.contactPhone || '',
        website: org.website || '',
        address: org.address || '',
        country: org.country || 'India',
        timezone: org.timezone || 'Asia/Kolkata',
        socialLinks: org.socialLinks ? JSON.parse(org.socialLinks) : {},
        footerText: org.footerText || '',
        buttonStyle: org.buttonStyle || 'rounded',
        typography: org.typography || 'sans',
        fontFamily: org.fontFamily || 'Plus Jakarta Sans',
        theme: org.theme || 'luxury',
        headerStyle: org.headerStyle || 'BLURRED',
        headerSticky: org.headerSticky ?? true,
        headerCtaText: org.headerCtaText || 'Explore Courses',
        headerCtaUrl: org.headerCtaUrl || '/courses',
        heroBackgroundType: org.heroBackgroundType || 'GRADIENT',
        heroBackgroundImage: org.heroBackgroundImage || '',
        heroBackgroundVideo: org.heroBackgroundVideo || '',
        heroOverlayOpacity: org.heroOverlayOpacity ?? 0.7,
        seoTitle: org.seoTitle || '',
        seoDescription: org.seoDescription || '',
        ogImage: org.ogImage || '',
        allowStudentRegistration: org.allowStudentRegistration,
        plan: org.plan,
        status: org.status,
        subscriptionStatus: org.subscriptionStatus,
        isFreeAccess: org.isFreeAccess,
        freeUntil: org.freeUntil,
        // Gateway status flags (Never return raw secrets to client)
        hasRazorpayConfigured: Boolean(org.razorpayKeyId && org.razorpayKeySecret),
        razorpayKeyId: org.razorpayKeyId || '',
        hasStripeConfigured: Boolean(org.stripePublishableKey && org.stripeSecretKey),
        stripePublishableKey: org.stripePublishableKey || ''
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const org = await resolveAdminOrganization(admin);

    const body = await req.json();
    const {
      name,
      logo,
      favicon,
      logoHeight,
      primaryColor,
      secondaryColor,
      description,
      contactEmail,
      contactPhone,
      website,
      address,
      country,
      timezone,
      socialLinks,
      footerText,
      buttonStyle,
      typography,
      fontFamily,
      theme,
      headerStyle,
      headerSticky,
      headerCtaText,
      headerCtaUrl,
      heroBackgroundType,
      heroBackgroundImage,
      heroBackgroundVideo,
      heroOverlayOpacity,
      seoTitle,
      seoDescription,
      ogImage,
      allowStudentRegistration,
      razorpayKeyId,
      razorpayKeySecret,
      razorpayWebhookSecret,
      stripePublishableKey,
      stripeSecretKey
    } = body;

    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (logo !== undefined) data.logo = logo;
    if (favicon !== undefined) data.favicon = favicon;
    if (logoHeight !== undefined) data.logoHeight = Number(logoHeight);
    if (primaryColor !== undefined) data.primaryColor = primaryColor;
    if (secondaryColor !== undefined) data.secondaryColor = secondaryColor;
    if (description !== undefined) data.description = description;
    if (contactEmail !== undefined) data.contactEmail = contactEmail;
    if (contactPhone !== undefined) data.contactPhone = contactPhone;
    if (website !== undefined) data.website = website;
    if (address !== undefined) data.address = address;
    if (country !== undefined) data.country = country;
    if (timezone !== undefined) data.timezone = timezone;
    if (footerText !== undefined) data.footerText = footerText;
    if (buttonStyle !== undefined) data.buttonStyle = buttonStyle;
    if (typography !== undefined) data.typography = typography;
    if (fontFamily !== undefined) data.fontFamily = fontFamily;
    if (theme !== undefined) data.theme = theme;
    if (headerStyle !== undefined) data.headerStyle = headerStyle;
    if (headerSticky !== undefined) data.headerSticky = Boolean(headerSticky);
    if (headerCtaText !== undefined) data.headerCtaText = headerCtaText;
    if (headerCtaUrl !== undefined) data.headerCtaUrl = headerCtaUrl;
    if (heroBackgroundType !== undefined) data.heroBackgroundType = heroBackgroundType;
    if (heroBackgroundImage !== undefined) data.heroBackgroundImage = heroBackgroundImage;
    if (heroBackgroundVideo !== undefined) data.heroBackgroundVideo = heroBackgroundVideo;
    if (heroOverlayOpacity !== undefined) data.heroOverlayOpacity = Number(heroOverlayOpacity);
    if (seoTitle !== undefined) data.seoTitle = seoTitle;
    if (seoDescription !== undefined) data.seoDescription = seoDescription;
    if (ogImage !== undefined) data.ogImage = ogImage;
    if (socialLinks !== undefined) data.socialLinks = JSON.stringify(socialLinks);
    if (allowStudentRegistration !== undefined) data.allowStudentRegistration = Boolean(allowStudentRegistration);

    // Payment credentials update (only if non-empty string provided)
    if (razorpayKeyId !== undefined && razorpayKeyId !== '') data.razorpayKeyId = razorpayKeyId.trim();
    if (razorpayKeySecret !== undefined && razorpayKeySecret !== '') data.razorpayKeySecret = razorpayKeySecret.trim();
    if (razorpayWebhookSecret !== undefined && razorpayWebhookSecret !== '') data.razorpayWebhookSecret = razorpayWebhookSecret.trim();
    if (stripePublishableKey !== undefined && stripePublishableKey !== '') data.stripePublishableKey = stripePublishableKey.trim();
    if (stripeSecretKey !== undefined && stripeSecretKey !== '') data.stripeSecretKey = stripeSecretKey.trim();

    const updated = await prisma.organization.update({
      where: { id: org.id },
      data
    });

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'UPDATE_ORGANIZATION_SETTINGS',
        entity: 'Organization',
        entityId: updated.id,
        description: `Admin ${admin.name} updated white-label branding, typography, hero background, and header settings.`
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Organization settings updated successfully.',
      settings: updated
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

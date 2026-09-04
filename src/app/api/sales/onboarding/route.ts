import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let organization: any = null;
    if (user.organizationId) {
      organization = await prisma.organization.findUnique({
        where: { id: user.organizationId }
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: (user as any).phone || null,
        role: user.role
      },
      organization: organization || {
        name: '',
        slug: '',
        businessType: 'ACADEMY',
        onboardingCompleted: false,
        onboardingStep: 1
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch onboarding state' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      isFinalSubmit,
      step,
      businessType,
      customBusinessType,
      businessName,
      contactEmail,
      contactPhone,
      country,
      state,
      city,
      industry,
      description,
      legalName,
      legalBusinessType,
      hasGst,
      gstin,
      gstStatus,
      gstDetails,
      goals,
      targetAudience,
      idealCustomer,
      productTypes,
      logo,
      primaryColor,
      secondaryColor,
      tagline,
      workspaceName,
      workspaceSlug
    } = body;

    const finalSlug = (workspaceSlug || businessName || 'my-business')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Map business type enum or string
    let mappedBusinessType = businessType || 'ACADEMY';
    if (businessType === 'ONLINE_ACADEMY' || businessType === 'ACADEMY') mappedBusinessType = 'ACADEMY';
    else if (businessType === 'COACHING') mappedBusinessType = 'COACHING';
    else if (businessType === 'CREATOR') mappedBusinessType = 'DIGITAL_PRODUCTS';
    else if (businessType === 'DIGITAL_PRODUCTS') mappedBusinessType = 'DIGITAL_PRODUCTS';
    else if (businessType === 'SERVICES' || businessType === 'SERVICE_BUSINESS') mappedBusinessType = 'SERVICES';
    else if (businessType === 'SOFTWARE') mappedBusinessType = 'SOFTWARE';

    const updatePayload: any = {
      name: businessName || workspaceName || user.organizationName || 'My Business',
      slug: finalSlug,
      subdomain: finalSlug,
      businessType: mappedBusinessType,
      industry: industry || customBusinessType || 'Digital Commerce',
      description: description || undefined,
      contactEmail: contactEmail || user.email,
      contactPhone: contactPhone || undefined,
      country: country || 'India',
      state: state || undefined,
      city: city || undefined,
      legalName: legalName || undefined,
      legalBusinessType: legalBusinessType || undefined,
      hasGst: hasGst || 'NOT_SURE',
      gstin: gstin || undefined,
      gstStatus: gstStatus || 'UNVERIFIED',
      gstDetails: gstDetails ? JSON.stringify(gstDetails) : undefined,
      goals: goals ? JSON.stringify(goals) : undefined,
      targetAudience: targetAudience ? JSON.stringify(targetAudience) : undefined,
      idealCustomer: idealCustomer || undefined,
      productTypes: productTypes ? JSON.stringify(productTypes) : undefined,
      logo: logo || undefined,
      primaryColor: primaryColor || '#4f46e5',
      secondaryColor: secondaryColor || '#10b981',
      tagline: tagline || undefined,
      onboardingData: JSON.stringify(body),
      onboardingStep: Number(step) || 5
    };

    if (isFinalSubmit) {
      updatePayload.onboardingCompleted = true;
      updatePayload.status = 'ACTIVE';
      updatePayload.verificationStatus = 'VERIFIED';
      updatePayload.verifiedSeller = true;
    }

    let organization;
    if (user.organizationId) {
      // Update existing organization
      organization = await prisma.organization.update({
        where: { id: user.organizationId },
        data: updatePayload
      });
    } else {
      // Create new organization and attach user as Admin
      organization = await prisma.organization.create({
        data: {
          ...updatePayload,
          users: {
            connect: { id: user.id }
          }
        }
      });

      // Update user role to ADMIN if STUDENT
      await prisma.user.update({
        where: { id: user.id },
        data: {
          organizationId: organization.id,
          role: user.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN'
        }
      });
    }

    // Auto-create or ensure Seller Wallet exists
    await prisma.wallet.upsert({
      where: { organizationId: organization.id },
      create: {
        organizationId: organization.id,
        availableBalance: 0,
        pendingBalance: 0,
        totalSales: 0,
        platformFees: 0,
        currency: organization.currency || 'INR'
      },
      update: {}
    });

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        subdomainUrl: `${organization.slug}.aadhyara.com`,
        businessType: organization.businessType,
        onboardingCompleted: organization.onboardingCompleted
      }
    });
  } catch (err: any) {
    console.error('Onboarding Save Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to save onboarding data' }, { status: 500 });
  }
}

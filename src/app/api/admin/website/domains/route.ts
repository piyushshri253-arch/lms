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
      include: {
        customDomains: { orderBy: { createdAt: 'desc' } }
      }
    });

    const defaultSubdomain = orgData?.subdomain || orgData?.slug || 'academy';
    const defaultUrl = `https://${defaultSubdomain}.morenalms.com`;

    return NextResponse.json({
      defaultDomain: {
        subdomain: defaultSubdomain,
        url: defaultUrl,
        isLive: true
      },
      customDomains: orgData?.customDomains || [],
      dnsInstructions: {
        recordType: 'CNAME',
        targetHost: 'platform.morenalms.com',
        txtVerificationPrefix: '_morena-verify'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch domains' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const org = await resolveAdminOrganization(user);
    const orgId = org.id;
    const body = await request.json();
    const { domain } = body;

    if (!domain || !domain.trim()) {
      return NextResponse.json({ error: 'Domain name is required (e.g. learn.myacademy.com).' }, { status: 400 });
    }

    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Check if domain is already registered
    const existing = await prisma.customDomain.findUnique({
      where: { domain: cleanDomain }
    });

    if (existing && existing.organizationId !== orgId) {
      return NextResponse.json({ error: 'This domain is already mapped to another academy.' }, { status: 409 });
    }

    const verificationToken = `morena_token_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;

    const customDomain = await prisma.customDomain.upsert({
      where: { domain: cleanDomain },
      create: {
        organizationId: orgId,
        domain: cleanDomain,
        verificationToken,
        verified: false,
        sslStatus: 'PENDING',
        isPrimary: true
      },
      update: {
        verificationToken,
        verified: false,
        sslStatus: 'PENDING'
      }
    });

    await createAuditLog({
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'CUSTOM_DOMAIN_ADDED',
      entity: 'CustomDomain',
      entityId: customDomain.id,
      description: `Added custom domain "${cleanDomain}" for verification.`,
      req: request
    });

    return NextResponse.json({
      success: true,
      customDomain,
      dnsRecord: {
        type: 'CNAME',
        name: cleanDomain,
        target: 'platform.morenalms.com',
        txtVerification: `${customDomain.verificationToken}`
      },
      message: `Domain ${cleanDomain} added. Configure DNS CNAME to complete verification.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add domain' }, { status: 500 });
  }
}

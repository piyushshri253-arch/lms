import { prisma } from './prisma';

export interface TenantContext {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  customDomain: string | null;
  status: string;
  logo: string | null;
  favicon: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  fontFamily: string | null;
  buttonStyle: string | null;
  borderRadius: string | null;
  themeId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  twitterHandle: string | null;
  sitemapEnabled: boolean;
  allowStudentRegistration: boolean;
}

/**
 * Resolves an organization from an incoming HTTP request hostname.
 * Supports custom domains (e.g. learn.abcacademy.com) and subdomains (e.g. abc-academy.morenalms.com).
 */
export async function resolveTenantFromHost(hostHeader: string | null): Promise<TenantContext | null> {
  if (!hostHeader) return null;

  // Clean host (remove port if present, e.g. "localhost:3000" -> "localhost")
  const cleanHost = hostHeader.split(':')[0].toLowerCase();

  // 1. Check custom domains
  const customDomainRecord = await prisma.customDomain.findFirst({
    where: {
      domain: cleanHost,
      verified: true
    },
    include: { organization: true }
  });

  if (customDomainRecord?.organization && customDomainRecord.organization.status !== 'SUSPENDED') {
    return formatTenant(customDomainRecord.organization);
  }

  // Also check organization.customDomain direct field
  const directDomainOrg = await prisma.organization.findFirst({
    where: {
      customDomain: cleanHost,
      domainVerified: true,
      status: { not: 'SUSPENDED' }
    }
  });

  if (directDomainOrg) {
    return formatTenant(directDomainOrg);
  }

  // 2. Check Subdomain (e.g. "abc-academy.morenalms.com" or "abc-academy.localhost")
  const parts = cleanHost.split('.');
  if (parts.length >= 2) {
    const potentialSubdomain = parts[0];
    if (potentialSubdomain && potentialSubdomain !== 'www' && potentialSubdomain !== 'platform' && potentialSubdomain !== 'app' && potentialSubdomain !== 'api') {
      const orgBySubdomain = await prisma.organization.findFirst({
        where: {
          OR: [
            { subdomain: potentialSubdomain },
            { slug: potentialSubdomain }
          ],
          status: { not: 'SUSPENDED' }
        }
      });

      if (orgBySubdomain) {
        return formatTenant(orgBySubdomain);
      }
    }
  }

  return null;
}

/**
 * Resolves an organization by its slug.
 */
export async function resolveTenantFromSlug(slug: string): Promise<TenantContext | null> {
  if (!slug) return null;

  const org = await prisma.organization.findUnique({
    where: { slug: slug.toLowerCase() }
  });

  if (!org || org.status === 'SUSPENDED') {
    return null;
  }

  return formatTenant(org);
}

/**
 * Load complete website configuration for a tenant.
 */
export async function getTenantWebsiteConfig(organizationId: string, pageSlug = 'home') {
  const [organization, page, navigationItems, courses, categories] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId }
    }),
    prisma.websitePage.findUnique({
      where: { organizationId_slug: { organizationId, slug: pageSlug } },
      include: {
        sections: {
          where: { enabled: true },
          orderBy: { order: 'asc' }
        }
      }
    }),
    prisma.navigationItem.findMany({
      where: { organizationId, enabled: true },
      orderBy: { order: 'asc' }
    }),
    prisma.course.findMany({
      where: { organizationId, status: 'PUBLISHED' },
      include: {
        category: true,
        instructor: { select: { id: true, name: true, avatar: true, bio: true } },
        reviews: { select: { rating: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.category.findMany({
      where: { organizationId }
    })
  ]);

  return {
    organization,
    page,
    navigationItems,
    courses,
    categories
  };
}

function formatTenant(org: any): TenantContext {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    subdomain: org.subdomain,
    customDomain: org.customDomain,
    status: org.status,
    logo: org.logo,
    favicon: org.favicon,
    primaryColor: org.primaryColor || '#6366f1',
    secondaryColor: org.secondaryColor || '#10b981',
    fontFamily: org.fontFamily || 'Plus Jakarta Sans',
    buttonStyle: org.buttonStyle || 'rounded',
    borderRadius: org.borderRadius || '0.75rem',
    themeId: org.themeId || 'MODERN_ACADEMY',
    seoTitle: org.seoTitle,
    seoDescription: org.seoDescription,
    ogImage: org.ogImage,
    twitterHandle: org.twitterHandle,
    sitemapEnabled: org.sitemapEnabled ?? true,
    allowStudentRegistration: org.allowStudentRegistration ?? true
  };
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const org = await prisma.organization.findUnique({
      where: { slug: slug.toLowerCase() },
      include: {
        websitePages: {
          where: { status: 'PUBLISHED' },
          select: { slug: true, updatedAt: true }
        },
        courses: {
          where: { status: 'PUBLISHED' },
          select: { slug: true, updatedAt: true }
        }
      }
    });

    if (!org || org.status === 'SUSPENDED') {
      return new NextResponse('Not found', { status: 404 });
    }

    const baseUrl = org.customDomain && org.domainVerified
      ? `https://${org.customDomain}`
      : `https://${org.subdomain || org.slug}.morenalms.com`;

    const nowIso = new Date().toISOString();

    const urls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [];

    // 1. Home
    urls.push({
      loc: `${baseUrl}/`,
      lastmod: nowIso,
      changefreq: 'daily',
      priority: '1.0'
    });

    // 2. Published Pages
    for (const p of org.websitePages) {
      if (p.slug !== 'home') {
        urls.push({
          loc: `${baseUrl}/${p.slug}`,
          lastmod: p.updatedAt.toISOString(),
          changefreq: 'weekly',
          priority: '0.8'
        });
      }
    }

    // 3. Published Courses
    for (const c of org.courses) {
      urls.push({
        loc: `${baseUrl}/courses/${c.slug}`,
        lastmod: c.updatedAt.toISOString(),
        changefreq: 'weekly',
        priority: '0.9'
      });
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600'
      }
    });
  } catch (err: any) {
    return new NextResponse('Server error', { status: 500 });
  }
}

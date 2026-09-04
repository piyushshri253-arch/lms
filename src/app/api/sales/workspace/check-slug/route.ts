import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawSlug = searchParams.get('slug') || '';
    const currentOrgId = searchParams.get('currentOrgId') || '';

    const cleanSlug = rawSlug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!cleanSlug || cleanSlug.length < 2) {
      return NextResponse.json({
        available: false,
        slug: cleanSlug,
        error: 'Slug must be at least 2 alphanumeric characters.'
      });
    }

    // Reserved subdomains
    const reserved = ['admin', 'api', 'app', 'auth', 'billing', 'cdn', 'dashboard', 'dev', 'help', 'login', 'mail', 'marketplace', 'portal', 'root', 'sales', 'super-admin', 'support', 'www'];
    if (reserved.includes(cleanSlug)) {
      return NextResponse.json({
        available: false,
        slug: cleanSlug,
        error: 'This workspace name is reserved by the platform.',
        suggestions: [`${cleanSlug}-hq`, `${cleanSlug}-hub`, `my-${cleanSlug}`]
      });
    }

    const existing = await prisma.organization.findUnique({
      where: { slug: cleanSlug }
    });

    if (existing && existing.id !== currentOrgId) {
      // Suggest alternatives
      const suggestions = [
        `${cleanSlug}-official`,
        `${cleanSlug}-academy`,
        `${cleanSlug}-studio`,
        `${cleanSlug}-online`,
        `${cleanSlug}-app`
      ];

      return NextResponse.json({
        available: false,
        slug: cleanSlug,
        suggestions
      });
    }

    return NextResponse.json({
      available: true,
      slug: cleanSlug
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Slug check failed' }, { status: 500 });
  }
}

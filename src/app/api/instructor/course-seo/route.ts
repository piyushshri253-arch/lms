import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

function sanitizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function computeSeoScore(data: {
  seoTitle: string;
  seoDescription: string;
  slug: string;
  ogImage: string;
  keywords: string[];
}): { score: number; checks: Array<{ label: string; passed: boolean; hint: string }> } {
  const checks = [
    {
      label: 'SEO Title Length (30–60 chars)',
      passed: data.seoTitle.trim().length >= 25 && data.seoTitle.trim().length <= 65,
      hint: `Current: ${data.seoTitle.trim().length} characters (Ideal: 30–60)`
    },
    {
      label: 'Meta Description (100–160 chars)',
      passed: data.seoDescription.trim().length >= 80 && data.seoDescription.trim().length <= 165,
      hint: `Current: ${data.seoDescription.trim().length} characters (Ideal: 100–160)`
    },
    {
      label: 'Clean Search-Friendly URL Slug',
      passed: Boolean(data.slug && data.slug.length >= 4 && !data.slug.includes('_')),
      hint: `/courses/${data.slug || 'missing-slug'}`
    },
    {
      label: 'OpenGraph (OG) Social Share Image',
      passed: Boolean(data.ogImage && data.ogImage.trim().length > 5),
      hint: data.ogImage ? '1200×630 OG Banner configured' : 'Add an OG image URL or course thumbnail'
    },
    {
      label: 'Target Search Keywords (3+ keywords)',
      passed: Array.isArray(data.keywords) && data.keywords.length >= 3,
      hint: `${(data.keywords || []).length} keywords configured`
    }
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);
  return { score, checks };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['INSTRUCTOR', 'ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    const courses = await prisma.course.findMany({
      where:
        user.role === 'INSTRUCTOR'
          ? { instructorId: user.id, ...(courseId ? { id: courseId } : {}) }
          : courseId
          ? { id: courseId }
          : {},
      include: {
        category: { select: { name: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const items = await Promise.all(
      courses.map(async (course) => {
        let parsedTags: string[] = [];
        try {
          parsedTags = JSON.parse(course.tags || '[]');
          if (!Array.isArray(parsedTags)) parsedTags = [];
        } catch {
          parsedTags = [];
        }

        let extraSeo: any = {};
        try {
          const row = await prisma.platformSetting.findUnique({
            where: { key: `course_seo_${course.id}` }
          });
          if (row?.value) extraSeo = JSON.parse(row.value);
        } catch {}

        const seoTitle = course.seoTitle || extraSeo.seoTitle || course.title || '';
        const seoDescription =
          course.seoDescription ||
          extraSeo.seoDescription ||
          course.shortDescription ||
          course.description?.slice(0, 155) ||
          '';
        const ogImage = extraSeo.ogImage || course.banner || course.thumbnail || '';
        const keywords: string[] =
          Array.isArray(extraSeo.keywords) && extraSeo.keywords.length > 0
            ? extraSeo.keywords
            : parsedTags;

        const audit = computeSeoScore({
          seoTitle,
          seoDescription,
          slug: course.slug,
          ogImage,
          keywords
        });

        return {
          id: course.id,
          title: course.title,
          shortDescription: course.shortDescription || '',
          description: course.description || '',
          categoryName: course.category?.name || 'Masterclass',
          status: course.status,
          price: course.price,
          discountPrice: course.discountPrice,
          thumbnail: course.thumbnail || '',
          banner: course.banner || '',
          slug: course.slug,
          seoTitle,
          seoDescription,
          ogImage,
          keywords,
          robotsIndex: extraSeo.robotsIndex ?? true,
          canonicalUrl: extraSeo.canonicalUrl || '',
          seoScore: audit.score,
          seoChecks: audit.checks,
          updatedAt: course.updatedAt.toISOString()
        };
      })
    );

    return NextResponse.json({ courses: items });
  } catch (error) {
    console.error('GET /api/instructor/course-seo error:', error);
    return NextResponse.json({ error: 'Failed to load course SEO settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['INSTRUCTOR', 'ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      courseId,
      seoTitle,
      seoDescription,
      slug,
      ogImage,
      keywords,
      robotsIndex = true,
      canonicalUrl = ''
    } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only edit SEO for your own courses.' },
        { status: 403 }
      );
    }

    const cleanSlug = sanitizeSlug(slug || course.slug || course.title);
    if (!cleanSlug) {
      return NextResponse.json({ error: 'Valid URL slug is required' }, { status: 400 });
    }

    // Check slug uniqueness within organization
    const duplicateSlug = await prisma.course.findFirst({
      where: {
        slug: cleanSlug,
        organizationId: course.organizationId,
        id: { not: course.id }
      }
    });

    if (duplicateSlug) {
      return NextResponse.json(
        { error: `URL slug "${cleanSlug}" is already in use by another course.` },
        { status: 409 }
      );
    }

    const cleanKeywords: string[] = Array.isArray(keywords)
      ? keywords.map((k) => String(k).trim()).filter(Boolean)
      : String(keywords || '')
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean);

    const updatedCourse = await prisma.course.update({
      where: { id: course.id },
      data: {
        slug: cleanSlug,
        seoTitle: (seoTitle || '').trim() || null,
        seoDescription: (seoDescription || '').trim() || null,
        tags: JSON.stringify(cleanKeywords),
        ...(ogImage && ogImage.trim() ? { banner: ogImage.trim() } : {})
      }
    });

    const extraPayload = {
      courseId: course.id,
      seoTitle: (seoTitle || '').trim(),
      seoDescription: (seoDescription || '').trim(),
      slug: cleanSlug,
      ogImage: (ogImage || '').trim(),
      keywords: cleanKeywords,
      robotsIndex: Boolean(robotsIndex),
      canonicalUrl: (canonicalUrl || '').trim(),
      updatedAt: new Date().toISOString()
    };

    await prisma.platformSetting.upsert({
      where: { key: `course_seo_${course.id}` },
      update: { value: JSON.stringify(extraPayload) },
      create: { key: `course_seo_${course.id}`, value: JSON.stringify(extraPayload) }
    });

    const audit = computeSeoScore({
      seoTitle: extraPayload.seoTitle || updatedCourse.title,
      seoDescription: extraPayload.seoDescription || updatedCourse.shortDescription || '',
      slug: updatedCourse.slug,
      ogImage: extraPayload.ogImage || updatedCourse.banner || updatedCourse.thumbnail || '',
      keywords: cleanKeywords
    });

    return NextResponse.json({
      success: true,
      slug: updatedCourse.slug,
      seoScore: audit.score,
      seoChecks: audit.checks,
      message: 'Course SEO metadata, URL slug, OpenGraph image, and keywords updated.'
    });
  } catch (error) {
    console.error('PUT /api/instructor/course-seo error:', error);
    return NextResponse.json({ error: 'Failed to update course SEO settings' }, { status: 500 });
  }
}

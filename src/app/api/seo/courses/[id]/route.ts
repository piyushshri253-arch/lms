import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const course = await prisma.course.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        instructor: { select: { id: true, name: true, email: true, avatar: true } },
        category: true,
        sections: {
          select: {
            id: true,
            lessons: { select: { id: true, type: true } }
          }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    let keywords: string[] = [];
    try {
      if (course.tags) {
        const parsed = JSON.parse(course.tags);
        if (Array.isArray(parsed)) keywords = parsed;
      }
    } catch {}

    // Load custom ads if set
    let adsData: any = null;
    let extraMeta: any = {};
    try {
      const [adsRow, metaRow] = await Promise.all([
        prisma.platformSetting.findUnique({ where: { key: `course_ads_${course.id}` } }),
        prisma.platformSetting.findUnique({ where: { key: `course_seo_meta_${course.id}` } })
      ]);
      if (adsRow?.value) adsData = JSON.parse(adsRow.value);
      if (metaRow?.value) extraMeta = JSON.parse(metaRow.value);
    } catch {}

    const totalLessons = course.sections.flatMap((s) => s.lessons).length;

    return NextResponse.json({
      success: true,
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        slug: course.slug,
        categoryName: course.category?.name || 'General',
        status: course.status,
        price: course.price,
        thumbnail: course.thumbnail || '',
        instructor: course.instructor,
        modulesCount: course.sections.length,
        lecturesCount: totalLessons,
        seoTitle: course.seoTitle || course.title,
        seoDescription: course.seoDescription || (course.description ? course.description.slice(0, 155) : ''),
        keywords,
        canonicalUrl: extraMeta.canonicalUrl || `https://morenateach.com/courses/${course.slug}`,
        schemaMarkup: extraMeta.schemaMarkup || '',
        ads: adsData
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch course SEO' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { seoTitle, seoDescription, slug, keywords, canonicalUrl, schemaMarkup, ads } = body;

    const course = await prisma.course.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true, title: true }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const cleanKeywords: string[] = Array.isArray(keywords)
      ? keywords.map((k) => String(k).trim()).filter(Boolean)
      : [];

    const updated = await prisma.course.update({
      where: { id: course.id },
      data: {
        seoTitle: seoTitle !== undefined ? String(seoTitle).trim() || null : undefined,
        seoDescription: seoDescription !== undefined ? String(seoDescription).trim() || null : undefined,
        slug: slug !== undefined ? String(slug).trim() || undefined : undefined,
        tags: JSON.stringify(cleanKeywords)
      }
    });

    // Save extra metadata (canonicalUrl, schemaMarkup)
    if (canonicalUrl !== undefined || schemaMarkup !== undefined) {
      const extra = {
        canonicalUrl: canonicalUrl !== undefined ? String(canonicalUrl).trim() : undefined,
        schemaMarkup: schemaMarkup !== undefined ? String(schemaMarkup).trim() : undefined
      };
      await prisma.platformSetting.upsert({
        where: { key: `course_seo_meta_${course.id}` },
        update: { value: JSON.stringify(extra) },
        create: { key: `course_seo_meta_${course.id}`, value: JSON.stringify(extra) }
      });
    }

    // Save ads config if passed
    if (ads) {
      await prisma.platformSetting.upsert({
        where: { key: `course_ads_${course.id}` },
        update: { value: JSON.stringify(ads) },
        create: { key: `course_ads_${course.id}`, value: JSON.stringify(ads) }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'SEO and Ads settings updated successfully.',
      course: updated,
      ads
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update SEO' }, { status: 500 });
  }
}

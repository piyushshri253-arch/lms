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
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' }
            }
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

    let whatYouWillLearn: string[] = [];
    try {
      if (course.whatYouWillLearn) {
        const parsed = JSON.parse(course.whatYouWillLearn);
        if (Array.isArray(parsed)) whatYouWillLearn = parsed;
        else if (typeof parsed === 'string') whatYouWillLearn = [parsed];
      }
    } catch {
      if (course.whatYouWillLearn) whatYouWillLearn = [course.whatYouWillLearn];
    }

    let requirements: string[] = [];
    try {
      if (course.requirements) {
        const parsed = JSON.parse(course.requirements);
        if (Array.isArray(parsed)) requirements = parsed;
        else if (typeof parsed === 'string') requirements = [parsed];
      }
    } catch {
      if (course.requirements) requirements = [course.requirements];
    }

    let targetAudience: string[] = [];
    try {
      if (course.targetAudience) {
        const parsed = JSON.parse(course.targetAudience);
        if (Array.isArray(parsed)) targetAudience = parsed;
        else if (typeof parsed === 'string') targetAudience = [parsed];
      }
    } catch {
      if (course.targetAudience) targetAudience = [course.targetAudience];
    }

    // Extract Final Assessment Quiz details from lessons
    const allLessons = course.sections.flatMap((s) => s.lessons);
    const quizLesson = allLessons.find(
      (l: any) =>
        l.type === 'QUIZ' &&
        (l.title.toLowerCase().includes('final') ||
          l.title.toLowerCase().includes('assessment') ||
          l.title.toLowerCase().includes('certification'))
    ) || allLessons.find((l: any) => l.type === 'QUIZ');

    let finalAssessment: any = null;
    if (quizLesson) {
      let quizContent: any = null;
      try {
        if (quizLesson.quizData) {
          quizContent = typeof quizLesson.quizData === 'string' ? JSON.parse(quizLesson.quizData) : quizLesson.quizData;
        } else if ((quizLesson as any).content) {
          quizContent = typeof (quizLesson as any).content === 'string' ? JSON.parse((quizLesson as any).content) : (quizLesson as any).content;
        }
      } catch {}

      finalAssessment = {
        lessonId: quizLesson.id,
        title: quizLesson.title,
        passingScore: quizContent?.passingScore ?? 80,
        attemptLimit: quizContent?.attemptLimit ?? 0,
        questions: Array.isArray(quizContent?.questions) ? quizContent.questions : []
      };
    }

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

    const totalLessons = allLessons.length;

    return NextResponse.json({
      success: true,
      course: {
        id: course.id,
        title: course.title,
        description: course.description || '',
        shortDescription: course.shortDescription || '',
        slug: course.slug,
        categoryName: course.category?.name || 'General',
        category: course.category,
        level: course.level || 'Foundational',
        language: course.language || 'English',
        durationHours: course.durationHours || 12,
        status: course.status,
        price: course.price,
        discountPrice: course.discountPrice,
        thumbnail: course.thumbnail || '',
        trailerVideoUrl: course.trailerVideoUrl || '',
        instructor: course.instructor,
        modulesCount: course.sections.length,
        lecturesCount: totalLessons,
        sections: course.sections.map((sec) => ({
          id: sec.id,
          title: sec.title,
          order: sec.order,
          lessons: sec.lessons.map((les) => ({
            id: les.id,
            title: les.title,
            type: les.type,
            duration: les.duration || (les.durationSeconds ? `${Math.round(les.durationSeconds / 60)}m` : '15m'),
            durationSeconds: les.durationSeconds,
            isFree: les.isFree,
            isPreview: les.isPreview,
            order: les.order,
            videoUrl: les.videoUrl
          }))
        })),
        whatYouWillLearn,
        requirements,
        targetAudience,
        finalAssessment,
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
    const {
      seoTitle,
      seoDescription,
      slug,
      keywords,
      canonicalUrl,
      schemaMarkup,
      ads,
      thumbnail,
      trailerVideoUrl,
      shortDescription,
      description,
      whatYouWillLearn,
      requirements,
      targetAudience
    } = body;

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
        tags: keywords !== undefined ? JSON.stringify(cleanKeywords) : undefined,
        thumbnail: thumbnail !== undefined ? String(thumbnail).trim() || undefined : undefined,
        trailerVideoUrl: trailerVideoUrl !== undefined ? String(trailerVideoUrl).trim() || null : undefined,
        shortDescription: shortDescription !== undefined ? String(shortDescription).trim() || null : undefined,
        description: description !== undefined ? String(description).trim() || undefined : undefined,
        whatYouWillLearn: whatYouWillLearn !== undefined ? JSON.stringify(whatYouWillLearn) : undefined,
        requirements: requirements !== undefined ? JSON.stringify(requirements) : undefined,
        targetAudience: targetAudience !== undefined ? JSON.stringify(targetAudience) : undefined
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
      message: 'Course settings and marketing metadata updated successfully.',
      course: updated,
      ads
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update SEO' }, { status: 500 });
  }
}

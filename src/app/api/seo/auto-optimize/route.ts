import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { courseId, mode } = body;

    // Helper to generate SEO metadata
    const generateSeoData = (title: string, categoryName?: string, level?: string) => {
      const cleanTitle = title.trim();
      const cat = categoryName || 'Education';
      const lvl = level || 'Teacher Training';

      // Title target: 50-60 chars
      let seoTitle = `${cleanTitle} | Certified Online Course`;
      if (seoTitle.length > 60) {
        seoTitle = `${cleanTitle.slice(0, 42)} | Morena Teach`;
      }

      // Description target: 130-155 chars
      const seoDescription = `Enroll in ${cleanTitle} by Morena Teach. Comprehensive ${cat} curriculum, practical classroom frameworks, and verified educator certificate.`;

      // Keywords based on title & category
      const words = cleanTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !['with', 'from', 'your', 'about', 'this', 'that', 'into'].includes(w));

      const keywords = Array.from(
        new Set([
          ...words.slice(0, 4),
          `${cat.toLowerCase()} course`,
          'teacher training online',
          'educator certification',
          'classroom pedagogy'
        ])
      );

      // JSON-LD Schema
      const schemaMarkup = JSON.stringify(
        {
          '@context': 'https://schema.org',
          '@type': 'Course',
          name: cleanTitle,
          description: seoDescription,
          provider: {
            '@type': 'Organization',
            name: 'Morena Teach',
            sameAs: 'https://morenateach.com'
          },
          educationalCredentialAwarded: 'Certificate of Teacher Excellence',
          hasCourseInstance: {
            '@type': 'CourseInstance',
            courseMode: 'online',
            courseWorkload: 'PT20H'
          }
        },
        null,
        2
      );

      return { seoTitle, seoDescription, keywords, schemaMarkup };
    };

    // Case 1: Optimize ALL pending courses in LMS
    if (mode === 'ALL' || courseId === 'all') {
      const courses = await prisma.course.findMany({
        where: {
          parentCourseId: null,
          OR: [
            { seoTitle: null },
            { seoTitle: '' },
            { seoDescription: null },
            { seoDescription: '' }
          ]
        },
        include: { category: true }
      });

      let updatedCount = 0;
      for (const course of courses) {
        const seo = generateSeoData(course.title, course.category?.name, course.level || undefined);

        await prisma.course.update({
          where: { id: course.id },
          data: {
            seoTitle: seo.seoTitle,
            seoDescription: seo.seoDescription,
            tags: JSON.stringify(seo.keywords)
          }
        });

        // Save schema markup in PlatformSetting
        await prisma.platformSetting.upsert({
          where: { key: `course_seo_meta_${course.id}` },
          update: {
            value: JSON.stringify({
              canonicalUrl: `https://morenateach.com/courses/${course.slug}`,
              schemaMarkup: seo.schemaMarkup
            })
          },
          create: {
            key: `course_seo_meta_${course.id}`,
            value: JSON.stringify({
              canonicalUrl: `https://morenateach.com/courses/${course.slug}`,
              schemaMarkup: seo.schemaMarkup
            })
          }
        });

        updatedCount++;
      }

      return NextResponse.json({
        success: true,
        message: `Successfully optimized SEO for ${updatedCount} LMS courses in database.`,
        updatedCount
      });
    }

    // Case 2: Optimize a SINGLE specific course by ID
    if (!courseId) {
      return NextResponse.json({ error: 'courseId or mode: ALL is required' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { category: true }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const seo = generateSeoData(course.title, course.category?.name, course.level || undefined);

    const updated = await prisma.course.update({
      where: { id: course.id },
      data: {
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
        tags: JSON.stringify(seo.keywords)
      }
    });

    // Save schema in PlatformSetting
    await prisma.platformSetting.upsert({
      where: { key: `course_seo_meta_${course.id}` },
      update: {
        value: JSON.stringify({
          canonicalUrl: `https://morenateach.com/courses/${course.slug}`,
          schemaMarkup: seo.schemaMarkup
        })
      },
      create: {
        key: `course_seo_meta_${course.id}`,
        value: JSON.stringify({
          canonicalUrl: `https://morenateach.com/courses/${course.slug}`,
          schemaMarkup: seo.schemaMarkup
        })
      }
    });

    return NextResponse.json({
      success: true,
      message: `SEO generated and saved for course "${course.title}".`,
      course: updated,
      seo
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Auto-optimize failed' }, { status: 500 });
  }
}

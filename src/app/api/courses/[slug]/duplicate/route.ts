import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const admin = await requireRole(['ADMIN', 'INSTRUCTOR']);
    const { slug } = await params;

    const source = await prisma.course.findFirst({
      where: {
        OR: [{ slug }, { id: slug }]
      },
      include: {
        sections: {
          include: { lessons: true }
        }
      }
    });

    if (!source) {
      return NextResponse.json({ error: 'Source course not found' }, { status: 404 });
    }

    const uniqueSlug = `${source.slug}-copy-${Date.now().toString(36)}`;
    const duplicateTitle = `Copy of ${source.title}`;

    const newCourse = await prisma.course.create({
      data: {
        title: duplicateTitle,
        slug: uniqueSlug,
        description: source.description,
        shortDescription: source.shortDescription,
        thumbnail: source.thumbnail,
        price: source.price,
        discountPrice: source.discountPrice,
        categoryId: source.categoryId,
        level: source.level,
        instructorId: admin.id || source.instructorId,
        status: 'DRAFT',
        durationHours: source.durationHours,
        language: source.language,
        whatYouWillLearn: source.whatYouWillLearn,
        isNew: true
      }
    });

    // Clone sections and lessons
    for (const sec of source.sections) {
      const newSec = await prisma.courseSection.create({
        data: {
          courseId: newCourse.id,
          title: sec.title,
          description: sec.description,
          order: sec.order
        }
      });

      for (const les of sec.lessons) {
        await prisma.lesson.create({
          data: {
            sectionId: newSec.id,
            title: les.title,
            description: les.description,
            videoUrl: les.videoUrl,
            duration: les.duration,
            durationSeconds: les.durationSeconds,
            order: les.order,
            isFree: les.isFree,
            resources: les.resources
          }
        });
      }
    }

    // Log Audit action
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'DUPLICATE_COURSE',
        entity: 'Course',
        entityId: newCourse.id,
        description: `Admin duplicated "${source.title}" into new draft "${duplicateTitle}".`
      }
    });

    return NextResponse.json({
      course: newCourse,
      message: `Course duplicated as draft: "${duplicateTitle}".`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

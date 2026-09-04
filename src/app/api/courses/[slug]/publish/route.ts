import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const user = await requireRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const course = await prisma.course.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      include: {
        category: true,
        instructor: true,
        sections: {
          include: {
            lessons: true
          }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only publish courses authored by your account.' },
        { status: 403 }
      );
    }

    const allLessons = course.sections.flatMap((s) => s.lessons);

    // Validation Rules
    const checklist = [
      {
        id: 'title',
        label: 'Course Title & Basics',
        passed: !!course.title && course.title.trim().length >= 3,
        message: course.title ? 'Course title is set.' : 'Course title is missing.',
        step: 0
      },
      {
        id: 'description',
        label: 'Syllabus & Overview Description',
        passed: !!course.description && course.description.trim().length >= 20,
        message: course.description?.length >= 20 ? 'Course description is comprehensive.' : 'Description must be at least 20 characters.',
        step: 0
      },
      {
        id: 'category',
        label: 'Category Selected',
        passed: !!course.category,
        message: course.category ? `Category: ${course.category.name}` : 'Please select a valid category.',
        step: 0
      },
      {
        id: 'sections',
        label: 'Curriculum Sections / Modules',
        passed: course.sections.length >= 1,
        message: course.sections.length >= 1 ? `${course.sections.length} module(s) created.` : 'Add at least 1 section in Curriculum.',
        step: 2
      },
      {
        id: 'lessons',
        label: 'Lectures & Lesson Content',
        passed: allLessons.length >= 1,
        message: allLessons.length >= 1 ? `${allLessons.length} lecture(s) created.` : 'Add at least 1 lesson in Curriculum.',
        step: 2
      },
      {
        id: 'lesson_content',
        label: 'Lesson Assets & Media Ready',
        passed: allLessons.length > 0 && allLessons.every((l) => {
          const type = (l as any).type || 'VIDEO';
          if (type === 'VIDEO') return !!l.videoUrl || (l.durationSeconds && l.durationSeconds > 0);
          if (type === 'TEXT') return !!(l as any).content && (l as any).content.length >= 10;
          if (type === 'PDF') return !!(l as any).pdfUrl;
          if (type === 'QUIZ') return !!(l as any).quizData;
          return true;
        }),
        message: allLessons.length > 0 ? 'All lectures configured with valid content.' : 'Configure video, text, PDF or quiz for your lessons.',
        step: 2
      },
      {
        id: 'pricing',
        label: 'Pricing & Access Configured',
        passed: course.price >= 0,
        message:
          course.price === 0
            ? 'Course configured as 100% Free.'
            : `Course priced at ${(course as any).currency === 'INR' ? '₹' : '$'}${course.price} (${(course as any).currency || 'INR'}).`,
        step: 4
      }
    ];

    const canPublish = checklist.every((c) => c.passed);

    // If dryRun check only
    if (body.validateOnly) {
      return NextResponse.json({ canPublish, checklist });
    }

    if (!canPublish) {
      const missing = checklist.filter((c) => !c.passed);
      return NextResponse.json(
        {
          error: 'Course does not meet all publishing requirements yet.',
          canPublish: false,
          missing,
          checklist
        },
        { status: 400 }
      );
    }

    // Update course status to PUBLISHED
    const updated = await prisma.course.update({
      where: { id: course.id },
      data: {
        status: 'PUBLISHED'
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        adminEmail: user.email,
        action: 'PUBLISH_COURSE',
        entity: 'Course',
        entityId: course.id,
        description: `${user.role} published master course "${course.title}".`
      }
    });

    return NextResponse.json({
      success: true,
      canPublish: true,
      course: updated,
      checklist,
      message: 'Course published successfully and is now live on AADHYARA!'
    });
  } catch (err: any) {
    const isAuth = err.message?.includes('Authentication');
    const isForbidden = err.message?.includes('forbidden') || err.message?.includes('Insufficient') || err.message?.includes('permissions');
    const status = isAuth ? 401 : isForbidden ? 403 : 400;
    return NextResponse.json({ error: err.message || 'Publishing failed' }, { status });
  }
}

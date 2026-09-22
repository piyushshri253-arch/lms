import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, validateTenantOwnership, handleAuthError } from '@/lib/auth';

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

    // Tenant Isolation Check
    if (!validateTenantOwnership(course.organizationId, user)) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to publish courses outside your organization.' },
        { status: 403 }
      );
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

    // Determine target status according to approval workflow:
    let targetStatus = 'PUBLISHED';
    let responseMessage = 'Course approved and published live to landing page!';

    if (user.role === 'INSTRUCTOR') {
      // If course is already approved by Super Admin, instructor can publish live!
      if (course.status === 'APPROVED') {
        targetStatus = 'PUBLISHED';
        responseMessage = 'Congratulations! Your approved course is now published live on the platform! 🚀';
      } else if (course.status === 'PUBLISHED') {
        return NextResponse.json({
          success: true,
          status: 'PUBLISHED',
          course,
          message: 'Course is already published live.'
        });
      } else if (course.status === 'IN_REVIEW') {
        return NextResponse.json(
          {
            error: 'This course is currently under review by Super Admin. Please wait for approval before publishing.',
            status: 'IN_REVIEW'
          },
          { status: 400 }
        );
      } else {
        // DRAFT or REJECTED: Instructor submits for Super Admin approval
        targetStatus = 'IN_REVIEW';
        responseMessage = 'Course submitted for Super Admin review! Once approved, you will be able to publish it live.';
      }
    } else {
      // Super Admin or Admin actions
      if (body.status === 'APPROVED' || body.action === 'APPROVE') {
        targetStatus = 'APPROVED';
        responseMessage = 'Course approved! The instructor can now publish it live to the website.';
      } else if (body.status === 'REJECTED' || body.action === 'REJECT') {
        targetStatus = 'REJECTED';
        responseMessage = 'Course submission rejected with reviewer feedback.';
      } else if (body.status === 'DRAFT' || body.action === 'UNPUBLISH') {
        targetStatus = 'DRAFT';
        responseMessage = 'Course unpublished back to draft state.';
      } else {
        targetStatus = 'PUBLISHED';
        responseMessage = 'Course approved and published live to landing page!';
      }
    }

    // Update course status
    const updated = await prisma.course.update({
      where: { id: course.id },
      data: {
        status: targetStatus
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        adminEmail: user.email,
        action: targetStatus === 'IN_REVIEW' ? 'SUBMIT_COURSE_REVIEW' : 'PUBLISH_COURSE',
        entity: 'Course',
        entityId: course.id,
        description: `${user.role} set course "${course.title}" status to ${targetStatus}.`
      }
    });

    return NextResponse.json({
      success: true,
      canPublish: true,
      status: targetStatus,
      course: updated,
      checklist,
      message: responseMessage
    });
  } catch (err: any) {
    return handleAuthError(err);
  }
}

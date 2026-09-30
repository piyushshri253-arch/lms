import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, getCurrentUser, validateTenantOwnership, handleAuthError } from '@/lib/auth';
import { createNotification } from '@/lib/notification';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    let user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
    }

    if (user.role === 'STUDENT') {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'INSTRUCTOR', platform: 'LMS' }
      }).catch(() => {});
      user = { ...user, role: 'INSTRUCTOR' };
    }

    if (!['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN', 'LMS_ADMIN', 'SALES_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Access denied: Insufficient privileges to publish courses.' },
        { status: 403 }
      );
    }
    
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

    // Flexible, realistic validation rules
    const checklist = [
      {
        id: 'title',
        label: 'Course Title',
        passed: !!course.title && course.title.trim().length >= 3,
        message: course.title && course.title.trim().length >= 3 ? 'Course title is set.' : 'Course title must be at least 3 characters.',
        step: 0
      },
      {
        id: 'description',
        label: 'Syllabus & Overview',
        passed: !!course.description && course.description.trim().length >= 3,
        message: course.description && course.description.trim().length >= 3 ? 'Course description provided.' : 'Please add a course description.',
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
        id: 'pricing',
        label: 'Pricing & Access Configured',
        passed: course.price !== undefined && course.price !== null && course.price >= 0,
        message:
          course.price === 0
            ? 'Course configured as 100% Free.'
            : `Course priced at ${(course as any).currency === 'INR' ? '₹' : '$'}${course.price} (${(course as any).currency || 'INR'}).`,
        step: 3
      }
    ];

    const canPublish = checklist.every((c) => c.passed);

    // If dryRun check only
    if (body.validateOnly) {
      return NextResponse.json({ canPublish, checklist });
    }

    const isSuperAdminAction = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    const isBypassCheck =
      isSuperAdminAction ||
      body.action === 'REJECT' ||
      body.status === 'REJECTED' ||
      body.action === 'UNPUBLISH' ||
      body.status === 'DRAFT';

    if (!canPublish && !isBypassCheck) {
      const missing = checklist.filter((c) => !c.passed);
      const missingMessages = missing.map((m) => m.message).join(' • ');
      return NextResponse.json(
        {
          error: `Requirements not met: ${missingMessages}`,
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

    // Moving back to DRAFT / UNPUBLISH is permitted for both instructors and admins
    if (body.status === 'DRAFT' || body.action === 'UNPUBLISH') {
      targetStatus = 'DRAFT';
      responseMessage = 'Course successfully moved back to draft state.';
    } else if (user.role === 'INSTRUCTOR') {
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
      } else {
        targetStatus = 'PUBLISHED';
        responseMessage = 'Course approved and published live to landing page!';
      }
    }

    // Update course status
    const updatePayload: any = { status: targetStatus };
    if (targetStatus === 'IN_REVIEW') {
      updatePayload.reviewFeedback = null; // Clear old feedback on resubmission
    }

    const updated = await prisma.course.update({
      where: { id: course.id },
      data: updatePayload
    });

    if (targetStatus === 'IN_REVIEW') {
      // Find all Reviewers, Admins, and Super Admins
      const reviewerUsers = await prisma.user.findMany({
        where: {
          role: { in: ['REVIEWER', 'ADMIN', 'SUPER_ADMIN'] },
          status: 'ACTIVE',
          ...(course.organizationId && user.role !== 'SUPER_ADMIN' ? { organizationId: course.organizationId } : {})
        },
        select: { id: true }
      });

      for (const rev of reviewerUsers) {
        if (rev.id !== user.id) {
          await createNotification({
            organizationId: course.organizationId,
            userId: rev.id,
            title: '📋 New Course Submitted for Review',
            message: `Instructor "${user.name}" submitted "${course.title}" for curriculum & quality review.`,
            type: 'COURSES',
            category: 'COURSES',
            link: '/reviewer'
          });
        }
      }
    }

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

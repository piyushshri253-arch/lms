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

    // Inactive / Active / Unpublish actions
    if (
      body.action === 'MAKE_INACTIVE' ||
      body.action === 'INACTIVE' ||
      body.action === 'DEACTIVATE' ||
      body.status === 'ARCHIVED' ||
      body.status === 'INACTIVE'
    ) {
      targetStatus = 'ARCHIVED';
      responseMessage = 'Course marked as Inactive. It is now unlisted from public enrollment.';
    } else if (
      body.action === 'MAKE_ACTIVE' ||
      body.action === 'ACTIVE' ||
      body.action === 'ACTIVATE'
    ) {
      targetStatus = 'PUBLISHED';
      responseMessage = 'Course marked as Active and published live! 🚀';
    } else if (body.status === 'DRAFT' || body.action === 'UNPUBLISH') {
      targetStatus = 'DRAFT';
      responseMessage = 'Course successfully moved back to draft state.';
    } else if (user.role === 'INSTRUCTOR') {
      // If course is already approved by Super Admin / Auditor, instructor can publish live!
      if (course.status === 'APPROVED') {
        targetStatus = 'PUBLISHED';
        responseMessage = 'Congratulations! Your approved course is now published live on the platform! 🚀';
      } else if (course.status === 'PUBLISHED') {
        // When an already-published course is submitted for approval after editing:
        // Set status to IN_REVIEW so Course Auditor and Admins can review and approve the updated content!
        targetStatus = 'IN_REVIEW';
        responseMessage = 'Course updates submitted for Super Admin & Auditor review! Once approved, your changes will be published live.';
      } else if (course.status === 'IN_REVIEW') {
        return NextResponse.json(
          {
            error: 'This course is currently under review by Super Admin / Course Auditor. Please wait for approval.',
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

    // Notify Instructor by Email if course status was set to APPROVED or REJECTED
    if ((targetStatus === 'APPROVED' || targetStatus === 'REJECTED') && course.instructor?.email) {
      try {
        const { EmailService } = await import('@/lib/email');
        await EmailService.sendCourseReviewDecisionEmail({
          decision: targetStatus,
          course: { id: course.id, title: course.title, category: course.category?.name, slug: course.slug },
          instructor: { id: course.instructor.id, name: course.instructor.name, email: course.instructor.email },
          auditor: { name: user.name, role: user.role },
          feedback: body.reviewFeedback || body.note || null,
          organizationId: course.organizationId
        });
      } catch (emailErr) {
        console.error('[Course Publish Email Error]:', emailErr);
      }
    }

    if (targetStatus === 'IN_REVIEW') {
      // Also update version state to PENDING_REVIEW if course versioning is active
      try {
        const { getCourseVersionState, saveCourseVersionState } = await import('@/lib/course-versioning');
        const verState = await getCourseVersionState(course.id);
        if (verState.stagedSnapshot || verState.status === 'DRAFT_VERSION') {
          await saveCourseVersionState(course.id, {
            status: 'PENDING_REVIEW',
            submittedAt: new Date().toISOString(),
            submittedBy: user.name
          });
        }
      } catch {}

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
            title: course.status === 'PUBLISHED'
              ? '📋 Updated Course Submitted for Review'
              : '📋 New Course Submitted for Review',
            message: `Instructor "${user.name}" submitted "${course.title}" for curriculum & quality review.`,
            type: 'COURSES',
            category: 'COURSES',
            link: `/reviewer/courses/${course.id}`
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

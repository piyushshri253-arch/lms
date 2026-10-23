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

    const finalAssignmentLesson = allLessons.find((l: any) =>
      Boolean(l.isFinalAssignment) ||
      (l.type === 'QUIZ' && /final\s+assignment/i.test(l.title || ''))
    );

    const hasValidFinalAssignment = Boolean(
      course.status === 'APPROVED' ||
      (finalAssignmentLesson &&
      (
        (finalAssignmentLesson.quizData && typeof finalAssignmentLesson.quizData === 'object' && Array.isArray((finalAssignmentLesson.quizData as any).questions) && (finalAssignmentLesson.quizData as any).questions.length > 0) ||
        (typeof finalAssignmentLesson?.quizData === 'string' && finalAssignmentLesson.quizData.includes('"question"'))
      ))
    );

    // Strict Validation: Every quiz in the course must contain an EVEN number of questions (2, 4, 6, ...)
    let oddQuizLessonTitle = '';
    let oddQuizCount = 0;
    if (course.status !== 'APPROVED') {
      for (const l of allLessons) {
        if (l.type === 'QUIZ' || l.quizData) {
          let qCount = 0;
          try {
            if (l.quizData) {
              const parsed = typeof l.quizData === 'string' ? JSON.parse(l.quizData) : l.quizData;
              if (Array.isArray(parsed?.questions)) {
                qCount = parsed.questions.length;
              }
            }
          } catch {}
          if (qCount > 0 && qCount % 2 !== 0) {
            oddQuizLessonTitle = l.title || 'Quiz';
            oddQuizCount = qCount;
            break;
          }
        }
      }
    }

    const quizzesEvenPassed = course.status === 'APPROVED' || !oddQuizLessonTitle;

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
        id: 'final_assignment',
        label: 'Mandatory Final Assessment (Certification Exam)',
        passed: hasValidFinalAssignment,
        message: hasValidFinalAssignment
          ? 'Mandatory Final Assessment configured.'
          : 'Every course requires a Final Assessment before it can be submitted for review or approval.',
        step: 2
      },
      {
        id: 'quiz_even_rule',
        label: 'Quiz Even Questions Rule',
        passed: quizzesEvenPassed,
        message: quizzesEvenPassed
          ? 'All quizzes contain an even number of questions (2, 4, 6, 8, ...).'
          : `"${oddQuizLessonTitle}" has ${oddQuizCount} questions. All quizzes must contain an EVEN number of questions (e.g. 2, 4, 6, 8, 10). Odd counts are not accepted.`,
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
    const isPublishingApprovedCourse =
      course.status === 'APPROVED' ||
      body.action === 'PUBLISH_APPROVED' ||
      body.publishApproved === true ||
      (course.status === 'APPROVED' && (body.publish === true || !body.action));

    const isBypassCheck =
      isSuperAdminAction ||
      isPublishingApprovedCourse ||
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
        // When an already-published course has its version draft submitted for review:
        // KEEP course.status = 'PUBLISHED' in the DB so live students continue learning without disruption!
        targetStatus = 'PUBLISHED';
        responseMessage = 'Course updates submitted for Super Admin & Auditor review! The live version remains active for students.';
      } else if (course.status === 'IN_REVIEW') {
        targetStatus = 'IN_REVIEW';
        responseMessage = 'Course curriculum updates successfully submitted for Super Admin & Auditor review!';
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

    if (targetStatus === 'PUBLISHED') {
      try {
        const { getCourseVersionState, applyApprovedVersionToLiveCourse } = await import('@/lib/course-versioning');
        const verState = await getCourseVersionState(course.id);
        if (verState.stagedSnapshot && (course.status === 'APPROVED' || verState.status === 'PENDING_REVIEW' || verState.status === 'APPROVED' || isPublishingApprovedCourse)) {
          const applied = await applyApprovedVersionToLiveCourse(course.id, user, 'Published live by Instructor/Admin');
          if (applied?.newCourseTitle) {
            responseMessage = `Version ${applied.liveVersionLabel} published live as an independent course ("${applied.newCourseTitle}"). Both versions are active! 🚀`;
          }
        }
      } catch (verErr) {
        console.error('[Publish Version Sync Error]:', verErr);
      }
    }

    // Notify Instructor by Email if course status was set to APPROVED, REJECTED, or CHANGES_REQUESTED
    let instructorUser: { id: string; name: string; email: string } | null = course.instructor;
    if ((!instructorUser || !instructorUser.email) && course.instructorId) {
      instructorUser = await prisma.user.findUnique({
        where: { id: course.instructorId },
        select: { id: true, name: true, email: true }
      });
    }

    if ((targetStatus === 'APPROVED' || targetStatus === 'REJECTED' || targetStatus === 'CHANGES_REQUESTED') && instructorUser?.email) {
      try {
        const { EmailService } = await import('@/lib/email');
        console.log(`[Publish Route] Sending ${targetStatus} email to instructor ${instructorUser.email} for course "${course.title}"`);
        await EmailService.sendCourseReviewDecisionEmail({
          decision: targetStatus === 'CHANGES_REQUESTED' ? 'REQUEST_CHANGES' : targetStatus,
          course: { id: course.id, title: course.title, category: course.category?.name, slug: course.slug },
          instructor: { id: instructorUser.id, name: instructorUser.name, email: instructorUser.email },
          auditor: { name: user.name, role: user.role },
          feedback: body.reviewFeedback || body.note || null,
          organizationId: course.organizationId
        });
      } catch (emailErr) {
        console.error('[Course Publish Email Error]:', emailErr);
      }
    }

    const shouldNotifyReviewers = targetStatus === 'IN_REVIEW' || (course.status === 'PUBLISHED' && targetStatus === 'PUBLISHED' && !isPublishingApprovedCourse);
    if (shouldNotifyReviewers) {
      // Also update version state to PENDING_REVIEW if course versioning is active
      try {
        const { getCourseVersionState, saveCourseVersionState } = await import('@/lib/course-versioning');
        const verState = await getCourseVersionState(course.id);
        if (verState.stagedSnapshot || verState.status === 'DRAFT_VERSION') {
          const nextLabel = verState.pendingVersionLabel || `v${(verState.liveVersionNumber || 1) + 1}.0`;
          await saveCourseVersionState(course.id, {
            status: 'PENDING_REVIEW',
            pendingVersionLabel: nextLabel,
            submittedAt: new Date().toISOString(),
            submittedBy: user.name,
            reviewerFeedback: null
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

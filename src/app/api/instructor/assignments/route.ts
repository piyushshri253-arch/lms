import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notification';
import {
  saveAssignmentMeta,
  AssignmentExtendedMeta,
  AssignmentStatus,
  SubmissionType,
  LateSubmissionPolicy
} from '@/lib/assessment-engine';

export async function GET(req: NextRequest) {
  try {
    const user = await requireTenantRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const courseIdFilter = searchParams.get('courseId') || '';
    const moduleIdFilter = searchParams.get('moduleId') || '';
    const statusFilter = (searchParams.get('status') || '').toUpperCase();

    // Strict RBAC: Instructors can only view assignments for their own courses!
    const courseWhere: any =
      user.role === 'INSTRUCTOR'
        ? { instructorId: user.id }
        : user.organizationId
        ? { organizationId: user.organizationId }
        : {};

    const instructorCourses = await prisma.course.findMany({
      where: courseWhere,
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: { id: true, title: true, type: true, order: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const ownedCourseIds = instructorCourses.map((c) => c.id);

    const assignments = await prisma.assignment.findMany({
      where: {
        courseId: { in: ownedCourseIds }
      },
      include: {
        course: {
          select: { id: true, title: true, slug: true, instructorId: true }
        },
        submissions: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          },
          orderBy: { submittedAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch assignment_meta in bulk
    const metaKeys = assignments.map((a) => `assignment_meta_${a.id}`);
    const metaRows =
      metaKeys.length > 0
        ? await prisma.platformSetting.findMany({
            where: { key: { in: metaKeys } }
          })
        : [];
    const metaMap = new Map<string, AssignmentExtendedMeta>();
    for (const row of metaRows) {
      try {
        metaMap.set(
          row.key.replace('assignment_meta_', ''),
          JSON.parse(row.value) as AssignmentExtendedMeta
        );
      } catch {}
    }

    // Build section/lesson lookup map
    const lessonInfoMap = new Map<
      string,
      { lessonTitle: string; moduleId: string; moduleTitle: string }
    >();
    const sectionInfoMap = new Map<string, string>();
    for (const c of instructorCourses) {
      for (const s of c.sections) {
        sectionInfoMap.set(s.id, s.title);
        for (const l of s.lessons) {
          lessonInfoMap.set(l.id, {
            lessonTitle: l.title,
            moduleId: s.id,
            moduleTitle: s.title
          });
        }
      }
    }

    const formattedAssignments = assignments
      .map((a) => {
        const meta = metaMap.get(a.id);
        const lInfo = a.lessonId ? lessonInfoMap.get(a.lessonId) : null;
        const moduleId = meta?.sectionId || lInfo?.moduleId || '';
        const moduleTitle =
          (moduleId && sectionInfoMap.get(moduleId)) || lInfo?.moduleTitle || 'General Module';
        const lessonTitle = lInfo?.lessonTitle || '';

        // Normalize status: ACTIVE -> PUBLISHED
        const rawStatus = meta?.status || (a.status === 'ACTIVE' ? 'PUBLISHED' : a.status);
        const status: AssignmentStatus =
          rawStatus === 'DRAFT'
            ? 'DRAFT'
            : rawStatus === 'ARCHIVED' || rawStatus === 'CLOSED'
            ? 'ARCHIVED'
            : 'PUBLISHED';

        let allowedFileTypes: string[] = ['pdf', 'zip', 'docx', 'png', 'jpg'];
        try {
          allowedFileTypes = meta?.allowedFileTypes || JSON.parse(a.allowedFormats);
        } catch {}

        const totalSubmissions = a.submissions.length;
        const pendingReviews = a.submissions.filter(
          (s) => s.status === 'SUBMITTED' || s.status === 'UNDER_REVIEW' || s.status === 'LATE'
        ).length;
        const gradedSubmissions = a.submissions.filter(
          (s) => s.status === 'GRADED' && s.score !== null && s.score !== undefined
        );
        const avgMarks =
          gradedSubmissions.length > 0
            ? Number(
                (
                  gradedSubmissions.reduce((acc, s) => acc + Number(s.score || 0), 0) /
                  gradedSubmissions.length
                ).toFixed(1)
              )
            : 0;
        const lateSubmissionsCount = a.submissions.filter((s) => {
          if (s.status === 'LATE') return true;
          if (a.dueDate && new Date(s.submittedAt) > new Date(a.dueDate)) return true;
          return false;
        }).length;

        return {
          id: a.id,
          title: a.title,
          description: a.description,
          instructions: meta?.instructions || a.description,
          courseId: a.courseId,
          courseTitle: a.course.title,
          courseSlug: a.course.slug,
          moduleId,
          moduleTitle,
          lessonId: a.lessonId || '',
          lessonTitle,
          dueDate: a.dueDate ? a.dueDate.toISOString() : null,
          maxMarks: a.maxScore,
          submissionType: meta?.submissionType || 'FILE_AND_TEXT',
          allowedFileTypes,
          maxFileSizeMB: meta?.maxFileSizeMB || Math.round(a.maxFileSizeBytes / (1024 * 1024)),
          allowMultipleSubmissions: meta?.allowMultipleSubmissions ?? true,
          allowResubmission: meta?.allowResubmission ?? true,
          lateSubmissionPolicy: meta?.lateSubmissionPolicy || 'ALLOWED_WITH_PENALTY',
          latePenaltyPercentage: meta?.latePenaltyPercentage ?? 10,
          status,
          submissionsCount: totalSubmissions,
          pendingReviewsCount: pendingReviews,
          lateSubmissionsCount,
          avgMarks,
          avgGradePercent:
            a.maxScore > 0 && gradedSubmissions.length > 0
              ? Number(((avgMarks / a.maxScore) * 100).toFixed(1))
              : 0,
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString()
        };
      })
      .filter((item) => {
        if (courseIdFilter && item.courseId !== courseIdFilter) return false;
        if (moduleIdFilter && item.moduleId !== moduleIdFilter) return false;
        if (statusFilter && statusFilter !== 'ALL' && item.status !== statusFilter) return false;
        if (
          search &&
          !item.title.toLowerCase().includes(search) &&
          !item.courseTitle.toLowerCase().includes(search) &&
          !item.moduleTitle.toLowerCase().includes(search)
        ) {
          return false;
        }
        return true;
      });

    const totalSubmissionsAll = formattedAssignments.reduce(
      (sum, a) => sum + a.submissionsCount,
      0
    );
    const totalPendingReviews = formattedAssignments.reduce(
      (sum, a) => sum + a.pendingReviewsCount,
      0
    );
    const totalLateSubmissions = formattedAssignments.reduce(
      (sum, a) => sum + a.lateSubmissionsCount,
      0
    );
    const withGraded = formattedAssignments.filter((a) => a.avgGradePercent > 0);
    const overallAvgGradePercent =
      withGraded.length > 0
        ? Number(
            (
              withGraded.reduce((sum, a) => sum + a.avgGradePercent, 0) / withGraded.length
            ).toFixed(1)
          )
        : 0;

    return NextResponse.json({
      success: true,
      assignments: formattedAssignments,
      analytics: {
        totalAssignments: formattedAssignments.length,
        publishedAssignments: formattedAssignments.filter((a) => a.status === 'PUBLISHED').length,
        draftAssignments: formattedAssignments.filter((a) => a.status === 'DRAFT').length,
        totalSubmissions: totalSubmissionsAll,
        pendingReviews: totalPendingReviews,
        lateSubmissions: totalLateSubmissions,
        overallAvgGradePercent
      },
      courses: instructorCourses.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        modules: c.sections.map((s) => ({
          id: s.id,
          title: s.title,
          lessons: s.lessons
        }))
      }))
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to load instructor assignments.' },
      { status: 401 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireTenantRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const body = await req.json();

    const {
      title,
      description,
      instructions,
      courseId,
      moduleId,
      lessonId,
      maxMarks = 100,
      dueDate,
      submissionType = 'FILE_AND_TEXT',
      allowedFileTypes = ['pdf', 'zip', 'docx', 'png', 'jpg'],
      maxFileSizeMB = 10,
      allowMultipleSubmissions = true,
      allowResubmission = true,
      lateSubmissionPolicy = 'ALLOWED_WITH_PENALTY',
      latePenaltyPercentage = 10,
      status = 'PUBLISHED'
    } = body;

    // 1. Backend Validation
    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: 'Assignment Title is required.' }, { status: 400 });
    }
    if (!description?.trim() && !instructions?.trim()) {
      return NextResponse.json(
        { error: 'Assignment description and instructions are required.' },
        { status: 400 }
      );
    }
    if (!courseId) {
      return NextResponse.json({ error: 'Course selection is required.' }, { status: 400 });
    }

    const maxScoreNum = Number(maxMarks);
    if (isNaN(maxScoreNum) || maxScoreNum <= 0) {
      return NextResponse.json(
        { error: 'Maximum Marks must be greater than 0.' },
        { status: 400 }
      );
    }

    if (dueDate && isNaN(new Date(dueDate).getTime())) {
      return NextResponse.json({ error: 'Please provide a valid Due Date.' }, { status: 400 });
    }

    // 2. Verify Course Ownership (Prevent IDOR)
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { sections: { orderBy: { order: 'asc' } } }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only create assignments for courses you own.' },
        { status: 403 }
      );
    }

    // 3. Resolve Module & Lesson
    let targetSectionId = moduleId;
    if (!targetSectionId || !course.sections.some((s) => s.id === targetSectionId)) {
      if (course.sections.length > 0) {
        targetSectionId = course.sections[0].id;
      } else {
        const createdSec = await prisma.courseSection.create({
          data: {
            courseId: course.id,
            title: 'Module 1: Assignments & Projects',
            order: 1
          }
        });
        targetSectionId = createdSec.id;
      }
    }

    let targetLessonId = lessonId || null;
    if (!targetLessonId) {
      const createdLesson = await prisma.lesson.create({
        data: {
          sectionId: targetSectionId,
          title: `Assignment: ${String(title).trim()}`,
          type: 'ASSIGNMENT',
          duration: '30:00',
          order: 99,
          isRequired: true
        }
      });
      targetLessonId = createdLesson.id;
    }

    const targetStatus: AssignmentStatus =
      status === 'DRAFT' ? 'DRAFT' : status === 'ARCHIVED' ? 'ARCHIVED' : 'PUBLISHED';
    const dbStatus = targetStatus === 'PUBLISHED' ? 'ACTIVE' : targetStatus;

    const cleanFileTypes = Array.isArray(allowedFileTypes)
      ? allowedFileTypes.map((f: string) => f.toLowerCase().replace(/^\./, ''))
      : ['pdf', 'zip', 'docx', 'png', 'jpg'];

    const maxBytes = Math.max(1, Number(maxFileSizeMB || 10)) * 1024 * 1024;

    const assignment = await prisma.assignment.create({
      data: {
        organizationId: course.organizationId,
        courseId: course.id,
        lessonId: targetLessonId,
        title: String(title).trim(),
        description: String(description || instructions).trim(),
        dueDate: dueDate ? new Date(dueDate) : null,
        maxScore: maxScoreNum,
        allowedFormats: JSON.stringify(cleanFileTypes),
        maxFileSizeBytes: maxBytes,
        status: dbStatus
      }
    });

    const metaPayload: AssignmentExtendedMeta = {
      assignmentId: assignment.id,
      courseId: course.id,
      sectionId: targetSectionId,
      lessonId: targetLessonId,
      instructorId: user.id,
      instructions: String(instructions || description).trim(),
      submissionType: (submissionType as SubmissionType) || 'FILE_AND_TEXT',
      allowedFileTypes: cleanFileTypes,
      maxFileSizeMB: Math.max(1, Number(maxFileSizeMB || 10)),
      allowMultipleSubmissions: !!allowMultipleSubmissions,
      allowResubmission: !!allowResubmission,
      lateSubmissionPolicy:
        (lateSubmissionPolicy as LateSubmissionPolicy) || 'ALLOWED_WITH_PENALTY',
      latePenaltyPercentage: Number(latePenaltyPercentage ?? 10),
      status: targetStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveAssignmentMeta(assignment.id, metaPayload);

    await createAuditLog({
      organizationId: course.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: targetStatus === 'PUBLISHED' ? 'ASSIGNMENT_PUBLISHED' : 'ASSIGNMENT_CREATED',
      entity: 'Assignment',
      entityId: assignment.id,
      description: `Instructor "${user.name}" created assignment "${assignment.title}" (${maxScoreNum} marks, status: ${targetStatus}) in course "${course.title}".`,
      req
    }).catch(() => {});

    // Notify enrolled students if Published
    if (targetStatus === 'PUBLISHED') {
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId: course.id, status: 'ACTIVE' },
        select: { userId: true }
      });

      for (const enr of enrollments) {
        await createNotification({
          organizationId: course.organizationId,
          userId: enr.userId,
          title: 'New Assignment Available 📋',
          message: `A new assignment "${assignment.title}" has been posted in "${course.title}".${
            dueDate ? ` Due: ${new Date(dueDate).toLocaleDateString()}.` : ''
          }`,
          type: 'ASSIGNMENT',
          category: 'COURSES',
          link: `/learn/${course.slug || course.id}`
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      assignmentId: assignment.id,
      message: `Assignment "${assignment.title}" ${
        targetStatus === 'PUBLISHED' ? 'published' : 'saved as draft'
      } successfully!`
    });
  } catch (err: any) {
    console.error('[Create Instructor Assignment Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create assignment.' },
      { status: 500 }
    );
  }
}

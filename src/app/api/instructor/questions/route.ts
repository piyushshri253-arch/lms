import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createNotification } from '@/lib/notification';

interface DiscussionExtendedMeta {
  discussionId: string;
  isResolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  isPinned: boolean;
  category: 'QUESTION' | 'FORUM_DISCUSSION' | 'FAQ';
  bestReplyId: string | null;
  updatedAt: string;
}

const DEFAULT_DISCUSSION_META = (discussionId: string): DiscussionExtendedMeta => ({
  discussionId,
  isResolved: false,
  resolvedAt: null,
  resolvedBy: null,
  isPinned: false,
  category: 'QUESTION',
  bestReplyId: null,
  updatedAt: new Date().toISOString()
});

async function getDiscussionMetaMap(discussionIds: string[]): Promise<Record<string, DiscussionExtendedMeta>> {
  if (discussionIds.length === 0) return {};
  const keys = discussionIds.map((id) => `discussion_meta_${id}`);
  try {
    const rows = await prisma.platformSetting.findMany({
      where: { key: { in: keys } }
    });
    const map: Record<string, DiscussionExtendedMeta> = {};
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.value);
        const id = row.key.replace('discussion_meta_', '');
        map[id] = { ...DEFAULT_DISCUSSION_META(id), ...parsed, discussionId: id };
      } catch {}
    }
    return map;
  } catch {
    return {};
  }
}

async function saveDiscussionMeta(discussionId: string, partial: Partial<DiscussionExtendedMeta>): Promise<DiscussionExtendedMeta> {
  const key = `discussion_meta_${discussionId}`;
  let existing = DEFAULT_DISCUSSION_META(discussionId);
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key } });
    if (row?.value) {
      existing = { ...existing, ...JSON.parse(row.value) };
    }
  } catch {}
  const merged: DiscussionExtendedMeta = {
    ...existing,
    ...partial,
    discussionId,
    updatedAt: new Date().toISOString()
  };
  await prisma.platformSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(merged) },
    create: { key, value: JSON.stringify(merged) }
  });
  return merged;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !['INSTRUCTOR', 'SUPER_ADMIN', 'LMS_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized: Instructor access required.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const courseId = searchParams.get('courseId') || '';
    const lessonId = searchParams.get('lessonId') || '';
    const statusFilter = (searchParams.get('status') || 'ALL').toUpperCase(); // ALL, UNANSWERED, ANSWERED, RESOLVED, PINNED
    const categoryFilter = (searchParams.get('category') || 'ALL').toUpperCase(); // ALL, QUESTION, FORUM_DISCUSSION, FAQ
    const sortBy = searchParams.get('sortBy') || 'newest'; // newest, oldest_unanswered, most_replies

    // 1. Load courses owned by this Instructor / Admin
    const courseWhere: any = {};
    if (user.role === 'INSTRUCTOR') {
      courseWhere.OR = [
        { instructorId: user.id },
        ...(user.organizationId ? [{ organizationId: user.organizationId }] : [])
      ];
    } else if (user.role === 'SUPER_ADMIN') {
      // Super Admin has universal visibility across all courses
    } else if (user.organizationId) {
      courseWhere.organizationId = user.organizationId;
    }

    const instructorCourses = await prisma.course.findMany({
      where: courseWhere,
      select: {
        id: true,
        title: true,
        slug: true,
        thumbnail: true,
        status: true,
        instructorId: true,
        sections: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            order: true,
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                type: true,
                order: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const courseMap = new Map(instructorCourses.map((c) => [c.id, c]));
    const lessonInfoMap = new Map<string, { lessonId: string; lessonTitle: string; lessonType: string; moduleId: string; moduleTitle: string; courseId: string }>();

    for (const c of instructorCourses) {
      for (const sec of c.sections) {
        for (const les of sec.lessons) {
          lessonInfoMap.set(les.id, {
            lessonId: les.id,
            lessonTitle: les.title,
            lessonType: les.type,
            moduleId: sec.id,
            moduleTitle: sec.title,
            courseId: c.id
          });
        }
      }
    }

    const allowedCourseIds = instructorCourses.map((c) => c.id);
    if (allowedCourseIds.length === 0) {
      return NextResponse.json({
        questions: [],
        courses: [],
        stats: {
          totalQuestions: 0,
          unansweredCount: 0,
          answeredPendingCount: 0,
          resolvedCount: 0,
          pinnedCount: 0,
          responseRate: 100
        }
      });
    }

    // 2. Fetch all discussions belonging to Instructor's courses
    const discussionWhere: any = {
      courseId: courseId && allowedCourseIds.includes(courseId) ? courseId : { in: allowedCourseIds }
    };
    if (lessonId === 'GENERAL') {
      discussionWhere.lessonId = null;
    } else if (lessonId) {
      discussionWhere.lessonId = lessonId;
    }

    const discussions = await prisma.discussion.findMany({
      where: discussionWhere,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 3. Load extended metadata for all discussions
    const metaMap = await getDiscussionMetaMap(discussions.map((d) => d.id));

    // 4. Enrich each discussion item
    const enrichedAll = discussions.map((d) => {
      const course = courseMap.get(d.courseId);
      const lessonInfo = d.lessonId ? lessonInfoMap.get(d.lessonId) : null;
      const meta = metaMap[d.id] || DEFAULT_DISCUSSION_META(d.id);

      const hasInstructorReply = d.replies.some(
        (r) =>
          r.userId === course?.instructorId ||
          ['INSTRUCTOR', 'SUPER_ADMIN', 'LMS_ADMIN'].includes(r.user.role)
      );

      // If the thread itself was created by the instructor (e.g., Forum Topic / FAQ), it's not an unanswered student question
      const isInstructorAuthoredThread =
        d.userId === course?.instructorId ||
        ['INSTRUCTOR', 'SUPER_ADMIN', 'LMS_ADMIN'].includes(d.user.role);

      let status: 'UNANSWERED' | 'ANSWERED' | 'RESOLVED' = 'UNANSWERED';
      if (meta.isResolved) {
        status = 'RESOLVED';
      } else if (hasInstructorReply || isInstructorAuthoredThread) {
        status = 'ANSWERED';
      } else {
        status = 'UNANSWERED';
      }

      const lastReply = d.replies.length > 0 ? d.replies[d.replies.length - 1] : null;

      return {
        id: d.id,
        courseId: d.courseId,
        courseTitle: course?.title || 'Course',
        courseThumbnail: course?.thumbnail || '',
        lessonId: d.lessonId || null,
        lessonTitle: lessonInfo?.lessonTitle || 'General Course Forum',
        lessonType: lessonInfo?.lessonType || 'FORUM',
        moduleId: lessonInfo?.moduleId || null,
        moduleTitle: lessonInfo?.moduleTitle || 'Course-Level Discussion',
        student: {
          id: d.user.id,
          name: d.user.name,
          email: d.user.email,
          avatar: d.user.avatar,
          role: d.user.role
        },
        title: d.title || 'Student Question',
        content: d.content,
        category: meta.category || 'QUESTION',
        status,
        isResolved: meta.isResolved,
        resolvedAt: meta.resolvedAt,
        resolvedBy: meta.resolvedBy,
        isPinned: meta.isPinned,
        bestReplyId: meta.bestReplyId,
        hasInstructorReply,
        isInstructorAuthoredThread,
        replyCount: d.replies.length,
        createdAt: d.createdAt,
        lastActivityAt: lastReply ? lastReply.createdAt : d.createdAt,
        replies: d.replies.map((r) => {
          const isInstructor =
            r.userId === course?.instructorId ||
            ['INSTRUCTOR', 'SUPER_ADMIN', 'LMS_ADMIN'].includes(r.user.role);
          return {
            id: r.id,
            userId: r.userId,
            userName: r.user.name,
            userEmail: r.user.email,
            userAvatar: r.user.avatar,
            userRole: r.user.role,
            isInstructor,
            isBestAnswer: meta.bestReplyId === r.id,
            content: r.content,
            createdAt: r.createdAt
          };
        })
      };
    });

    // 5. Calculate KPI Summary Stats across all Instructor discussions
    const totalQuestions = enrichedAll.length;
    const unansweredCount = enrichedAll.filter((q) => q.status === 'UNANSWERED').length;
    const answeredPendingCount = enrichedAll.filter((q) => q.status === 'ANSWERED').length;
    const resolvedCount = enrichedAll.filter((q) => q.status === 'RESOLVED').length;
    const pinnedCount = enrichedAll.filter((q) => q.isPinned).length;
    const responseRate =
      totalQuestions > 0
        ? Math.round(((totalQuestions - unansweredCount) / totalQuestions) * 100)
        : 100;

    // 6. Apply UI filters
    let filtered = enrichedAll.filter((q) => {
      if (statusFilter === 'UNANSWERED' && q.status !== 'UNANSWERED') return false;
      if (statusFilter === 'ANSWERED' && q.status !== 'ANSWERED') return false;
      if (statusFilter === 'RESOLVED' && q.status !== 'RESOLVED') return false;
      if (statusFilter === 'PINNED' && !q.isPinned) return false;

      if (categoryFilter !== 'ALL' && q.category !== categoryFilter) return false;

      if (search) {
        const haystack = [
          q.title,
          q.content,
          q.student.name,
          q.student.email,
          q.courseTitle,
          q.lessonTitle,
          q.moduleTitle,
          ...q.replies.map((r) => `${r.userName} ${r.content}`)
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    // 7. Apply sorting
    filtered = filtered.sort((a, b) => {
      // Always keep pinned items prioritized when viewing ALL or PINNED
      if (statusFilter === 'ALL' && a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      if (sortBy === 'oldest_unanswered') {
        if (a.status === 'UNANSWERED' && b.status !== 'UNANSWERED') return -1;
        if (a.status !== 'UNANSWERED' && b.status === 'UNANSWERED') return 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'most_replies') {
        return b.replyCount - a.replyCount;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      questions: filtered,
      courses: instructorCourses.map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        lessons: c.sections.flatMap((s) =>
          s.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            moduleTitle: s.title,
            type: l.type
          }))
        )
      })),
      stats: {
        totalQuestions,
        unansweredCount,
        answeredPendingCount,
        resolvedCount,
        pinnedCount,
        responseRate
      }
    });
  } catch (err: any) {
    console.error('[GET /api/instructor/questions] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to load student questions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !['INSTRUCTOR', 'SUPER_ADMIN', 'LMS_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized: Instructor access required.' }, { status: 401 });
    }

    const body = await request.json();
    const { action = 'REPLY' } = body;

    if (action === 'REPLY') {
      const { discussionId, content, markResolved = false, markAsBestAnswer = false } = body;
      if (!discussionId || !String(content || '').trim()) {
        return NextResponse.json({ error: 'Discussion ID and reply content are required.' }, { status: 400 });
      }

      const discussion = await prisma.discussion.findUnique({
        where: { id: discussionId },
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      });

      if (!discussion) {
        return NextResponse.json({ error: 'Question thread not found.' }, { status: 404 });
      }

      // Verify ownership of the course
      const course = await prisma.course.findUnique({
        where: { id: discussion.courseId },
        select: { id: true, title: true, instructorId: true, organizationId: true }
      });

      if (!course) {
        return NextResponse.json({ error: 'Associated course not found.' }, { status: 404 });
      }

      if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: You can only reply to questions in courses you own.' },
          { status: 403 }
        );
      }

      const reply = await prisma.discussionReply.create({
        data: {
          discussionId,
          userId: user.id,
          content: String(content).trim()
        },
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true, role: true } }
        }
      });

      // Update extended metadata if markResolved or markAsBestAnswer is requested
      const metaUpdates: Partial<DiscussionExtendedMeta> = {};
      if (markResolved) {
        metaUpdates.isResolved = true;
        metaUpdates.resolvedAt = new Date().toISOString();
        metaUpdates.resolvedBy = user.name;
      }
      if (markAsBestAnswer) {
        metaUpdates.bestReplyId = reply.id;
      }
      const updatedMeta = await saveDiscussionMeta(discussionId, metaUpdates);

      // Notify student who asked the question
      if (discussion.userId !== user.id) {
        await createNotification({
          organizationId: course.organizationId || user.organizationId || null,
          userId: discussion.userId,
          title: markResolved
            ? `Instructor Answered & Resolved Your Question`
            : `Instructor Replied to Your Question`,
          message: `${user.name} replied to "${discussion.title}" in ${course.title}.`,
          type: 'COMMUNITY',
          category: 'COURSES',
          link: `/dashboard/questions?questionId=${discussion.id}`
        });
      }

      await prisma.auditLog.create({
        data: {
          organizationId: course.organizationId || user.organizationId || null,
          adminId: user.id,
          adminEmail: user.email,
          action: 'INSTRUCTOR_QA_REPLY',
          entity: 'Discussion',
          entityId: discussion.id,
          description: `Instructor replied to student question "${discussion.title}" in course "${course.title}"${markResolved ? ' and marked as resolved' : ''}.`
        }
      });

      return NextResponse.json({
        success: true,
        reply: {
          id: reply.id,
          userId: reply.userId,
          userName: reply.user.name,
          userEmail: reply.user.email,
          userAvatar: reply.user.avatar,
          userRole: reply.user.role,
          isInstructor: true,
          isBestAnswer: updatedMeta.bestReplyId === reply.id,
          content: reply.content,
          createdAt: reply.createdAt
        },
        meta: updatedMeta,
        message: markResolved ? 'Reply posted and question marked as resolved!' : 'Instructor reply posted!'
      });
    }

    if (action === 'CREATE_THREAD') {
      const {
        courseId,
        lessonId = null,
        title,
        content,
        category = 'FORUM_DISCUSSION',
        isPinned = true,
        notifyStudents = false
      } = body;

      if (!courseId || !String(title || '').trim() || !String(content || '').trim()) {
        return NextResponse.json(
          { error: 'Course, Title, and Discussion Content are required.' },
          { status: 400 }
        );
      }

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, title: true, instructorId: true, organizationId: true }
      });

      if (!course) {
        return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
      }

      if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: You can only create forum discussions in courses you own.' },
          { status: 403 }
        );
      }

      const discussion = await prisma.discussion.create({
        data: {
          organizationId: course.organizationId || user.organizationId || null,
          courseId: course.id,
          lessonId: lessonId || null,
          userId: user.id,
          title: String(title).trim(),
          content: String(content).trim()
        }
      });

      const meta = await saveDiscussionMeta(discussion.id, {
        category: ['QUESTION', 'FORUM_DISCUSSION', 'FAQ'].includes(category) ? category : 'FORUM_DISCUSSION',
        isPinned: Boolean(isPinned),
        isResolved: category === 'FAQ'
      });

      if (notifyStudents) {
        const enrollments = await prisma.enrollment.findMany({
          where: { courseId: course.id, status: 'ACTIVE' },
          select: { userId: true }
        });
        for (const enr of enrollments) {
          if (enr.userId !== user.id) {
            await createNotification({
              organizationId: course.organizationId || user.organizationId || null,
              userId: enr.userId,
              title: `New Course Discussion: ${discussion.title}`,
              message: `Your instructor ${user.name} posted a new ${category === 'FAQ' ? 'FAQ' : 'discussion thread'} in ${course.title}.`,
              type: 'COMMUNITY',
              category: 'COURSES',
              link: `/learn/${course.id}`
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        discussionId: discussion.id,
        meta,
        message: 'Course discussion thread published!'
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    console.error('[POST /api/instructor/questions] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to process action' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !['INSTRUCTOR', 'SUPER_ADMIN', 'LMS_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized: Instructor access required.' }, { status: 401 });
    }

    const body = await request.json();
    const { action, discussionId, replyId, content, isResolved, isPinned } = body;

    if (!discussionId) {
      return NextResponse.json({ error: 'discussionId is required.' }, { status: 400 });
    }

    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId }
    });

    if (!discussion) {
      return NextResponse.json({ error: 'Discussion thread not found.' }, { status: 404 });
    }

    const course = await prisma.course.findUnique({
      where: { id: discussion.courseId },
      select: { id: true, title: true, instructorId: true, organizationId: true }
    });

    if (!course) {
      return NextResponse.json({ error: 'Associated course not found.' }, { status: 404 });
    }

    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only manage questions in courses you own.' },
        { status: 403 }
      );
    }

    if (action === 'TOGGLE_RESOLVE') {
      const nextResolved = typeof isResolved === 'boolean' ? isResolved : true;
      const updated = await saveDiscussionMeta(discussionId, {
        isResolved: nextResolved,
        resolvedAt: nextResolved ? new Date().toISOString() : null,
        resolvedBy: nextResolved ? user.name : null
      });

      if (nextResolved && discussion.userId !== user.id) {
        await createNotification({
          organizationId: course.organizationId || user.organizationId || null,
          userId: discussion.userId,
          title: 'Your Question Was Marked Resolved',
          message: `Your question "${discussion.title}" in ${course.title} has been marked as resolved by ${user.name}.`,
          type: 'COMMUNITY',
          category: 'COURSES',
          link: `/learn/${course.id}`
        });
      }

      return NextResponse.json({
        success: true,
        meta: updated,
        message: nextResolved ? 'Question marked as resolved.' : 'Question reopened.'
      });
    }

    if (action === 'TOGGLE_PIN') {
      const nextPinned = typeof isPinned === 'boolean' ? isPinned : true;
      const updated = await saveDiscussionMeta(discussionId, {
        isPinned: nextPinned
      });
      return NextResponse.json({
        success: true,
        meta: updated,
        message: nextPinned ? 'Pinned to top of course forum.' : 'Unpinned from course forum.'
      });
    }

    if (action === 'MARK_BEST_REPLY') {
      const updated = await saveDiscussionMeta(discussionId, {
        bestReplyId: replyId || null,
        isResolved: Boolean(replyId)
      });
      return NextResponse.json({
        success: true,
        meta: updated,
        message: replyId ? 'Marked as official solution!' : 'Removed official solution badge.'
      });
    }

    if (action === 'EDIT_REPLY') {
      if (!replyId || !String(content || '').trim()) {
        return NextResponse.json({ error: 'replyId and updated content are required.' }, { status: 400 });
      }
      const existingReply = await prisma.discussionReply.findUnique({ where: { id: replyId } });
      if (!existingReply || existingReply.discussionId !== discussionId) {
        return NextResponse.json({ error: 'Reply not found.' }, { status: 404 });
      }
      if (user.role === 'INSTRUCTOR' && existingReply.userId !== user.id) {
        return NextResponse.json({ error: 'You can only edit your own replies.' }, { status: 403 });
      }
      const updatedReply = await prisma.discussionReply.update({
        where: { id: replyId },
        data: { content: String(content).trim() }
      });
      return NextResponse.json({
        success: true,
        reply: updatedReply,
        message: 'Reply updated.'
      });
    }

    if (action === 'DELETE_REPLY') {
      if (!replyId) {
        return NextResponse.json({ error: 'replyId is required.' }, { status: 400 });
      }
      const existingReply = await prisma.discussionReply.findUnique({ where: { id: replyId } });
      if (!existingReply || existingReply.discussionId !== discussionId) {
        return NextResponse.json({ error: 'Reply not found.' }, { status: 404 });
      }
      await prisma.discussionReply.delete({ where: { id: replyId } });
      return NextResponse.json({
        success: true,
        message: 'Reply deleted.'
      });
    }

    if (action === 'DELETE_THREAD') {
      await prisma.discussion.delete({ where: { id: discussionId } });
      return NextResponse.json({
        success: true,
        message: 'Discussion thread deleted.'
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    console.error('[PATCH /api/instructor/questions] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update question' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createNotification } from '@/lib/notification';

export interface DiscussionExtendedMeta {
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
    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = (searchParams.get('view') || 'MY_QUESTIONS').toUpperCase(); // MY_QUESTIONS | COURSE_FORUM
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const courseId = searchParams.get('courseId') || '';
    const lessonId = searchParams.get('lessonId') || '';
    const statusFilter = (searchParams.get('status') || 'ALL').toUpperCase(); // ALL, PENDING, ANSWERED, RESOLVED

    // 1. Load student's enrolled courses (plus any published courses if student has 0 enrollments yet so they can still select or explore)
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
      select: { courseId: true }
    });

    const enrolledCourseIds = enrollments.map((e) => e.courseId);

    // Also include courses where this student has already posted a discussion
    const studentDiscussions = await prisma.discussion.findMany({
      where: { userId: user.id },
      select: { courseId: true }
    });
    const allRelevantCourseIds = Array.from(
      new Set([...enrolledCourseIds, ...studentDiscussions.map((d) => d.courseId)])
    );

    const courses = await prisma.course.findMany({
      where:
        allRelevantCourseIds.length > 0
          ? { id: { in: allRelevantCourseIds } }
          : { status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        slug: true,
        thumbnail: true,
        instructorId: true,
        instructor: {
          select: { id: true, name: true, avatar: true }
        },
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
      orderBy: { title: 'asc' }
    });

    const courseMap = new Map(courses.map((c) => [c.id, c]));
    const lessonInfoMap = new Map<
      string,
      { lessonId: string; lessonTitle: string; lessonType: string; moduleId: string; moduleTitle: string; courseId: string }
    >();

    for (const c of courses) {
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

    const allowedCourseIds = courses.map((c) => c.id);
    if (allowedCourseIds.length === 0) {
      return NextResponse.json({
        questions: [],
        courses: [],
        stats: {
          myTotalQuestions: 0,
          myPendingCount: 0,
          myAnsweredCount: 0,
          myResolvedCount: 0,
          courseForumCount: 0
        }
      });
    }

    // 2. Fetch discussions across allowed courses
    const whereClause: any = {
      courseId: courseId && allowedCourseIds.includes(courseId) ? courseId : { in: allowedCourseIds }
    };
    if (lessonId === 'GENERAL') {
      whereClause.lessonId = null;
    } else if (lessonId) {
      whereClause.lessonId = lessonId;
    }

    const discussions = await prisma.discussion.findMany({
      where: whereClause,
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

    const metaMap = await getDiscussionMetaMap(discussions.map((d) => d.id));

    const enrichedAll = discussions.map((d) => {
      const course = courseMap.get(d.courseId);
      const lessonInfo = d.lessonId ? lessonInfoMap.get(d.lessonId) : null;
      const meta = metaMap[d.id] || DEFAULT_DISCUSSION_META(d.id);

      const hasInstructorReply = d.replies.some(
        (r) =>
          r.userId === course?.instructorId ||
          ['INSTRUCTOR', 'SUPER_ADMIN', 'LMS_ADMIN'].includes(r.user.role)
      );

      let status: 'PENDING' | 'ANSWERED' | 'RESOLVED' = 'PENDING';
      if (meta.isResolved) {
        status = 'RESOLVED';
      } else if (hasInstructorReply) {
        status = 'ANSWERED';
      } else {
        status = 'PENDING';
      }

      return {
        id: d.id,
        isMine: d.userId === user.id,
        courseId: d.courseId,
        courseTitle: course?.title || 'Course',
        courseThumbnail: course?.thumbnail || '',
        instructorName: course?.instructor?.name || 'Course Instructor',
        lessonId: d.lessonId || null,
        lessonTitle: lessonInfo?.lessonTitle || 'General Course Forum',
        moduleTitle: lessonInfo?.moduleTitle || 'Course-Level Discussion',
        author: {
          id: d.user.id,
          name: d.user.name,
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
        replyCount: d.replies.length,
        createdAt: d.createdAt,
        replies: d.replies.map((r) => {
          const isInstructor =
            r.userId === course?.instructorId ||
            ['INSTRUCTOR', 'SUPER_ADMIN', 'LMS_ADMIN'].includes(r.user.role);
          return {
            id: r.id,
            userId: r.userId,
            userName: r.user.name,
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

    // Stats
    const myItems = enrichedAll.filter((q) => q.isMine);
    const stats = {
      myTotalQuestions: myItems.length,
      myPendingCount: myItems.filter((q) => q.status === 'PENDING').length,
      myAnsweredCount: myItems.filter((q) => q.status === 'ANSWERED').length,
      myResolvedCount: myItems.filter((q) => q.status === 'RESOLVED').length,
      courseForumCount: enrichedAll.length
    };

    // Filter by view (MY_QUESTIONS vs COURSE_FORUM)
    let filtered =
      view === 'MY_QUESTIONS'
        ? enrichedAll.filter((q) => q.isMine)
        : enrichedAll;

    if (statusFilter === 'PENDING') {
      filtered = filtered.filter((q) => q.status === 'PENDING');
    } else if (statusFilter === 'ANSWERED') {
      filtered = filtered.filter((q) => q.status === 'ANSWERED');
    } else if (statusFilter === 'RESOLVED') {
      filtered = filtered.filter((q) => q.status === 'RESOLVED');
    }

    if (search) {
      filtered = filtered.filter((q) => {
        const haystack = [
          q.title,
          q.content,
          q.courseTitle,
          q.lessonTitle,
          q.instructorName,
          ...q.replies.map((r) => `${r.userName} ${r.content}`)
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(search);
      });
    }

    // Sort: Pinned first in COURSE_FORUM, then newest
    filtered = filtered.sort((a, b) => {
      if (view === 'COURSE_FORUM' && a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      questions: filtered,
      courses: courses.map((c) => ({
        id: c.id,
        title: c.title,
        instructorName: c.instructor?.name || 'Course Instructor',
        lessons: c.sections.flatMap((s) =>
          s.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            moduleTitle: s.title,
            type: l.type
          }))
        )
      })),
      stats
    });
  } catch (err: any) {
    console.error('[GET /api/student/questions] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to load questions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    const { action = 'ASK_QUESTION' } = body;

    if (action === 'ASK_QUESTION') {
      const { courseId, lessonId = null, title, content } = body;
      if (!courseId || !String(title || '').trim() || !String(content || '').trim()) {
        return NextResponse.json(
          { error: 'Please select a course and enter your question title and details.' },
          { status: 400 }
        );
      }

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, title: true, instructorId: true, organizationId: true }
      });

      if (!course) {
        return NextResponse.json({ error: 'Selected course not found.' }, { status: 404 });
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

      await saveDiscussionMeta(discussion.id, {
        category: 'QUESTION',
        isResolved: false,
        isPinned: false
      });

      // Notify Course Instructor immediately
      if (course.instructorId && course.instructorId !== user.id) {
        await createNotification({
          organizationId: course.organizationId || user.organizationId || null,
          userId: course.instructorId,
          title: `New Student Doubt in ${course.title}`,
          message: `${user.name} asked: "${discussion.title}"`,
          type: 'COMMUNITY',
          category: 'COURSES',
          link: `/instructor/questions?questionId=${discussion.id}`
        });
      }

      return NextResponse.json({
        success: true,
        questionId: discussion.id,
        message: 'Your question has been sent to the Course Instructor!'
      });
    }

    if (action === 'REPLY') {
      const { discussionId, content } = body;
      if (!discussionId || !String(content || '').trim()) {
        return NextResponse.json({ error: 'Reply content is required.' }, { status: 400 });
      }

      const discussion = await prisma.discussion.findUnique({
        where: { id: discussionId }
      });

      if (!discussion) {
        return NextResponse.json({ error: 'Question thread not found.' }, { status: 404 });
      }

      const course = await prisma.course.findUnique({
        where: { id: discussion.courseId },
        select: { id: true, title: true, instructorId: true, organizationId: true }
      });

      const reply = await prisma.discussionReply.create({
        data: {
          discussionId,
          userId: user.id,
          content: String(content).trim()
        }
      });

      // Notify Course Instructor of the student's follow-up reply
      if (course?.instructorId && course.instructorId !== user.id) {
        await createNotification({
          organizationId: course.organizationId || user.organizationId || null,
          userId: course.instructorId,
          title: `Student Follow-up Reply on "${discussion.title}"`,
          message: `${user.name} replied on "${discussion.title}" in ${course.title}.`,
          type: 'COMMUNITY',
          category: 'COURSES',
          link: `/instructor/questions?questionId=${discussion.id}`
        });
      }

      return NextResponse.json({
        success: true,
        replyId: reply.id,
        message: 'Your reply has been posted!'
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    console.error('[POST /api/student/questions] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to submit question' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    const { discussionId, isResolved } = body;

    if (!discussionId) {
      return NextResponse.json({ error: 'discussionId is required.' }, { status: 400 });
    }

    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId }
    });

    if (!discussion) {
      return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    }

    if (discussion.userId !== user.id) {
      return NextResponse.json(
        { error: 'You can only change resolution status on questions you asked.' },
        { status: 403 }
      );
    }

    const nextResolved = Boolean(isResolved);
    const updated = await saveDiscussionMeta(discussionId, {
      isResolved: nextResolved,
      resolvedAt: nextResolved ? new Date().toISOString() : null,
      resolvedBy: nextResolved ? `${user.name} (Student)` : null
    });

    return NextResponse.json({
      success: true,
      meta: updated,
      message: nextResolved ? 'Marked your question as resolved!' : 'Question reopened for follow-up.'
    });
  } catch (err: any) {
    console.error('[PATCH /api/student/questions] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update status' }, { status: 500 });
  }
}

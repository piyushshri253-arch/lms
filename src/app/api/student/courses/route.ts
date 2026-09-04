import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q')?.toLowerCase() || '';
    const tab = searchParams.get('tab') || 'ALL'; // ALL, IN_PROGRESS, COMPLETED, NOT_STARTED
    const category = searchParams.get('category') || 'ALL';
    const sort = searchParams.get('sort') || 'recent'; // recent, progress_asc, progress_desc, title

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
      include: {
        course: {
          include: {
            instructor: { select: { id: true, name: true, avatar: true } },
            category: { select: { id: true, name: true } },
            certificates: { where: { userId: user.id } },
            sections: {
              orderBy: { order: 'asc' },
              include: {
                lessons: {
                  orderBy: { order: 'asc' },
                  select: { id: true, title: true, duration: true, durationSeconds: true }
                }
              }
            }
          }
        }
      },
      orderBy: { enrolledAt: 'desc' }
    });

    const lessonProgresses = await prisma.lessonProgress.findMany({
      where: { userId: user.id }
    });

    const progressMap = new Map<string, { completed: boolean; updatedAt: Date }>();
    lessonProgresses.forEach((lp) => {
      progressMap.set(lp.lessonId, { completed: lp.completed, updatedAt: lp.updatedAt });
    });

    let coursesList = enrollments.map((enr) => {
      const course = enr.course;
      const allLessons = course.sections.flatMap((s) => s.lessons);
      const totalLessons = allLessons.length;
      let completedLessons = 0;
      let firstUncompletedLesson = allLessons[0] || null;
      let lastAccessedLesson = null;
      let latestAccessTime = 0;

      for (const lesson of allLessons) {
        const prog = progressMap.get(lesson.id);
        if (prog) {
          if (prog.completed) completedLessons++;
          const accessTime = new Date(prog.updatedAt).getTime();
          if (accessTime > latestAccessTime) {
            latestAccessTime = accessTime;
            lastAccessedLesson = lesson;
          }
        }
      }

      for (const lesson of allLessons) {
        const prog = progressMap.get(lesson.id);
        if (!prog || !prog.completed) {
          firstUncompletedLesson = lesson;
          break;
        }
      }

      const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      const status = progressPercent === 100 ? 'COMPLETED' : progressPercent > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';
      const certificate = course.certificates[0] || null;
      const nextLesson = lastAccessedLesson || firstUncompletedLesson || allLessons[0] || null;

      return {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail && course.thumbnail.trim() ? course.thumbnail.trim() : null,
        category: course.category.name,
        instructor: {
          ...course.instructor,
          avatar: course.instructor.avatar && course.instructor.avatar.trim() ? course.instructor.avatar.trim() : null
        },
        durationHours: course.durationHours,
        totalLessons,
        completedLessons,
        progressPercent,
        status,
        enrolledAt: enr.enrolledAt,
        certificateNumber: certificate?.certificateNumber || null,
        nextLesson: nextLesson
          ? {
              id: nextLesson.id,
              title: nextLesson.title,
              duration: nextLesson.duration
            }
          : null
      };
    });

    // Filter by search
    if (search) {
      coursesList = coursesList.filter(
        (c) =>
          c.title.toLowerCase().includes(search) ||
          c.category.toLowerCase().includes(search) ||
          c.instructor.name.toLowerCase().includes(search)
      );
    }

    // Filter by category
    if (category !== 'ALL') {
      coursesList = coursesList.filter((c) => c.category.toLowerCase() === category.toLowerCase());
    }

    // Filter by tab
    if (tab === 'IN_PROGRESS') {
      coursesList = coursesList.filter((c) => c.status === 'IN_PROGRESS');
    } else if (tab === 'COMPLETED') {
      coursesList = coursesList.filter((c) => c.status === 'COMPLETED');
    } else if (tab === 'NOT_STARTED') {
      coursesList = coursesList.filter((c) => c.status === 'NOT_STARTED');
    }

    // Sort
    if (sort === 'progress_asc') {
      coursesList.sort((a, b) => a.progressPercent - b.progressPercent);
    } else if (sort === 'progress_desc') {
      coursesList.sort((a, b) => b.progressPercent - a.progressPercent);
    } else if (sort === 'title') {
      coursesList.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      coursesList.sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime());
    }

    return NextResponse.json({
      courses: coursesList,
      totalCount: enrollments.length,
      counts: {
        all: enrollments.length,
        inProgress: enrollments.filter((e) => {
          const l = e.course.sections.flatMap((s) => s.lessons);
          const c = l.filter((les) => progressMap.get(les.id)?.completed).length;
          const p = l.length > 0 ? Math.round((c / l.length) * 100) : 0;
          return p > 0 && p < 100;
        }).length,
        completed: enrollments.filter((e) => {
          const l = e.course.sections.flatMap((s) => s.lessons);
          const c = l.filter((les) => progressMap.get(les.id)?.completed).length;
          return l.length > 0 && c === l.length;
        }).length,
        notStarted: enrollments.filter((e) => {
          const l = e.course.sections.flatMap((s) => s.lessons);
          const c = l.filter((les) => progressMap.get(les.id)?.completed).length;
          return c === 0;
        }).length
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

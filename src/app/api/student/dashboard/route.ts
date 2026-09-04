import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireTenantAuth();
    const orgId = user.organizationId;

    // 1. Fetch user's full database profile
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        organizationId: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true
          }
        }
      }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Fetch all user enrollments with course details, sections, and lessons
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id },
      include: {
        course: {
          include: {
            instructor: { select: { id: true, name: true, avatar: true } },
            category: { select: { id: true, name: true } },
            sections: {
              orderBy: { order: 'asc' },
              include: {
                lessons: {
                  orderBy: { order: 'asc' },
                  select: { id: true, title: true, duration: true, durationSeconds: true, order: true }
                }
              }
            }
          }
        }
      },
      orderBy: { enrolledAt: 'desc' }
    });

    // 3. Fetch all user lesson progress records
    const lessonProgresses = await prisma.lessonProgress.findMany({
      where: { userId: user.id }
    });

    const progressMap = new Map<string, { completed: boolean; watchedDuration: number; updatedAt: Date }>();
    lessonProgresses.forEach((lp) => {
      progressMap.set(lp.lessonId, {
        completed: lp.completed,
        watchedDuration: lp.watchedDuration,
        updatedAt: lp.updatedAt
      });
    });

    // 4. Fetch user's certificates
    const certificates = await prisma.certificate.findMany({
      where: { userId: user.id },
      include: {
        course: { select: { id: true, title: true, slug: true } }
      },
      orderBy: { issuedAt: 'desc' }
    });

    // 5. Calculate course-level progress
    let totalWatchedSeconds = 0;
    let inProgressCount = 0;
    let completedCoursesCount = 0;

    const continueLearningCourses: any[] = [];
    const enrolledCourseIds = new Set<string>();
    const enrolledCategoryIds = new Set<string>();

    for (const enrollment of enrollments) {
      const course = enrollment.course;
      enrolledCourseIds.add(course.id);
      enrolledCategoryIds.add(course.categoryId);

      const allLessons = course.sections.flatMap((s) => s.lessons);
      const totalLessons = allLessons.length;
      let completedLessons = 0;
      let firstUncompletedLesson = allLessons[0] || null;
      let lastAccessedLesson = null;
      let latestAccessTime = 0;

      for (const lesson of allLessons) {
        const prog = progressMap.get(lesson.id);
        if (prog) {
          totalWatchedSeconds += prog.watchedDuration || 0;
          if (prog.completed) {
            completedLessons++;
          }
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

      const progressPercent =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      if (progressPercent === 100) {
        completedCoursesCount++;
      } else if (progressPercent > 0) {
        inProgressCount++;
      }

      const activeLessonToResume = lastAccessedLesson || firstUncompletedLesson || allLessons[0] || null;

      continueLearningCourses.push({
        id: course.id,
        slug: course.slug,
        title: course.title,
        thumbnail: course.thumbnail && course.thumbnail.trim() ? course.thumbnail.trim() : null,
        category: course.category.name,
        instructor: course.instructor,
        durationHours: course.durationHours,
        totalLessons,
        completedLessons,
        progressPercent,
        status: progressPercent === 100 ? 'COMPLETED' : progressPercent > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
        enrolledAt: enrollment.enrolledAt,
        nextLesson: activeLessonToResume
          ? {
              id: activeLessonToResume.id,
              title: activeLessonToResume.title,
              duration: activeLessonToResume.duration
            }
          : null
      });
    }

    // 6. Calculate Learning Streak
    const activeDates = new Set<string>();
    lessonProgresses.forEach((lp) => {
      activeDates.add(new Date(lp.updatedAt).toISOString().split('T')[0]);
    });
    enrollments.forEach((e) => {
      activeDates.add(new Date(e.enrolledAt).toISOString().split('T')[0]);
    });

    let currentStreak = 0;
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      if (activeDates.has(dateStr)) {
        currentStreak++;
      } else if (i === 0) {
        continue;
      } else {
        break;
      }
    }
    if (currentStreak === 0 && activeDates.size > 0) {
      currentStreak = 1;
    }

    const learningHours = Number((totalWatchedSeconds / 3600 + completedCoursesCount * 1.5).toFixed(1));

    // 7. Recent Activities from DB
    const recentActivities: any[] = [];

    lessonProgresses
      .filter((lp) => lp.completed && lp.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
      .slice(0, 4)
      .forEach((lp) => {
        recentActivities.push({
          id: `lp-${lp.id}`,
          type: 'LESSON_COMPLETED',
          title: 'Lesson Completed',
          description: 'You completed a course lecture module',
          date: lp.completedAt
        });
      });

    certificates.forEach((c) => {
      recentActivities.push({
        id: `cert-${c.id}`,
        type: 'CERTIFICATE_EARNED',
        title: 'Certificate Earned 🎉',
        description: `Verified completion diploma for "${c.course.title}"`,
        date: c.issuedAt,
        certificateNumber: c.certificateNumber
      });
    });

    enrollments.slice(0, 3).forEach((e) => {
      recentActivities.push({
        id: `enr-${e.id}`,
        type: 'COURSE_ENROLLED',
        title: 'Enrolled in Course',
        description: `Started learning "${e.course.title}"`,
        date: e.enrolledAt
      });
    });

    recentActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 8. Recommended Courses scoped to student's organization
    const recommendedCourses = await prisma.course.findMany({
      where: {
        organizationId: orgId || null,
        status: 'PUBLISHED',
        id: { notIn: Array.from(enrolledCourseIds) }
      },
      include: {
        instructor: { select: { name: true, avatar: true } },
        category: { select: { name: true } }
      },
      take: 4,
      orderBy: { bestseller: 'desc' }
    });

    // 9. Announcements scoped to student's organization
    const audienceFilters: any[] = [
      {
        targetAudience: {
          in: ['ALL', 'STUDENTS', 'ALL_STUDENTS', 'all', 'students', 'All', 'All Students', 'Everyone', 'everyone']
        }
      }
    ];

    if (enrolledCourseIds.size > 0) {
      audienceFilters.push({
        courseId: { in: Array.from(enrolledCourseIds) }
      });
    }

    const announcements = await prisma.announcement.findMany({
      where: {
        organizationId: orgId || null,
        status: { in: ['ACTIVE', 'PUBLISHED', 'active', 'published'] },
        OR: audienceFilters
      },
      orderBy: { createdAt: 'desc' },
      take: 6
    });

    return NextResponse.json({
      user: dbUser,
      organization: dbUser.organization,
      stats: {
        totalEnrolled: enrollments.length,
        inProgress: inProgressCount,
        completed: completedCoursesCount,
        certificates: certificates.length,
        learningHours: Math.max(learningHours, enrollments.length * 2.4),
        learningStreak: Math.max(currentStreak, 1)
      },
      continueLearning: continueLearningCourses,
      recentActivity: recentActivities.slice(0, 6),
      recommendedCourses: recommendedCourses.map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        thumbnail: c.thumbnail && c.thumbnail.trim() ? c.thumbnail.trim() : null,
        price: c.price,
        discountPrice: c.discountPrice,
        category: c.category.name,
        instructor: c.instructor,
        durationHours: c.durationHours,
        level: c.level,
        bestseller: c.bestseller
      })),
      announcements
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

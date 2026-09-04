import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * Validates lesson prerequisite fulfillment.
 */
export async function checkLessonPrerequisites(
  userId: string,
  lessonId: string
): Promise<{ allowed: boolean; prerequisiteLessonTitle?: string }> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId }
  });

  if (!lesson || !lesson.prerequisiteLessonId) {
    return { allowed: true };
  }

  const prereqProgress = await prisma.lessonProgress.findUnique({
    where: {
      userId_lessonId: {
        userId,
        lessonId: lesson.prerequisiteLessonId
      }
    }
  });

  if (!prereqProgress || !prereqProgress.completed) {
    const prereqLesson = await prisma.lesson.findUnique({
      where: { id: lesson.prerequisiteLessonId }
    });
    return {
      allowed: false,
      prerequisiteLessonTitle: prereqLesson?.title || 'Previous Lesson'
    };
  }

  return { allowed: true };
}

/**
 * Calculates drip content unlock schedule based on student enrollment date.
 */
export async function calculateDripAvailability(
  userId: string,
  courseId: string,
  lessonId: string
): Promise<{ isUnlocked: boolean; unlockDate?: Date; daysRemaining?: number }> {
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId
      }
    }
  });

  if (!enrollment) {
    return { isUnlocked: false };
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId }
  });

  if (!lesson || !lesson.dripDays || lesson.dripDays <= 0) {
    return { isUnlocked: true };
  }

  const unlockDate = new Date(enrollment.enrolledAt);
  unlockDate.setDate(unlockDate.getDate() + lesson.dripDays);

  const now = new Date();
  const isUnlocked = now >= unlockDate;
  const daysRemaining = isUnlocked
    ? 0
    : Math.ceil((unlockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    isUnlocked,
    unlockDate,
    daysRemaining
  };
}

/**
 * Generates secure short-lived signed playback/download URL tokens.
 */
export function generateSignedMediaUrl(
  resourcePath: string,
  userId: string,
  expiresInSeconds = 3600
): { signedUrl: string; expiresAt: Date } {
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  const secret = process.env.MEDIA_SIGNING_SECRET || 'morena_secure_media_token_2026';
  const payload = `${resourcePath}|${userId}|${expiresAt.getTime()}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  const signedUrl = `${resourcePath}?token=${signature}&expires=${expiresAt.getTime()}&uid=${userId}`;

  return { signedUrl, expiresAt };
}

/**
 * Generates a randomized quiz attempt from a Question Bank or question pool.
 */
export async function generateRandomizedQuiz(
  quizId: string,
  userId: string,
  questionCount?: number
): Promise<{
  attemptId: string;
  startedAt: Date;
  expiresAt: Date | null;
  questions: Array<{
    id: string;
    question: string;
    type: string;
    options: Array<{ id: string; text: string }>;
  }>;
}> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: { options: true }
      }
    }
  });

  if (!quiz) {
    throw new Error('Quiz not found');
  }

  let selectedQuestions = [...quiz.questions];

  // Shuffle questions
  selectedQuestions.sort(() => Math.random() - 0.5);

  if (questionCount && questionCount > 0) {
    selectedQuestions = selectedQuestions.slice(0, questionCount);
  }

  const startedAt = new Date();
  let expiresAt: Date | null = null;
  if (quiz.timeLimitMinutes && quiz.timeLimitMinutes > 0) {
    expiresAt = new Date(startedAt.getTime() + quiz.timeLimitMinutes * 60 * 1000);
  }

  // Create attempt
  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId: quiz.id,
      userId,
      score: 0,
      pointsEarned: 0,
      pointsTotal: selectedQuestions.length,
      passed: false
    }
  });

  // Prepare sanitized questions for student
  const sanitizedQuestions = selectedQuestions.map((q) => {
    const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
    return {
      id: q.id,
      question: q.question,
      type: q.type,
      options: shuffledOptions.map((opt) => ({ id: opt.id, text: opt.text }))
    };
  });

  return {
    attemptId: attempt.id,
    startedAt,
    expiresAt,
    questions: sanitizedQuestions
  };
}

/**
 * Awards gamification badges, XP, and updates learning streaks.
 */
export async function awardBadgeAndXP(
  organizationId: string,
  userId: string,
  criteriaType: string,
  xpEarned: number = 50
): Promise<{ newBadges: any[]; currentStreak: number; totalXP: number }> {
  // Update streak
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, xpPoints: true, currentStreak: true, longestStreak: true, lastLearningDate: true }
  });

  if (!user) return { newBadges: [], currentStreak: 0, totalXP: 0 };

  const now = new Date();
  let currentStreak = user.currentStreak || 0;
  let longestStreak = user.longestStreak || 0;

  if (user.lastLearningDate) {
    const lastDate = new Date(user.lastLearningDate);
    const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak += 1;
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
  } else {
    currentStreak = 1;
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      xpPoints: { increment: xpEarned },
      currentStreak,
      longestStreak,
      lastLearningDate: now
    }
  });

  // Find matching badges
  const availableBadges = await prisma.badge.findMany({
    where: {
      organizationId,
      criteriaType
    }
  });

  const newBadges: any[] = [];
  for (const badge of availableBadges) {
    const existing = await prisma.userBadge.findUnique({
      where: {
        badgeId_userId: {
          badgeId: badge.id,
          userId
        }
      }
    });

    if (!existing) {
      const awarded = await prisma.userBadge.create({
        data: {
          badgeId: badge.id,
          userId
        },
        include: { badge: true }
      });
      newBadges.push(awarded);
    }
  }

  return {
    newBadges,
    currentStreak: updatedUser.currentStreak,
    totalXP: updatedUser.xpPoints
  };
}

/**
 * Evaluates course completion with weighted activities and issues verifiable certificates.
 */
export async function evaluateCourseWeightedCompletion(
  userId: string,
  courseId: string
): Promise<{
  isCompleted: boolean;
  completionPercentage: number;
  completedLessons: number;
  totalLessons: number;
  certificateNumber?: string;
}> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      organization: true,
      sections: {
        include: {
          lessons: {
            where: { isPublished: true, isRequired: true }
          }
        }
      }
    }
  });

  if (!course) {
    throw new Error('Course not found');
  }

  const allRequiredLessons = course.sections.flatMap((s) => s.lessons);
  const totalLessons = allRequiredLessons.length;

  if (totalLessons === 0) {
    return { isCompleted: true, completionPercentage: 100, completedLessons: 0, totalLessons: 0 };
  }

  const completedProgresses = await prisma.lessonProgress.findMany({
    where: {
      userId,
      lessonId: { in: allRequiredLessons.map((l) => l.id) },
      completed: true
    }
  });

  const completedLessons = completedProgresses.length;
  const completionPercentage = Math.round((completedLessons / totalLessons) * 100);
  const isCompleted = completedLessons === totalLessons;

  let certificateNumber: string | undefined = undefined;

  if (isCompleted) {
    // Transition Enrollment to COMPLETED
    await prisma.enrollment.updateMany({
      where: { userId, courseId },
      data: { status: 'COMPLETED' }
    });

    // Check or generate Certificate
    const existingCert = await prisma.certificate.findUnique({
      where: {
        userId_courseId: { userId, courseId }
      }
    });

    if (!existingCert) {
      const year = new Date().getFullYear();
      const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
      const certNumber = `MT-${year}-${randomHex}`;

      const cert = await prisma.certificate.create({
        data: {
          organizationId: course.organizationId,
          userId,
          courseId,
          certificateNumber: certNumber,
          status: 'VALID',
          metadata: JSON.stringify({
            courseTitle: course.title,
            organizationName: course.organization?.name,
            completedAt: new Date()
          })
        }
      });
      certificateNumber = cert.certificateNumber;

      // Award course completion badge and XP
      if (course.organizationId) {
        await awardBadgeAndXP(course.organizationId, userId, 'COURSE_COMPLETED', 500);
      }
    } else {
      certificateNumber = existingCert.certificateNumber;
    }
  }

  return {
    isCompleted,
    completionPercentage,
    completedLessons,
    totalLessons,
    certificateNumber
  };
}

/**
 * Computes step-by-step lesson drop-off analytics.
 */
export async function calculateDropOffAnalytics(courseId: string): Promise<{
  totalEnrolled: number;
  funnel: Array<{ lessonId: string; title: string; completedCount: number; completionRate: number }>;
}> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            where: { isPublished: true },
            orderBy: { order: 'asc' }
          }
        }
      },
      enrollments: true
    }
  });

  if (!course) return { totalEnrolled: 0, funnel: [] };

  const totalEnrolled = course.enrollments.length;
  const lessons = course.sections.flatMap((s) => s.lessons);
  const funnel: Array<{ lessonId: string; title: string; completedCount: number; completionRate: number }> = [];

  for (const lesson of lessons) {
    const completedCount = await prisma.lessonProgress.count({
      where: { lessonId: lesson.id, completed: true }
    });

    const completionRate = totalEnrolled > 0 ? Math.round((completedCount / totalEnrolled) * 100) : 0;

    funnel.push({
      lessonId: lesson.id,
      title: lesson.title,
      completedCount,
      completionRate
    });
  }

  return {
    totalEnrolled,
    funnel
  };
}

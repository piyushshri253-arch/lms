import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notification';
import {
  getQuizMeta,
  saveAttemptMeta,
  evaluateQuizSubmissionServerSide,
  normalizeQuestionType,
  AttemptStatus
} from '@/lib/assessment-engine';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const body = await request.json();

    const {
      answers = [],
      servedQuestionIds = [],
      startedAt: clientStartedAt,
      autoSubmitted = false,
      isPreview = false
    } = body;

    // 1. Fetch Quiz with Questions and correct options
    const quiz = await prisma.quiz.findFirst({
      where: {
        OR: [{ id }, { lessonId: id }]
      },
      include: {
        lesson: {
          include: {
            section: {
              include: {
                course: {
                  include: {
                    sections: {
                      include: { lessons: true }
                    }
                  }
                }
              }
            }
          }
        },
        questions: {
          include: { options: true },
          orderBy: { order: 'asc' }
        },
        attempts: {
          where: { userId: user.id },
          orderBy: { submittedAt: 'asc' }
        }
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const course = quiz.lesson.section.course;
    const meta = await getQuizMeta(quiz.id);

    // Determine exact questions served in this attempt (for reproducible random question bank scoring!)
    const targetQuestions =
      Array.isArray(servedQuestionIds) && servedQuestionIds.length > 0
        ? quiz.questions.filter((q) => servedQuestionIds.includes(q.id))
        : quiz.questions;

    const questionsForEval = (targetQuestions.length > 0 ? targetQuestions : quiz.questions).map(
      (q) => {
        const qm = meta?.questionMeta?.[q.id];
        return {
          id: q.id,
          question: q.question,
          type: qm?.questionType || normalizeQuestionType(q.type),
          explanation: q.explanation,
          marks: qm?.marks && Number(qm.marks) > 0 ? Number(qm.marks) : 1,
          options: q.options.map((o) => ({
            id: o.id,
            text: o.text,
            isCorrect: o.isCorrect
          }))
        };
      }
    );

    // 2. Evaluate server-side
    const evalResult = evaluateQuizSubmissionServerSide({
      questions: questionsForEval,
      studentAnswers: answers,
      passingPercentage: quiz.passingScore,
      multipleAnswerRule: meta?.multipleAnswerScoringRule || 'EXACT_MATCH'
    });

    // If Instructor Preview Mode -> return evaluation result immediately WITHOUT saving a student attempt!
    if (isPreview) {
      return NextResponse.json({
        success: true,
        isPreview: true,
        attempt: {
          id: 'preview_attempt',
          score: evalResult.percentage,
          percentage: evalResult.percentage,
          pointsEarned: evalResult.obtainedMarks,
          pointsTotal: evalResult.totalMarks,
          obtainedMarks: evalResult.obtainedMarks,
          totalMarks: evalResult.totalMarks,
          passed: evalResult.passed,
          passingScore: quiz.passingScore,
          questionBreakdown: evalResult.questionBreakdown
        }
      });
    }

    // 3. Verify student has active enrollment or admin/instructor privileges
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: user.id,
        courseId: course.id,
        status: { in: ['ACTIVE', 'COMPLETED'] }
      }
    });

    const isPrivileged =
      user.role === 'SUPER_ADMIN' ||
      (user.role === 'ADMIN' && course.organizationId === user.organizationId) ||
      course.instructorId === user.id;

    if (!enrollment && !isPrivileged) {
      return NextResponse.json(
        { error: 'Enrollment required: You must be enrolled in this course to submit quiz attempts.' },
        { status: 403 }
      );
    }

    // 4. Check attempt limit
    const allowRetake = meta?.allowRetake ?? quiz.maxAttempts !== 1;
    const effectiveMaxAttempts = !allowRetake ? 1 : quiz.maxAttempts;
    if (
      effectiveMaxAttempts > 0 &&
      quiz.attempts.length >= effectiveMaxAttempts &&
      !isPrivileged
    ) {
      return NextResponse.json(
        { error: `Maximum attempt limit (${effectiveMaxAttempts}) reached for this quiz.` },
        { status: 400 }
      );
    }

    // 5. Server-Side Timer & Duration Validation
    const submittedAtDate = new Date();
    const startedAtDate =
      clientStartedAt && !isNaN(new Date(clientStartedAt).getTime())
        ? new Date(clientStartedAt)
        : new Date(submittedAtDate.getTime() - 60 * 1000);

    const durationSeconds = Math.max(
      1,
      Math.round((submittedAtDate.getTime() - startedAtDate.getTime()) / 1000)
    );

    let attemptStatus: AttemptStatus = autoSubmitted ? 'AUTO_SUBMITTED' : 'GRADED';
    if (quiz.timeLimitMinutes && quiz.timeLimitMinutes > 0) {
      const maxAllowedSeconds = quiz.timeLimitMinutes * 60 + 30; // 30s network buffer
      if (durationSeconds > maxAllowedSeconds) {
        attemptStatus = 'AUTO_SUBMITTED';
      }
    }

    const attemptNumber = quiz.attempts.length + 1;

    // 6. Save QuizAttempt and Answers in PostgreSQL
    const attempt = await prisma.$transaction(async (tx) => {
      const newAttempt = await tx.quizAttempt.create({
        data: {
          quizId: quiz.id,
          userId: user.id,
          score: evalResult.percentage,
          pointsEarned: Math.round(evalResult.obtainedMarks),
          pointsTotal: Math.round(evalResult.totalMarks),
          passed: evalResult.passed,
          submittedAt: submittedAtDate
        }
      });

      for (const ans of evalResult.questionBreakdown) {
        await tx.quizAnswer.create({
          data: {
            attemptId: newAttempt.id,
            questionId: ans.questionId,
            selectedOptionIds: JSON.stringify(ans.selectedOptionIds),
            isCorrect: ans.isCorrect
          }
        });
      }

      // If passed, mark this quiz lesson as completed
      if (evalResult.passed) {
        await tx.lessonProgress.upsert({
          where: {
            userId_lessonId: {
              userId: user.id,
              lessonId: quiz.lessonId
            }
          },
          create: {
            userId: user.id,
            lessonId: quiz.lessonId,
            completed: true,
            completedAt: new Date()
          },
          update: {
            completed: true,
            completedAt: new Date()
          }
        });
      }

      return newAttempt;
    });

    // 7. Save Detailed Attempt Metadata (Reproducible Random Questions + Marks + Timestamps)
    await saveAttemptMeta(attempt.id, {
      attemptId: attempt.id,
      quizId: quiz.id,
      userId: user.id,
      attemptNumber,
      status: attemptStatus,
      startedAt: startedAtDate.toISOString(),
      submittedAt: submittedAtDate.toISOString(),
      durationSeconds,
      totalMarks: evalResult.totalMarks,
      obtainedMarks: evalResult.obtainedMarks,
      percentage: evalResult.percentage,
      passed: evalResult.passed,
      servedQuestionIds: questionsForEval.map((q) => q.id),
      questionBreakdown: evalResult.questionBreakdown
    });

    // 8. Notify Instructor & Student
    if (course.instructorId && course.instructorId !== user.id) {
      await createNotification({
        organizationId: course.organizationId,
        userId: course.instructorId,
        title: `Quiz Attempt Submitted: ${quiz.title}`,
        message: `${user.name} completed Attempt #${attemptNumber} on "${quiz.title}" — Score: ${evalResult.obtainedMarks}/${evalResult.totalMarks} (${evalResult.percentage}% — ${
          evalResult.passed ? 'PASSED' : 'FAILED'
        }).`,
        type: 'QUIZ',
        category: 'STUDENTS',
        link: `/instructor/quizzes/${quiz.id}/results`
      }).catch(() => {});
    }

    await createNotification({
      organizationId: course.organizationId,
      userId: user.id,
      title: `Quiz Result: ${evalResult.passed ? 'Passed 🎉' : 'Completed'}`,
      message: `You scored ${evalResult.obtainedMarks}/${evalResult.totalMarks} (${evalResult.percentage}%) on "${quiz.title}".`,
      type: 'QUIZ',
      category: 'COURSES',
      link: `/learn/${course.slug || course.id}`
    }).catch(() => {});

    // 9. Check Course Completion & Auto-Issue Certificate
    let courseCompleted = false;
    let certificateIssued: any = null;

    if (evalResult.passed && enrollment) {
      const allLessons = course.sections.flatMap((s) => s.lessons);
      const completedProgress = await prisma.lessonProgress.findMany({
        where: {
          userId: user.id,
          completed: true,
          lesson: {
            section: { courseId: course.id }
          }
        }
      });

      const completedLessonIds = new Set(completedProgress.map((p) => p.lessonId));
      const allRequiredCompleted = allLessons.every(
        (l) => !l.isRequired || completedLessonIds.has(l.id)
      );

      if (allRequiredCompleted) {
        courseCompleted = true;

        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { status: 'COMPLETED' }
        });

        const year = new Date().getFullYear();
        const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
        const certNumber = `MT-${year}-${randomHex}`;

        certificateIssued = await prisma.certificate.upsert({
          where: {
            userId_courseId: {
              userId: user.id,
              courseId: course.id
            }
          },
          create: {
            organizationId: course.organizationId,
            userId: user.id,
            courseId: course.id,
            certificateNumber: certNumber,
            status: 'VALID',
            metadata: JSON.stringify({
              studentName: user.name,
              courseTitle: course.title,
              finalScore: `${evalResult.percentage}%`
            })
          },
          update: { status: 'VALID' }
        });
      }
    }

    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt.id,
        attemptNumber,
        status: attemptStatus,
        startedAt: startedAtDate.toISOString(),
        submittedAt: submittedAtDate.toISOString(),
        durationSeconds,
        score: evalResult.percentage,
        percentage: evalResult.percentage,
        pointsEarned: evalResult.obtainedMarks,
        pointsTotal: evalResult.totalMarks,
        obtainedMarks: evalResult.obtainedMarks,
        totalMarks: evalResult.totalMarks,
        passed: evalResult.passed,
        passingScore: quiz.passingScore,
        showResultImmediately: meta?.showResultImmediately ?? true,
        showCorrectAnswers: meta?.showCorrectAnswers ?? true,
        questionBreakdown:
          meta?.showCorrectAnswers === false ? [] : evalResult.questionBreakdown,
        courseCompleted,
        certificate: certificateIssued
          ? {
              certificateNumber: certificateIssued.certificateNumber,
              url: `/certificate/${certificateIssued.certificateNumber}`
            }
          : null
      }
    });
  } catch (err: any) {
    console.error('[Quiz Attempt Error]:', err);
    return NextResponse.json({ error: err.message || 'Submission failed' }, { status: 500 });
  }
}

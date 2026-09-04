import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    const body = await request.json();

    const { answers = [] } = body; // Array of { questionId: string, selectedOptionIds: string[] }

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
          include: { options: true }
        },
        attempts: {
          where: { userId: user.id }
        }
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const course = quiz.lesson.section.course;

    // 2. Verify student has active enrollment or admin/instructor privileges
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

    // 3. Check attempt limit
    if (quiz.maxAttempts > 0 && quiz.attempts.length >= quiz.maxAttempts && !isPrivileged) {
      return NextResponse.json(
        { error: `Maximum attempt limit (${quiz.maxAttempts}) reached for this quiz.` },
        { status: 400 }
      );
    }

    // 4. Server-Side Scoring Engine
    let pointsEarned = 0;
    const pointsTotal = quiz.questions.length;
    const evaluatedAnswers: { questionId: string; selectedOptionIds: string[]; isCorrect: boolean }[] = [];

    for (const q of quiz.questions) {
      const studentAns = answers.find((a: any) => a.questionId === q.id);
      const selected = Array.isArray(studentAns?.selectedOptionIds)
        ? studentAns.selectedOptionIds
        : studentAns?.selectedOptionId
        ? [studentAns.selectedOptionId]
        : [];

      const correctOptionIds = q.options.filter((opt) => opt.isCorrect).map((opt) => opt.id);

      // Check if exact match of correct options
      const isCorrect =
        selected.length === correctOptionIds.length &&
        selected.every((id: string) => correctOptionIds.includes(id)) &&
        correctOptionIds.every((id) => selected.includes(id));

      if (isCorrect) {
        pointsEarned++;
      }

      evaluatedAnswers.push({
        questionId: q.id,
        selectedOptionIds: selected,
        isCorrect
      });
    }

    const scorePercent = pointsTotal > 0 ? Number(((pointsEarned / pointsTotal) * 100).toFixed(1)) : 100.0;
    const passed = scorePercent >= quiz.passingScore;

    // 5. Save QuizAttempt and Answers
    const attempt = await prisma.$transaction(async (tx) => {
      const newAttempt = await tx.quizAttempt.create({
        data: {
          quizId: quiz.id,
          userId: user.id,
          score: scorePercent,
          pointsEarned,
          pointsTotal,
          passed
        }
      });

      for (const ans of evaluatedAnswers) {
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
      if (passed) {
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

    // 6. Check Course Completion & Auto-Issue Certificate
    let courseCompleted = false;
    let certificateIssued: any = null;

    if (passed && enrollment) {
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
      const allRequiredCompleted = allLessons.every((l) => !l.isRequired || completedLessonIds.has(l.id));

      if (allRequiredCompleted) {
        courseCompleted = true;

        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: 'COMPLETED'
          }
        });

        // Generate unique certificate ID
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
              finalScore: `${scorePercent}%`
            })
          },
          update: {
            status: 'VALID'
          }
        });

        await createAuditLog({
          organizationId: course.organizationId,
          actorId: user.id,
          actorEmail: user.email,
          action: 'COURSE_COMPLETED',
          entity: 'Certificate',
          entityId: certificateIssued.id,
          description: `Student "${user.name}" finished all modules in "${course.title}". Certificate ${certNumber} generated.`
        });
      }
    }

    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt.id,
        score: scorePercent,
        pointsEarned,
        pointsTotal,
        passed,
        passingScore: quiz.passingScore,
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

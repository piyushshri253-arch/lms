import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notification';
import {
  getQuizMeta,
  saveQuizMeta,
  getAttemptMeta,
  normalizeQuestionType,
  toPrismaQuestionType,
  QuizExtendedMeta,
  QuizStatus,
  ResultPolicy,
  MultipleAnswerScoringRule
} from '@/lib/assessment-engine';

async function fetchAndAuthorizeQuiz(quizId: string, user: any) {
  const quiz = await prisma.quiz.findFirst({
    where: {
      OR: [{ id: quizId }, { lessonId: quizId }]
    },
    include: {
      lesson: {
        include: {
          section: {
            include: {
              course: true
            }
          }
        }
      },
      questions: {
        include: { options: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' }
      },
      attempts: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true }
          },
          answers: true
        },
        orderBy: { submittedAt: 'desc' }
      }
    }
  });

  if (!quiz) {
    return { error: 'Quiz not found.', status: 404, quiz: null };
  }

  const course = quiz.lesson.section.course;
  if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) {
    return {
      error: 'Forbidden: You do not have permission to access another Instructor’s quiz.',
      status: 403,
      quiz: null
    };
  }

  return { error: null, status: 200, quiz, course, section: quiz.lesson.section };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTenantRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const { id } = await params;

    const authCheck = await fetchAndAuthorizeQuiz(id, user);
    if (authCheck.error || !authCheck.quiz) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { quiz, course, section } = authCheck;
    const meta = await getQuizMeta(quiz.id);

    // Format questions with marks & image metadata
    let calculatedTotalMarks = 0;
    const formattedQuestions = quiz.questions.map((q, idx) => {
      const qm = meta?.questionMeta?.[q.id];
      const marks = qm?.marks && Number(qm.marks) > 0 ? Number(qm.marks) : 1;
      calculatedTotalMarks += marks;
      const qType = qm?.questionType || normalizeQuestionType(q.type);

      // Question-wise performance across all attempts
      const totalAnswersForQ = quiz.attempts.reduce((count, att) => {
        const hasAns = att.answers.some((a) => a.questionId === q.id);
        return count + (hasAns ? 1 : 0);
      }, 0);
      const correctAnswersForQ = quiz.attempts.reduce((count, att) => {
        const isCorr = att.answers.some((a) => a.questionId === q.id && a.isCorrect);
        return count + (isCorr ? 1 : 0);
      }, 0);

      return {
        id: q.id,
        question: q.question,
        type: qType,
        marks,
        explanation: q.explanation || '',
        imageUrl: qm?.imageUrl || '',
        difficulty: qm?.difficulty || 'MEDIUM',
        topic: qm?.topic || 'General',
        order: q.order || idx + 1,
        accuracyPercent:
          totalAnswersForQ > 0
            ? Number(((correctAnswersForQ / totalAnswersForQ) * 100).toFixed(1))
            : 0,
        totalResponses: totalAnswersForQ,
        options: q.options.map((opt, oIdx) => ({
          id: opt.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
          order: opt.order || oIdx + 1
        }))
      };
    });

    // Fetch attempt metadata for all attempts
    const attemptMetaKeys = quiz.attempts.map((a) => `attempt_meta_${a.id}`);
    const attemptMetaRows =
      attemptMetaKeys.length > 0
        ? await prisma.platformSetting.findMany({
            where: { key: { in: attemptMetaKeys } }
          })
        : [];
    const attemptMetaMap = new Map<string, any>();
    for (const row of attemptMetaRows) {
      try {
        attemptMetaMap.set(row.key.replace('attempt_meta_', ''), JSON.parse(row.value));
      } catch {}
    }

    // Track student attempt numbers chronologically per student
    const studentAttemptCounters: Record<string, number> = {};
    const chronologicalAttempts = [...quiz.attempts].sort(
      (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    );
    const attemptNumberById: Record<string, number> = {};
    for (const att of chronologicalAttempts) {
      studentAttemptCounters[att.userId] = (studentAttemptCounters[att.userId] || 0) + 1;
      attemptNumberById[att.id] = studentAttemptCounters[att.userId];
    }

    const formattedAttempts = quiz.attempts.map((att) => {
      const aMeta = attemptMetaMap.get(att.id);
      const obtainedMarks =
        aMeta?.obtainedMarks !== undefined ? Number(aMeta.obtainedMarks) : att.pointsEarned;
      const maxMarks =
        aMeta?.totalMarks !== undefined
          ? Number(aMeta.totalMarks)
          : calculatedTotalMarks || att.pointsTotal;
      const durationSeconds = aMeta?.durationSeconds || 0;

      // Build detailed breakdown per question if not already stored in aMeta
      const questionBreakdown =
        aMeta?.questionBreakdown ||
        formattedQuestions.map((fq) => {
          const ansRecord = att.answers.find((a) => a.questionId === fq.id);
          let selectedOptionIds: string[] = [];
          if (ansRecord?.selectedOptionIds) {
            try {
              selectedOptionIds = JSON.parse(ansRecord.selectedOptionIds);
            } catch {
              selectedOptionIds = [ansRecord.selectedOptionIds];
            }
          }
          const correctOptionIds = fq.options.filter((o) => o.isCorrect).map((o) => o.id);
          const isCorrect = ansRecord ? ansRecord.isCorrect : false;

          return {
            questionId: fq.id,
            questionText: fq.question,
            questionType: fq.type,
            selectedOptionIds,
            correctOptionIds,
            isCorrect,
            marksAwarded: isCorrect ? fq.marks : 0,
            maxMarks: fq.marks,
            explanation: fq.explanation,
            options: fq.options
          };
        });

      return {
        id: att.id,
        studentId: att.userId,
        studentName: att.user?.name || 'Student',
        studentEmail: att.user?.email || '',
        studentAvatar: att.user?.avatar || null,
        attemptNumber: aMeta?.attemptNumber || attemptNumberById[att.id] || 1,
        startedAt: aMeta?.startedAt || new Date(att.submittedAt.getTime() - 600000).toISOString(),
        submittedAt: att.submittedAt.toISOString(),
        durationSeconds,
        obtainedMarks,
        totalMarks: maxMarks,
        percentage: Number(att.score.toFixed(1)),
        passed: att.passed,
        status: aMeta?.status || 'GRADED',
        servedQuestionIds: aMeta?.servedQuestionIds || formattedQuestions.map((q) => q.id),
        questionBreakdown: questionBreakdown.map((qb: any) => {
          const matchQ = formattedQuestions.find((fq) => fq.id === qb.questionId);
          return {
            ...qb,
            options: matchQ?.options || qb.options || []
          };
        })
      };
    });

    const totalAttemptsCount = formattedAttempts.length;
    const passedCount = formattedAttempts.filter((a) => a.passed).length;
    const avgPercentage =
      totalAttemptsCount > 0
        ? Number(
            (
              formattedAttempts.reduce((acc, a) => acc + a.percentage, 0) / totalAttemptsCount
            ).toFixed(1)
          )
        : 0;
    const avgCompletionSeconds =
      totalAttemptsCount > 0
        ? Math.round(
            formattedAttempts.reduce((acc, a) => acc + (a.durationSeconds || 300), 0) /
              totalAttemptsCount
          )
        : 0;

    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description || '',
        courseId: course.id,
        courseTitle: course.title,
        courseSlug: course.slug,
        moduleId: section.id,
        moduleTitle: section.title,
        lessonId: quiz.lesson.id,
        lessonTitle: quiz.lesson.title,
        totalMarks: calculatedTotalMarks || meta?.totalMarks || 0,
        passingPercentage: quiz.passingScore,
        timeLimitMinutes: quiz.timeLimitMinutes,
        attemptsAllowed: quiz.maxAttempts,
        randomizeQuestions: meta?.randomizeQuestions ?? false,
        questionBankSize: meta?.questionBankSize ?? formattedQuestions.length,
        questionsPerAttempt: meta?.questionsPerAttempt ?? formattedQuestions.length,
        showResultImmediately: meta?.showResultImmediately ?? true,
        showCorrectAnswers: meta?.showCorrectAnswers ?? true,
        allowRetake: meta?.allowRetake ?? quiz.maxAttempts !== 1,
        resultPolicy: meta?.resultPolicy || 'HIGHEST_SCORE',
        multipleAnswerScoringRule: meta?.multipleAnswerScoringRule || 'EXACT_MATCH',
        status: meta?.status || 'PUBLISHED',
        createdAt: quiz.createdAt.toISOString(),
        updatedAt: (meta?.updatedAt ? new Date(meta.updatedAt) : quiz.updatedAt).toISOString(),
        questions: formattedQuestions
      },
      attempts: formattedAttempts,
      analytics: {
        totalAttempts: totalAttemptsCount,
        passedAttempts: passedCount,
        failedAttempts: totalAttemptsCount - passedCount,
        passRate:
          totalAttemptsCount > 0
            ? Number(((passedCount / totalAttemptsCount) * 100).toFixed(1))
            : 0,
        failRate:
          totalAttemptsCount > 0
            ? Number((((totalAttemptsCount - passedCount) / totalAttemptsCount) * 100).toFixed(1))
            : 0,
        avgScore: avgPercentage,
        avgCompletionTimeSeconds: avgCompletionSeconds
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to load quiz details.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTenantRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const { id } = await params;

    const authCheck = await fetchAndAuthorizeQuiz(id, user);
    if (authCheck.error || !authCheck.quiz) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { quiz, course, section } = authCheck;
    const body = await req.json();

    const {
      title,
      description,
      passingPercentage = quiz.passingScore,
      timeLimitMinutes = quiz.timeLimitMinutes,
      attemptsAllowed = quiz.maxAttempts,
      randomizeQuestions = false,
      questionBankSize = 0,
      questionsPerAttempt = 0,
      showResultImmediately = true,
      showCorrectAnswers = true,
      allowRetake = true,
      resultPolicy = 'HIGHEST_SCORE',
      multipleAnswerScoringRule = 'EXACT_MATCH',
      status = 'DRAFT',
      questions = []
    } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: 'Quiz Title is required.' }, { status: 400 });
    }

    const targetStatus: QuizStatus =
      status === 'PUBLISHED' ? 'PUBLISHED' : status === 'ARCHIVED' ? 'ARCHIVED' : 'DRAFT';

    if (targetStatus === 'PUBLISHED' && (!Array.isArray(questions) || questions.length === 0)) {
      return NextResponse.json(
        { error: 'Quiz must have at least 2 questions before publishing.' },
        { status: 400 }
      );
    }

    if (Array.isArray(questions) && questions.length > 0) {
      if (questions.length < 2 || questions.length % 2 !== 0) {
        return NextResponse.json(
          {
            error: `Quiz must contain an EVEN number of questions (e.g. 2, 4, 6, 8, 10). Currently received: ${questions.length} question(s). Odd numbers of questions are not accepted.`
          },
          { status: 400 }
        );
      }
    }

    const questionMetaMap: QuizExtendedMeta['questionMeta'] = {};
    let totalMarks = 0;

    await prisma.$transaction(async (tx) => {
      await tx.quiz.update({
        where: { id: quiz.id },
        data: {
          title: String(title).trim(),
          description: description ? String(description).trim() : null,
          passingScore: Number(passingPercentage) || 60,
          maxAttempts: allowRetake ? Number(attemptsAllowed ?? 3) : 1,
          timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null
        }
      });

      // Replace questions and options cleanly
      await tx.quizQuestion.deleteMany({
        where: { quizId: quiz.id }
      });

      for (let idx = 0; idx < questions.length; idx++) {
        const qData = questions[idx];
        if (!qData.question?.trim()) continue;

        const qType = normalizeQuestionType(qData.type);
        const qMarks = Number(qData.marks) > 0 ? Number(qData.marks) : 1;
        totalMarks += qMarks;

        const newQ = await tx.quizQuestion.create({
          data: {
            quizId: quiz.id,
            question: String(qData.question).trim(),
            type: toPrismaQuestionType(qType),
            explanation: qData.explanation ? String(qData.explanation).trim() : null,
            order: idx + 1
          }
        });

        questionMetaMap[newQ.id] = {
          marks: qMarks,
          imageUrl: qData.imageUrl || null,
          difficulty: qData.difficulty || 'MEDIUM',
          topic: qData.topic || 'General',
          questionType: qType
        };

        const opts = Array.isArray(qData.options) ? qData.options : [];
        for (let oIdx = 0; oIdx < opts.length; oIdx++) {
          const opt = opts[oIdx];
          if (!opt.text?.trim()) continue;
          await tx.quizOption.create({
            data: {
              questionId: newQ.id,
              text: String(opt.text).trim(),
              isCorrect: !!opt.isCorrect,
              order: oIdx + 1
            }
          });
        }
      }
    });

    const existingMeta = await getQuizMeta(quiz.id);
    const updatedMeta: QuizExtendedMeta = {
      quizId: quiz.id,
      courseId: course.id,
      sectionId: section.id,
      lessonId: quiz.lessonId,
      instructorId: user.id,
      status: targetStatus,
      totalMarks,
      passingPercentage: Number(passingPercentage) || 60,
      timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
      maxAttempts: allowRetake ? Number(attemptsAllowed ?? 3) : 1,
      resultPolicy: (resultPolicy as ResultPolicy) || 'HIGHEST_SCORE',
      multipleAnswerScoringRule:
        (multipleAnswerScoringRule as MultipleAnswerScoringRule) || 'EXACT_MATCH',
      randomizeQuestions: !!randomizeQuestions,
      questionBankSize: Number(questionBankSize) || questions.length,
      questionsPerAttempt: Number(questionsPerAttempt) || questions.length,
      showResultImmediately: !!showResultImmediately,
      showCorrectAnswers: !!showCorrectAnswers,
      allowRetake: !!allowRetake,
      questionMeta: questionMetaMap,
      createdAt: existingMeta?.createdAt || quiz.createdAt.toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveQuizMeta(quiz.id, updatedMeta);

    await createAuditLog({
      organizationId: course.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'QUIZ_UPDATED',
      entity: 'Quiz',
      entityId: quiz.id,
      description: `Instructor "${user.name}" updated quiz "${title}" (${questions.length} questions, ${totalMarks} marks, status: ${targetStatus}).`,
      req
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      quizId: quiz.id,
      message: `Quiz "${title}" updated successfully!`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update quiz.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTenantRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const { id } = await params;

    const authCheck = await fetchAndAuthorizeQuiz(id, user);
    if (authCheck.error || !authCheck.quiz) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { quiz, course, section } = authCheck;
    const body = await req.json();
    const { action } = body;

    const existingMeta = await getQuizMeta(quiz.id);

    if (action === 'DUPLICATE') {
      // Create a new Lesson and clone Quiz + Questions + Options as DRAFT
      const dupLesson = await prisma.lesson.create({
        data: {
          sectionId: section.id,
          title: `Quiz: ${quiz.title} (Copy)`,
          type: 'QUIZ',
          duration: quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes}:00` : '15:00',
          order: 99,
          isRequired: true
        }
      });

      const dupQuestionMeta: QuizExtendedMeta['questionMeta'] = {};

      const dupQuiz = await prisma.$transaction(async (tx) => {
        const created = await tx.quiz.create({
          data: {
            organizationId: course.organizationId,
            lessonId: dupLesson.id,
            title: `${quiz.title} (Copy)`,
            description: quiz.description,
            passingScore: quiz.passingScore,
            maxAttempts: quiz.maxAttempts,
            timeLimitMinutes: quiz.timeLimitMinutes
          }
        });

        for (const origQ of quiz.questions) {
          const newQ = await tx.quizQuestion.create({
            data: {
              quizId: created.id,
              question: origQ.question,
              type: origQ.type,
              explanation: origQ.explanation,
              order: origQ.order
            }
          });

          if (existingMeta?.questionMeta?.[origQ.id]) {
            dupQuestionMeta[newQ.id] = { ...existingMeta.questionMeta[origQ.id] };
          } else {
            dupQuestionMeta[newQ.id] = {
              marks: 1,
              questionType: normalizeQuestionType(origQ.type)
            };
          }

          for (const origOpt of origQ.options) {
            await tx.quizOption.create({
              data: {
                questionId: newQ.id,
                text: origOpt.text,
                isCorrect: origOpt.isCorrect,
                order: origOpt.order
              }
            });
          }
        }

        return created;
      });

      if (existingMeta) {
        await saveQuizMeta(dupQuiz.id, {
          ...existingMeta,
          quizId: dupQuiz.id,
          lessonId: dupLesson.id,
          status: 'DRAFT',
          questionMeta: dupQuestionMeta,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      await createAuditLog({
        organizationId: course.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        action: 'QUIZ_DUPLICATED',
        entity: 'Quiz',
        entityId: dupQuiz.id,
        description: `Instructor "${user.name}" duplicated quiz "${quiz.title}" -> "${dupQuiz.title}".`,
        req
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        quizId: dupQuiz.id,
        message: `Quiz duplicated as "${dupQuiz.title}" (Draft).`
      });
    }

    let nextStatus: QuizStatus = existingMeta?.status || 'PUBLISHED';
    if (action === 'PUBLISH') {
      if (quiz.questions.length === 0) {
        return NextResponse.json(
          { error: 'Cannot publish a quiz with 0 questions. Please add at least 1 question first.' },
          { status: 400 }
        );
      }
      nextStatus = 'PUBLISHED';
    } else if (action === 'UNPUBLISH') {
      nextStatus = 'DRAFT';
    } else if (action === 'ARCHIVE') {
      nextStatus = 'ARCHIVED';
    } else {
      return NextResponse.json({ error: 'Invalid quiz action.' }, { status: 400 });
    }

    const baseMeta: QuizExtendedMeta = existingMeta || {
      quizId: quiz.id,
      courseId: course.id,
      sectionId: section.id,
      lessonId: quiz.lessonId,
      instructorId: user.id,
      status: nextStatus,
      totalMarks: quiz.questions.length,
      passingPercentage: quiz.passingScore,
      timeLimitMinutes: quiz.timeLimitMinutes,
      maxAttempts: quiz.maxAttempts,
      resultPolicy: 'HIGHEST_SCORE',
      multipleAnswerScoringRule: 'EXACT_MATCH',
      randomizeQuestions: false,
      questionBankSize: quiz.questions.length,
      questionsPerAttempt: quiz.questions.length,
      showResultImmediately: true,
      showCorrectAnswers: true,
      allowRetake: true,
      questionMeta: {},
      createdAt: quiz.createdAt.toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveQuizMeta(quiz.id, {
      ...baseMeta,
      status: nextStatus
    });

    await createAuditLog({
      organizationId: course.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: `QUIZ_${nextStatus}`,
      entity: 'Quiz',
      entityId: quiz.id,
      description: `Instructor "${user.name}" changed quiz "${quiz.title}" status to ${nextStatus}.`,
      req
    }).catch(() => {});

    if (nextStatus === 'PUBLISHED') {
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId: course.id, status: 'ACTIVE' },
        select: { userId: true }
      });

      for (const enr of enrollments) {
        await createNotification({
          organizationId: course.organizationId,
          userId: enr.userId,
          title: 'Quiz Published 📝',
          message: `Quiz "${quiz.title}" is now live in "${course.title}".`,
          type: 'QUIZ',
          category: 'COURSES',
          link: `/learn/${course.slug || course.id}`
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      status: nextStatus,
      message: `Quiz "${quiz.title}" is now ${nextStatus}.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update quiz status.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireTenantRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const confirmWithAttempts = searchParams.get('confirm') === 'true';

    const authCheck = await fetchAndAuthorizeQuiz(id, user);
    if (authCheck.error || !authCheck.quiz) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { quiz, course } = authCheck;

    // Business Rule: Do NOT allow deleting a quiz that already has student attempts without explicit confirmation/handling
    if (quiz.attempts.length > 0 && !confirmWithAttempts) {
      return NextResponse.json(
        {
          error: `This quiz already has ${quiz.attempts.length} student attempt(s). Deleting it will permanently remove historical student scores. We recommend Archiving it instead, or confirm deletion explicitly.`,
          hasAttempts: true,
          attemptsCount: quiz.attempts.length
        },
        { status: 409 }
      );
    }

    await prisma.quiz.delete({
      where: { id: quiz.id }
    });

    await prisma.platformSetting
      .delete({
        where: { key: `quiz_meta_${quiz.id}` }
      })
      .catch(() => {});

    await createAuditLog({
      organizationId: course.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'QUIZ_DELETED',
      entity: 'Quiz',
      entityId: quiz.id,
      description: `Instructor "${user.name}" deleted quiz "${quiz.title}" from course "${course.title}".`,
      req
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Quiz "${quiz.title}" deleted successfully.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete quiz.' }, { status: 500 });
  }
}

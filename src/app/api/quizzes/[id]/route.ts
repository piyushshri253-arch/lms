import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, validateTenantOwnership } from '@/lib/auth';
import { getQuizMeta, normalizeQuestionType } from '@/lib/assessment-engine';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    // Query quiz by quiz id OR lesson id
    const quiz = await prisma.quiz.findFirst({
      where: {
        OR: [{ id }, { lessonId: id }]
      },
      include: {
        lesson: {
          include: {
            section: {
              include: { course: true }
            }
          }
        },
        questions: {
          include: { options: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' }
        },
        attempts: user
          ? {
              where: { userId: user.id },
              orderBy: { submittedAt: 'desc' }
            }
          : false
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const meta = await getQuizMeta(quiz.id);

    const isInstructorOrAdmin =
      user &&
      (user.role === 'SUPER_ADMIN' ||
        (user.role === 'ADMIN' && validateTenantOwnership(quiz.organizationId, user)) ||
        (user.role === 'INSTRUCTOR' && quiz.lesson.section.course.instructorId === user.id));

    let poolQuestions = [...quiz.questions];

    // If Randomize Questions is enabled and student is taking the quiz, shuffle & slice to questionsPerAttempt
    if (meta?.randomizeQuestions && !isInstructorOrAdmin) {
      for (let i = poolQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [poolQuestions[i], poolQuestions[j]] = [poolQuestions[j], poolQuestions[i]];
      }
      const limit =
        meta.questionsPerAttempt && meta.questionsPerAttempt > 0
          ? Math.min(poolQuestions.length, meta.questionsPerAttempt)
          : poolQuestions.length;
      poolQuestions = poolQuestions.slice(0, limit);
    }

    let totalMarks = 0;
    const sanitizedQuestions = poolQuestions.map((q) => {
      const qm = meta?.questionMeta?.[q.id];
      const marks = qm?.marks && Number(qm.marks) > 0 ? Number(qm.marks) : 1;
      totalMarks += marks;
      const qType = qm?.questionType || normalizeQuestionType(q.type);

      return {
        id: q.id,
        question: q.question,
        type: qType,
        marks,
        imageUrl: qm?.imageUrl || null,
        explanation: isInstructorOrAdmin ? q.explanation : undefined,
        order: q.order,
        options: q.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          order: opt.order,
          isCorrect: isInstructorOrAdmin ? opt.isCorrect : undefined
        }))
      };
    });

    const myAttempts = Array.isArray(quiz.attempts) ? quiz.attempts : [];
    const resultPolicy = meta?.resultPolicy || 'HIGHEST_SCORE';
    const bestOrLatestAttempt =
      myAttempts.length > 0
        ? resultPolicy === 'LATEST_SCORE'
          ? myAttempts[0]
          : [...myAttempts].sort((a, b) => b.score - a.score)[0]
        : null;

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        lessonId: quiz.lessonId,
        title: quiz.title,
        description: quiz.description,
        totalMarks,
        passingScore: quiz.passingScore,
        passingPercentage: quiz.passingScore,
        maxAttempts: quiz.maxAttempts,
        timeLimitMinutes: quiz.timeLimitMinutes,
        randomizeQuestions: meta?.randomizeQuestions ?? false,
        questionBankSize: meta?.questionBankSize ?? quiz.questions.length,
        questionsPerAttempt: meta?.questionsPerAttempt ?? sanitizedQuestions.length,
        showResultImmediately: meta?.showResultImmediately ?? true,
        showCorrectAnswers: meta?.showCorrectAnswers ?? true,
        allowRetake: meta?.allowRetake ?? quiz.maxAttempts !== 1,
        resultPolicy,
        multipleAnswerScoringRule: meta?.multipleAnswerScoringRule || 'EXACT_MATCH',
        serverStartedAt: new Date().toISOString(),
        questions: sanitizedQuestions,
        myAttempts,
        effectiveResultAttempt: bestOrLatestAttempt
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

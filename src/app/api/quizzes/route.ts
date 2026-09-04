import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole, validateTenantOwnership } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const body = await request.json();

    const {
      lessonId,
      title,
      description,
      passingScore = 70,
      maxAttempts = 3,
      timeLimitMinutes,
      questions = [] // Array of { question, type, explanation, order, options: [{ text, isCorrect, order }] }
    } = body;

    if (!lessonId || !title) {
      return NextResponse.json({ error: 'lessonId and title are required.' }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { include: { course: true } } }
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    if (!validateTenantOwnership(lesson.section.course.organizationId, user)) {
      return NextResponse.json({ error: 'Forbidden: Cross-tenant access denied.' }, { status: 403 });
    }

    if (user.role === 'INSTRUCTOR' && lesson.section.course.instructorId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only edit quizzes for your own courses.' }, { status: 403 });
    }

    // Upsert Quiz and replace questions/options atomically
    const quiz = await prisma.$transaction(async (tx) => {
      // 1. Delete existing quiz if any
      await tx.quiz.deleteMany({
        where: { lessonId }
      });

      // 2. Create fresh Quiz
      const newQuiz = await tx.quiz.create({
        data: {
          organizationId: lesson.section.course.organizationId,
          lessonId,
          title: title.trim(),
          description: description?.trim() || null,
          passingScore: Number(passingScore) || 70,
          maxAttempts: Number(maxAttempts) || 3,
          timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null
        }
      });

      // 3. Create Questions & Options
      for (let qIdx = 0; qIdx < questions.length; qIdx++) {
        const qData = questions[qIdx];
        if (!qData.question?.trim()) continue;

        const newQ = await tx.quizQuestion.create({
          data: {
            quizId: newQuiz.id,
            question: qData.question.trim(),
            type: qData.type || 'MULTIPLE_CHOICE',
            explanation: qData.explanation || null,
            order: qData.order !== undefined ? qData.order : qIdx + 1
          }
        });

        if (Array.isArray(qData.options)) {
          for (let oIdx = 0; oIdx < qData.options.length; oIdx++) {
            const optData = qData.options[oIdx];
            if (!optData.text?.trim()) continue;

            await tx.quizOption.create({
              data: {
                questionId: newQ.id,
                text: optData.text.trim(),
                isCorrect: !!optData.isCorrect,
                order: optData.order !== undefined ? optData.order : oIdx + 1
              }
            });
          }
        }
      }

      // Update lesson type to QUIZ
      await tx.lesson.update({
        where: { id: lessonId },
        data: { type: 'QUIZ' }
      });

      return newQuiz;
    });

    const fullQuiz = await prisma.quiz.findUnique({
      where: { id: quiz.id },
      include: {
        questions: {
          include: { options: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Quiz configured successfully.',
      quiz: fullQuiz
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save quiz' }, { status: 500 });
  }
}

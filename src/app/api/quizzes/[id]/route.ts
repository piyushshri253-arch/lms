import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, validateTenantOwnership } from '@/lib/auth';

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
          include: { options: true },
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

    const isInstructorOrAdmin =
      user &&
      (user.role === 'SUPER_ADMIN' ||
        (user.role === 'ADMIN' && validateTenantOwnership(quiz.organizationId, user)) ||
        (user.role === 'INSTRUCTOR' && quiz.lesson.section.course.instructorId === user.id));

    // Sanitize questions: strip `isCorrect` unless instructor or admin
    const sanitizedQuestions = quiz.questions.map((q) => ({
      id: q.id,
      question: q.question,
      type: q.type,
      explanation: isInstructorOrAdmin ? q.explanation : undefined,
      order: q.order,
      options: q.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        order: opt.order,
        isCorrect: isInstructorOrAdmin ? opt.isCorrect : undefined
      }))
    }));

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        lessonId: quiz.lessonId,
        title: quiz.title,
        description: quiz.description,
        passingScore: quiz.passingScore,
        maxAttempts: quiz.maxAttempts,
        timeLimitMinutes: quiz.timeLimitMinutes,
        questions: sanitizedQuestions,
        myAttempts: quiz.attempts || []
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

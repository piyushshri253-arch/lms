import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import {
  getInstructorQuestionBank,
  saveInstructorQuestionBank,
  getQuizMeta,
  saveQuizMeta,
  normalizeQuestionType,
  toPrismaQuestionType,
  QuestionBankItem
} from '@/lib/assessment-engine';

export async function GET(req: NextRequest) {
  try {
    const user = await requireTenantRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const courseId = searchParams.get('courseId') || '';
    const category = (searchParams.get('category') || '').trim().toLowerCase();
    const type = searchParams.get('type') || '';
    const difficulty = searchParams.get('difficulty') || '';

    const bankItems = await getInstructorQuestionBank(user.id);

    const courses = await prisma.course.findMany({
      where: user.role === 'INSTRUCTOR' ? { instructorId: user.id } : {},
      select: { id: true, title: true }
    });

    const quizzes = await prisma.quiz.findMany({
      where: {
        lesson: {
          section: {
            courseId: { in: courses.map((c) => c.id) }
          }
        }
      },
      select: {
        id: true,
        title: true,
        lesson: {
          select: {
            section: {
              select: {
                course: { select: { id: true, title: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const filtered = bankItems.filter((item) => {
      if (courseId && item.courseId !== courseId) return false;
      if (category && item.category.toLowerCase() !== category) return false;
      if (type && type !== 'ALL' && item.type !== type) return false;
      if (difficulty && difficulty !== 'ALL' && item.difficulty !== difficulty) return false;
      if (
        search &&
        !item.question.toLowerCase().includes(search) &&
        !item.topic.toLowerCase().includes(search) &&
        !item.category.toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    });

    return NextResponse.json({
      success: true,
      questions: filtered,
      totalBankCount: bankItems.length,
      courses,
      quizzes: quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        courseTitle: q.lesson.section.course.title
      }))
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to load Question Bank.' },
      { status: 401 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireTenantRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const body = await req.json();

    // Action 1: Bulk Add Selected Question Bank Items to a Quiz (with Duplicate Prevention)
    if (body.action === 'ADD_TO_QUIZ') {
      const { quizId, questionIds = [] } = body;
      if (!quizId || !Array.isArray(questionIds) || questionIds.length === 0) {
        return NextResponse.json(
          { error: 'Please select a target quiz and at least one question to import.' },
          { status: 400 }
        );
      }

      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
          lesson: { include: { section: { include: { course: true } } } },
          questions: true
        }
      });

      if (!quiz) {
        return NextResponse.json({ error: 'Target quiz not found.' }, { status: 404 });
      }

      if (user.role === 'INSTRUCTOR' && quiz.lesson.section.course.instructorId !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: You can only add questions to your own quizzes.' },
          { status: 403 }
        );
      }

      const bankItems = await getInstructorQuestionBank(user.id);
      const selectedBankQuestions = bankItems.filter((item) => questionIds.includes(item.id));

      // Duplicate prevention: compare normalized question text against existing questions in the quiz
      const existingNormalizedTexts = new Set(
        quiz.questions.map((q) => q.question.trim().toLowerCase())
      );

      let addedCount = 0;
      let skippedDuplicates = 0;
      let currentMaxOrder = quiz.questions.reduce((max, q) => Math.max(max, q.order || 0), 0);

      const meta = await getQuizMeta(quiz.id);
      const questionMeta = meta?.questionMeta || {};
      let addedMarks = 0;

      for (const bq of selectedBankQuestions) {
        const normText = bq.question.trim().toLowerCase();
        if (existingNormalizedTexts.has(normText)) {
          skippedDuplicates++;
          continue;
        }

        existingNormalizedTexts.add(normText);
        currentMaxOrder++;
        addedCount++;
        const qMarks = Number(bq.marks) > 0 ? Number(bq.marks) : 1;
        addedMarks += qMarks;

        const createdQ = await prisma.quizQuestion.create({
          data: {
            quizId: quiz.id,
            question: bq.question.trim(),
            type: toPrismaQuestionType(bq.type),
            explanation: bq.explanation || null,
            order: currentMaxOrder
          }
        });

        questionMeta[createdQ.id] = {
          marks: qMarks,
          imageUrl: bq.imageUrl || null,
          difficulty: bq.difficulty || 'MEDIUM',
          topic: bq.topic || 'General',
          questionType: bq.type
        };

        for (let oIdx = 0; oIdx < bq.options.length; oIdx++) {
          const opt = bq.options[oIdx];
          await prisma.quizOption.create({
            data: {
              questionId: createdQ.id,
              text: opt.text,
              isCorrect: !!opt.isCorrect,
              order: oIdx + 1
            }
          });
        }
      }

      if (meta) {
        await saveQuizMeta(quiz.id, {
          ...meta,
          totalMarks: (meta.totalMarks || 0) + addedMarks,
          questionMeta
        });
      }

      await createAuditLog({
        organizationId: quiz.lesson.section.course.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        action: 'QUESTION_BANK_IMPORTED_TO_QUIZ',
        entity: 'Quiz',
        entityId: quiz.id,
        description: `Instructor "${user.name}" imported ${addedCount} question(s) into quiz "${quiz.title}" (${skippedDuplicates} duplicate(s) prevented).`,
        req
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        addedCount,
        skippedDuplicates,
        message:
          skippedDuplicates > 0
            ? `Added ${addedCount} question(s) to "${quiz.title}" (${skippedDuplicates} duplicate question(s) automatically skipped).`
            : `Successfully added ${addedCount} question(s) to "${quiz.title}"!`
      });
    }

    // Action 2: Create a New Question in the Instructor Question Bank
    const {
      question,
      type = 'SINGLE_CHOICE',
      options = [],
      marks = 1,
      explanation = '',
      imageUrl = '',
      courseId = null,
      category = 'General',
      topic = 'Core Concept',
      difficulty = 'MEDIUM'
    } = body;

    if (!question || !String(question).trim()) {
      return NextResponse.json({ error: 'Question text is required.' }, { status: 400 });
    }

    const qType = normalizeQuestionType(type);
    const cleanOptions = Array.isArray(options)
      ? options
          .filter((o: any) => o.text && String(o.text).trim())
          .map((o: any, idx: number) => ({
            id: o.id || `opt_${Date.now()}_${idx}`,
            text: String(o.text).trim(),
            isCorrect: !!o.isCorrect
          }))
      : [];

    if (cleanOptions.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 answer options are required.' },
        { status: 400 }
      );
    }

    if (!cleanOptions.some((o) => o.isCorrect)) {
      return NextResponse.json(
        { error: 'At least one option must be marked as the correct answer.' },
        { status: 400 }
      );
    }

    let courseTitle: string | null = null;
    if (courseId) {
      const c = await prisma.course.findFirst({
        where: { id: courseId, ...(user.role === 'INSTRUCTOR' ? { instructorId: user.id } : {}) },
        select: { title: true }
      });
      courseTitle = c?.title || null;
    }

    const bankItems = await getInstructorQuestionBank(user.id);
    const newItem: QuestionBankItem = {
      id: `qb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      instructorId: user.id,
      courseId: courseId || null,
      courseTitle,
      category: String(category || 'General').trim(),
      topic: String(topic || 'Core Concept').trim(),
      difficulty:
        difficulty === 'EASY' || difficulty === 'HARD' ? difficulty : 'MEDIUM',
      type: qType,
      question: String(question).trim(),
      options: cleanOptions,
      marks: Number(marks) > 0 ? Number(marks) : 1,
      explanation: explanation ? String(explanation).trim() : null,
      imageUrl: imageUrl ? String(imageUrl).trim() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    bankItems.unshift(newItem);
    await saveInstructorQuestionBank(user.id, bankItems);

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'QUESTION_CREATED',
      entity: 'QuestionBankQuestion',
      entityId: newItem.id,
      description: `Instructor "${user.name}" added a ${qType} question to Question Bank: "${newItem.question.slice(0, 60)}".`,
      req
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      question: newItem,
      message: 'Question added to your Question Bank!'
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to save question.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireTenantRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const body = await req.json();
    const {
      id,
      question,
      type,
      options,
      marks,
      explanation,
      imageUrl,
      courseId,
      category,
      topic,
      difficulty
    } = body;

    if (!id || !question?.trim()) {
      return NextResponse.json({ error: 'Question ID and text are required.' }, { status: 400 });
    }

    const bankItems = await getInstructorQuestionBank(user.id);
    const idx = bankItems.findIndex((item) => item.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Question not found in your Question Bank.' }, { status: 404 });
    }

    const qType = normalizeQuestionType(type || bankItems[idx].type);
    const cleanOptions = Array.isArray(options)
      ? options
          .filter((o: any) => o.text && String(o.text).trim())
          .map((o: any, i: number) => ({
            id: o.id || `opt_${Date.now()}_${i}`,
            text: String(o.text).trim(),
            isCorrect: !!o.isCorrect
          }))
      : bankItems[idx].options;

    if (!cleanOptions.some((o) => o.isCorrect)) {
      return NextResponse.json(
        { error: 'At least one option must be marked as the correct answer.' },
        { status: 400 }
      );
    }

    bankItems[idx] = {
      ...bankItems[idx],
      question: String(question).trim(),
      type: qType,
      options: cleanOptions,
      marks: Number(marks) > 0 ? Number(marks) : bankItems[idx].marks,
      explanation: explanation !== undefined ? String(explanation).trim() : bankItems[idx].explanation,
      imageUrl: imageUrl !== undefined ? String(imageUrl).trim() : bankItems[idx].imageUrl,
      courseId: courseId !== undefined ? courseId : bankItems[idx].courseId,
      category: category ? String(category).trim() : bankItems[idx].category,
      topic: topic ? String(topic).trim() : bankItems[idx].topic,
      difficulty: difficulty || bankItems[idx].difficulty,
      updatedAt: new Date().toISOString()
    };

    await saveInstructorQuestionBank(user.id, bankItems);

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'QUESTION_UPDATED',
      entity: 'QuestionBankQuestion',
      entityId: id,
      description: `Instructor "${user.name}" updated Question Bank item "${bankItems[idx].question.slice(0, 60)}".`,
      req
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      question: bankItems[idx],
      message: 'Question updated in Question Bank!'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update question.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireTenantRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Question ID is required.' }, { status: 400 });
    }

    const bankItems = await getInstructorQuestionBank(user.id);
    const nextItems = bankItems.filter((item) => item.id !== id);

    await saveInstructorQuestionBank(user.id, nextItems);

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'QUESTION_DELETED',
      entity: 'QuestionBankQuestion',
      entityId: id,
      description: `Instructor "${user.name}" deleted Question Bank item ${id}.`,
      req
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Question removed from Question Bank.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete question.' }, { status: 500 });
  }
}

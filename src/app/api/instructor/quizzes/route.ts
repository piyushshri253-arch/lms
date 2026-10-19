import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notification';
import {
  getQuizMeta,
  saveQuizMeta,
  normalizeQuestionType,
  toPrismaQuestionType,
  QuizExtendedMeta,
  QuizStatus,
  MultipleAnswerScoringRule,
  ResultPolicy
} from '@/lib/assessment-engine';

export async function GET(req: NextRequest) {
  try {
    const user = await requireTenantRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const courseIdFilter = searchParams.get('courseId') || '';
    const moduleIdFilter = searchParams.get('moduleId') || '';
    const statusFilter = (searchParams.get('status') || '').toUpperCase();
    const sort = searchParams.get('sort') || 'newest';

    // Strict RBAC: Instructors can ONLY see courses they own!
    const courseWhere: any =
      user.role === 'INSTRUCTOR'
        ? { instructorId: user.id }
        : user.organizationId
        ? { organizationId: user.organizationId }
        : {};

    const instructorCourses = await prisma.course.findMany({
      where: courseWhere,
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: { id: true, title: true, type: true, order: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const ownedCourseIds = instructorCourses.map((c) => c.id);

    const quizzes = await prisma.quiz.findMany({
      where: {
        lesson: {
          section: {
            courseId: { in: ownedCourseIds }
          }
        }
      },
      include: {
        lesson: {
          include: {
            section: {
              include: {
                course: {
                  select: { id: true, title: true, slug: true, instructorId: true }
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
          orderBy: { submittedAt: 'desc' }
        }
      },
      orderBy: { createdAt: sort === 'oldest' ? 'asc' : 'desc' }
    });

    // Fetch all quiz_meta settings in bulk
    const metaKeys = quizzes.map((q) => `quiz_meta_${q.id}`);
    const metaRows =
      metaKeys.length > 0
        ? await prisma.platformSetting.findMany({
            where: { key: { in: metaKeys } }
          })
        : [];
    const metaMap = new Map<string, QuizExtendedMeta>();
    for (const row of metaRows) {
      try {
        const parsed = JSON.parse(row.value) as QuizExtendedMeta;
        metaMap.set(row.key.replace('quiz_meta_', ''), parsed);
      } catch {}
    }

    const formattedQuizzes = quizzes
      .map((q) => {
        const meta = metaMap.get(q.id);
        const course = q.lesson.section.course;
        const section = q.lesson.section;

        // Calculate total marks from question metadata or default 1 per question
        let totalMarks = 0;
        for (const question of q.questions) {
          const qm = meta?.questionMeta?.[question.id];
          totalMarks += qm?.marks && Number(qm.marks) > 0 ? Number(qm.marks) : 1;
        }
        if (totalMarks === 0 && meta?.totalMarks) {
          totalMarks = meta.totalMarks;
        }

        const status: QuizStatus = meta?.status || 'PUBLISHED';
        const attemptsCount = q.attempts.length;
        const passedAttempts = q.attempts.filter((a) => a.passed).length;
        const avgScore =
          attemptsCount > 0
            ? Number(
                (q.attempts.reduce((sum, a) => sum + Number(a.score || 0), 0) / attemptsCount).toFixed(
                  1
                )
              )
            : 0;
        const passRate =
          attemptsCount > 0 ? Number(((passedAttempts / attemptsCount) * 100).toFixed(1)) : 0;

        return {
          id: q.id,
          title: q.title,
          description: q.description || '',
          courseId: course.id,
          courseTitle: course.title,
          courseSlug: course.slug,
          moduleId: section.id,
          moduleTitle: section.title,
          lessonId: q.lesson.id,
          lessonTitle: q.lesson.title,
          questionCount: q.questions.length,
          totalMarks,
          passingPercentage: q.passingScore,
          attemptsAllowed: q.maxAttempts, // 0 = unlimited
          timeLimitMinutes: q.timeLimitMinutes,
          randomizeQuestions: meta?.randomizeQuestions ?? false,
          questionBankSize: meta?.questionBankSize ?? q.questions.length,
          questionsPerAttempt: meta?.questionsPerAttempt ?? q.questions.length,
          showResultImmediately: meta?.showResultImmediately ?? true,
          showCorrectAnswers: meta?.showCorrectAnswers ?? true,
          allowRetake: meta?.allowRetake ?? q.maxAttempts !== 1,
          resultPolicy: meta?.resultPolicy || 'HIGHEST_SCORE',
          multipleAnswerScoringRule: meta?.multipleAnswerScoringRule || 'EXACT_MATCH',
          status,
          attemptsCount,
          avgScore,
          passRate,
          failRate: attemptsCount > 0 ? Number((100 - passRate).toFixed(1)) : 0,
          createdAt: q.createdAt.toISOString(),
          updatedAt: (meta?.updatedAt ? new Date(meta.updatedAt) : q.updatedAt).toISOString()
        };
      })
      .filter((item) => {
        if (courseIdFilter && item.courseId !== courseIdFilter) return false;
        if (moduleIdFilter && item.moduleId !== moduleIdFilter) return false;
        if (statusFilter && statusFilter !== 'ALL' && item.status !== statusFilter) return false;
        if (
          search &&
          !item.title.toLowerCase().includes(search) &&
          !item.courseTitle.toLowerCase().includes(search) &&
          !item.moduleTitle.toLowerCase().includes(search)
        ) {
          return false;
        }
        return true;
      });

    // Aggregate Assessment Analytics across all Instructor Quizzes
    const totalAttempts = formattedQuizzes.reduce((acc, q) => acc + q.attemptsCount, 0);
    const quizzesWithAttempts = formattedQuizzes.filter((q) => q.attemptsCount > 0);
    const overallAvgScore =
      quizzesWithAttempts.length > 0
        ? Number(
            (
              quizzesWithAttempts.reduce((acc, q) => acc + q.avgScore, 0) /
              quizzesWithAttempts.length
            ).toFixed(1)
          )
        : 0;
    const overallPassRate =
      quizzesWithAttempts.length > 0
        ? Number(
            (
              quizzesWithAttempts.reduce((acc, q) => acc + q.passRate, 0) /
              quizzesWithAttempts.length
            ).toFixed(1)
          )
        : 0;

    return NextResponse.json({
      success: true,
      quizzes: formattedQuizzes,
      analytics: {
        totalQuizzes: formattedQuizzes.length,
        publishedQuizzes: formattedQuizzes.filter((q) => q.status === 'PUBLISHED').length,
        draftQuizzes: formattedQuizzes.filter((q) => q.status === 'DRAFT').length,
        archivedQuizzes: formattedQuizzes.filter((q) => q.status === 'ARCHIVED').length,
        totalAttempts,
        overallAvgScore,
        overallPassRate,
        overallFailRate: totalAttempts > 0 ? Number((100 - overallPassRate).toFixed(1)) : 0
      },
      courses: instructorCourses.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        modules: c.sections.map((s) => ({
          id: s.id,
          title: s.title,
          lessons: s.lessons
        }))
      }))
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to load instructor quizzes.' },
      { status: 401 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireTenantRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const body = await req.json();

    const {
      title,
      description,
      courseId,
      moduleId,
      lessonId,
      passingPercentage = 60,
      timeLimitMinutes = 30,
      attemptsAllowed = 3,
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

    // 1. Backend Validation
    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: 'Quiz Title is required.' }, { status: 400 });
    }
    if (!courseId) {
      return NextResponse.json({ error: 'Course selection is required.' }, { status: 400 });
    }

    const passNum = Number(passingPercentage);
    if (isNaN(passNum) || passNum < 1 || passNum > 100) {
      return NextResponse.json(
        { error: 'Passing percentage must be between 1% and 100%.' },
        { status: 400 }
      );
    }

    const targetStatus: QuizStatus =
      status === 'PUBLISHED' ? 'PUBLISHED' : status === 'ARCHIVED' ? 'ARCHIVED' : 'DRAFT';

    if (targetStatus === 'PUBLISHED' && (!Array.isArray(questions) || questions.length === 0)) {
      return NextResponse.json(
        { error: 'A quiz must have at least 2 questions before publishing.' },
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

    // Validate every question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q.marks !== undefined && (isNaN(Number(q.marks)) || Number(q.marks) <= 0)) {
        return NextResponse.json(
          { error: `Question #${i + 1} must have a valid positive marks value (e.g. 10 marks).` },
          { status: 400 }
        );
      }
      if (!q.question || !String(q.question).trim()) {
        return NextResponse.json(
          { error: `Question #${i + 1} is missing question text.` },
          { status: 400 }
        );
      }
      const qType = normalizeQuestionType(q.type);
      const opts = Array.isArray(q.options) ? q.options.filter((o: any) => o.text?.trim()) : [];
      if (qType === 'SINGLE_CHOICE' && opts.length < 2) {
        return NextResponse.json(
          { error: `Question #${i + 1} (Single Choice) must have at least 2 options.` },
          { status: 400 }
        );
      }
      if (qType === 'MULTIPLE_ANSWER' && opts.length < 2) {
        return NextResponse.json(
          { error: `Question #${i + 1} (Multiple Answer) must have at least 2 options.` },
          { status: 400 }
        );
      }
      const correctCount = opts.filter((o: any) => o.isCorrect).length;
      if (correctCount === 0) {
        return NextResponse.json(
          { error: `Question #${i + 1} must have at least one correct answer selected.` },
          { status: 400 }
        );
      }
    }

    // 2. Verify Course Ownership (Prevent IDOR!)
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    }

    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only create quizzes for courses you own.' },
        { status: 403 }
      );
    }

    // 3. Resolve or Create Module (Section) and Lesson
    let targetSectionId = moduleId;
    if (!targetSectionId || !course.sections.some((s) => s.id === targetSectionId)) {
      if (course.sections.length > 0) {
        targetSectionId = course.sections[0].id;
      } else {
        const newSection = await prisma.courseSection.create({
          data: {
            courseId: course.id,
            title: 'Module 1: Core Assessments',
            order: 1
          }
        });
        targetSectionId = newSection.id;
      }
    }

    let targetLessonId = lessonId;
    if (targetLessonId) {
      // Check if this lesson already has a quiz; if so, create a fresh lesson for this new quiz so existing quizzes aren't overwritten
      const existingQuizOnLesson = await prisma.quiz.findUnique({
        where: { lessonId: targetLessonId }
      });
      if (existingQuizOnLesson) {
        targetLessonId = '';
      }
    }

    if (!targetLessonId) {
      const createdLesson = await prisma.lesson.create({
        data: {
          sectionId: targetSectionId,
          title: `Quiz: ${String(title).trim()}`,
          type: 'QUIZ',
          duration: timeLimitMinutes ? `${timeLimitMinutes}:00` : '15:00',
          order: 99,
          isRequired: true
        }
      });
      targetLessonId = createdLesson.id;
    } else {
      await prisma.lesson.update({
        where: { id: targetLessonId },
        data: { type: 'QUIZ' }
      });
    }

    // 4. Create Quiz & Questions in Database
    const questionMetaMap: QuizExtendedMeta['questionMeta'] = {};
    let totalMarks = 0;

    const createdQuiz = await prisma.$transaction(async (tx) => {
      const qz = await tx.quiz.create({
        data: {
          organizationId: course.organizationId,
          lessonId: targetLessonId,
          title: String(title).trim(),
          description: description ? String(description).trim() : null,
          passingScore: passNum,
          maxAttempts: allowRetake ? Number(attemptsAllowed ?? 3) : 1,
          timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null
        }
      });

      for (let idx = 0; idx < questions.length; idx++) {
        const qData = questions[idx];
        const qType = normalizeQuestionType(qData.type);
        const qMarks = Number(qData.marks) > 0 ? Number(qData.marks) : 1;
        totalMarks += qMarks;

        const createdQuestion = await tx.quizQuestion.create({
          data: {
            quizId: qz.id,
            question: String(qData.question).trim(),
            type: toPrismaQuestionType(qType),
            explanation: qData.explanation ? String(qData.explanation).trim() : null,
            order: idx + 1
          }
        });

        questionMetaMap[createdQuestion.id] = {
          marks: qMarks,
          imageUrl: qData.imageUrl || null,
          difficulty: qData.difficulty || 'MEDIUM',
          topic: qData.topic || 'General',
          questionType: qType
        };

        const rawOptions = Array.isArray(qData.options) ? qData.options : [];
        const finalOptions =
          qType === 'TRUE_FALSE' && rawOptions.length === 0
            ? [
                { text: 'True', isCorrect: true },
                { text: 'False', isCorrect: false }
              ]
            : rawOptions;

        for (let oIdx = 0; oIdx < finalOptions.length; oIdx++) {
          const opt = finalOptions[oIdx];
          if (!opt.text?.trim()) continue;
          await tx.quizOption.create({
            data: {
              questionId: createdQuestion.id,
              text: String(opt.text).trim(),
              isCorrect: !!opt.isCorrect,
              order: oIdx + 1
            }
          });
        }
      }

      return qz;
    });

    // 5. Save Extended Quiz Metadata
    const metaPayload: QuizExtendedMeta = {
      quizId: createdQuiz.id,
      courseId: course.id,
      sectionId: targetSectionId,
      lessonId: targetLessonId,
      instructorId: user.id,
      status: targetStatus,
      totalMarks,
      passingPercentage: passNum,
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveQuizMeta(createdQuiz.id, metaPayload);

    // 5b. If course is already PUBLISHED, record this Quiz addition in Course Version Control
    if (course.status === 'PUBLISHED') {
      try {
        const { getCourseVersionState, saveCourseVersionState } = await import('@/lib/course-versioning');
        const curVer = await getCourseVersionState(course.id);
        const nextVerNum = (curVer.liveVersionNumber || 1) + 1;
        await saveCourseVersionState(course.id, {
          pendingVersionNumber: nextVerNum,
          pendingVersionLabel: `v${nextVerNum}.0`,
          status: curVer.status === 'LIVE_SYNCED' ? 'DRAFT_VERSION' : curVer.status,
          detectedChanges: [
            ...curVer.detectedChanges,
            {
              category: 'QUIZ',
              field: `quiz.${createdQuiz.id}`,
              summary: `Added/Modified Quiz "${createdQuiz.title}" (${questions.length} questions, ${totalMarks} marks)`
            }
          ]
        });
      } catch {}
    }

    // 6. Audit Log
    await createAuditLog({
      organizationId: course.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: targetStatus === 'PUBLISHED' ? 'QUIZ_PUBLISHED' : 'QUIZ_CREATED',
      entity: 'Quiz',
      entityId: createdQuiz.id,
      description: `Instructor "${user.name}" created quiz "${createdQuiz.title}" (${questions.length} questions, ${totalMarks} marks, status: ${targetStatus}) in course "${course.title}".`,
      req
    }).catch(() => {});

    // 7. Notify Enrolled Students if Published
    if (targetStatus === 'PUBLISHED') {
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId: course.id, status: 'ACTIVE' },
        select: { userId: true }
      });

      for (const enr of enrollments) {
        await createNotification({
          organizationId: course.organizationId,
          userId: enr.userId,
          title: 'New Quiz Available 📝',
          message: `A new quiz "${createdQuiz.title}" has been published in "${course.title}".`,
          type: 'QUIZ',
          category: 'COURSES',
          link: `/learn/${course.slug || course.id}`
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      quizId: createdQuiz.id,
      message: `Quiz "${createdQuiz.title}" ${
        targetStatus === 'PUBLISHED' ? 'created and published' : 'saved as draft'
      } successfully!`
    });
  } catch (err: any) {
    console.error('[Create Instructor Quiz Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to create quiz.' }, { status: 500 });
  }
}

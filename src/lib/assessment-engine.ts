import { prisma } from '@/lib/prisma';

export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_ANSWER' | 'TRUE_FALSE';
export type QuizStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type AssignmentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type MultipleAnswerScoringRule = 'EXACT_MATCH' | 'PARTIAL_CREDIT';
export type ResultPolicy = 'HIGHEST_SCORE' | 'LATEST_SCORE';
export type SubmissionType = 'FILE_UPLOAD' | 'TEXT_SUBMISSION' | 'FILE_AND_TEXT';
export type LateSubmissionPolicy = 'ALLOWED' | 'ALLOWED_WITH_PENALTY' | 'NOT_ALLOWED';
export type AttemptStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED' | 'GRADED';

export interface QuizExtendedMeta {
  quizId: string;
  courseId: string;
  sectionId: string;
  lessonId: string;
  instructorId: string;
  status: QuizStatus;
  totalMarks: number;
  passingPercentage: number;
  timeLimitMinutes: number | null;
  maxAttempts: number; // 0 = unlimited
  resultPolicy: ResultPolicy;
  multipleAnswerScoringRule: MultipleAnswerScoringRule;
  randomizeQuestions: boolean;
  questionBankSize: number;
  questionsPerAttempt: number;
  showResultImmediately: boolean;
  showCorrectAnswers: boolean;
  allowRetake: boolean;
  questionMeta: Record<
    string,
    {
      marks: number;
      imageUrl?: string | null;
      difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
      topic?: string;
      questionType?: QuestionType;
    }
  >;
  createdAt: string;
  updatedAt: string;
}

export interface AttemptExtendedMeta {
  attemptId: string;
  quizId: string;
  userId: string;
  attemptNumber: number;
  status: AttemptStatus;
  startedAt: string;
  submittedAt: string;
  durationSeconds: number;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  passed: boolean;
  servedQuestionIds: string[];
  questionBreakdown: Array<{
    questionId: string;
    questionText: string;
    questionType: QuestionType;
    selectedOptionIds: string[];
    correctOptionIds: string[];
    isCorrect: boolean;
    marksAwarded: number;
    maxMarks: number;
    explanation?: string | null;
  }>;
}

export interface QuestionBankItem {
  id: string;
  instructorId: string;
  courseId?: string | null;
  courseTitle?: string | null;
  category: string;
  topic: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  type: QuestionType;
  question: string;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
  marks: number;
  explanation?: string | null;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentExtendedMeta {
  assignmentId: string;
  courseId: string;
  sectionId: string;
  lessonId?: string | null;
  instructorId: string;
  instructions: string;
  submissionType: SubmissionType;
  allowedFileTypes: string[];
  maxFileSizeMB: number;
  allowMultipleSubmissions: boolean;
  allowResubmission: boolean;
  lateSubmissionPolicy: LateSubmissionPolicy;
  latePenaltyPercentage: number; // e.g. 10 means 10% deduction
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionVersionItem {
  versionNumber: number;
  submissionId: string;
  submittedAt: string;
  fileUrl?: string | null;
  fileName?: string | null;
  files?: Array<{ fileName: string; fileUrl: string; fileSizeBytes?: number }>;
  textResponse?: string | null;
  isLate: boolean;
  daysLate: number;
  status: 'NOT_SUBMITTED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'GRADED' | 'RETURNED' | 'LATE';
  rawScore?: number | null;
  latePenaltyDeducted?: number | null;
  finalScore?: number | null;
  maxMarks: number;
  feedback?: string | null;
  gradedBy?: string | null;
  gradedAt?: string | null;
}

export function normalizeQuestionType(rawType?: string): QuestionType {
  const upper = (rawType || 'SINGLE_CHOICE').toUpperCase();
  if (upper === 'MULTIPLE_SELECT' || upper === 'MULTIPLE_ANSWER') return 'MULTIPLE_ANSWER';
  if (upper === 'TRUE_FALSE') return 'TRUE_FALSE';
  return 'SINGLE_CHOICE';
}

export function toPrismaQuestionType(type: QuestionType): string {
  if (type === 'MULTIPLE_ANSWER') return 'MULTIPLE_SELECT';
  if (type === 'TRUE_FALSE') return 'TRUE_FALSE';
  return 'MULTIPLE_CHOICE';
}

export async function getQuizMeta(quizId: string): Promise<QuizExtendedMeta | null> {
  try {
    const row = await prisma.platformSetting.findUnique({
      where: { key: `quiz_meta_${quizId}` }
    });
    if (!row) return null;
    return JSON.parse(row.value) as QuizExtendedMeta;
  } catch {
    return null;
  }
}

export async function saveQuizMeta(quizId: string, meta: QuizExtendedMeta): Promise<void> {
  const key = `quiz_meta_${quizId}`;
  const value = JSON.stringify({
    ...meta,
    quizId,
    updatedAt: new Date().toISOString()
  });
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value }
  });
}

export async function getAttemptMeta(attemptId: string): Promise<AttemptExtendedMeta | null> {
  try {
    const row = await prisma.platformSetting.findUnique({
      where: { key: `attempt_meta_${attemptId}` }
    });
    if (!row) return null;
    return JSON.parse(row.value) as AttemptExtendedMeta;
  } catch {
    return null;
  }
}

export async function saveAttemptMeta(attemptId: string, meta: AttemptExtendedMeta): Promise<void> {
  const key = `attempt_meta_${attemptId}`;
  const value = JSON.stringify(meta);
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value }
  });
}

export async function getInstructorQuestionBank(instructorId: string): Promise<QuestionBankItem[]> {
  try {
    const row = await prisma.platformSetting.findUnique({
      where: { key: `question_bank_${instructorId}` }
    });
    if (!row) return [];
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveInstructorQuestionBank(
  instructorId: string,
  items: QuestionBankItem[]
): Promise<void> {
  const key = `question_bank_${instructorId}`;
  const value = JSON.stringify(items);
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value }
  });
}

export async function getAssignmentMeta(assignmentId: string): Promise<AssignmentExtendedMeta | null> {
  try {
    const row = await prisma.platformSetting.findUnique({
      where: { key: `assignment_meta_${assignmentId}` }
    });
    if (!row) return null;
    return JSON.parse(row.value) as AssignmentExtendedMeta;
  } catch {
    return null;
  }
}

export async function saveAssignmentMeta(
  assignmentId: string,
  meta: AssignmentExtendedMeta
): Promise<void> {
  const key = `assignment_meta_${assignmentId}`;
  const value = JSON.stringify({
    ...meta,
    assignmentId,
    updatedAt: new Date().toISOString()
  });
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value }
  });
}

export async function getSubmissionHistory(
  assignmentId: string,
  userId: string
): Promise<SubmissionVersionItem[]> {
  try {
    const row = await prisma.platformSetting.findUnique({
      where: { key: `submission_history_${assignmentId}_${userId}` }
    });
    if (!row) return [];
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveSubmissionHistory(
  assignmentId: string,
  userId: string,
  history: SubmissionVersionItem[]
): Promise<void> {
  const key = `submission_history_${assignmentId}_${userId}`;
  const value = JSON.stringify(history);
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value }
  });
}

/**
 * Server-side question evaluation & scoring engine.
 * Supports Single Choice, Multiple Answer (Exact Match or Partial Credit), and True/False.
 */
export function evaluateQuizSubmissionServerSide(params: {
  questions: Array<{
    id: string;
    question: string;
    type: string;
    explanation?: string | null;
    marks: number;
    options: Array<{ id: string; text: string; isCorrect: boolean }>;
  }>;
  studentAnswers: Array<{
    questionId: string;
    selectedOptionIds?: string[];
    selectedOptionId?: string;
  }>;
  passingPercentage: number;
  multipleAnswerRule: MultipleAnswerScoringRule;
}) {
  const { questions, studentAnswers, passingPercentage, multipleAnswerRule } = params;

  let totalMarks = 0;
  let obtainedMarks = 0;

  const questionBreakdown: AttemptExtendedMeta['questionBreakdown'] = [];

  for (const q of questions) {
    const qMarks = Number(q.marks) > 0 ? Number(q.marks) : 1;
    totalMarks += qMarks;

    const normType = normalizeQuestionType(q.type);
    const ansObj = studentAnswers.find((a) => a.questionId === q.id);
    const rawSelected = Array.isArray(ansObj?.selectedOptionIds)
      ? ansObj!.selectedOptionIds
      : ansObj?.selectedOptionId
      ? [ansObj.selectedOptionId]
      : [];
    const selectedOptionIds = Array.from(new Set(rawSelected.map(String)));

    const correctOptionIds = q.options.filter((o) => o.isCorrect).map((o) => String(o.id));

    let isCorrect = false;
    let marksAwarded = 0;

    if (normType === 'MULTIPLE_ANSWER') {
      const hasWrongSelection = selectedOptionIds.some((id) => !correctOptionIds.includes(id));
      const matchedCount = selectedOptionIds.filter((id) => correctOptionIds.includes(id)).length;

      if (
        !hasWrongSelection &&
        matchedCount === correctOptionIds.length &&
        correctOptionIds.length > 0
      ) {
        isCorrect = true;
        marksAwarded = qMarks;
      } else if (
        multipleAnswerRule === 'PARTIAL_CREDIT' &&
        !hasWrongSelection &&
        matchedCount > 0 &&
        correctOptionIds.length > 0
      ) {
        isCorrect = false;
        marksAwarded = Number(((matchedCount / correctOptionIds.length) * qMarks).toFixed(2));
      } else {
        isCorrect = false;
        marksAwarded = 0;
      }
    } else {
      // SINGLE_CHOICE or TRUE_FALSE
      isCorrect =
        selectedOptionIds.length === 1 &&
        correctOptionIds.length === 1 &&
        selectedOptionIds[0] === correctOptionIds[0];
      marksAwarded = isCorrect ? qMarks : 0;
    }

    obtainedMarks += marksAwarded;

    questionBreakdown.push({
      questionId: q.id,
      questionText: q.question,
      questionType: normType,
      selectedOptionIds,
      correctOptionIds,
      isCorrect,
      marksAwarded,
      maxMarks: qMarks,
      explanation: q.explanation || null
    });
  }

  obtainedMarks = Number(obtainedMarks.toFixed(2));
  totalMarks = Number(totalMarks.toFixed(2));
  const percentage =
    totalMarks > 0 ? Number(((obtainedMarks / totalMarks) * 100).toFixed(1)) : 100.0;
  const passed = percentage >= passingPercentage;

  return {
    totalMarks,
    obtainedMarks,
    percentage,
    passed,
    questionBreakdown
  };
}

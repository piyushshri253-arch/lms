import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notification';
import { checkTitleMinorSpellingFix } from '@/lib/course-title-validator';

export type ChangeCategory =
  | 'PRICE'
  | 'VIDEO'
  | 'CURRICULUM'
  | 'QUIZ'
  | 'ASSIGNMENT'
  | 'LEARNING_OUTCOMES'
  | 'CERTIFICATION'
  | 'MINOR'
  | 'UNCLASSIFIED';

export interface DetectedCourseChange {
  category: ChangeCategory;
  field: string;
  summary: string;
  before?: any;
  after?: any;
}

export interface StagedCourseSnapshot {
  title: string;
  description: string;
  shortDescription?: string;
  price: number;
  discountPrice?: number | null;
  currency?: string;
  level?: string;
  language?: string;
  durationHours?: number;
  thumbnail?: string;
  banner?: string;
  accessType?: string;
  accessDays?: number | null;
  whatYouWillLearn?: string[];
  requirements?: string[];
  targetAudience?: string[];
  seoTitle?: string;
  seoDescription?: string;
  sections: {
    id?: string;
    title: string;
    description?: string;
    order: number;
    lessons: {
      id?: string;
      title: string;
      description?: string;
      type: string;
      content?: string | null;
      videoUrl?: string | null;
      pdfUrl?: string | null;
      fileUrl?: string | null;
      quizData?: any;
      duration?: string;
      durationSeconds?: number;
      isFree?: boolean;
      isFinalAssignment?: boolean;
      isPublished?: boolean;
      order: number;
    }[];
  }[];
}

export interface CourseVersionHistoryEntry {
  versionNumber: number;
  versionLabel: string; // e.g., "v1.0", "v2.0"
  status?: string; // e.g. "PUBLISHED", "SUPERSEDED", "APPROVED"
  publishedAt: string;
  approvedBy: string;
  creatorName?: string;
  changeSummary: string[];
  price: number;
  modulesCount: number;
  lessonsCount: number;
  lessonIds?: string[];
  snapshot?: Partial<StagedCourseSnapshot>;
}

export interface CourseVersionState {
  courseId: string;
  liveVersionNumber: number;
  liveVersionLabel: string; // e.g., "v1.0"
  pendingVersionNumber: number | null;
  pendingVersionLabel: string | null; // e.g., "v2.0"
  status: 'LIVE_SYNCED' | 'DRAFT_VERSION' | 'PENDING_REVIEW' | 'VERSION_REJECTED' | 'APPROVED';
  detectedChanges: DetectedCourseChange[];
  stagedSnapshot: StagedCourseSnapshot | null;
  submittedAt: string | null;
  submittedBy: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewerFeedback: string | null;
  history: CourseVersionHistoryEntry[];
  updatedAt: string;
  uploadedExcel?: {
    fileName: string;
    fileSize?: number;
    fileData?: string;
    uploadedAt?: string;
  } | null;
}

export const DEFAULT_COURSE_VERSION_STATE = (courseId: string): CourseVersionState => ({
  courseId,
  liveVersionNumber: 1,
  liveVersionLabel: 'v1.0',
  pendingVersionNumber: null,
  pendingVersionLabel: null,
  status: 'LIVE_SYNCED',
  detectedChanges: [],
  stagedSnapshot: null,
  submittedAt: null,
  submittedBy: null,
  reviewedAt: null,
  reviewedBy: null,
  reviewerFeedback: null,
  history: [
    {
      versionNumber: 1,
      versionLabel: 'v1.0',
      publishedAt: new Date().toISOString(),
      approvedBy: 'Initial Release',
      changeSummary: ['Initial published course release'],
      price: 0,
      modulesCount: 0,
      lessonsCount: 0
    }
  ],
  updatedAt: new Date().toISOString()
});

export async function getCourseVersionState(courseId: string): Promise<CourseVersionState> {
  const key = `course_version_${courseId}`;
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key } });
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      return { ...DEFAULT_COURSE_VERSION_STATE(courseId), ...parsed, courseId };
    }
  } catch {}
  return DEFAULT_COURSE_VERSION_STATE(courseId);
}

export async function saveCourseVersionState(
  courseId: string,
  partial: Partial<CourseVersionState>
): Promise<CourseVersionState> {
  const key = `course_version_${courseId}`;
  const current = await getCourseVersionState(courseId);
  const merged: CourseVersionState = {
    ...current,
    ...partial,
    courseId,
    updatedAt: new Date().toISOString()
  };
  await prisma.platformSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(merged) },
    create: { key, value: JSON.stringify(merged) }
  });
  return merged;
}

/**
 * Returns the version number of the course that a student purchased/enrolled in.
 * If the student enrolled when Version 1 was active, they own Version 1.
 * If Version 2 is now live, they will not have access to Version 2 updates unless they purchase Version 2.
 */
export async function getStudentEnrolledVersion(
  userId: string,
  courseId: string
): Promise<number | null> {
  const key = `student_version_${userId}_${courseId}`;
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key } });
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      if (typeof parsed.versionNumber === 'number') {
        return parsed.versionNumber;
      }
    }
  } catch {}

  // Fallback to checking student's active enrollment timestamp against version publication history
  try {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } }
    });
    if (!enrollment) return null;

    const verState = await getCourseVersionState(courseId);
    if (verState.history && verState.history.length > 1) {
      const sortedHistory = [...verState.history].sort((a, b) => a.versionNumber - b.versionNumber);
      let matchedVersion = 1;
      const enrolledTime = new Date(enrollment.enrolledAt).getTime();
      for (const h of sortedHistory) {
        if (enrolledTime >= new Date(h.publishedAt).getTime()) {
          matchedVersion = h.versionNumber;
        }
      }
      return matchedVersion;
    }
  } catch {}

  return 1;
}

/**
 * Saves/upgrades the version number of the course owned by the student (e.g. upon purchasing Version 2).
 */
export async function setStudentEnrolledVersion(
  userId: string,
  courseId: string,
  versionNumber: number
): Promise<void> {
  const key = `student_version_${userId}_${courseId}`;
  const payload = {
    userId,
    courseId,
    versionNumber,
    enrolledAt: new Date().toISOString()
  };
  await prisma.platformSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(payload) },
    create: { key, value: JSON.stringify(payload) }
  });
}

/**
 * Helper to normalize string arrays for comparison
 */
function normalizeStringArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean);
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
    if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
  } catch {}
  return [String(val).trim()].filter(Boolean);
}

/**
 * Classifies edits to a PUBLISHED course into Major Changes (requiring version staging + Auditor review)
 * vs Minor Changes (safe to apply immediately to live course).
 *
 * Rules:
 * 1. Minor: typos, grammar, punctuation, short metadata, thumbnail presentation, minor formatting.
 * 2. Major: modules/lessons addition/deletion/reorder, video replacement/duration change, learning outcomes,
 *    quizzes, assignments, price/discount/access changes, certification criteria.
 * 3. Mixed/Uncertain: Any batch with at least one major change is classified as Major. Any unrecognized
 *    or ambiguous change is classified as Major (UNCLASSIFIED) to prevent accidental auto-publishing.
 */
export function classifyCourseChanges(
  liveCourse: any,
  incomingBody: any
): {
  hasMajorChanges: boolean;
  hasMinorChanges: boolean;
  isMixedOrUncertain: boolean;
  majorChanges: DetectedCourseChange[];
  minorChanges: DetectedCourseChange[];
} {
  const majorChanges: DetectedCourseChange[] = [];
  const minorChanges: DetectedCourseChange[] = [];

  // 1. Check Price & Access Changes (MAJOR)
  if (
    incomingBody.price !== undefined &&
    Number(incomingBody.price) !== Number(liveCourse.price)
  ) {
    majorChanges.push({
      category: 'PRICE',
      field: 'price',
      summary: `Course price changed from ₹${liveCourse.price} to ₹${Number(incomingBody.price)}`,
      before: liveCourse.price,
      after: Number(incomingBody.price)
    });
  }

  if (
    incomingBody.discountPrice !== undefined &&
    Number(incomingBody.discountPrice || 0) !== Number(liveCourse.discountPrice || 0)
  ) {
    majorChanges.push({
      category: 'PRICE',
      field: 'discountPrice',
      summary: `Discount price changed from ₹${liveCourse.discountPrice || 0} to ₹${Number(incomingBody.discountPrice || 0)}`,
      before: liveCourse.discountPrice,
      after: incomingBody.discountPrice
    });
  }

  if (
    incomingBody.currency !== undefined &&
    incomingBody.currency !== (liveCourse.currency || 'INR')
  ) {
    majorChanges.push({
      category: 'PRICE',
      field: 'currency',
      summary: `Course currency changed from ${liveCourse.currency || 'INR'} to ${incomingBody.currency}`,
      before: liveCourse.currency,
      after: incomingBody.currency
    });
  }

  if (
    incomingBody.accessType !== undefined &&
    incomingBody.accessType !== (liveCourse.accessType || 'LIFETIME')
  ) {
    majorChanges.push({
      category: 'PRICE',
      field: 'accessType',
      summary: `Course access type changed from ${liveCourse.accessType || 'LIFETIME'} to ${incomingBody.accessType}`,
      before: liveCourse.accessType,
      after: incomingBody.accessType
    });
  }

  if (
    incomingBody.accessDays !== undefined &&
    Number(incomingBody.accessDays || 0) !== Number(liveCourse.accessDays || 0)
  ) {
    majorChanges.push({
      category: 'PRICE',
      field: 'accessDays',
      summary: `Access duration changed from ${liveCourse.accessDays || 'unlimited'} days to ${incomingBody.accessDays} days`,
      before: liveCourse.accessDays,
      after: incomingBody.accessDays
    });
  }

  // 2. Check Learning Outcomes, Prerequisites, Target Audience (MAJOR)
  if (incomingBody.whatYouWillLearn !== undefined) {
    const liveOutcomes = normalizeStringArray(liveCourse.whatYouWillLearn);
    const incomingOutcomes = normalizeStringArray(incomingBody.whatYouWillLearn);
    if (JSON.stringify(liveOutcomes) !== JSON.stringify(incomingOutcomes)) {
      majorChanges.push({
        category: 'LEARNING_OUTCOMES',
        field: 'whatYouWillLearn',
        summary: `Course learning outcomes modified (${liveOutcomes.length} items → ${incomingOutcomes.length} items)`,
        before: liveOutcomes,
        after: incomingOutcomes
      });
    }
  }

  if (incomingBody.requirements !== undefined) {
    const liveReqs = normalizeStringArray(liveCourse.requirements);
    const incomingReqs = normalizeStringArray(incomingBody.requirements);
    if (JSON.stringify(liveReqs) !== JSON.stringify(incomingReqs)) {
      majorChanges.push({
        category: 'LEARNING_OUTCOMES',
        field: 'requirements',
        summary: `Course prerequisites modified (${liveReqs.length} items → ${incomingReqs.length} items)`,
        before: liveReqs,
        after: incomingReqs
      });
    }
  }

  if (incomingBody.targetAudience !== undefined) {
    const liveAudience = normalizeStringArray(liveCourse.targetAudience);
    const incomingAudience = normalizeStringArray(incomingBody.targetAudience);
    if (JSON.stringify(liveAudience) !== JSON.stringify(incomingAudience)) {
      majorChanges.push({
        category: 'LEARNING_OUTCOMES',
        field: 'targetAudience',
        summary: `Target audience modified (${liveAudience.length} items → ${incomingAudience.length} items)`,
        before: liveAudience,
        after: incomingAudience
      });
    }
  }

  // 3. Check Curriculum, Video, Quiz, and Assignment Changes (MAJOR vs MINOR)
  if (incomingBody.sections && Array.isArray(incomingBody.sections)) {
    const liveSections: any[] = liveCourse.sections || [];
    const incomingSections: any[] = incomingBody.sections;

    if (incomingSections.length !== liveSections.length) {
      majorChanges.push({
        category: 'CURRICULUM',
        field: 'sections.length',
        summary: `Curriculum modules count changed from ${liveSections.length} to ${incomingSections.length}`,
        before: liveSections.length,
        after: incomingSections.length
      });
    }

    const liveLessonsMap = new Map<string, any>();
    for (const sec of liveSections) {
      for (const les of sec.lessons || []) {
        liveLessonsMap.set(les.id, { ...les, sectionTitle: sec.title });
      }
    }

    const incomingLessonsFlat: any[] = [];
    for (const sec of incomingSections) {
      const matchingLiveSec = sec.id
        ? liveSections.find((ls: any) => ls.id === sec.id)
        : null;

      if (sec.id && !matchingLiveSec) {
        majorChanges.push({
          category: 'CURRICULUM',
          field: 'section.added',
          summary: `New curriculum module added: "${sec.title}"`
        });
      } else if (matchingLiveSec) {
        if (sec.title && sec.title.trim() !== matchingLiveSec.title.trim()) {
          minorChanges.push({
            category: 'MINOR',
            field: `section.${matchingLiveSec.id}.title`,
            summary: `Module title updated: "${matchingLiveSec.title}" → "${sec.title}"`
          });
        }
        if (sec.description !== undefined && (sec.description || '').trim() !== (matchingLiveSec.description || '').trim()) {
          minorChanges.push({
            category: 'MINOR',
            field: `section.${matchingLiveSec.id}.description`,
            summary: `Module description updated in "${sec.title}"`
          });
        }
      }
      for (const les of sec.lessons || []) {
        incomingLessonsFlat.push({ ...les, sectionTitle: sec.title });
      }
    }

    if (incomingLessonsFlat.length !== liveLessonsMap.size) {
      majorChanges.push({
        category: 'CURRICULUM',
        field: 'lessons.length',
        summary: `Total lessons count changed from ${liveLessonsMap.size} to ${incomingLessonsFlat.length}`,
        before: liveLessonsMap.size,
        after: incomingLessonsFlat.length
      });
    }

    // Compare each incoming lesson with existing live lesson
    for (const incLes of incomingLessonsFlat) {
      const existingLes = incLes.id ? liveLessonsMap.get(incLes.id) : null;
      if (!existingLes) {
        majorChanges.push({
          category: 'CURRICULUM',
          field: 'lesson.added',
          summary: `Added new ${incLes.type || 'VIDEO'} lesson: "${incLes.title}" in ${incLes.sectionTitle}`
        });
        if (incLes.videoUrl) {
          majorChanges.push({
            category: 'VIDEO',
            field: 'lesson.videoUrl',
            summary: `New video uploaded/linked for lesson "${incLes.title}"`
          });
        }
        if (incLes.isFinalAssignment) {
          majorChanges.push({
            category: 'ASSIGNMENT',
            field: 'lesson.isFinalAssignment',
            summary: `Final assessment added: "${incLes.title}"`
          });
        }
        continue;
      }

      // Check Final Assessment flag
      if (Boolean(incLes.isFinalAssignment) !== Boolean(existingLes.isFinalAssignment)) {
        majorChanges.push({
          category: 'ASSIGNMENT',
          field: `lesson.${existingLes.id}.isFinalAssignment`,
          summary: `Assessment status modified for lesson "${existingLes.title}"`
        });
      }

      // Check Video URL Change
      const oldVideo = (existingLes.videoUrl || '').trim();
      const newVideo = (incLes.videoUrl !== undefined ? incLes.videoUrl || '' : oldVideo).trim();
      if (oldVideo !== newVideo) {
        // Material video change requires review
        majorChanges.push({
          category: 'VIDEO',
          field: `lesson.${existingLes.id}.videoUrl`,
          summary: `Video replaced in lesson "${existingLes.title}"`,
          before: oldVideo || 'None',
          after: newVideo || 'Removed'
        });
      }

      // Check Video Duration (material change > 10%)
      if (
        incLes.durationSeconds !== undefined &&
        existingLes.durationSeconds !== undefined &&
        existingLes.durationSeconds > 0
      ) {
        const diffRatio = Math.abs(incLes.durationSeconds - existingLes.durationSeconds) / existingLes.durationSeconds;
        if (diffRatio > 0.1) {
          majorChanges.push({
            category: 'VIDEO',
            field: `lesson.${existingLes.id}.durationSeconds`,
            summary: `Video duration changed significantly in lesson "${existingLes.title}" (${existingLes.durationSeconds}s → ${incLes.durationSeconds}s)`,
            before: existingLes.durationSeconds,
            after: incLes.durationSeconds
          });
        }
      }

      // Check Lesson Type Change
      if (incLes.type && incLes.type !== existingLes.type) {
        majorChanges.push({
          category: 'CURRICULUM',
          field: `lesson.${existingLes.id}.type`,
          summary: `Lesson "${existingLes.title}" type changed from ${existingLes.type} to ${incLes.type}`,
          before: existingLes.type,
          after: incLes.type
        });
      }

      // Check Quiz Data Change
      const oldQuizStr =
        typeof existingLes.quizData === 'string'
          ? existingLes.quizData
          : existingLes.quizData
          ? JSON.stringify(existingLes.quizData)
          : '';
      const newQuizStr =
        typeof incLes.quizData === 'string'
          ? incLes.quizData
          : incLes.quizData
          ? JSON.stringify(incLes.quizData)
          : '';
      if (incLes.quizData !== undefined && oldQuizStr !== newQuizStr) {
        majorChanges.push({
          category: 'QUIZ',
          field: `lesson.${existingLes.id}.quizData`,
          summary: `Quiz questions, scoring, or pass marks modified in lesson "${existingLes.title}"`
        });
      }

      // Check Lesson Content (articles/text)
      if (incLes.content !== undefined && incLes.content !== existingLes.content) {
        const oldContent = (existingLes.content || '').trim();
        const newContent = (incLes.content || '').trim();
        const lenDiff = Math.abs(newContent.length - oldContent.length);
        if (lenDiff > 100 || (oldContent.length > 0 && lenDiff / oldContent.length > 0.3)) {
          // Significant text rewrite -> Major
          majorChanges.push({
            category: 'CURRICULUM',
            field: `lesson.${existingLes.id}.content`,
            summary: `Lesson content substantially revised in "${existingLes.title}"`
          });
        } else {
          // Typo/spelling/formatting fix in lesson text -> Minor
          minorChanges.push({
            category: 'MINOR',
            field: `lesson.${existingLes.id}.content`,
            summary: `Minor text/formatting update in lesson "${existingLes.title}"`
          });
        }
      }

      // Check Lesson Title Change
      if (incLes.title && incLes.title.trim() !== existingLes.title.trim()) {
        minorChanges.push({
          category: 'MINOR',
          field: `lesson.${existingLes.id}.title`,
          summary: `Lesson renamed from "${existingLes.title}" to "${incLes.title}"`
        });
      }
    }

    // Check if any live lesson was deleted
    for (const [liveId, liveLes] of liveLessonsMap.entries()) {
      if (!incomingLessonsFlat.some((il) => il.id === liveId)) {
        majorChanges.push({
          category: 'CURRICULUM',
          field: 'lesson.deleted',
          summary: `Removed lesson "${liveLes.title}" from ${liveLes.sectionTitle}`
        });
      }
    }
  }

  // 4. Check Minor Metadata Changes (Title typos, Description typos, Thumbnail presentation, SEO)
  if (
    incomingBody.title !== undefined &&
    incomingBody.title.trim() !== liveCourse.title.trim()
  ) {
    const oldTitle = liveCourse.title.trim();
    const newTitle = incomingBody.title.trim();
    const titleCheck = checkTitleMinorSpellingFix(oldTitle, newTitle);
    if (!titleCheck.isMinorFix) {
      majorChanges.push({
        category: 'CURRICULUM',
        field: 'title',
        summary: titleCheck.reason || `Course title significantly renamed to "${newTitle}"`,
        before: oldTitle,
        after: newTitle
      });
    } else {
      minorChanges.push({
        category: 'MINOR',
        field: 'title',
        summary: `Course title spelling/typo fix: "${oldTitle}" → "${newTitle}"`
      });
    }
  }

  if (
    incomingBody.description !== undefined &&
    incomingBody.description.trim() !== (liveCourse.description || '').trim()
  ) {
    const oldDesc = (liveCourse.description || '').trim();
    const newDesc = incomingBody.description.trim();
    const lenDiff = Math.abs(newDesc.length - oldDesc.length);
    if (lenDiff > 200 || (oldDesc.length > 0 && lenDiff / oldDesc.length > 0.4)) {
      majorChanges.push({
        category: 'CURRICULUM',
        field: 'description',
        summary: 'Major syllabus and course description overhaul',
        before: `${oldDesc.substring(0, 60)}...`,
        after: `${newDesc.substring(0, 60)}...`
      });
    } else {
      minorChanges.push({
        category: 'MINOR',
        field: 'description',
        summary: 'Course description & syllabus text typos/formatting updated'
      });
    }
  }

  if (
    incomingBody.shortDescription !== undefined &&
    incomingBody.shortDescription.trim() !== (liveCourse.shortDescription || '').trim()
  ) {
    minorChanges.push({
      category: 'MINOR',
      field: 'shortDescription',
      summary: 'Course subtitle/short description updated'
    });
  }

  if (
    incomingBody.thumbnail !== undefined &&
    incomingBody.thumbnail.trim() !== (liveCourse.thumbnail || '').trim()
  ) {
    // Replacing thumbnail is a visual rebranding/major change that requires a version update
    majorChanges.push({
      category: 'CURRICULUM',
      field: 'thumbnail',
      summary: 'Course thumbnail replacement (Requires version update)',
      before: liveCourse.thumbnail ? 'Existing Thumbnail' : 'None',
      after: 'New Thumbnail'
    });
  }

  if (
    incomingBody.banner !== undefined &&
    incomingBody.banner.trim() !== (liveCourse.banner || '').trim()
  ) {
    minorChanges.push({
      category: 'MINOR',
      field: 'banner',
      summary: 'Course banner visual asset updated'
    });
  }

  if (
    incomingBody.seoTitle !== undefined &&
    incomingBody.seoTitle.trim() !== (liveCourse.seoTitle || '').trim()
  ) {
    minorChanges.push({
      category: 'MINOR',
      field: 'seoTitle',
      summary: 'Course SEO title meta tag updated'
    });
  }

  if (
    incomingBody.seoDescription !== undefined &&
    incomingBody.seoDescription.trim() !== (liveCourse.seoDescription || '').trim()
  ) {
    minorChanges.push({
      category: 'MINOR',
      field: 'seoDescription',
      summary: 'Course SEO description meta tag updated'
    });
  }

  const hasMajor = majorChanges.length > 0;
  const hasMinor = minorChanges.length > 0;
  const isMixed = hasMajor && hasMinor;

  return {
    hasMajorChanges: hasMajor,
    hasMinorChanges: hasMinor,
    isMixedOrUncertain: isMixed,
    majorChanges,
    minorChanges
  };
}

/**
 * Creates or retrieves an existing draft version for a PUBLISHED course.
 * Preserves the Course ID, increments version number ($V1 -> $V2), copies all content,
 * and prevents duplicate drafts on repeated clicks.
 */
export async function createOrGetDraftVersion(
  courseId: string,
  user?: { id: string; name: string }
): Promise<{
  isNewDraft: boolean;
  versionState: CourseVersionState;
  draftUrl: string;
}> {
  const versionState = await getCourseVersionState(courseId);

  // If an active draft already exists (either being edited or pending review), reuse it without duplication
  if (
    (versionState.status === 'DRAFT_VERSION' || versionState.status === 'PENDING_REVIEW') &&
    versionState.stagedSnapshot
  ) {
    return {
      isNewDraft: false,
      versionState,
      draftUrl: `/instructor/courses/builder?courseId=${encodeURIComponent(courseId)}&mode=version_draft`
    };
  }

  const liveCourse = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' }
          }
        }
      }
    }
  });

  if (!liveCourse) {
    throw new Error('Course not found');
  }

  let whatYouWillLearn: string[] = [];
  let requirements: string[] = [];
  let targetAudience: string[] = [];
  try { whatYouWillLearn = JSON.parse(liveCourse.whatYouWillLearn || '[]'); } catch {}
  try { requirements = JSON.parse(liveCourse.requirements || '[]'); } catch {}
  try { targetAudience = JSON.parse(liveCourse.targetAudience || '[]'); } catch {}

  const nextVerNum = (versionState.liveVersionNumber || 1) + 1;
  const nextVerLabel = `v${nextVerNum}.0`;

  const stagedSnapshot: StagedCourseSnapshot = {
    title: liveCourse.title,
    description: liveCourse.description,
    shortDescription: liveCourse.shortDescription || '',
    price: liveCourse.price,
    discountPrice: liveCourse.discountPrice,
    currency: liveCourse.currency,
    level: liveCourse.level,
    language: liveCourse.language,
    durationHours: liveCourse.durationHours,
    thumbnail: liveCourse.thumbnail,
    banner: liveCourse.banner || '',
    accessType: liveCourse.accessType,
    accessDays: liveCourse.accessDays,
    whatYouWillLearn,
    requirements,
    targetAudience,
    seoTitle: liveCourse.seoTitle || '',
    seoDescription: liveCourse.seoDescription || '',
    sections: liveCourse.sections.map((sec, sIdx) => ({
      id: sec.id,
      title: sec.title,
      description: sec.description || '',
      order: sec.order || sIdx + 1,
      lessons: sec.lessons.map((les, lIdx) => ({
        id: les.id,
        title: les.title,
        description: les.description || '',
        type: les.type,
        content: les.content,
        videoUrl: les.videoUrl,
        pdfUrl: les.pdfUrl,
        fileUrl: les.fileUrl,
        quizData: les.quizData,
        duration: les.duration,
        durationSeconds: les.durationSeconds,
        isFree: les.isFree,
        isFinalAssignment: Boolean((les as any).isFinalAssignment || (les.type === 'QUIZ' && /final\s*(assessment|assignment|exam)/i.test(les.title || ''))),
        isPublished: les.isPublished,
        order: les.order || lIdx + 1
      }))
    }))
  };

  const updatedState = await saveCourseVersionState(courseId, {
    status: 'DRAFT_VERSION',
    pendingVersionNumber: nextVerNum,
    pendingVersionLabel: nextVerLabel,
    stagedSnapshot,
    detectedChanges: [],
    submittedAt: null,
    submittedBy: user?.name || null
  });

  return {
    isNewDraft: true,
    versionState: updatedState,
    draftUrl: `/instructor/courses/builder?courseId=${encodeURIComponent(courseId)}&mode=version_draft`
  };
}

/**
 * Discards / Deletes an in-progress draft version for a course.
 * Resets status to LIVE_SYNCED and clears stagedSnapshot,
 * leaving the live published course active and 100% untouched.
 */
export async function discardDraftVersion(
  courseId: string,
  user?: { id?: string; name?: string; role?: string }
): Promise<CourseVersionState> {
  const currentState = await getCourseVersionState(courseId);
  const discardedVersion = currentState.pendingVersionLabel || `v${(currentState.liveVersionNumber || 1) + 1}.0`;

  const updatedState: CourseVersionState = {
    ...currentState,
    pendingVersionNumber: null,
    pendingVersionLabel: null,
    status: 'LIVE_SYNCED',
    detectedChanges: [],
    stagedSnapshot: null,
    submittedAt: null,
    submittedBy: null,
    reviewerFeedback: null,
    updatedAt: new Date().toISOString()
  };

  await saveCourseVersionState(courseId, updatedState);

  if (user?.id) {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { organizationId: true, title: true }
      });
      if (course?.organizationId) {
        await prisma.auditLog.create({
          data: {
            organizationId: course.organizationId,
            adminId: user.id,
            action: 'DISCARD_COURSE_VERSION_DRAFT',
            entity: 'Course',
            entityId: courseId,
            description: `${user.role || 'User'} "${user.name || 'Instructor'}" deleted/discarded draft Version ${discardedVersion} for "${course.title}". Live published course remains active.`
          }
        });
      }
    } catch {}
  }

  return updatedState;
}

/**
 * Applies purely minor updates directly to the live published course, recording an audit log.
 */
export async function applyMinorUpdateToLiveCourse(
  courseId: string,
  updates: any,
  user: { id: string; name: string; role: string },
  minorChanges: DetectedCourseChange[]
) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { organizationId: true, title: true }
  });

  if (!course) throw new Error('Course not found');

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: {
      title: updates.title !== undefined ? updates.title.trim() : undefined,
      description: updates.description !== undefined ? updates.description : undefined,
      shortDescription: updates.shortDescription !== undefined ? updates.shortDescription : undefined,
      // Thumbnail and Banner are locked in minor edits (rebranding requires version update)
      thumbnail: undefined,
      banner: undefined,
      level: updates.level !== undefined ? updates.level : undefined,
      language: updates.language !== undefined ? updates.language : undefined,
      durationHours: updates.durationHours !== undefined ? Number(updates.durationHours) : undefined,
      seoTitle: updates.seoTitle !== undefined ? updates.seoTitle : undefined,
      seoDescription: updates.seoDescription !== undefined ? updates.seoDescription : undefined,
      updatedAt: new Date()
    }
  });

  // Apply minor updates to existing modules and lectures (typos/spelling fixes)
  if (updates.sections && Array.isArray(updates.sections)) {
    for (const sec of updates.sections) {
      if (sec.id && !sec.id.startsWith('sec-')) {
        await prisma.courseSection.update({
          where: { id: sec.id },
          data: {
            title: sec.title !== undefined ? sec.title.trim() : undefined,
            description: sec.description !== undefined ? sec.description : undefined
          }
        }).catch(() => {});
      }
      for (const les of sec.lessons || []) {
        if (les.id && !les.id.startsWith('les-')) {
          await prisma.lesson.update({
            where: { id: les.id },
            data: {
              title: les.title !== undefined ? les.title.trim() : undefined,
              description: les.description !== undefined ? les.description : undefined,
              content: les.content !== undefined ? les.content : undefined
            }
          }).catch(() => {});
        }
      }
    }
  }

  const versionState = await getCourseVersionState(courseId);
  // Clear any open draft version state since minor edits were applied live
  await saveCourseVersionState(courseId, {
    status: 'LIVE_SYNCED',
    pendingVersionNumber: null,
    pendingVersionLabel: null,
    stagedSnapshot: null,
    detectedChanges: []
  });

  await prisma.auditLog.create({
    data: {
      organizationId: course.organizationId,
      adminId: user.id,
      adminEmail: user.name,
      action: 'MINOR_CHANGE_AUTOPUBLISHED',
      entity: 'Course',
      entityId: courseId,
      description: `Minor changes auto-published for "${course.title}" (${versionState.liveVersionLabel}): ${minorChanges.map((c) => c.summary).join('; ')}`
    }
  }).catch(() => {});

  return updated;
}

/**
 * Applies a staged version snapshot by publishing Version 2.0+ as a SEPARATE LIVE COURSE
 * in the database alongside Version 1.0, preserving Version 1.0 completely untouched (zero deletions, zero overwrites).
 */
export async function applyApprovedVersionToLiveCourse(
  courseId: string,
  reviewer: { id: string; name: string; email: string; role: string },
  reviewerNote?: string
) {
  const versionState = await getCourseVersionState(courseId);
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      sections: { include: { lessons: true } }
    }
  });

  if (!course) {
    throw new Error('Course not found');
  }

  const snap = versionState.stagedSnapshot;
  const nextVersionNumber = versionState.pendingVersionNumber || ((versionState.liveVersionNumber || 1) + 1);
  const nextVersionLabel = versionState.pendingVersionLabel || `v${nextVersionNumber}.0`;
  const currentLiveVersionNumber = versionState.liveVersionNumber || 1;
  const currentLiveVersionLabel = versionState.liveVersionLabel || `v${currentLiveVersionNumber}.0`;

  // 1. Ensure original course (v1.0 or current live version) is cleanly labeled with its version
  //    and remains 100% active and untouched (no lessons or sections deleted or overwritten!)
  const baseTitle = course.title.replace(/\s*\(v\d+(\.\d+)?\)\s*$/i, '').trim();
  const baseSlug = course.slug.replace(/-v\d+$/i, '').trim();

  // If original course title doesn't end with (v...), append (v1.0)
  if (!/\(v\d+(\.\d+)?\)$/i.test(course.title)) {
    await prisma.course.update({
      where: { id: course.id },
      data: {
        title: `${baseTitle} (${currentLiveVersionLabel})`
      }
    }).catch(() => {});
  }

  // 2. Generate unique slug and title for the new upgraded version course
  let newSlug = `${baseSlug}-v${nextVersionNumber}`;
  const slugCollision = await prisma.course.findFirst({
    where: {
      slug: newSlug,
      ...(course.organizationId ? { organizationId: course.organizationId } : {})
    }
  });
  if (slugCollision) {
    newSlug = `${baseSlug}-v${nextVersionNumber}-${Date.now().toString(36).slice(-4)}`;
  }

  const newTitle = snap?.title
    ? (/\(v\d+(\.\d+)?\)$/i.test(snap.title)
        ? snap.title
        : `${snap.title.replace(/\s*\(v\d+(\.\d+)?\)\s*$/i, '').trim()} (${nextVersionLabel})`)
    : `${baseTitle} (${nextVersionLabel})`;

  // 3. Create the NEW Course record in Prisma for Version 2.0+
  const newCourse = await prisma.course.create({
    data: {
      organizationId: course.organizationId,
      instructorId: course.instructorId,
      categoryId: course.categoryId,
      title: newTitle,
      slug: newSlug,
      description: snap?.description !== undefined ? snap.description : course.description,
      shortDescription: snap?.shortDescription !== undefined ? snap.shortDescription : course.shortDescription,
      price: snap?.price !== undefined ? Number(snap.price) : course.price,
      discountPrice: snap?.discountPrice !== undefined ? snap.discountPrice : course.discountPrice,
      currency: snap?.currency || course.currency,
      level: snap?.level || course.level,
      language: snap?.language || course.language,
      durationHours: snap?.durationHours !== undefined ? Number(snap.durationHours) : course.durationHours,
      thumbnail: snap?.thumbnail !== undefined ? snap.thumbnail : course.thumbnail,
      banner: snap?.banner !== undefined ? snap.banner : course.banner,
      accessType: snap?.accessType || course.accessType,
      accessDays: snap?.accessDays !== undefined ? snap.accessDays : course.accessDays,
      whatYouWillLearn: snap?.whatYouWillLearn ? JSON.stringify(snap.whatYouWillLearn) : course.whatYouWillLearn,
      requirements: snap?.requirements ? JSON.stringify(snap.requirements) : course.requirements,
      targetAudience: snap?.targetAudience ? JSON.stringify(snap.targetAudience) : course.targetAudience,
      seoTitle: snap?.seoTitle !== undefined ? snap.seoTitle : course.seoTitle,
      seoDescription: snap?.seoDescription !== undefined ? snap.seoDescription : course.seoDescription,
      status: 'PUBLISHED',
      reviewedAt: new Date(),
      reviewedById: reviewer.id,
      reviewFeedback: reviewerNote || null
    }
  });

  // 4. Populate Curriculum Sections and Lessons for the NEW course
  const allAppliedLessonIds: string[] = [];
  const sectionsSource = (snap?.sections && Array.isArray(snap.sections) && snap.sections.length > 0)
    ? snap.sections
    : course.sections.map((s) => ({
        title: s.title,
        order: s.order,
        description: s.description || undefined,
        lessons: s.lessons.map((l) => ({
          title: l.title,
          description: l.description || undefined,
          type: l.type,
          content: l.content,
          videoUrl: l.videoUrl,
          pdfUrl: l.pdfUrl,
          fileUrl: l.fileUrl,
          quizData: l.quizData,
          duration: l.duration,
          durationSeconds: l.durationSeconds,
          isFree: l.isFree,
          isPublished: l.isPublished,
          order: l.order,
          resources: (l as any).resources || '[]'
        }))
      }));

  for (let sIdx = 0; sIdx < sectionsSource.length; sIdx++) {
    const secData = sectionsSource[sIdx];
    const createdSection = await prisma.courseSection.create({
      data: {
        courseId: newCourse.id,
        title: secData.title || `Module ${sIdx + 1}`,
        description: (secData as any).description || null,
        order: secData.order || sIdx + 1
      }
    });

    if (secData.lessons && Array.isArray(secData.lessons)) {
      for (let lIdx = 0; lIdx < secData.lessons.length; lIdx++) {
        const lesData = secData.lessons[lIdx];
        const quizDataStr =
          typeof lesData.quizData === 'object' && lesData.quizData !== null
            ? JSON.stringify(lesData.quizData)
            : typeof lesData.quizData === 'string'
            ? lesData.quizData
            : null;

        const effectiveType = lesData.type || (quizDataStr ? 'QUIZ' : 'VIDEO');

        const createdLesson = await prisma.lesson.create({
          data: {
            sectionId: createdSection.id,
            title: lesData.title || `Lesson ${lIdx + 1}`,
            description: (lesData as any).description || null,
            type: effectiveType,
            content: lesData.content || null,
            videoUrl: lesData.videoUrl || null,
            pdfUrl: lesData.pdfUrl || null,
            fileUrl: lesData.fileUrl || null,
            quizData: quizDataStr,
            duration: lesData.duration || '10:00',
            durationSeconds: lesData.durationSeconds || 600,
            isFree: !!lesData.isFree,
            isPublished: lesData.isPublished !== false,
            resources: (lesData as any).resources || '[]',
            order: lesData.order || lIdx + 1
          }
        });
        allAppliedLessonIds.push(createdLesson.id);
      }
    }
  }

  // 5. Version History Entry for New Course
  const totalModules = sectionsSource.length;
  const totalLessons = sectionsSource.reduce((acc, s) => acc + (s.lessons?.length || 0), 0);

  const newHistoryEntry: CourseVersionHistoryEntry = {
    versionNumber: nextVersionNumber,
    versionLabel: nextVersionLabel,
    status: 'PUBLISHED',
    publishedAt: new Date().toISOString(),
    approvedBy: `${reviewer.name} (${reviewer.role})`,
    creatorName: reviewer.name,
    changeSummary:
      versionState.detectedChanges.length > 0
        ? versionState.detectedChanges.map((c) => c.summary)
        : ['Approved course version update'],
    price: snap?.price !== undefined ? Number(snap.price) : course.price,
    modulesCount: totalModules,
    lessonsCount: totalLessons,
    lessonIds: allAppliedLessonIds,
    snapshot: snap || undefined
  };

  // 6. Save Version State for the NEW Course (Version 2.0+)
  await saveCourseVersionState(newCourse.id, {
    liveVersionNumber: nextVersionNumber,
    liveVersionLabel: nextVersionLabel,
    pendingVersionNumber: null,
    pendingVersionLabel: null,
    status: 'LIVE_SYNCED',
    detectedChanges: [],
    stagedSnapshot: null,
    uploadedExcel: versionState.uploadedExcel || null,
    reviewedAt: new Date().toISOString(),
    reviewedBy: `${reviewer.name} (${reviewer.role})`,
    reviewerFeedback: reviewerNote || null,
    history: [newHistoryEntry]
  });

  // 7. Clear staged draft on the original course (Version 1.0) and keep it LIVE_SYNCED
  const updatedOriginalState = await saveCourseVersionState(course.id, {
    liveVersionNumber: currentLiveVersionNumber,
    liveVersionLabel: currentLiveVersionLabel,
    pendingVersionNumber: null,
    pendingVersionLabel: null,
    status: 'LIVE_SYNCED',
    detectedChanges: [],
    stagedSnapshot: null,
    reviewedAt: new Date().toISOString(),
    reviewedBy: `${reviewer.name} (${reviewer.role})`,
    reviewerFeedback: reviewerNote || null,
    history: [newHistoryEntry, ...(versionState.history || [])]
  });

  // 8. Notify Instructor
  if (course.instructorId) {
    await createNotification({
      organizationId: course.organizationId,
      userId: course.instructorId,
      title: `🎉 Course Version ${nextVersionLabel} Published Live!`,
      message: `Your updated course "${newTitle}" is now live as an independent course alongside "${course.title}". Both versions are active!`,
      type: 'COURSES',
      category: 'COURSES',
      link: `/instructor?tab=PUBLISHED`
    }).catch(() => {});
  }

  return {
    ...updatedOriginalState,
    newCourseId: newCourse.id,
    newCourseSlug: newCourse.slug,
    newCourseTitle: newCourse.title,
    liveVersionLabel: nextVersionLabel,
    liveVersionNumber: nextVersionNumber
  };
}

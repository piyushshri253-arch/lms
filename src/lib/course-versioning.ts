import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notification';

export type ChangeCategory = 'PRICE' | 'VIDEO' | 'CURRICULUM' | 'QUIZ' | 'MINOR';

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
      isPublished?: boolean;
      order: number;
    }[];
  }[];
}

export interface CourseVersionHistoryEntry {
  versionNumber: number;
  versionLabel: string; // e.g., "v1.0", "v2.0"
  publishedAt: string;
  approvedBy: string;
  changeSummary: string[];
  price: number;
  modulesCount: number;
  lessonsCount: number;
}

export interface CourseVersionState {
  courseId: string;
  liveVersionNumber: number;
  liveVersionLabel: string; // e.g., "v1.0"
  pendingVersionNumber: number | null;
  pendingVersionLabel: string | null; // e.g., "v2.0"
  status: 'LIVE_SYNCED' | 'DRAFT_VERSION' | 'PENDING_REVIEW' | 'VERSION_REJECTED';
  detectedChanges: DetectedCourseChange[];
  stagedSnapshot: StagedCourseSnapshot | null;
  submittedAt: string | null;
  submittedBy: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewerFeedback: string | null;
  history: CourseVersionHistoryEntry[];
  updatedAt: string;
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
 * Classifies edits to a PUBLISHED course into Major Changes (requiring version staging + Auditor review)
 * vs Minor Changes (safe to apply immediately to live course).
 */
export function classifyCourseChanges(
  liveCourse: any,
  incomingBody: any
): {
  hasMajorChanges: boolean;
  hasMinorChanges: boolean;
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

  // 2. Check Curriculum, Video, and Quiz Changes (MAJOR)
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
      // Check if a new module was added
      if (sec.id && !liveSections.some((ls) => ls.id === sec.id)) {
        majorChanges.push({
          category: 'CURRICULUM',
          field: 'section.added',
          summary: `New curriculum module added: "${sec.title}"`
        });
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
        continue;
      }

      // Check Video URL Change
      const oldVideo = (existingLes.videoUrl || '').trim();
      const newVideo = (incLes.videoUrl !== undefined ? incLes.videoUrl || '' : oldVideo).trim();
      if (oldVideo !== newVideo) {
        majorChanges.push({
          category: 'VIDEO',
          field: `lesson.${existingLes.id}.videoUrl`,
          summary: `Video changed in lesson "${existingLes.title}"`,
          before: oldVideo || 'None',
          after: newVideo || 'Removed'
        });
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
          summary: `Quiz questions/settings modified in lesson "${existingLes.title}"`
        });
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

  // 3. Check Minor Metadata Changes (Title, Description, Thumbnail, SEO)
  if (
    incomingBody.title !== undefined &&
    incomingBody.title.trim() !== liveCourse.title.trim()
  ) {
    minorChanges.push({
      category: 'MINOR',
      field: 'title',
      summary: `Course title updated to "${incomingBody.title.trim()}"`
    });
  }
  if (
    incomingBody.description !== undefined &&
    incomingBody.description.trim() !== (liveCourse.description || '').trim()
  ) {
    minorChanges.push({
      category: 'MINOR',
      field: 'description',
      summary: 'Course description & syllabus text updated'
    });
  }
  if (
    incomingBody.thumbnail !== undefined &&
    incomingBody.thumbnail.trim() !== (liveCourse.thumbnail || '').trim()
  ) {
    minorChanges.push({
      category: 'MINOR',
      field: 'thumbnail',
      summary: 'Course thumbnail image updated'
    });
  }

  return {
    hasMajorChanges: majorChanges.length > 0,
    hasMinorChanges: minorChanges.length > 0,
    majorChanges,
    minorChanges
  };
}

/**
 * Applies a staged version snapshot to the Live PUBLISHED course once approved by an Auditor / Reviewer / Super Admin.
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
  const nextVersionNumber = (versionState.liveVersionNumber || 1) + 1;
  const nextVersionLabel = `v${nextVersionNumber}.0`;

  if (snap) {
    await prisma.course.update({
      where: { id: course.id },
      data: {
        title: snap.title !== undefined ? snap.title : course.title,
        description: snap.description !== undefined ? snap.description : course.description,
        shortDescription: snap.shortDescription !== undefined ? snap.shortDescription : course.shortDescription,
        price: snap.price !== undefined ? Number(snap.price) : course.price,
        discountPrice: snap.discountPrice !== undefined ? snap.discountPrice : course.discountPrice,
        currency: snap.currency !== undefined ? snap.currency : course.currency,
        level: snap.level !== undefined ? snap.level : course.level,
        language: snap.language !== undefined ? snap.language : course.language,
        durationHours: snap.durationHours !== undefined ? Number(snap.durationHours) : course.durationHours,
        thumbnail: snap.thumbnail !== undefined ? snap.thumbnail : course.thumbnail,
        banner: snap.banner !== undefined ? snap.banner : course.banner,
        accessType: snap.accessType !== undefined ? snap.accessType : course.accessType,
        accessDays: snap.accessDays !== undefined ? snap.accessDays : course.accessDays,
        whatYouWillLearn: snap.whatYouWillLearn ? JSON.stringify(snap.whatYouWillLearn) : course.whatYouWillLearn,
        requirements: snap.requirements ? JSON.stringify(snap.requirements) : course.requirements,
        targetAudience: snap.targetAudience ? JSON.stringify(snap.targetAudience) : course.targetAudience,
        seoTitle: snap.seoTitle !== undefined ? snap.seoTitle : course.seoTitle,
        seoDescription: snap.seoDescription !== undefined ? snap.seoDescription : course.seoDescription,
        status: 'PUBLISHED',
        reviewedAt: new Date(),
        reviewedById: reviewer.id,
        reviewFeedback: reviewerNote || null
      }
    });

    // Apply staged sections & lessons
    if (snap.sections && Array.isArray(snap.sections)) {
      const incomingSectionIds: string[] = [];
      for (let sIdx = 0; sIdx < snap.sections.length; sIdx++) {
        const secData = snap.sections[sIdx];
        let section = course.sections.find((s) => s.id === secData.id);
        if (section) {
          section = await prisma.courseSection.update({
            where: { id: section.id },
            data: {
              title: secData.title || `Module ${sIdx + 1}`,
              order: secData.order || sIdx + 1
            },
            include: { lessons: true }
          });
        } else {
          section = await prisma.courseSection.create({
            data: {
              courseId: course.id,
              title: secData.title || `Module ${sIdx + 1}`,
              order: secData.order || sIdx + 1
            },
            include: { lessons: true }
          });
        }
        incomingSectionIds.push(section.id);

        if (secData.lessons && Array.isArray(secData.lessons)) {
          const incomingLessonIds: string[] = [];
          for (let lIdx = 0; lIdx < secData.lessons.length; lIdx++) {
            const lesData = secData.lessons[lIdx];
            const quizDataStr =
              typeof lesData.quizData === 'object' && lesData.quizData !== null
                ? JSON.stringify(lesData.quizData)
                : typeof lesData.quizData === 'string'
                ? lesData.quizData
                : null;
            const existingLesson = (section.lessons || []).find((l) => l.id === lesData.id);
            if (existingLesson) {
              const updatedLesson = await prisma.lesson.update({
                where: { id: existingLesson.id },
                data: {
                  title: lesData.title,
                  type: lesData.type || 'VIDEO',
                  content: lesData.content !== undefined ? lesData.content : undefined,
                  videoUrl: lesData.videoUrl !== undefined ? lesData.videoUrl : undefined,
                  pdfUrl: lesData.pdfUrl !== undefined ? lesData.pdfUrl : undefined,
                  fileUrl: lesData.fileUrl !== undefined ? lesData.fileUrl : undefined,
                  quizData: quizDataStr,
                  duration: lesData.duration || '10:00',
                  durationSeconds: lesData.durationSeconds || 600,
                  isFree: lesData.isFree !== undefined ? !!lesData.isFree : undefined,
                  isPublished: lesData.isPublished !== undefined ? lesData.isPublished : undefined,
                  order: lesData.order || lIdx + 1
                }
              });
              incomingLessonIds.push(updatedLesson.id);
            } else {
              const newLesson = await prisma.lesson.create({
                data: {
                  sectionId: section.id,
                  title: lesData.title || `Lesson ${lIdx + 1}`,
                  type: lesData.type || 'VIDEO',
                  content: lesData.content || null,
                  videoUrl: lesData.videoUrl || null,
                  pdfUrl: lesData.pdfUrl || null,
                  fileUrl: lesData.fileUrl || null,
                  quizData: quizDataStr,
                  duration: lesData.duration || '10:00',
                  durationSeconds: lesData.durationSeconds || 600,
                  isFree: !!lesData.isFree,
                  isPublished: lesData.isPublished !== false,
                  order: lesData.order || lIdx + 1
                }
              });
              incomingLessonIds.push(newLesson.id);
            }
          }
          const lessonsToDelete = (section.lessons || []).filter((l) => !incomingLessonIds.includes(l.id));
          for (const lToDel of lessonsToDelete) {
            await prisma.lesson.delete({ where: { id: lToDel.id } }).catch(() => {});
          }
        }
      }
      const sectionsToDelete = course.sections.filter((s) => !incomingSectionIds.includes(s.id));
      for (const sToDel of sectionsToDelete) {
        await prisma.courseSection.delete({ where: { id: sToDel.id } }).catch(() => {});
      }
    }
  }

  const totalModules = snap?.sections?.length || course.sections.length;
  const totalLessons =
    snap?.sections?.reduce((acc, s) => acc + (s.lessons?.length || 0), 0) ||
    course.sections.reduce((acc, s) => acc + s.lessons.length, 0);

  const newHistoryEntry: CourseVersionHistoryEntry = {
    versionNumber: nextVersionNumber,
    versionLabel: nextVersionLabel,
    publishedAt: new Date().toISOString(),
    approvedBy: `${reviewer.name} (${reviewer.role})`,
    changeSummary:
      versionState.detectedChanges.length > 0
        ? versionState.detectedChanges.map((c) => c.summary)
        : ['Approved course version update'],
    price: snap?.price !== undefined ? Number(snap.price) : course.price,
    modulesCount: totalModules,
    lessonsCount: totalLessons
  };

  const updatedState = await saveCourseVersionState(course.id, {
    liveVersionNumber: nextVersionNumber,
    liveVersionLabel: nextVersionLabel,
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

  if (course.instructorId) {
    await createNotification({
      organizationId: course.organizationId,
      userId: course.instructorId,
      title: `🎉 Course Version ${nextVersionLabel} Approved & Published!`,
      message: `Your major updates to "${course.title}" have been approved by ${reviewer.name} and are now LIVE (${nextVersionLabel}).`,
      type: 'COURSES',
      category: 'COURSES',
      link: `/instructor/course-versions?courseId=${course.id}`
    });
  }

  return updatedState;
}

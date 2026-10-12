import { prisma } from '@/lib/prisma';

export type SubmissionType = 'NEW' | 'MAJOR_UPDATE' | 'RESUBMISSION';

export type SectionAuditStatus = 'PASSED' | 'ISSUE' | 'PENDING';

export interface SectionIssueItem {
  id: string;
  section: 'Curriculum' | 'Video' | 'PDF' | 'Quiz' | 'Pricing' | 'Learning Outcomes' | 'SEO';
  lessonRef?: string; // e.g. "Module 3 → Lesson 4"
  issue: string;
  comment: string;
  resolved?: boolean;
  createdAt: string;
}

export interface ReviewHistoryEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action:
    | 'COURSE_CREATED'
    | 'SUBMITTED_FOR_REVIEW'
    | 'REVIEW_STARTED'
    | 'VIDEO_REVIEWED'
    | 'PDF_REVIEWED'
    | 'QUIZ_REVIEWED'
    | 'REQUEST_CHANGES'
    | 'CHANGES_REQUESTED'
    | 'COURSE_REJECTED'
    | 'COURSE_APPROVED'
    | 'COURSE_PUBLISHED'
    | 'VERSION_CREATED'
    | 'VERSION_APPLIED'
    | 'RESUBMITTED';
  versionLabel: string;
  submissionType: SubmissionType;
  feedback?: string;
  sectionIssues?: SectionIssueItem[];
}

export interface ArchivedVersionRecord {
  versionLabel: string;
  status: 'ARCHIVED' | 'LIVE';
  archivedAt: string;
  snapshot: any;
}

export interface CourseAuditMetadata {
  courseId: string;
  submissionType: SubmissionType;
  submittedAt: string;
  reviewStartedAt?: string;
  reviewedAt?: string;
  reviewDurationMinutes?: number;
  sectionStatuses: {
    curriculum: SectionAuditStatus;
    video: SectionAuditStatus;
    pdf: SectionAuditStatus;
    quiz: SectionAuditStatus;
    pricing: SectionAuditStatus;
    learningOutcomes: SectionAuditStatus;
  };
  sectionIssues: SectionIssueItem[];
  internalNotes: Array<{
    id: string;
    authorName: string;
    authorRole: string;
    note: string;
    createdAt: string;
  }>;
  reviewHistory: ReviewHistoryEntry[];
  archivedVersions: ArchivedVersionRecord[];
}

export function getDefaultAuditMetadata(courseId: string): CourseAuditMetadata {
  return {
    courseId,
    submissionType: 'NEW',
    submittedAt: new Date().toISOString(),
    sectionStatuses: {
      curriculum: 'PENDING',
      video: 'PENDING',
      pdf: 'PENDING',
      quiz: 'PENDING',
      pricing: 'PENDING',
      learningOutcomes: 'PENDING'
    },
    sectionIssues: [],
    internalNotes: [],
    reviewHistory: [],
    archivedVersions: []
  };
}

export async function getCourseAuditMetadata(courseId: string): Promise<CourseAuditMetadata> {
  const key = `course_audit_meta_${courseId}`;
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key } });
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      const base = getDefaultAuditMetadata(courseId);
      return {
        ...base,
        ...parsed,
        courseId,
        sectionStatuses: {
          ...base.sectionStatuses,
          ...(parsed.sectionStatuses || {})
        },
        sectionIssues: Array.isArray(parsed.sectionIssues) ? parsed.sectionIssues : [],
        internalNotes: Array.isArray(parsed.internalNotes) ? parsed.internalNotes : [],
        reviewHistory: Array.isArray(parsed.reviewHistory) ? parsed.reviewHistory : [],
        archivedVersions: Array.isArray(parsed.archivedVersions) ? parsed.archivedVersions : []
      };
    }
  } catch {}
  return getDefaultAuditMetadata(courseId);
}

export async function saveCourseAuditMetadata(
  courseId: string,
  partial: Partial<CourseAuditMetadata>
): Promise<CourseAuditMetadata> {
  const key = `course_audit_meta_${courseId}`;
  const current = await getCourseAuditMetadata(courseId);
  const merged: CourseAuditMetadata = {
    ...current,
    ...partial,
    courseId,
    sectionStatuses: {
      ...current.sectionStatuses,
      ...(partial.sectionStatuses || {})
    }
  };

  await prisma.platformSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(merged) },
    create: { key, value: JSON.stringify(merged) }
  });

  return merged;
}

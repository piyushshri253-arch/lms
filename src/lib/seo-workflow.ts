import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notification';

export type SeoWorkflowStateStatus =
  | 'AUDITOR_REVIEW_PENDING'
  | 'AUDITOR_APPROVED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'SEO_SUBMITTED_FOR_APPROVAL'
  | 'SEO_COMPLETED'
  | 'CHANGES_REQUESTED';

export interface SeoAssignmentInfo {
  specialistId: string;
  specialistName: string;
  specialistEmail: string;
  assignedAt: string;
  assignedById: string;
  assignedByName: string;
  notes?: string;
}

export interface SeoAuditHistoryEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  previousStatus: SeoWorkflowStateStatus;
  newStatus: SeoWorkflowStateStatus;
  notes?: string;
}

export interface SeoChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string;
  recipientId: string;
  recipientName: string;
  message: string;
  createdAt: string;
}

export interface CourseSeoWorkflowRecord {
  courseId: string;
  status: SeoWorkflowStateStatus;
  assignment?: SeoAssignmentInfo | null;
  history: SeoAuditHistoryEntry[];
  submittedAt?: string;
  completedAt?: string;
  completionNotes?: string;
  updatedAt: string;
}

const SETTING_PREFIX = 'course_seo_workflow_';
const MESSAGES_PREFIX = 'course_seo_messages_';

/**
 * Fetch SEO workflow state for a course
 */
export async function getCourseSeoWorkflow(courseId: string): Promise<CourseSeoWorkflowRecord> {
  try {
    const row = await prisma.platformSetting.findUnique({
      where: { key: `${SETTING_PREFIX}${courseId}` }
    });

    if (row && row.value) {
      const parsed = JSON.parse(row.value);
      return {
        courseId,
        status: parsed.status || 'AUDITOR_APPROVED',
        assignment: parsed.assignment || null,
        history: Array.isArray(parsed.history) ? parsed.history : [],
        submittedAt: parsed.submittedAt,
        completedAt: parsed.completedAt,
        completionNotes: parsed.completionNotes,
        updatedAt: parsed.updatedAt || new Date().toISOString()
      };
    }
  } catch (err) {
    console.error(`[SeoWorkflow] Failed to read workflow for course ${courseId}:`, err);
  }

  // Default fallback if not initialized yet
  return {
    courseId,
    status: 'AUDITOR_APPROVED',
    assignment: null,
    history: [],
    updatedAt: new Date().toISOString()
  };
}

/**
 * Save SEO workflow state for a course
 */
export async function saveCourseSeoWorkflow(
  courseId: string,
  data: Partial<CourseSeoWorkflowRecord>
): Promise<CourseSeoWorkflowRecord> {
  const current = await getCourseSeoWorkflow(courseId);
  const updated: CourseSeoWorkflowRecord = {
    ...current,
    ...data,
    updatedAt: new Date().toISOString()
  };

  await prisma.platformSetting.upsert({
    where: { key: `${SETTING_PREFIX}${courseId}` },
    update: { value: JSON.stringify(updated) },
    create: {
      key: `${SETTING_PREFIX}${courseId}`,
      value: JSON.stringify(updated)
    }
  });

  return updated;
}

/**
 * Transition SEO workflow status with audit history
 */
export async function transitionSeoWorkflow(
  courseId: string,
  newStatus: SeoWorkflowStateStatus,
  actor: { id: string; name: string; role: string },
  notes?: string,
  assignment?: SeoAssignmentInfo
): Promise<CourseSeoWorkflowRecord> {
  const current = await getCourseSeoWorkflow(courseId);
  const historyEntry: SeoAuditHistoryEntry = {
    id: `seo_hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: `STATUS_CHANGE_TO_${newStatus}`,
    previousStatus: current.status,
    newStatus,
    notes
  };

  const nextHistory = [historyEntry, ...(current.history || [])];

  const patch: Partial<CourseSeoWorkflowRecord> = {
    status: newStatus,
    history: nextHistory
  };

  if (assignment) {
    patch.assignment = assignment;
  }

  if (newStatus === 'SEO_SUBMITTED_FOR_APPROVAL') {
    patch.submittedAt = new Date().toISOString();
  }

  if (newStatus === 'SEO_COMPLETED') {
    patch.completedAt = new Date().toISOString();
    patch.completionNotes = notes || 'Course SEO and Meta Ads optimization completed and approved.';
  }

  return saveCourseSeoWorkflow(courseId, patch);
}

/**
 * Dispatch notification to SEO team when Course Auditor approves a course
 */
export async function notifySeoTeamOnAuditorApproval(course: {
  id: string;
  title: string;
  organizationId?: string | null;
}) {
  try {
    // 1. Mark workflow as AUDITOR_APPROVED
    await saveCourseSeoWorkflow(course.id, {
      status: 'AUDITOR_APPROVED'
    });

    // 2. Find all SEO team members (SEO_MANAGER, SEO_SPECIALIST, SEO) + Admins
    const seoUsers = await prisma.user.findMany({
      where: {
        role: {
          in: ['SEO_MANAGER', 'SEO_SPECIALIST', 'SEO', 'ADMIN', 'SUPER_ADMIN']
        }
      },
      select: { id: true, name: true, email: true, role: true }
    });

    for (const u of seoUsers) {
      await createNotification({
        organizationId: course.organizationId || null,
        userId: u.id,
        title: `🚀 New Course Ready for SEO: "${course.title}"`,
        message: `Auditor has approved "${course.title}". It is now ready for SEO metadata configuration, keyword targeting, and paid ad campaign setup.`,
        type: 'COURSES',
        category: 'COURSES',
        link: `/seo?courseId=${course.id}`
      });
    }
  } catch (err) {
    console.error('[SeoWorkflow] Error notifying SEO team:', err);
  }
}

/**
 * Dispatch completion notifications when SEO Manager approves course
 */
export async function notifyPartiesOnSeoCompletion(
  course: {
    id: string;
    title: string;
    instructorId?: string | null;
    organizationId?: string | null;
  },
  actor: { name: string; role: string }
) {
  try {
    // 1. Notify Instructor
    if (course.instructorId) {
      await createNotification({
        organizationId: course.organizationId || null,
        userId: course.instructorId,
        title: `✨ SEO & Ads Setup Completed: "${course.title}"`,
        message: `SEO Team has finished optimizing meta tags, focus keywords, schema markup, and ad campaign setup for "${course.title}". Check your dashboard for live performance.`,
        type: 'COURSES',
        category: 'COURSES',
        link: `/instructor/course-seo?courseId=${course.id}`
      });
    }

    // 2. Notify Admins and Super Admins
    const adminUsers = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] }
      },
      select: { id: true }
    });

    for (const a of adminUsers) {
      await createNotification({
        organizationId: course.organizationId || null,
        userId: a.id,
        title: `✅ Course SEO & Ads Approved: "${course.title}"`,
        message: `SEO Lead ${actor.name} approved production SEO metadata and ad matrix for "${course.title}".`,
        type: 'COURSES',
        category: 'COURSES',
        link: `/seo?courseId=${course.id}`
      });
    }
  } catch (err) {
    console.error('[SeoWorkflow] Error notifying parties on SEO completion:', err);
  }
}

/**
 * Get chat messages for course
 */
export async function getCourseSeoMessages(courseId: string): Promise<SeoChatMessage[]> {
  try {
    const row = await prisma.platformSetting.findUnique({
      where: { key: `${MESSAGES_PREFIX}${courseId}` }
    });
    if (row && row.value) {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error(`[SeoWorkflow] Error reading messages for ${courseId}:`, err);
  }
  return [];
}

/**
 * Send a chat message between SEO team and instructor
 */
export async function sendCourseSeoMessage(
  courseId: string,
  msg: {
    senderId: string;
    senderName: string;
    senderRole: string;
    senderAvatar?: string;
    recipientId: string;
    recipientName: string;
    message: string;
  },
  courseTitle?: string,
  organizationId?: string | null
): Promise<SeoChatMessage> {
  const current = await getCourseSeoMessages(courseId);
  const newMsg: SeoChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    senderId: msg.senderId,
    senderName: msg.senderName,
    senderRole: msg.senderRole,
    senderAvatar: msg.senderAvatar,
    recipientId: msg.recipientId,
    recipientName: msg.recipientName,
    message: msg.message.trim(),
    createdAt: new Date().toISOString()
  };

  const updated = [...current, newMsg];

  await prisma.platformSetting.upsert({
    where: { key: `${MESSAGES_PREFIX}${courseId}` },
    update: { value: JSON.stringify(updated) },
    create: {
      key: `${MESSAGES_PREFIX}${courseId}`,
      value: JSON.stringify(updated)
    }
  });

  // Create In-App Notification for recipient
  if (msg.recipientId) {
    await createNotification({
      organizationId: organizationId || null,
      userId: msg.recipientId,
      title: `💬 New Message regarding "${courseTitle || 'Course SEO'}":`,
      message: `${msg.senderName} (${msg.senderRole}): "${msg.message.slice(0, 100)}${msg.message.length > 100 ? '...' : ''}"`,
      type: 'COURSES',
      category: 'COURSES',
      link: msg.senderRole.includes('INSTRUCTOR') ? `/seo?courseId=${courseId}` : `/instructor/course-seo?courseId=${courseId}`
    });
  }

  return newMsg;
}

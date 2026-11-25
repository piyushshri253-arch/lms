import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notification';
import { sendTaskAssignedEmail } from '@/lib/email';

const SETTING_ASSIGNMENTS_KEY = 'seo_team_assignments';

export interface SeoTaskAssignment {
  id: string;
  issueKey?: string; // e.g. "SEO-101", "SEO-102" like YouTrack
  title: string; // The manual task title typed by SEO Manager
  courseId?: string;
  courseTitle?: string;
  targetUrl?: string; // Optional target page or external link
  specialistId: string;
  specialistName: string;
  specialistEmail: string;
  specialistAvatar?: string;
  taskType:
    | 'GOOGLE_ADS'
    | 'META_ADS'
    | 'SEO_METADATA'
    | 'MEDIA_CREATIVE'
    | 'FULL_OPTIMIZATION'
    | 'TECHNICAL_SEO'
    | 'ON_PAGE'
    | 'OFF_PAGE_BACKLINKS'
    | 'KEYWORD_RESEARCH'
    | 'CONTENT_WRITING'
    | 'SCHEMA_MARKUP'
    | 'SPEED_VITALS'
    | 'GENERAL'
    | string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'BLOCKED';
  progress: number; // 0 - 100
  targetDueDate: string;
  dailyBudget?: number;
  targetLeads?: number;
  instructions: string; // Description & acceptance criteria
  latestNote?: string;
  deliverableLink?: string; // Proof of work, Google doc, PR, sheet link
  assignedBy?: string;
  assignedAt: string;
  updatedAt: string;
}

export async function GET(req: NextRequest) {
  try {
    let assignments: SeoTaskAssignment[] = [];
    const row = await prisma.platformSetting.findUnique({
      where: { key: SETTING_ASSIGNMENTS_KEY }
    });

    if (row?.value) {
      try {
        assignments = JSON.parse(row.value);
      } catch {}
    }

    // If no assignments exist yet, seed initial realistic YouTrack-style tasks
    if (assignments.length === 0) {
      // Find courses and specialists
      const courses = await prisma.course.findMany({
        take: 4,
        select: { id: true, title: true }
      });

      const specialists = await prisma.user.findMany({
        where: { role: { in: ['SEO_SPECIALIST', 'SEO_MANAGER', 'SEO'] } },
        take: 4,
        select: { id: true, name: true, email: true }
      });

      if (specialists.length > 0) {
        const seedItems: SeoTaskAssignment[] = [
          {
            id: `assign_init_1`,
            issueKey: 'SEO-101',
            title: 'Setup High-Intent Search Ads for Teacher Training 2026',
            courseId: courses[0]?.id || 'course_1',
            courseTitle: courses[0]?.title || 'Teacher Eligibility Masterclass',
            specialistId: specialists[0].id,
            specialistName: specialists[0].name,
            specialistEmail: specialists[0].email,
            taskType: 'GOOGLE_ADS',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            progress: 65,
            targetDueDate: '2026-11-28',
            dailyBudget: 500,
            targetLeads: 250,
            instructions: 'Setup high-intent search keywords for teacher training certification, negative keyword exclusions, and drive admission leads.',
            latestNote: 'Google Ads campaign draft completed with 12 negative keywords and ₹500/day bid strategy.',
            assignedBy: 'Rohit Sharma (SEO Manager)',
            assignedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];

        if (specialists.length > 1) {
          seedItems.push({
            id: `assign_init_2`,
            issueKey: 'SEO-102',
            title: 'Meta Ads & Instagram Video Hooks for Regional Educators',
            courseId: courses[1]?.id || 'course_2',
            courseTitle: courses[1]?.title || 'Early Childhood Education Diploma',
            specialistId: specialists[1].id,
            specialistName: specialists[1].name,
            specialistEmail: specialists[1].email,
            taskType: 'META_ADS',
            priority: 'CRITICAL',
            status: 'IN_PROGRESS',
            progress: 40,
            targetDueDate: '2026-11-30',
            dailyBudget: 400,
            targetLeads: 300,
            instructions: 'Launch Instagram carousel and Facebook lead form campaign targeting Hindi-speaking regional educators with video testimonials.',
            latestNote: 'Ad creatives and video hooks received from design team. Creating custom lookalike audience.',
            assignedBy: 'Rohit Sharma (SEO Manager)',
            assignedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
            updatedAt: new Date().toISOString()
          });
        }

        seedItems.push({
          id: `assign_init_3`,
          issueKey: 'SEO-103',
          title: 'Keyword Research & Competitor Gap Analysis for CTET Exam Batch',
          courseId: courses[2]?.id || 'course_general',
          courseTitle: courses[2]?.title || 'CTET Exam Complete Batch 2026',
          targetUrl: 'https://morenateach.com/courses',
          specialistId: specialists[0].id,
          specialistName: specialists[0].name,
          specialistEmail: specialists[0].email,
          taskType: 'KEYWORD_RESEARCH',
          priority: 'HIGH',
          status: 'COMPLETED',
          progress: 100,
          targetDueDate: '2026-11-20',
          instructions: 'Perform keyword research for top 50 search queries with monthly volume > 2,000 and KD < 35. Prepare content cluster sheet.',
          latestNote: 'Keyword research sheet with 75 long-tail keywords submitted and verified. Audit score 100/100.',
          deliverableLink: 'https://docs.google.com/spreadsheets/d/morena-keywords-ctet',
          assignedBy: 'Rohit Sharma (SEO Manager)',
          assignedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        });

        assignments = seedItems;

        // Persist seed
        await prisma.platformSetting.upsert({
          where: { key: SETTING_ASSIGNMENTS_KEY },
          update: { value: JSON.stringify(assignments) },
          create: { key: SETTING_ASSIGNMENTS_KEY, value: JSON.stringify(assignments) }
        });
      }
    }

    // Normalize any legacy items that lack title or issueKey
    const normalized = assignments.map((item, index) => ({
      ...item,
      title: item.title || item.courseTitle || 'Manual SEO Task',
      issueKey: item.issueKey || `SEO-${101 + index}`
    }));

    return NextResponse.json({ success: true, assignments: normalized });
  } catch (err: any) {
    console.error('[SEO Assignments GET Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const row = await prisma.platformSetting.findUnique({
      where: { key: SETTING_ASSIGNMENTS_KEY }
    });

    let currentList: SeoTaskAssignment[] = [];
    if (row?.value) {
      try {
        currentList = JSON.parse(row.value);
      } catch {}
    }

    // 1. Support Batch Course/Task Allocation
    if (body.batch && Array.isArray(body.assignments)) {
      const { specialistId, specialistName, specialistEmail, assignments: batchItems } = body;
      if (!specialistId || batchItems.length === 0) {
        return NextResponse.json({ error: 'Specialist and at least one assignment required.' }, { status: 400 });
      }

      const createdList: SeoTaskAssignment[] = [];

      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        const nextNum = currentList.length + createdList.length + 101;
        const taskTitle = item.title?.trim() || item.courseTitle || `SEO Optimization Task #${nextNum}`;
        const newAssign: SeoTaskAssignment = {
          id: `assign_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          issueKey: item.issueKey || `SEO-${nextNum}`,
          title: taskTitle,
          courseId: item.courseId || undefined,
          courseTitle: item.courseTitle || taskTitle,
          targetUrl: item.targetUrl || undefined,
          specialistId,
          specialistName: specialistName || 'Specialist',
          specialistEmail: specialistEmail || '',
          specialistAvatar: item.specialistAvatar || undefined,
          taskType: item.taskType || 'SEO_METADATA',
          priority: item.priority || 'HIGH',
          status: item.status || 'PENDING',
          progress: item.progress || 0,
          targetDueDate: item.targetDueDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
          dailyBudget: item.dailyBudget ? Number(item.dailyBudget) : undefined,
          targetLeads: item.targetLeads ? Number(item.targetLeads) : undefined,
          instructions: item.instructions?.trim() || `${item.taskType?.replace(/_/g, ' ')} optimization assigned by SEO Manager.`,
          latestNote: 'Task allocated by SEO Manager.',
          assignedBy: body.assignedBy || 'Rohit Sharma (SEO Manager)',
          assignedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        createdList.push(newAssign);
      }

      const updatedList = [...createdList, ...currentList];

      await prisma.platformSetting.upsert({
        where: { key: SETTING_ASSIGNMENTS_KEY },
        update: { value: JSON.stringify(updatedList) },
        create: { key: SETTING_ASSIGNMENTS_KEY, value: JSON.stringify(updatedList) }
      });

      // Resolve real user record from database
      let recipientEmail = specialistEmail?.trim();
      let recipientName = specialistName?.trim();
      let validUserId: string | null = null;

      try {
        const userObj = await prisma.user.findFirst({
          where: {
            OR: [
              { id: specialistId },
              ...(recipientEmail ? [{ email: recipientEmail.toLowerCase() }] : [])
            ]
          },
          select: { id: true, name: true, email: true }
        });

        if (userObj) {
          validUserId = userObj.id;
          recipientEmail = recipientEmail || userObj.email;
          recipientName = recipientName || userObj.name;
        }
      } catch {}

      // Send in-app notification if valid database user
      if (validUserId) {
        try {
          await createNotification({
            userId: validUserId,
            title: `⚡ Bhai Task Aaya Hai (${createdList.length} Tasks)`,
            message: `SEO Manager has allocated ${createdList.length} new tasks to your dashboard. Check Task Management.`,
            type: 'COURSES',
            category: 'COURSES',
            link: `/seo?nav=Task+Management`
          });
        } catch {}
      }

      // Send email notification to the member's registered email address
      try {
        if (recipientEmail && createdList.length > 0) {
          const firstTask = createdList[0];
          await sendTaskAssignedEmail({
            to: recipientEmail,
            memberName: recipientName || specialistName || 'Team Member',
            issueKey: firstTask.issueKey || 'SEO',
            title: createdList.length === 1 ? firstTask.title : `${createdList.length} New SEO Tasks Allocated`,
            priority: firstTask.priority || 'HIGH',
            targetDueDate: firstTask.targetDueDate || '1 week',
            courseTitle: firstTask.courseTitle,
            targetUrl: firstTask.targetUrl,
            instructions: `SEO Manager has allocated ${createdList.length} tasks to your workbench. Please log in to view and start work.`,
            assignedBy: firstTask.assignedBy,
            userId: validUserId
          });
        }
      } catch (emailErr) {
        console.error('[SEO Batch Task Assignment Email Error]:', emailErr);
      }

      return NextResponse.json({
        success: true,
        assignments: createdList,
        message: `Successfully allocated ${createdList.length} tasks to ${specialistName}!`
      });
    }

    // 2. Single YouTrack-Style Manual Task Creation
    const {
      title,
      taskTitle,
      issueKey,
      courseId,
      courseTitle,
      targetUrl,
      specialistId,
      specialistName,
      specialistEmail,
      specialistAvatar,
      taskType,
      priority,
      status,
      targetDueDate,
      dailyBudget,
      targetLeads,
      instructions,
      assignedBy
    } = body;

    const resolvedTitle = (title || taskTitle || courseTitle || '').trim();

    if (!resolvedTitle) {
      return NextResponse.json(
        { error: 'Task Title is required. Type the task description.' },
        { status: 400 }
      );
    }

    if (!specialistId) {
      return NextResponse.json(
        { error: 'Please select a Team Member to assign this task.' },
        { status: 400 }
      );
    }

    const nextIssueNum = currentList.length + 101;
    const resolvedIssueKey = issueKey?.trim() || `SEO-${nextIssueNum}`;

    const newAssignment: SeoTaskAssignment = {
      id: `assign_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      issueKey: resolvedIssueKey,
      title: resolvedTitle,
      courseId: courseId || undefined,
      courseTitle: courseTitle || resolvedTitle,
      targetUrl: targetUrl?.trim() || undefined,
      specialistId,
      specialistName: specialistName || 'Specialist',
      specialistEmail: specialistEmail || '',
      specialistAvatar: specialistAvatar || undefined,
      taskType: taskType || 'TECHNICAL_SEO',
      priority: priority || 'HIGH',
      status: status || 'PENDING',
      progress: status === 'IN_PROGRESS' ? 15 : 0,
      targetDueDate: targetDueDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      dailyBudget: dailyBudget ? Number(dailyBudget) : undefined,
      targetLeads: targetLeads ? Number(targetLeads) : undefined,
      instructions: instructions?.trim() || `Execute task "${resolvedTitle}" as per guidelines and submit deliverable report.`,
      latestNote: 'New task assigned by SEO Manager.',
      assignedBy: assignedBy || 'Rohit Sharma (SEO Manager)',
      assignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedList = [newAssignment, ...currentList];

    await prisma.platformSetting.upsert({
      where: { key: SETTING_ASSIGNMENTS_KEY },
      update: { value: JSON.stringify(updatedList) },
      create: { key: SETTING_ASSIGNMENTS_KEY, value: JSON.stringify(updatedList) }
    });

    // Resolve real user record from database
    let recipientEmail = specialistEmail?.trim();
    let recipientName = specialistName?.trim();
    let validUserId: string | null = null;

    try {
      const userObj = await prisma.user.findFirst({
        where: {
          OR: [
            { id: specialistId },
            ...(recipientEmail ? [{ email: recipientEmail.toLowerCase() }] : [])
          ]
        },
        select: { id: true, name: true, email: true }
      });

      if (userObj) {
        validUserId = userObj.id;
        recipientEmail = recipientEmail || userObj.email;
        recipientName = recipientName || userObj.name;
      }
    } catch {}

    // Notify the assigned member: "Bhai task aaya hai!" (In-app notification)
    if (validUserId) {
      try {
        await createNotification({
          userId: validUserId,
          title: `⚡ Bhai Task Aaya Hai: [${resolvedIssueKey}] ${resolvedTitle}`,
          message: `SEO Manager has assigned you "${resolvedTitle}". Priority: ${priority || 'HIGH'} • Deadline: ${targetDueDate || '1 week'}. Check your Task Management workbench.`,
          type: 'COURSES',
          category: 'COURSES',
          link: `/seo?nav=Task+Management`
        });
      } catch {}
    }

    // Send email notification to member's account email ID
    try {
      if (recipientEmail) {
        await sendTaskAssignedEmail({
          to: recipientEmail,
          memberName: recipientName || specialistName || 'Team Member',
          issueKey: resolvedIssueKey,
          title: resolvedTitle,
          priority: priority || 'HIGH',
          targetDueDate: newAssignment.targetDueDate,
          courseTitle: newAssignment.courseTitle,
          targetUrl: newAssignment.targetUrl,
          instructions: newAssignment.instructions,
          assignedBy: newAssignment.assignedBy,
          userId: validUserId
        });
      }
    } catch (emailErr) {
      console.error('[SEO Task Assignment Email Error]:', emailErr);
    }

    return NextResponse.json({
      success: true,
      assignment: newAssignment,
      message: `Successfully created task [${resolvedIssueKey}] and assigned to ${specialistName}!`
    });
  } catch (err: any) {
    console.error('[SEO Assignments POST Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      assignmentId,
      status,
      progress,
      latestNote,
      deliverableLink,
      title,
      instructions,
      priority,
      taskType,
      targetDueDate,
      targetUrl,
      specialistId,
      specialistName,
      specialistEmail
    } = body;

    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId is required' }, { status: 400 });
    }

    const row = await prisma.platformSetting.findUnique({
      where: { key: SETTING_ASSIGNMENTS_KEY }
    });

    let currentList: SeoTaskAssignment[] = [];
    if (row?.value) {
      try {
        currentList = JSON.parse(row.value);
      } catch {}
    }

    const targetIdx = currentList.findIndex((a) => a.id === assignmentId);
    if (targetIdx === -1) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const prev = currentList[targetIdx];

    const updatedAssignment: SeoTaskAssignment = {
      ...prev,
      title: title?.trim() || prev.title,
      instructions: instructions !== undefined ? instructions : prev.instructions,
      priority: priority || prev.priority,
      taskType: taskType || prev.taskType,
      targetDueDate: targetDueDate || prev.targetDueDate,
      targetUrl: targetUrl !== undefined ? targetUrl : prev.targetUrl,
      specialistId: specialistId || prev.specialistId,
      specialistName: specialistName || prev.specialistName,
      specialistEmail: specialistEmail || prev.specialistEmail,
      status: status || prev.status,
      progress:
        typeof progress === 'number'
          ? Math.min(100, Math.max(0, progress))
          : status === 'COMPLETED'
          ? 100
          : prev.progress,
      latestNote: latestNote !== undefined ? latestNote : prev.latestNote,
      deliverableLink: deliverableLink !== undefined ? deliverableLink : prev.deliverableLink,
      updatedAt: new Date().toISOString()
    };

    currentList[targetIdx] = updatedAssignment;

    await prisma.platformSetting.upsert({
      where: { key: SETTING_ASSIGNMENTS_KEY },
      update: { value: JSON.stringify(currentList) },
      create: { key: SETTING_ASSIGNMENTS_KEY, value: JSON.stringify(currentList) }
    });

    // If re-assigned to a new specialist, notify the new specialist
    if (specialistId && specialistId !== prev.specialistId) {
      let recipientEmail = specialistEmail?.trim() || updatedAssignment.specialistEmail?.trim();
      let recipientName = specialistName?.trim() || updatedAssignment.specialistName?.trim();
      let validUserId: string | null = null;

      try {
        const userObj = await prisma.user.findFirst({
          where: {
            OR: [
              { id: specialistId },
              ...(recipientEmail ? [{ email: recipientEmail.toLowerCase() }] : [])
            ]
          },
          select: { id: true, name: true, email: true }
        });

        if (userObj) {
          validUserId = userObj.id;
          recipientEmail = recipientEmail || userObj.email;
          recipientName = recipientName || userObj.name;
        }
      } catch {}

      if (validUserId) {
        try {
          await createNotification({
            userId: validUserId,
            title: `⚡ Bhai Task Aaya Hai: [${updatedAssignment.issueKey || 'SEO'}] ${updatedAssignment.title}`,
            message: `SEO Manager has assigned you "${updatedAssignment.title}". Priority: ${updatedAssignment.priority}. Check your Task Management workbench.`,
            type: 'COURSES',
            category: 'COURSES',
            link: `/seo?nav=Task+Management`
          });
        } catch {}
      }

      // Send email notification to new member's account email ID
      try {
        if (recipientEmail) {
          await sendTaskAssignedEmail({
            to: recipientEmail,
            memberName: recipientName || 'Team Member',
            issueKey: updatedAssignment.issueKey || 'SEO',
            title: updatedAssignment.title,
            priority: updatedAssignment.priority,
            targetDueDate: updatedAssignment.targetDueDate,
            courseTitle: updatedAssignment.courseTitle,
            targetUrl: updatedAssignment.targetUrl,
            instructions: updatedAssignment.instructions,
            assignedBy: updatedAssignment.assignedBy,
            userId: validUserId
          });
        }
      } catch (emailErr) {
        console.error('[SEO Task Reassignment Email Error]:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      assignment: updatedAssignment,
      message: 'Task updated successfully.'
    });
  } catch (err: any) {
    console.error('[SEO Assignments PUT Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get('assignmentId');

    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId is required' }, { status: 400 });
    }

    const row = await prisma.platformSetting.findUnique({
      where: { key: SETTING_ASSIGNMENTS_KEY }
    });

    let currentList: SeoTaskAssignment[] = [];
    if (row?.value) {
      try {
        currentList = JSON.parse(row.value);
      } catch {}
    }

    const filtered = currentList.filter((a) => a.id !== assignmentId);

    await prisma.platformSetting.upsert({
      where: { key: SETTING_ASSIGNMENTS_KEY },
      update: { value: JSON.stringify(filtered) },
      create: { key: SETTING_ASSIGNMENTS_KEY, value: JSON.stringify(filtered) }
    });

    return NextResponse.json({ success: true, message: 'Assignment removed.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

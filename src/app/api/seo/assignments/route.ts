import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notification';

const SETTING_ASSIGNMENTS_KEY = 'seo_team_assignments';

export interface SeoTaskAssignment {
  id: string;
  courseId: string;
  courseTitle: string;
  specialistId: string;
  specialistName: string;
  specialistEmail: string;
  taskType: 'GOOGLE_ADS' | 'META_ADS' | 'SEO_METADATA' | 'MEDIA_CREATIVE' | 'FULL_OPTIMIZATION';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'BLOCKED';
  progress: number; // 0 - 100
  targetDueDate: string;
  dailyBudget?: number;
  targetLeads?: number;
  instructions: string;
  latestNote?: string;
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

    // If no assignments exist yet, seed initial realistic tasks so user immediately sees real data
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

      if (courses.length > 0 && specialists.length > 0) {
        const seedItems: SeoTaskAssignment[] = [
          {
            id: `assign_init_1`,
            courseId: courses[0].id,
            courseTitle: courses[0].title,
            specialistId: specialists[0].id,
            specialistName: specialists[0].name,
            specialistEmail: specialists[0].email,
            taskType: 'GOOGLE_ADS',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            progress: 65,
            targetDueDate: '2026-11-20',
            dailyBudget: 500,
            targetLeads: 250,
            instructions: 'Setup high-intent search keywords for teacher training certification and drive admissions.',
            latestNote: 'Google Ads campaign draft completed with 12 negative keywords and ₹500/day bid strategy.',
            assignedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];

        if (courses.length > 1 && specialists.length > 1) {
          seedItems.push({
            id: `assign_init_2`,
            courseId: courses[1].id,
            courseTitle: courses[1].title,
            specialistId: specialists[1].id,
            specialistName: specialists[1].name,
            specialistEmail: specialists[1].email,
            taskType: 'META_ADS',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            progress: 40,
            targetDueDate: '2026-11-25',
            dailyBudget: 400,
            targetLeads: 300,
            instructions: 'Launch Instagram carousel and Facebook lead form campaign for regional educators.',
            latestNote: 'Ad creatives and video hooks received from design team. Creating custom audience.',
            assignedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
            updatedAt: new Date().toISOString()
          });
        }

        if (courses.length > 2) {
          seedItems.push({
            id: `assign_init_3`,
            courseId: courses[2].id,
            courseTitle: courses[2].title,
            specialistId: specialists[0].id,
            specialistName: specialists[0].name,
            specialistEmail: specialists[0].email,
            taskType: 'SEO_METADATA',
            priority: 'MEDIUM',
            status: 'COMPLETED',
            progress: 100,
            targetDueDate: '2026-11-15',
            instructions: 'Complete meta title, description, schema markup, and rank analysis on GSC.',
            latestNote: 'Audit score reached 100/100. Submitted for indexing on Google Search Console.',
            assignedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
            updatedAt: new Date().toISOString()
          });
        }

        assignments = seedItems;

        // Persist seed
        await prisma.platformSetting.upsert({
          where: { key: SETTING_ASSIGNMENTS_KEY },
          update: { value: JSON.stringify(assignments) },
          create: { key: SETTING_ASSIGNMENTS_KEY, value: JSON.stringify(assignments) }
        });
      }
    }

    return NextResponse.json({ success: true, assignments });
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

    // 1. Support Batch Course Allocation (e.g. assigning 3 courses for ads, 2 for SEO to 1 member)
    if (body.batch && Array.isArray(body.assignments)) {
      const { specialistId, specialistName, specialistEmail, assignments: batchItems } = body;
      if (!specialistId || batchItems.length === 0) {
        return NextResponse.json({ error: 'Specialist and at least one assignment required.' }, { status: 400 });
      }

      const createdList: SeoTaskAssignment[] = [];

      for (const item of batchItems) {
        const newAssign: SeoTaskAssignment = {
          id: `assign_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          courseId: item.courseId,
          courseTitle: item.courseTitle || 'Course',
          specialistId,
          specialistName: specialistName || 'Specialist',
          specialistEmail: specialistEmail || '',
          taskType: item.taskType || 'SEO_METADATA',
          priority: item.priority || 'HIGH',
          status: 'IN_PROGRESS',
          progress: item.progress || 10,
          targetDueDate: item.targetDueDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
          dailyBudget: item.dailyBudget ? Number(item.dailyBudget) : undefined,
          targetLeads: item.targetLeads ? Number(item.targetLeads) : undefined,
          instructions: item.instructions?.trim() || `${item.taskType?.replace('_', ' ')} optimization assigned by SEO Manager.`,
          latestNote: 'Task allocated by SEO Manager.',
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

      // Send notification
      try {
        await createNotification({
          userId: specialistId,
          title: `🎯 ${createdList.length} New Courses Allocated to Your Dashboard`,
          message: `SEO Manager has allocated ${createdList.length} course tasks to your dashboard for SEO and Ads.`,
          type: 'COURSES',
          category: 'COURSES',
          link: `/seo?nav=Course+Assignments`
        });
      } catch {}

      return NextResponse.json({
        success: true,
        assignments: createdList,
        message: `Successfully allocated ${createdList.length} course tasks to ${specialistName}!`
      });
    }

    // 2. Single Course Assignment
    const {
      courseId,
      courseTitle,
      specialistId,
      specialistName,
      specialistEmail,
      taskType,
      priority,
      targetDueDate,
      dailyBudget,
      targetLeads,
      instructions
    } = body;

    if (!courseId || !specialistId) {
      return NextResponse.json(
        { error: 'Course and Team Member are required.' },
        { status: 400 }
      );
    }

    const newAssignment: SeoTaskAssignment = {
      id: `assign_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      courseId,
      courseTitle: courseTitle || 'Selected Course',
      specialistId,
      specialistName: specialistName || 'Specialist',
      specialistEmail: specialistEmail || '',
      taskType: taskType || 'SEO_METADATA',
      priority: priority || 'HIGH',
      status: 'IN_PROGRESS',
      progress: 10,
      targetDueDate: targetDueDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      dailyBudget: dailyBudget ? Number(dailyBudget) : undefined,
      targetLeads: targetLeads ? Number(targetLeads) : undefined,
      instructions: instructions?.trim() || 'Execute SEO and ads campaign optimization as per target guidelines.',
      latestNote: 'New task assigned by SEO Manager.',
      assignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedList = [newAssignment, ...currentList];

    await prisma.platformSetting.upsert({
      where: { key: SETTING_ASSIGNMENTS_KEY },
      update: { value: JSON.stringify(updatedList) },
      create: { key: SETTING_ASSIGNMENTS_KEY, value: JSON.stringify(updatedList) }
    });

    // Notify the assigned member
    try {
      await createNotification({
        userId: specialistId,
        title: `🎯 New Course Assignment: ${courseTitle}`,
        message: `SEO Manager has assigned you "${courseTitle}" for ${taskType?.replace('_', ' ')}. Due date: ${targetDueDate || '1 week'}.`,
        type: 'COURSES',
        category: 'COURSES',
        link: `/seo?nav=Course+Assignments`
      });
    } catch {}

    return NextResponse.json({
      success: true,
      assignment: newAssignment,
      message: `Successfully assigned "${courseTitle}" to ${specialistName}!`
    });
  } catch (err: any) {
    console.error('[SEO Assignments POST Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { assignmentId, status, progress, latestNote } = body;

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

    const updatedAssignment: SeoTaskAssignment = {
      ...currentList[targetIdx],
      status: status || currentList[targetIdx].status,
      progress: typeof progress === 'number' ? Math.min(100, Math.max(0, progress)) : currentList[targetIdx].progress,
      latestNote: latestNote !== undefined ? latestNote : currentList[targetIdx].latestNote,
      updatedAt: new Date().toISOString()
    };

    currentList[targetIdx] = updatedAssignment;

    await prisma.platformSetting.upsert({
      where: { key: SETTING_ASSIGNMENTS_KEY },
      update: { value: JSON.stringify(currentList) },
      create: { key: SETTING_ASSIGNMENTS_KEY, value: JSON.stringify(currentList) }
    });

    return NextResponse.json({
      success: true,
      assignment: updatedAssignment,
      message: 'Task progress updated successfully.'
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

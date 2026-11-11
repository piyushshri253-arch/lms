import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  getCourseSeoWorkflow,
  transitionSeoWorkflow,
  notifyPartiesOnSeoCompletion,
  SeoAssignmentInfo
} from '@/lib/seo-workflow';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    const workflow = await getCourseSeoWorkflow(courseId);
    return NextResponse.json({ workflow });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const actor = user || {
      id: 'seo_manager_system',
      name: 'SEO Manager',
      role: 'SEO_MANAGER'
    };

    const body = await req.json();
    const { action, courseId, specialistId, notes } = body;

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { instructor: true }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (action === 'ASSIGN') {
      if (!specialistId) {
        return NextResponse.json({ error: 'specialistId is required for ASSIGN' }, { status: 400 });
      }

      const specialist = await prisma.user.findUnique({
        where: { id: specialistId },
        select: { id: true, name: true, email: true, role: true }
      });

      if (!specialist) {
        return NextResponse.json({ error: 'Specialist user not found' }, { status: 404 });
      }

      const assignment: SeoAssignmentInfo = {
        specialistId: specialist.id,
        specialistName: specialist.name,
        specialistEmail: specialist.email,
        assignedAt: new Date().toISOString(),
        assignedById: actor.id,
        assignedByName: actor.name,
        notes: notes || 'Assigned for SEO metadata and ads campaign optimization.'
      };

      const updated = await transitionSeoWorkflow(
        courseId,
        'ASSIGNED',
        { id: actor.id, name: actor.name, role: actor.role },
        notes,
        assignment
      );

      return NextResponse.json({
        success: true,
        workflow: updated,
        message: `Course assigned to ${specialist.name} successfully.`
      });
    }

    if (action === 'SUBMIT_FOR_REVIEW') {
      const updated = await transitionSeoWorkflow(
        courseId,
        'SEO_SUBMITTED_FOR_APPROVAL',
        { id: actor.id, name: actor.name, role: actor.role },
        notes || 'SEO specialist completed metadata, keywords, and schema markup.'
      );

      return NextResponse.json({
        success: true,
        workflow: updated,
        message: 'Course SEO submitted to SEO Manager for review!'
      });
    }

    if (action === 'APPROVE') {
      const updated = await transitionSeoWorkflow(
        courseId,
        'SEO_COMPLETED',
        { id: actor.id, name: actor.name, role: actor.role },
        notes || 'SEO and Ads optimization approved by SEO Manager.'
      );

      // Trigger automatic completion notifications to Instructor, Admin, and Super Admin
      await notifyPartiesOnSeoCompletion(
        {
          id: course.id,
          title: course.title,
          instructorId: course.instructorId,
          organizationId: course.organizationId
        },
        { name: actor.name, role: actor.role }
      );

      return NextResponse.json({
        success: true,
        workflow: updated,
        message: 'Course SEO approved! Notifications dispatched to Instructor, Admin, and Super Admin.'
      });
    }

    if (action === 'REQUEST_CHANGES') {
      const updated = await transitionSeoWorkflow(
        courseId,
        'CHANGES_REQUESTED',
        { id: actor.id, name: actor.name, role: actor.role },
        notes || 'Changes requested by SEO Manager.'
      );

      return NextResponse.json({
        success: true,
        workflow: updated,
        message: 'Changes requested from SEO Specialist.'
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('[SeoWorkflow Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

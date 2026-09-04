import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantAuth, requireTenantRole } from '@/lib/auth';
import { createNotification } from '@/lib/notification';

export async function GET(request: Request) {
  try {
    const user = await requireTenantAuth();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    const whereClause: any = {};
    if (user.organizationId) {
      whereClause.organizationId = user.organizationId;
    }
    if (courseId) {
      whereClause.courseId = courseId;
    }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        course: { select: { id: true, title: true, slug: true } },
        submissions: {
          where: user.role === 'STUDENT' ? { userId: user.id } : {},
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = assignments.map((a) => {
      const mySubmission = a.submissions.find((s) => s.userId === user.id) || null;
      let allowedFormatsList: string[] = [];
      try {
        allowedFormatsList = JSON.parse(a.allowedFormats);
      } catch {
        allowedFormatsList = ['pdf', 'zip', 'docx'];
      }

      return {
        id: a.id,
        courseId: a.courseId,
        courseTitle: a.course.title,
        lessonId: a.lessonId,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate,
        maxScore: a.maxScore,
        allowedFormats: allowedFormatsList,
        maxFileSizeBytes: a.maxFileSizeBytes,
        status: a.status,
        submissionsCount: a.submissions.length,
        mySubmission: mySubmission
          ? {
              id: mySubmission.id,
              fileUrl: mySubmission.fileUrl,
              fileName: mySubmission.fileName,
              notes: mySubmission.notes,
              score: mySubmission.score,
              feedback: mySubmission.feedback,
              status: mySubmission.status,
              submittedAt: mySubmission.submittedAt,
              gradedAt: mySubmission.gradedAt
            }
          : null,
        submissions: user.role !== 'STUDENT' ? a.submissions : undefined
      };
    });

    return NextResponse.json({ assignments: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const orgId = user.organizationId;
    const body = await request.json();
    const { courseId, lessonId, title, description, dueDate, maxScore, allowedFormats, maxFileSizeBytes } = body;

    if (!courseId || !title || !description) {
      return NextResponse.json({ error: 'courseId, title, and description are required.' }, { status: 400 });
    }

    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        ...(orgId ? { organizationId: orgId } : {})
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found in this organization.' }, { status: 404 });
    }

    const formatsStr = Array.isArray(allowedFormats)
      ? JSON.stringify(allowedFormats.map((f: string) => f.toLowerCase().replace(/^\./, '')))
      : JSON.stringify(['pdf', 'zip', 'docx']);

    const assignment = await prisma.assignment.create({
      data: {
        organizationId: orgId || null,
        courseId,
        lessonId: lessonId || null,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        maxScore: Number(maxScore || 100),
        allowedFormats: formatsStr,
        maxFileSizeBytes: Number(maxFileSizeBytes || 10485760),
        status: 'ACTIVE'
      }
    });

    // Notify enrolled students in this course
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId, status: 'ACTIVE' },
      select: { userId: true }
    });

    for (const enr of enrollments) {
      await createNotification({
        organizationId: orgId || null,
        userId: enr.userId,
        title: 'New Assignment Available',
        message: `A new assignment "${title}" has been assigned for "${course.title}".`,
        type: 'ASSIGNMENT',
        category: 'COURSES',
        link: `/learn/${course.id}`
      });
    }

    return NextResponse.json({
      success: true,
      assignment,
      message: `Assignment "${title}" created and announced to ${enrollments.length} enrolled student(s).`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, validateTenantOwnership, handleAuthError } from '@/lib/auth';
import { createOrGetDraftVersion, getCourseVersionState, discardDraftVersion } from '@/lib/course-versioning';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
    }

    if (!['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN', 'LMS_ADMIN', 'SALES_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Access denied: Insufficient privileges to create course version draft.' },
        { status: 403 }
      );
    }

    const course = await prisma.course.findFirst({
      where: {
        OR: [{ slug }, { id: slug }]
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        organizationId: true,
        instructorId: true
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Tenant Isolation Check
    if (!validateTenantOwnership(course.organizationId, user)) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to modify courses outside your organization.' },
        { status: 403 }
      );
    }

    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only update version drafts for courses authored by your account.' },
        { status: 403 }
      );
    }

    if (course.status !== 'PUBLISHED' && course.status !== 'INACTIVE' && course.status !== 'ARCHIVED') {
      // If course is still an unpublished draft, instruct user to use existing course builder
      return NextResponse.json(
        {
          error: 'Course must be published to create a new revision draft version.',
          draftUrl: `/instructor/courses/builder?courseId=${encodeURIComponent(course.id)}`
        },
        { status: 400 }
      );
    }

    const result = await createOrGetDraftVersion(course.id, {
      id: user.id,
      name: user.name
    });

    return NextResponse.json({
      success: true,
      isNewDraft: result.isNewDraft,
      draftUrl: result.draftUrl,
      versionState: result.versionState,
      message: result.isNewDraft
        ? `Created editable draft for Version ${result.versionState.pendingVersionLabel}. Live course remains untouched.`
        : `Resumed active draft for Version ${result.versionState.pendingVersionLabel}.`
    });
  } catch (err: any) {
    return handleAuthError(err);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
    }

    if (!['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN', 'LMS_ADMIN', 'SALES_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Access denied: Insufficient privileges to delete course version draft.' },
        { status: 403 }
      );
    }

    const course = await prisma.course.findFirst({
      where: {
        OR: [{ slug }, { id: slug }]
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        organizationId: true,
        instructorId: true
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Tenant Isolation Check
    if (!validateTenantOwnership(course.organizationId, user)) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to modify courses outside your organization.' },
        { status: 403 }
      );
    }

    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete version drafts for courses authored by your account.' },
        { status: 403 }
      );
    }

    const updatedState = await discardDraftVersion(course.id, {
      id: user.id,
      name: user.name,
      role: user.role
    });

    return NextResponse.json({
      success: true,
      versionState: updatedState,
      message: `Draft version deleted successfully for "${course.title}". Live published course remains active and untouched!`
    });
  } catch (err: any) {
    return handleAuthError(err);
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, validateTenantOwnership, handleAuthError } from '@/lib/auth';
import { createOrGetDraftVersion } from '@/lib/course-versioning';

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

    if (!['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN', 'LMS_ADMIN', 'SALES_ADMIN', 'REVIEWER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Access denied: Insufficient privileges to update course versions.' },
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
        instructorId: true,
        parentCourseId: true,
        versionNumber: true,
        versionLabel: true
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
        { error: 'Forbidden: You can only update versions of courses authored by your account.' },
        { status: 403 }
      );
    }

    const result = await createOrGetDraftVersion(course.id, {
      id: user.id,
      name: user.name
    });

    return NextResponse.json({
      success: true,
      reused: !result.isNewDraft,
      draftCourse: result.draftCourse,
      draftUrl: result.draftUrl,
      message: result.isNewDraft
        ? `Created editable draft for Version ${result.versionState.pendingVersionLabel || 'v2.0'}. Live course remains active and untouched.`
        : `Resumed active draft for Version ${result.versionState.pendingVersionLabel || 'v2.0'}.`
    });
  } catch (err: any) {
    console.error('[POST /api/courses/[slug]/update-version] Error:', err);
    return handleAuthError(err);
  }
}

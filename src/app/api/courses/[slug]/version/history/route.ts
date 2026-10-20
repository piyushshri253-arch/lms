import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, validateTenantOwnership, handleAuthError } from '@/lib/auth';
import { getCourseVersionState } from '@/lib/course-versioning';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
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
        price: true,
        discountPrice: true,
        organizationId: true,
        instructorId: true,
        instructor: { select: { id: true, name: true, email: true } },
        sections: {
          select: {
            id: true,
            title: true,
            order: true,
            lessons: {
              select: {
                id: true,
                title: true,
                type: true,
                duration: true,
                order: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (!validateTenantOwnership(course.organizationId, user)) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to view this course.' },
        { status: 403 }
      );
    }

    const versionState = await getCourseVersionState(course.id);

    const { searchParams } = new URL(request.url);
    const requestedVersion = searchParams.get('version');

    // If requesting details of a specific version
    if (requestedVersion) {
      const verNum = parseInt(requestedVersion, 10);
      const entry = (versionState.history || []).find((h) => h.versionNumber === verNum);
      if (!entry) {
        return NextResponse.json({ error: `Version ${requestedVersion} not found in history.` }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        version: entry,
        courseId: course.id,
        courseTitle: course.title,
        isLive: entry.versionNumber === versionState.liveVersionNumber
      });
    }

    const currentLiveHistory = versionState.history || [];
    // Ensure all versions have explicit status
    const formattedHistory = currentLiveHistory.map((h) => {
      const isLive = h.versionNumber === versionState.liveVersionNumber;
      return {
        ...h,
        status: isLive ? 'LIVE' : h.status || 'SUPERSEDED',
        isLive
      };
    });

    return NextResponse.json({
      success: true,
      courseId: course.id,
      courseTitle: course.title,
      courseSlug: course.slug,
      courseStatus: course.status,
      liveVersionNumber: versionState.liveVersionNumber,
      liveVersionLabel: versionState.liveVersionLabel,
      pendingVersionNumber: versionState.pendingVersionNumber,
      pendingVersionLabel: versionState.pendingVersionLabel,
      stateStatus: versionState.status,
      history: formattedHistory,
      stagedSnapshot: versionState.stagedSnapshot ? {
        title: versionState.stagedSnapshot.title,
        price: versionState.stagedSnapshot.price,
        modulesCount: versionState.stagedSnapshot.sections?.length || 0,
        lessonsCount: versionState.stagedSnapshot.sections?.reduce((a, s) => a + (s.lessons?.length || 0), 0) || 0
      } : null,
      detectedChanges: versionState.detectedChanges || []
    });
  } catch (err: any) {
    return handleAuthError(err);
  }
}

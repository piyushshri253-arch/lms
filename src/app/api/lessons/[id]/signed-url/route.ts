import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateSignedMediaUrl, checkLessonPrerequisites, calculateDripAvailability } from '@/lib/learning';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: lessonId } = await params;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: {
          include: { course: true }
        }
      }
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const courseId = lesson.section.courseId;

    // Check if free preview
    if (!lesson.isPreview && !lesson.isFree) {
      // Check active enrollment or entitlement
      const entitlement = await prisma.entitlement.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId
          }
        }
      });

      if (!entitlement || entitlement.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'Active enrollment or purchase required to access this lesson' }, { status: 403 });
      }

      // Check prerequisites
      const prereqCheck = await checkLessonPrerequisites(user.id, lessonId);
      if (!prereqCheck.allowed) {
        return NextResponse.json({
          error: `Please complete prerequisite lesson "${prereqCheck.prerequisiteLessonTitle}" first.`
        }, { status: 403 });
      }

      // Check Drip Availability
      const dripCheck = await calculateDripAvailability(user.id, courseId, lessonId);
      if (!dripCheck.isUnlocked) {
        return NextResponse.json({
          error: `This lesson unlocks on ${dripCheck.unlockDate?.toLocaleDateString()} (${dripCheck.daysRemaining} days remaining).`
        }, { status: 403 });
      }
    }

    const mediaUrl = lesson.videoUrl || lesson.pdfUrl || lesson.fileUrl || `/media/lesson-${lesson.id}`;
    const signedData = generateSignedMediaUrl(mediaUrl, user.id, 3600);

    return NextResponse.json({
      success: true,
      lessonId: lesson.id,
      title: lesson.title,
      type: lesson.type,
      signedUrl: signedData.signedUrl,
      expiresAt: signedData.expiresAt
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

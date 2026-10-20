import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateCourseExcel } from '@/lib/course-excel-validator';
import { getCourseVersionState, saveCourseVersionState, StagedCourseSnapshot } from '@/lib/course-versioning';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in.' },
        { status: 401 }
      );
    }

    if (!['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN', 'LMS_ADMIN', 'SALES_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Access denied: Insufficient privileges to import courses.' },
        { status: 403 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let buffer: Buffer | null = null;
    let fileName = 'Uploaded_Course_Template.xlsx';
    let courseId: string | undefined;
    let mode: 'NEW_COURSE' | 'REVISION_DRAFT' = 'NEW_COURSE';
    let requireVideoReference = false;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File size exceeds maximum allowed limit of 25MB` },
          { status: 413 }
        );
      }

      fileName = file.name || fileName;
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      courseId = (formData.get('courseId') as string) || undefined;
      mode = (formData.get('mode') as any) || (courseId ? 'REVISION_DRAFT' : 'NEW_COURSE');
      requireVideoReference = formData.get('requireVideoReference') === 'true';
    } else {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
      }

      const { fileData, fileName: reqName, courseId: reqCourseId, mode: reqMode, requireVideoReference: reqVideo } = body;
      if (!fileData) {
        return NextResponse.json({ error: 'fileData (base64 string) is required' }, { status: 400 });
      }

      fileName = reqName || fileName;
      courseId = reqCourseId;
      mode = reqMode || (courseId ? 'REVISION_DRAFT' : 'NEW_COURSE');
      requireVideoReference = Boolean(reqVideo);

      const base64Data = fileData.replace(/^data:.*?;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');

      if (buffer.length > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File size exceeds maximum allowed limit of 25MB` },
          { status: 413 }
        );
      }
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // Authoritative Server-side validation before any database action
    const validationResult = validateCourseExcel(buffer, { requireVideoReference });

    if (!validationResult.isValid) {
      console.warn('[Excel Import Rejected]', {
        user: user.email,
        fileName,
        blockingErrors: validationResult.blockingCount
      });
      return NextResponse.json(
        {
          error: 'Validation failed: The template contains blocking errors. No data was imported.',
          isValid: false,
          blockingCount: validationResult.blockingCount,
          errors: validationResult.errors,
          summary: validationResult.summary
        },
        { status: 422 }
      );
    }

    const parsedData = validationResult.parsedData!;

    // Mode B: Revision Draft of an existing course
    if (mode === 'REVISION_DRAFT' && courseId) {
      const existingCourse = await prisma.course.findFirst({
        where: { OR: [{ id: courseId }, { slug: courseId }] },
        include: { sections: { include: { lessons: true } } }
      });

      if (!existingCourse) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }

      // Safeguard: Never modify published version directly in revision mode!
      const currentVersionState = await getCourseVersionState(existingCourse.id);

      const stagedSnapshot: StagedCourseSnapshot = {
        title: parsedData.title || existingCourse.title,
        description: parsedData.description || existingCourse.description || '',
        shortDescription: parsedData.shortDescription || existingCourse.shortDescription || undefined,
        price: parsedData.price !== undefined ? parsedData.price : existingCourse.price,
        discountPrice: parsedData.discountPrice !== undefined ? parsedData.discountPrice : existingCourse.discountPrice,
        currency: parsedData.currency || existingCourse.currency,
        level: parsedData.level || existingCourse.level,
        language: parsedData.language || existingCourse.language,
        whatYouWillLearn: parsedData.whatYouWillLearn || (Array.isArray(existingCourse.whatYouWillLearn) ? (existingCourse.whatYouWillLearn as string[]) : existingCourse.whatYouWillLearn ? [String(existingCourse.whatYouWillLearn)] : []),
        requirements: parsedData.requirements || (Array.isArray(existingCourse.requirements) ? (existingCourse.requirements as string[]) : existingCourse.requirements ? [String(existingCourse.requirements)] : []),
        targetAudience: parsedData.targetAudience || (Array.isArray(existingCourse.targetAudience) ? (existingCourse.targetAudience as string[]) : existingCourse.targetAudience ? [String(existingCourse.targetAudience)] : []),
        accessType: parsedData.accessType || existingCourse.accessType,
        accessDays: parsedData.accessDays !== undefined ? parsedData.accessDays : existingCourse.accessDays,
        sections: (parsedData.sections || []).map((sec, sIdx) => ({
          title: sec.title,
          description: sec.description,
          order: sIdx + 1,
          lessons: (sec.lessons || []).map((les, lIdx) => ({
            title: les.title,
            description: les.description,
            type: les.type,
            content: les.content,
            videoUrl: les.videoUrl,
            quizData: les.quizData,
            duration: les.duration,
            durationSeconds: les.durationSeconds,
            isFree: les.isFree,
            isPublished: les.isPublished,
            order: lIdx + 1
          }))
        }))
      };

      // Save into version draft state
      await saveCourseVersionState(existingCourse.id, {
        ...currentVersionState,
        status: 'DRAFT_VERSION',
        pendingVersionNumber: (currentVersionState.liveVersionNumber || 1) + 1,
        pendingVersionLabel: `v${(currentVersionState.liveVersionNumber || 1) + 1}.0`,
        stagedSnapshot,
        updatedAt: new Date().toISOString()
      });

      console.log('[Excel Import Success - Mode B (Revision Draft)]', {
        courseId: existingCourse.id,
        user: user.email,
        modulesCount: parsedData.sections?.length
      });

      return NextResponse.json({
        success: true,
        mode: 'REVISION_DRAFT',
        message: 'Course revision draft updated successfully from Excel without modifying the published version.',
        summary: validationResult.summary,
        parsedData
      });
    }

    // Mode A: New Course Draft
    console.log('[Excel Import Success - Mode A (New Course)]', {
      user: user.email,
      courseTitle: parsedData.title,
      modulesCount: parsedData.sections?.length
    });

    return NextResponse.json({
      success: true,
      mode: 'NEW_COURSE',
      message: 'Course template validated and prepared for draft creation.',
      summary: validationResult.summary,
      parsedData
    });
  } catch (err: any) {
    console.error('Error during course Excel import:', err);
    return NextResponse.json(
      { error: 'Failed to import course due to an internal server error' },
      { status: 500 }
    );
  }
}

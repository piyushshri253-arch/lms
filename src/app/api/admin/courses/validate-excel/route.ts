import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { validateCourseExcel } from '@/lib/course-excel-validator';
import { validateVideoUniquenessForCourse } from '@/lib/video-deduplication';

// 25MB maximum upload limit for course Excel files
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
        { error: 'Access denied: Insufficient privileges to validate course templates.' },
        { status: 403 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let buffer: Buffer | null = null;
    let fileName = 'Uploaded_Course_Template.xlsx';
    let requireVideoReference = false;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json(
          { error: 'No file provided in form data' },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 25MB` },
          { status: 413 }
        );
      }

      fileName = file.name || fileName;
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      requireVideoReference = formData.get('requireVideoReference') === 'true';
    } else {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
      }

      const { fileData, fileName: reqFileName, requireVideoReference: reqRequireVideo } = body;
      if (!fileData) {
        return NextResponse.json({ error: 'fileData (base64 string) is required' }, { status: 400 });
      }

      fileName = reqFileName || fileName;
      requireVideoReference = Boolean(reqRequireVideo);

      // Clean base64 string
      const base64Data = fileData.replace(/^data:.*?;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');

      if (buffer.length > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File size (${(buffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 25MB` },
          { status: 413 }
        );
      }
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 });
    }

    // Run authoritative server-side validation
    const validationResult = validateCourseExcel(buffer, { requireVideoReference });

    // Strict Check: Verify that parsed video URLs are NOT already used in other courses in DB
    if (validationResult.parsedData?.sections) {
      try {
        const uniquenessCheck = await validateVideoUniquenessForCourse(
          validationResult.parsedData.sections
        );

        if (!uniquenessCheck.isValid) {
          validationResult.isValid = false;

          for (const col of uniquenessCheck.collisions) {
            validationResult.blockingCount += 1;
            validationResult.errors.push({
              location: `${col.incomingSectionTitle}, ${col.incomingLessonTitle}`,
              field: 'Video URL',
              error: `Duplicate Video Detected: This video URL (${col.videoUrl}) is already in use in course "${col.existingCourseTitle}" (Module: "${col.existingSectionTitle}", Lecture: "${col.existingLessonTitle}"). Reusing videos across courses is strictly prohibited. Each course must have unique video recordings.`,
              action: 'Provide a new, unique video recording for this lecture.',
              severity: 'BLOCKING'
            });
          }

          for (const intra of uniquenessCheck.intraDuplicates) {
            validationResult.blockingCount += 1;
            validationResult.errors.push({
              location: intra.lessons.map((l) => `${l.sectionTitle} -> ${l.lessonTitle}`).join(', '),
              field: 'Video URL',
              error: `Duplicate Video in Template: Video URL (${intra.url}) is assigned to multiple lectures in this spreadsheet.`,
              action: 'Assign a unique video to each lecture.',
              severity: 'BLOCKING'
            });
          }
        }
      } catch (err: any) {
        console.error('Error during cross-course video uniqueness validation:', err);
      }
    }

    // Secure Audit Log
    console.log('[Excel Validation Audit]', {
      user: user.email,
      userId: user.id,
      role: user.role,
      fileName,
      fileSizeBytes: buffer.length,
      isValid: validationResult.isValid,
      blockingErrorsCount: validationResult.blockingCount,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      isValid: validationResult.isValid,
      blockingCount: validationResult.blockingCount,
      warningCount: validationResult.warningCount,
      errors: validationResult.errors,
      summary: validationResult.summary,
      parsedData: validationResult.isValid ? validationResult.parsedData : undefined
    });
  } catch (err: any) {
    console.error('Server error during Excel template validation:', err);
    // Sanitize error: never leak internal stack trace
    return NextResponse.json(
      {
        error: 'Failed to validate Excel spreadsheet due to an internal server error',
        isValid: false,
        blockingCount: 1,
        warningCount: 0,
        errors: [
          {
            location: 'Server',
            field: 'Validation Engine',
            error: 'Server validation error occurred',
            action: 'Please verify the spreadsheet format and try again',
            severity: 'BLOCKING'
          }
        ]
      },
      { status: 500 }
    );
  }
}

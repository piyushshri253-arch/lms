import * as XLSX from 'xlsx-js-style';
import { BuilderSection, BuilderLesson } from '@/components/course-builder/CourseCurriculumStep';
import {
  ParsedCourseData,
  cleanModuleTitle,
  cleanLectureTitle,
  cleanQuizTitle
} from '@/lib/course-excel';

export interface ExcelValidationError {
  location: string;
  field: string;
  error: string;
  action: string;
  severity: 'BLOCKING' | 'WARNING';
}

export interface ExcelValidationSummary {
  modulesCount: number;
  lecturesCount: number;
  articlesCount: number;
  quizzesCount: number;
  questionsCount: number;
  hasFinalAssignment: boolean;
  finalAssignmentQuestionsCount: number;
  totalDurationMinutes: number;
}

export interface ExcelValidationResult {
  isValid: boolean;
  blockingCount: number;
  warningCount: number;
  errors: ExcelValidationError[];
  summary: ExcelValidationSummary;
  parsedData?: ParsedCourseData;
}

export interface ExcelValidationOptions {
  requireVideoReference?: boolean;
}

/**
 * Standard known placeholder titles from the downloadable template.
 * Used to detect if an instructor uploaded an empty/unmodified template.
 */
const TEMPLATE_PLACEHOLDER_TITLES = [
  'mastering modern ai & full-stack web development 2026',
  'complete web development bootcamp 2026',
  'sample course title'
];

/**
 * Validates a workbook buffer or parsed XLSX workbook against all strict LMS course rules.
 */
export function validateCourseExcel(
  wbOrBuffer: XLSX.WorkBook | Uint8Array | Buffer | ArrayBuffer,
  options: ExcelValidationOptions = {}
): ExcelValidationResult {
  const errors: ExcelValidationError[] = [];
  const emptySummary: ExcelValidationSummary = {
    modulesCount: 0,
    lecturesCount: 0,
    articlesCount: 0,
    quizzesCount: 0,
    questionsCount: 0,
    hasFinalAssignment: false,
    finalAssignmentQuestionsCount: 0,
    totalDurationMinutes: 0
  };

  // 1. Workbook Parsing & Integrity Check
  let wb: XLSX.WorkBook;
  try {
    if (wbOrBuffer && typeof (wbOrBuffer as any).SheetNames !== 'undefined') {
      wb = wbOrBuffer as XLSX.WorkBook;
    } else {
      const buffer = wbOrBuffer instanceof ArrayBuffer
        ? new Uint8Array(wbOrBuffer)
        : wbOrBuffer instanceof Uint8Array
        ? wbOrBuffer
        : Buffer.from(wbOrBuffer as any);
      wb = XLSX.read(buffer, { type: 'buffer' });
    }
  } catch (err: any) {
    errors.push({
      location: 'Workbook',
      field: 'File Format',
      error: 'The file is corrupted or cannot be parsed',
      action: 'Upload a valid Excel (.xlsx, .xls) spreadsheet file',
      severity: 'BLOCKING'
    });
    return {
      isValid: false,
      blockingCount: 1,
      warningCount: 0,
      errors,
      summary: emptySummary
    };
  }

  const sheetNames = wb.SheetNames || [];
  if (sheetNames.length === 0) {
    errors.push({
      location: 'Workbook',
      field: 'Worksheet Structure',
      error: 'Workbook contains no worksheets',
      action: 'Upload an Excel file generated from the official MORENA Course Upload Template',
      severity: 'BLOCKING'
    });
    return {
      isValid: false,
      blockingCount: 1,
      warningCount: 0,
      errors,
      summary: emptySummary
    };
  }

  // 2. Required Worksheets Check
  const detailsSheetName = sheetNames.find((name) => /course|detail|info|basic/i.test(name));
  const curriculumSheetName = sheetNames.find((name) => /curriculum|syllabus|modules|lessons/i.test(name));
  const quizSheetName = sheetNames.find((name) => /quiz|mcq|assessment|question/i.test(name));

  if (!detailsSheetName) {
    errors.push({
      location: 'Workbook',
      field: 'Worksheet Structure',
      error: 'Required worksheet "Course Details" is missing',
      action: 'Ensure the workbook contains the "Course Details" worksheet',
      severity: 'BLOCKING'
    });
  }

  if (!curriculumSheetName) {
    errors.push({
      location: 'Workbook',
      field: 'Worksheet Structure',
      error: 'Required worksheet "Curriculum" is missing',
      action: 'Ensure the workbook contains the "Curriculum" worksheet',
      severity: 'BLOCKING'
    });
  }

  // If foundational worksheets are missing, stop early because content cannot be checked
  if (!detailsSheetName || !curriculumSheetName) {
    return {
      isValid: false,
      blockingCount: errors.length,
      warningCount: 0,
      errors,
      summary: emptySummary
    };
  }

  // 3. Curriculum Sheet Headers Check
  const curSheet = wb.Sheets[curriculumSheetName];
  const curRows: any[][] = XLSX.utils.sheet_to_json(curSheet, { header: 1 });
  if (!curRows || curRows.length === 0) {
    errors.push({
      location: 'Course Content',
      field: 'Course Content',
      error: 'No course content found. Please fill in the mandatory course details and curriculum fields before uploading.',
      action: 'Fill in the mandatory course details and curriculum fields before uploading.',
      severity: 'BLOCKING'
    });
    return {
      isValid: false,
      blockingCount: errors.length,
      warningCount: 0,
      errors,
      summary: emptySummary
    };
  }

  const curHeaderRow = (curRows[0] || []).map((h) => String(h || '').trim().toLowerCase());
  const hasModuleHeader = curHeaderRow.some((h) => /module/i.test(h));
  const hasTopicHeader = curHeaderRow.some((h) => /topic|lesson|lecture/i.test(h));
  const hasTypeHeader = curHeaderRow.some((h) => /type|format/i.test(h));

  if (!hasModuleHeader) {
    errors.push({
      location: 'Curriculum',
      field: 'Headers',
      error: 'Mandatory column header "Module Title" is missing or altered',
      action: 'Include the "Module Title (Write once per module)" column header in row 1',
      severity: 'BLOCKING'
    });
  }
  if (!hasTopicHeader) {
    errors.push({
      location: 'Curriculum',
      field: 'Headers',
      error: 'Mandatory column header "Topic / Lesson Title" is missing or altered',
      action: 'Include the "Topic / Lesson Title *" column header in row 1',
      severity: 'BLOCKING'
    });
  }
  if (!hasTypeHeader) {
    errors.push({
      location: 'Curriculum',
      field: 'Headers',
      error: 'Mandatory column header "Content Type" is missing or altered',
      action: 'Include the "Content Type (LECTURE / ARTICLE / QUIZ / FINAL ASSIGNMENT) *" column header in row 1',
      severity: 'BLOCKING'
    });
  }

  // Parse details sheet
  const detailsSheet = wb.Sheets[detailsSheetName];
  const detailsRows: any[][] = XLSX.utils.sheet_to_json(detailsSheet, { header: 1 });
  const keyValues: Record<string, any> = {};

  // Read key-value format (Column A = Topic/Key, Column B = Value)
  for (const row of detailsRows) {
    if (!row || row.length === 0) continue;
    const key = String(row[0] || '').trim().toLowerCase();
    const val = row[1];
    if (key && val !== undefined && val !== null && val !== '') {
      keyValues[key] = val;
    }
  }

  // Also read horizontal table format if present in row 0 & 1
  if (detailsRows.length >= 2) {
    const hdrRow = detailsRows[0] || [];
    const valRow = detailsRows[1] || [];
    hdrRow.forEach((hdr: any, idx: number) => {
      const k = String(hdr || '').trim().toLowerCase();
      if (k && valRow[idx] !== undefined && valRow[idx] !== null && valRow[idx] !== '') {
        if (!keyValues[k]) keyValues[k] = valRow[idx];
      }
    });
  }

  const findDetail = (...aliases: string[]) => {
    for (const alias of aliases) {
      const lower = alias.toLowerCase();
      if (keyValues[lower] !== undefined && keyValues[lower] !== null && String(keyValues[lower]).trim() !== '') {
        return keyValues[lower];
      }
      for (const [k, v] of Object.entries(keyValues)) {
        if (k.includes(lower)) return v;
      }
    }
    return undefined;
  };

  const rawTitle = findDetail('course title', 'title');
  const courseTitle = rawTitle ? String(rawTitle).trim() : '';

  // 4. Empty Workbook Detection
  // Check if non-header rows exist in Curriculum
  const nonHeaderCurriculumRows = curRows.slice(1).filter((r) => r.some((c) => String(c || '').trim() !== ''));
  if (nonHeaderCurriculumRows.length === 0) {
    errors.push({
      location: 'Course Content',
      field: 'Course Content',
      error: 'No course content found. The spreadsheet has no curriculum modules or lessons. Please fill in your course content before uploading.',
      action: 'Fill in the curriculum sheet with modules, lectures, or quizzes before uploading.',
      severity: 'BLOCKING'
    });
    return {
      isValid: false,
      blockingCount: errors.length,
      warningCount: 0,
      errors,
      summary: emptySummary
    };
  }

  // 5. Mandatory Course Fields Validation
  if (!courseTitle || courseTitle.length < 3) {
    errors.push({
      location: 'Course Details',
      field: 'Course Title',
      error: 'Missing',
      action: 'Enter the course title',
      severity: 'BLOCKING'
    });
  }

  const rawDescription = findDetail('full course description', 'course description', 'description');
  const courseDescription = rawDescription ? String(rawDescription).trim() : '';
  if (!courseDescription || courseDescription.length < 3) {
    errors.push({
      location: 'Course Details',
      field: 'Course Description',
      error: 'Missing',
      action: 'Enter a comprehensive course description',
      severity: 'BLOCKING'
    });
  }

  const rawCategory = findDetail('category');
  const category = rawCategory ? String(rawCategory).trim() : '';
  if (!category || category.length < 2) {
    errors.push({
      location: 'Course Details',
      field: 'Category',
      error: 'Missing',
      action: 'Enter or select a valid category',
      severity: 'BLOCKING'
    });
  }

  const rawLevel = findDetail('skill level', 'level');
  const level = rawLevel ? String(rawLevel).trim() : '';
  if (!level) {
    errors.push({
      location: 'Course Details',
      field: 'Skill Level',
      error: 'Missing',
      action: 'Specify difficulty level (Foundational, Intermediate, Advanced, or All Levels)',
      severity: 'BLOCKING'
    });
  }

  const rawLanguage = findDetail('language');
  const language = rawLanguage ? String(rawLanguage).trim() : '';
  if (!language) {
    errors.push({
      location: 'Course Details',
      field: 'Language',
      error: 'Missing',
      action: 'Specify language of instruction (e.g. English, Hindi)',
      severity: 'BLOCKING'
    });
  }

  const rawOutcomes = findDetail('what students will learn', 'what you will learn', 'outcomes');
  const outcomes = rawOutcomes ? String(rawOutcomes).split(/[;\n\r|]+/).map((s) => s.trim()).filter(Boolean) : [];
  if (outcomes.length === 0) {
    errors.push({
      location: 'Course Details',
      field: 'What Students Will Learn',
      error: 'Missing',
      action: 'Enter at least one learning outcome (separate multiple with semicolons)',
      severity: 'BLOCKING'
    });
  }

  const rawPrice = findDetail('course price (inr)', 'course price', 'price');
  let parsedPrice: number | undefined;
  if (rawPrice !== undefined && rawPrice !== null && String(rawPrice).trim() !== '') {
    const p = parseFloat(String(rawPrice).replace(/[^0-9.]/g, ''));
    if (!isNaN(p) && p >= 0) {
      parsedPrice = p;
    }
  }
  if (parsedPrice === undefined) {
    errors.push({
      location: 'Course Details',
      field: 'Course Price',
      error: 'Missing or Invalid',
      action: 'Enter a valid numeric price in INR (enter 0 for Free courses)',
      severity: 'BLOCKING'
    });
  }

  const rawDiscount = findDetail('discount price (inr)', 'discount price', 'sale price');
  let parsedDiscount: number | null = null;
  if (rawDiscount !== undefined && rawDiscount !== null && String(rawDiscount).trim() !== '') {
    const dp = parseFloat(String(rawDiscount).replace(/[^0-9.]/g, ''));
    if (!isNaN(dp) && dp >= 0) {
      parsedDiscount = dp;
      if (parsedPrice !== undefined && dp > parsedPrice) {
        errors.push({
          location: 'Course Details',
          field: 'Discount Price',
          error: 'Discount price cannot exceed regular price',
          action: 'Ensure discount price is lower than regular price',
          severity: 'BLOCKING'
        });
      }
    }
  }

  // 6. Curriculum Modules & Lectures Extraction & Validation
  const rawCurriculumObjects: any[] = XLSX.utils.sheet_to_json(curSheet);
  const sections: BuilderSection[] = [];
  let currentSection: BuilderSection | null = null;
  let activeModuleIndex = 0;

  // Track raw curriculum rows for precise error reporting
  rawCurriculumObjects.forEach((row, rowIdx) => {
    const findField = (exactKeys: string[], fallbackKeyword?: string, excludeKeyword?: string) => {
      for (const [rKey, rVal] of Object.entries(row)) {
        const cleanKey = rKey.trim().toLowerCase();
        if (exactKeys.some((k) => cleanKey === k.toLowerCase())) {
          if (rVal !== undefined && rVal !== null && String(rVal).trim() !== '') {
            return String(rVal).trim();
          }
        }
      }
      if (fallbackKeyword) {
        for (const [rKey, rVal] of Object.entries(row)) {
          const cleanKey = rKey.trim().toLowerCase();
          if (excludeKeyword && cleanKey.includes(excludeKeyword.toLowerCase())) {
            continue;
          }
          if (cleanKey.includes(fallbackKeyword.toLowerCase())) {
            if (rVal !== undefined && rVal !== null && String(rVal).trim() !== '') {
              return String(rVal).trim();
            }
          }
        }
      }
      return '';
    };

    const rawModTitle = findField([
      'module title (write once per module)',
      'module title',
      'module name',
      'module',
      'section title',
      'section name'
    ]);
    const rawModDesc = findField(['module description', 'module desc', 'section description', 'section desc'], 'module desc');
    const rawLessonTitle = findField([
      'topic / lesson title *',
      'topic / lesson title',
      'topic title',
      'lecture title',
      'lesson title',
      'lecture name',
      'lesson name',
      'topic',
      'lecture',
      'lesson'
    ], 'title', 'module');
    const lessonDesc = findField(
      ['lecture description', 'lesson description', 'lecture desc', 'lesson desc', 'lecture summary', 'lesson summary'],
      'desc',
      'module'
    );
    const lessonTypeRaw = findField([
      'content type (lecture / article / quiz / final assignment) *',
      'content type (lecture / article / quiz / final assignment)',
      'content type (lecture / article / quiz) *',
      'content type (lecture / article / quiz)',
      'content type',
      'lesson type (lecture / article / quiz)',
      'lesson type',
      'lecture type (video/pdf/quiz)',
      'lecture type',
      'type',
      'format'
    ], 'type');
    const durationStr = findField(['duration (mm:ss)', 'lesson duration', 'duration', 'time', 'length'], 'duration') || '10:00';
    const isFreeRaw = findField(['free preview (yes / no)', 'free preview (yes/no)', 'is preview free (yes/no)', 'is preview free', 'is free', 'preview free', 'free preview', 'preview']);
    const isFree = /yes|true|1|free/i.test(isFreeRaw);
    const articleContentRaw = findField([
      'written article content / notes (markdown for written articles)',
      'written article content / notes (markdown)',
      'written article content / notes',
      'article content / notes',
      'written article content',
      'article content',
      'content',
      'notes',
      'markdown'
    ]);
    const videoUrlRaw = findField([
      'video url *',
      'video url',
      'video link *',
      'video link',
      'video file',
      'media url',
      'video'
    ]);

    // Skip completely empty rows
    if (!rawModTitle && !rawModDesc && !rawLessonTitle && !lessonDesc && !lessonTypeRaw) return;

    // Check if new module is starting or matching current/existing module
    if (rawModTitle) {
      const cleanedModTitle = cleanModuleTitle(rawModTitle);
      const normModKey = cleanedModTitle.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

      // Check if this module matches the currently active section or an existing section in this workbook
      let existingSection: BuilderSection | undefined;
      if (currentSection && cleanModuleTitle(currentSection.title).toLowerCase().replace(/[^a-z0-9]/g, '').trim() === normModKey) {
        existingSection = currentSection;
      } else {
        existingSection = sections.find((s) => cleanModuleTitle(s.title).toLowerCase().replace(/[^a-z0-9]/g, '').trim() === normModKey);
      }

      if (existingSection) {
        currentSection = existingSection;
        if (!currentSection.description && rawModDesc) {
          currentSection.description = rawModDesc;
        }
      } else {
        activeModuleIndex = sections.length + 1;
        if (!cleanedModTitle || cleanedModTitle.length < 2) {
          errors.push({
            location: `Module ${activeModuleIndex}`,
            field: 'Module Title',
            error: 'Missing',
            action: 'Enter a valid module title',
            severity: 'BLOCKING'
          });
        }

        currentSection = {
          id: `sec-${activeModuleIndex}`,
          title: cleanedModTitle,
          description: rawModDesc || '',
          order: activeModuleIndex,
          lessons: []
        };
        sections.push(currentSection);
      }
    } else {
      // Inherit current section if available
      if (!currentSection) {
        activeModuleIndex = sections.length + 1;
        errors.push({
          location: `Module ${activeModuleIndex}`,
          field: 'Module Title',
          error: 'Missing',
          action: 'Enter a module title on the first row of each module',
          severity: 'BLOCKING'
        });
        currentSection = {
          id: `sec-${activeModuleIndex}`,
          title: `Module ${activeModuleIndex}`,
          description: rawModDesc || '',
          order: activeModuleIndex,
          lessons: []
        };
        sections.push(currentSection);
      }
    }

    const currentModNum = currentSection.order || activeModuleIndex;
    const lessonOrderInMod = currentSection.lessons.length + 1;
    const lessonLocation = `Module ${currentModNum}, Lecture ${lessonOrderInMod}`;

    // Validate Lesson
    if (!rawLessonTitle && !lessonDesc && !lessonTypeRaw) {
      return;
    }

    const cleanedLessonTitle = cleanLectureTitle(rawLessonTitle);
    if (!cleanedLessonTitle || cleanedLessonTitle.length === 0) {
      errors.push({
        location: lessonLocation,
        field: 'Lecture Title',
        error: 'Missing',
        action: 'Enter a lecture title',
        severity: 'BLOCKING'
      });
    }

    const typeUpper = (lessonTypeRaw || '').toUpperCase().trim();
    const isExplicitFinal = /final\s*(assessment|assignment|exam)/i.test(typeUpper);
    const isExplicitQuiz = isExplicitFinal || /quiz|assessment|mcq|exam/i.test(typeUpper);
    const isExplicitArticle = !isExplicitFinal && !isExplicitQuiz && /article|text|written|note|reading/i.test(typeUpper);
    const isExplicitLecture = !isExplicitFinal && !isExplicitQuiz && !isExplicitArticle && /lecture|video/i.test(typeUpper);

    const hasExplicitType = isExplicitFinal || isExplicitQuiz || isExplicitArticle || isExplicitLecture;

    const isFinalAssignment = isExplicitFinal || /final\s*(assessment|assignment|exam)/i.test(rawLessonTitle);
    const isQuiz = isFinalAssignment || isExplicitQuiz || (!hasExplicitType && /quiz|assessment|mcq/i.test(rawLessonTitle));
    const isText = !isFinalAssignment && !isQuiz && (isExplicitArticle || (!hasExplicitType && /article|notes|reading/i.test(rawLessonTitle)));
    const isPdf = !isFinalAssignment && !isQuiz && !isText && /pdf|doc|file|handout/i.test(typeUpper);

    // Validate content type value
    if (lessonTypeRaw && !isFinalAssignment && !isQuiz && !isText && !isPdf && !isExplicitLecture) {
      errors.push({
        location: lessonLocation,
        field: 'Content Type',
        error: `Invalid content type: "${lessonTypeRaw}"`,
        action: 'Specify LECTURE, ARTICLE, QUIZ, or FINAL ASSESSMENT',
        severity: 'BLOCKING'
      });
    }

    // Validate Article Content
    if (isText) {
      if (!articleContentRaw || articleContentRaw.trim().length < 5) {
        errors.push({
          location: lessonLocation,
          field: 'Article Content',
          error: 'Missing',
          action: 'Provide written content or markdown notes for the article',
          severity: 'BLOCKING'
        });
      }
    }

    // Validate Video URL if applicable
    const isCurriculumHeaderRequiringVideo = curHeaderRow.some((h) => /video\s*url\s*\*|required/i.test(h));
    const isVideoRequired = options.requireVideoReference || isCurriculumHeaderRequiringVideo;

    if (!isQuiz && !isText && !isPdf) {
      if (isVideoRequired && (!videoUrlRaw || !videoUrlRaw.trim())) {
        errors.push({
          location: lessonLocation,
          field: 'Video URL',
          error: 'Video URL is required',
          action: 'Enter a valid supported URL',
          severity: 'BLOCKING'
        });
      } else if (videoUrlRaw && videoUrlRaw.trim()) {
        const cleanUrl = videoUrlRaw.trim();
        const isValidUrl = /^(https?:\/\/|\/|blob:|data:)/i.test(cleanUrl) || cleanUrl.includes('.mp4') || cleanUrl.includes('.webm') || cleanUrl.includes('youtube') || cleanUrl.includes('vimeo');
        if (!isValidUrl) {
          errors.push({
            location: lessonLocation,
            field: 'Video URL',
            error: 'Invalid URL',
            action: 'Enter a valid supported URL',
            severity: 'BLOCKING'
          });
        }
      }
    }

    const finalLessonTitle = isFinalAssignment
      ? (rawLessonTitle && /assignment/i.test(rawLessonTitle) ? 'Final Assignment' : 'Final Assessment')
      : isQuiz
      ? cleanQuizTitle(rawLessonTitle) || 'Quiz'
      : cleanedLessonTitle;

    const normalizedType: 'VIDEO' | 'PDF' | 'QUIZ' | 'TEXT' = isQuiz
      ? 'QUIZ'
      : isText
      ? 'TEXT'
      : isPdf
      ? 'PDF'
      : 'VIDEO';

    currentSection.lessons.push({
      id: `les-${currentModNum}-${lessonOrderInMod}`,
      title: finalLessonTitle,
      description: lessonDesc || (isFinalAssignment ? 'Mandatory comprehensive final assessment for certificate qualification.' : ''),
      type: normalizedType,
      duration: durationStr,
      durationSeconds: 600,
      content: isText ? articleContentRaw : undefined,
      videoUrl: videoUrlRaw || undefined,
      isFree,
      isPublished: true,
      isFinalAssignment: isFinalAssignment,
      order: lessonOrderInMod,
      quizData: isQuiz
        ? {
            questions: [],
            passingScore: isFinalAssignment ? 80 : 70,
            attemptLimit: 0
          }
        : undefined,
      subLessons: []
    });
  });

  // Verify modules exist and have lessons
  if (sections.length === 0) {
    errors.push({
      location: 'Curriculum',
      field: 'Modules',
      error: 'No modules found',
      action: 'Add at least one module and lecture in the Curriculum sheet',
      severity: 'BLOCKING'
    });
  } else {
    sections.forEach((sec, sIdx) => {
      if (sec.lessons.length === 0) {
        errors.push({
          location: `Module ${sIdx + 1}`,
          field: 'Lectures',
          error: 'Module has no lessons',
          action: 'Add at least one lecture, article, or quiz to this module',
          severity: 'BLOCKING'
        });
      }
    });
  }

  // 7. Quizzes & MCQs Sheet Validation (Strict Even Questions Rule & Correct Answers)
  const quizMap: Map<string, {
    key: string;
    moduleNum: number;
    quizTitle: string;
    isFinalAssignment: boolean;
    questions: any[];
    passingScore?: number;
    lessonRef?: BuilderLesson;
  }> = new Map();

  // Register quizzes from Curriculum
  sections.forEach((sec) => {
    sec.lessons.forEach((les) => {
      if (les.type === 'QUIZ') {
        const isFinal = Boolean(les.isFinalAssignment) || /final\s*(assessment|assignment|exam)/i.test(les.title || '');
        const normTitle = (les.title || (isFinal ? 'Final Assessment' : 'Quiz')).toLowerCase().trim();
        const key = isFinal ? '__final_assessment__' : `${sec.order}__${normTitle}`;
        quizMap.set(key, {
          key,
          moduleNum: sec.order,
          quizTitle: les.title || (isFinal ? 'Final Assessment' : 'Quiz'),
          isFinalAssignment: isFinal,
          questions: [],
          lessonRef: les
        });
      }
    });
  });

  // Check if Quizzes sheet exists
  if (quizSheetName && wb.Sheets[quizSheetName]) {
    const qSheet = wb.Sheets[quizSheetName];
    const quizRows: any[] = XLSX.utils.sheet_to_json(qSheet);

    let activeModuleKey = '1';
    let activeQuizKey = '';
    let activeQuizEntry: any = null;

    quizRows.forEach((row, rowIdx) => {
      const findQField = (exactKeys: string[], fallbackKeyword?: string, excludeKeyword?: string) => {
        for (const [rKey, rVal] of Object.entries(row)) {
          const cleanKey = rKey.trim().toLowerCase();
          if (exactKeys.some((k) => cleanKey === k.toLowerCase())) {
            if (rVal !== undefined && rVal !== null && String(rVal).trim() !== '') {
              return String(rVal).trim();
            }
          }
        }
        if (fallbackKeyword) {
          for (const [rKey, rVal] of Object.entries(row)) {
            const cleanKey = rKey.trim().toLowerCase();
            if (excludeKeyword && cleanKey.includes(excludeKeyword.toLowerCase())) {
              continue;
            }
            if (cleanKey.includes(fallbackKeyword.toLowerCase())) {
              if (rVal !== undefined && rVal !== null && String(rVal).trim() !== '') {
                return String(rVal).trim();
              }
            }
          }
        }
        return '';
      };

      const moduleIdentifier = findQField(['module (e.g. module 1)', 'module', 'module name', 'module #', 'section'], 'module');
      const quizTitleRaw = findQField(['quiz title (write once per quiz)', 'quiz title', 'quiz name', 'quiz', 'assessment title'], 'quiz');
      const qNumRaw = findQField(['q#', 'q', 'question number', 'question #']);
      const questionText = findQField(['question text *', 'question text', 'question', 'prompt', 'mcq'], 'question');
      const optA = findQField(['option a *', 'option a', 'choice a', 'a']);
      const optB = findQField(['option b *', 'option b', 'choice b', 'b']);
      const optC = findQField(['option c *', 'option c', 'choice c', 'c']);
      const optD = findQField(['option d *', 'option d', 'choice d', 'd']);
      const correctRaw = findQField(['correct option (a/b/c/d) *', 'correct option (a/b/c/d)', 'correct option', 'correct answer', 'answer', 'correct key', 'correct'], 'correct', 'explanation');
      const explanation = findQField(['explanation (why this option is correct)', 'explanation', 'explanation (optional)', 'rationale', 'solution'], 'explanation');
      const passScoreRaw = findQField(['passing score (%)', 'passing score', 'pass %', 'passing grade'], 'pass');
      const pointsRaw = findQField(['marks / points (e.g. 10)', 'marks / points', 'marks', 'points', 'mark', 'point', 'score'], 'mark');

      // Skip completely empty question rows
      if (!questionText && !optA && !optB && !optC && !optD && !correctRaw && !quizTitleRaw && !moduleIdentifier) {
        return;
      }

      // Resolve module number
      if (moduleIdentifier) {
        if (/final\s*(assessment|assignment|exam)/i.test(moduleIdentifier)) {
          activeModuleKey = 'final';
        } else {
          const numMatch = moduleIdentifier.match(/\d+/);
          if (numMatch) {
            activeModuleKey = numMatch[0];
          } else {
            const matchedSec = sections.find(
              (s) =>
                cleanModuleTitle(s.title).toLowerCase() === cleanModuleTitle(moduleIdentifier).toLowerCase() ||
                s.title.toLowerCase().includes(moduleIdentifier.toLowerCase())
            );
            if (matchedSec) {
              activeModuleKey = String(matchedSec.order);
            } else {
              activeModuleKey = moduleIdentifier;
            }
          }
        }
      }

      const isFinalAssignment =
        /final\s*(assessment|assignment|exam)/i.test(quizTitleRaw) ||
        /final\s*(assessment|assignment|exam)/i.test(moduleIdentifier) ||
        activeModuleKey === 'final' ||
        (!quizTitleRaw && activeQuizEntry?.isFinalAssignment);

      if (quizTitleRaw) {
        activeQuizKey = cleanQuizTitle(quizTitleRaw);
      }

      let quizEntry: any = null;

      // 1. If no new quiz title or module was specified and an active quiz entry exists, continue with it!
      if (!quizTitleRaw && !moduleIdentifier && activeQuizEntry) {
        quizEntry = activeQuizEntry;
      } else if (!quizTitleRaw && activeQuizEntry && activeQuizEntry.isFinalAssignment && isFinalAssignment) {
        quizEntry = activeQuizEntry;
      } else if (!quizTitleRaw && activeQuizEntry && String(activeQuizEntry.moduleNum) === String(activeModuleKey)) {
        quizEntry = activeQuizEntry;
      }

      // 2. Otherwise resolve target quiz
      if (!quizEntry) {
        if (isFinalAssignment) {
          quizEntry = quizMap.get('__final_assessment__');
          if (!quizEntry) {
            quizEntry = Array.from(quizMap.values()).find((v) => v.isFinalAssignment);
          }
          if (!quizEntry) {
            quizEntry = {
              key: '__final_assessment__',
              moduleNum: sections.length || 1,
              quizTitle: quizTitleRaw || 'Final Assessment',
              isFinalAssignment: true,
              questions: []
            };
            quizMap.set('__final_assessment__', quizEntry);
          }
        } else {
          const modNumInt = parseInt(activeModuleKey, 10) || 1;
          const effectiveQuizTitle = activeQuizKey || 'Quiz';
          const lookupKey = `${modNumInt}__${effectiveQuizTitle.toLowerCase().trim()}`;

          quizEntry = quizMap.get(lookupKey);

          if (!quizEntry) {
            // If this module only has 1 quiz registered from Curriculum (excluding final assessment), bind directly!
            const quizzesInModule = Array.from(quizMap.values()).filter(
              (v) => v.moduleNum === modNumInt && !v.isFinalAssignment
            );
            if (quizzesInModule.length === 1) {
              quizEntry = quizzesInModule[0];
            } else if (quizzesInModule.length > 1) {
              // Find by matching title
              quizEntry = quizzesInModule.find(
                (v) =>
                  v.quizTitle.toLowerCase().trim() === effectiveQuizTitle.toLowerCase().trim() ||
                  v.quizTitle.toLowerCase().includes(effectiveQuizTitle.toLowerCase()) ||
                  effectiveQuizTitle.toLowerCase().includes(v.quizTitle.toLowerCase())
              );
            }
          }

          if (!quizEntry) {
            // Try finding by title across quizMap
            for (const [k, v] of quizMap.entries()) {
              if (!v.isFinalAssignment && v.quizTitle.toLowerCase().trim() === effectiveQuizTitle.toLowerCase().trim()) {
                quizEntry = v;
                break;
              }
            }
          }

          if (!quizEntry) {
            quizEntry = {
              key: lookupKey,
              moduleNum: modNumInt,
              quizTitle: effectiveQuizTitle,
              isFinalAssignment: false,
              questions: []
            };
            quizMap.set(lookupKey, quizEntry);
          }
        }
      }

      activeQuizEntry = quizEntry;

      const currentQIndex = quizEntry.questions.length + 1;
      const qNumToDisplay = qNumRaw || String(currentQIndex);

      const locationPrefix = quizEntry.isFinalAssignment
        ? `Final Assessment`
        : `Module ${quizEntry.moduleNum}, ${quizEntry.quizTitle}`;
      const questionLocation = `${locationPrefix}, Question ${qNumToDisplay}`;

      // Validate Question Text
      if (!questionText || questionText.trim().length === 0) {
        errors.push({
          location: questionLocation,
          field: 'Question Text',
          error: 'Missing',
          action: 'Enter the question text',
          severity: 'BLOCKING'
        });
      }

      // Validate Options
      const options = [optA, optB, optC, optD];
      if (!optA || !optB || !optC || !optD) {
        errors.push({
          location: questionLocation,
          field: 'Options',
          error: 'Missing answer options',
          action: 'Provide all 4 answer options (Option A, Option B, Option C, Option D)',
          severity: 'BLOCKING'
        });
      }

      // Validate Correct Answer with intelligent normalization
      let cleanCorrect = correctRaw.trim().toUpperCase();
      if (!cleanCorrect) {
        errors.push({
          location: questionLocation,
          field: 'Correct Answer',
          error: 'Missing',
          action: 'Select a valid answer option',
          severity: 'BLOCKING'
        });
      } else {
        const matchLetter = cleanCorrect.match(/([A-D])/);
        const matchNum = cleanCorrect.match(/([1-4])/);
        if (['A', 'B', 'C', 'D'].includes(cleanCorrect)) {
          // already valid
        } else if (matchLetter && cleanCorrect.length <= 10) {
          cleanCorrect = matchLetter[1];
        } else if (matchNum && cleanCorrect.length <= 3) {
          const numVal = parseInt(matchNum[1], 10);
          cleanCorrect = ['A', 'B', 'C', 'D'][numVal - 1] || cleanCorrect;
        } else {
          const optMatchIdx = options.findIndex((opt) => opt && opt.trim().toLowerCase() === correctRaw.trim().toLowerCase());
          if (optMatchIdx >= 0) {
            cleanCorrect = ['A', 'B', 'C', 'D'][optMatchIdx];
          }
        }

        if (!['A', 'B', 'C', 'D'].includes(cleanCorrect)) {
          errors.push({
            location: questionLocation,
            field: 'Correct Answer',
            error: 'The correct answer must reference one of the available answer options',
            action: 'Please use the supported answer format shown in the template (A, B, C, or D)',
            severity: 'BLOCKING'
          });
        }
      }

      // Push valid question record
      quizEntry.questions.push({
        id: `q-${quizEntry.moduleNum}-${currentQIndex}`,
        question: questionText || `Question ${currentQIndex}`,
        options: [optA || 'Option A', optB || 'Option B', optC || 'Option C', optD || 'Option D'],
        correctAnswer: cleanCorrect,
        explanation: explanation || '',
        points: parseInt(pointsRaw, 10) || 10
      });

      if (passScoreRaw) {
        const parsedPass = parseInt(passScoreRaw, 10);
        if (!isNaN(parsedPass) && parsedPass > 0) {
          quizEntry.passingScore = parsedPass;
        }
      }
    });
  }

  // Consolidate orphan / duplicate quizMap entries:
  // If an entry from Curriculum has 0 questions, but another entry has questions, merge them!
  for (const [key, quiz] of Array.from(quizMap.entries())) {
    if (quiz.questions.length === 0) {
      if (quiz.isFinalAssignment) {
        const otherFinal = Array.from(quizMap.values()).find(
          (q) => q !== quiz && q.isFinalAssignment && q.questions.length > 0
        );
        if (otherFinal) {
          quiz.questions = otherFinal.questions;
          if (otherFinal.passingScore) quiz.passingScore = otherFinal.passingScore;
          quizMap.delete(otherFinal.key);
        }
      } else {
        const siblingWithQuestions = Array.from(quizMap.values()).find(
          (q) => q !== quiz && q.moduleNum === quiz.moduleNum && !q.isFinalAssignment && q.questions.length > 0
        );
        if (siblingWithQuestions && !siblingWithQuestions.lessonRef) {
          quiz.questions = siblingWithQuestions.questions;
          if (siblingWithQuestions.passingScore) quiz.passingScore = siblingWithQuestions.passingScore;
          quizMap.delete(siblingWithQuestions.key);
        }
      }
    }
  }

  // 8. Quiz Even Number of Questions Rule Validation
  let totalQuestionsCount = 0;
  let finalAssignmentFound = false;
  let finalAssignmentQuestionsCount = 0;

  for (const [, quiz] of quizMap.entries()) {
    const qCount = quiz.questions.length;
    totalQuestionsCount += qCount;

    const quizLoc = quiz.isFinalAssignment
      ? 'Final Assessment'
      : `Module ${quiz.moduleNum}, ${quiz.quizTitle}`;

    if (quiz.isFinalAssignment) {
      finalAssignmentFound = true;
      finalAssignmentQuestionsCount = qCount;
    }

    if (qCount === 0) {
      errors.push({
        location: quizLoc,
        field: 'Question Count',
        error: `${quiz.quizTitle} has 0 questions`,
        action: 'Add an even number of questions (minimum 2 questions)',
        severity: 'BLOCKING'
      });
    } else if (qCount % 2 !== 0) {
      errors.push({
        location: quizLoc,
        field: 'Question Count',
        error: `${qCount} questions; even count required`,
        action: `${quizLoc}: This quiz contains ${qCount} valid questions. An even number of questions is required. Please add or remove a question.`,
        severity: 'BLOCKING'
      });
    }

    // Attach validated questions to lesson reference for clean course builder import
    if (quiz.lessonRef && qCount > 0) {
      if (!quiz.lessonRef.quizData || typeof quiz.lessonRef.quizData === 'string') {
        quiz.lessonRef.quizData = {
          questions: [],
          passingScore: quiz.isFinalAssignment ? 80 : 70,
          attemptLimit: 0
        };
      }
      (quiz.lessonRef.quizData as any).questions = quiz.questions.map((q, qIdx) => {
        let correctIndex = 0;
        const cleanCorrect = (q.correctAnswer || 'A').toUpperCase().trim();
        if (cleanCorrect === 'B' || cleanCorrect === '2') correctIndex = 1;
        else if (cleanCorrect === 'C' || cleanCorrect === '3') correctIndex = 2;
        else if (cleanCorrect === 'D' || cleanCorrect === '4') correctIndex = 3;
        return {
          id: q.id || `q-${quiz.moduleNum}-${qIdx + 1}`,
          question: q.question,
          options: q.options,
          correctIndex,
          explanation: q.explanation || '',
          points: q.points || 10
        };
      });
      if (quiz.passingScore) {
        (quiz.lessonRef.quizData as any).passingScore = quiz.passingScore;
      }
    }
  }

  // Also check if any quiz lesson in sections was missed in quizMap
  sections.forEach((sec) => {
    sec.lessons.forEach((les) => {
      if (les.isFinalAssignment || /final\s*(assessment|assignment|exam)/i.test(les.title || '')) {
        finalAssignmentFound = true;
      }
    });
  });

  // 9. Mandatory Final Assessment Validation
  if (!finalAssignmentFound) {
    errors.push({
      location: 'Final Assessment',
      field: 'Final Assessment',
      error: 'Final Assessment is missing',
      action: 'Please add the required final assessment details before uploading the course.',
      severity: 'BLOCKING'
    });
  } else {
    // If final assessment was found as a lesson, check instructions
    const finalLesson = sections
      .flatMap((s) => s.lessons)
      .find((l) => l.isFinalAssignment || /final\s*(assessment|assignment|exam)/i.test(l.title || ''));

    if (finalLesson) {
      if (!finalLesson.title || !finalLesson.title.trim()) {
        errors.push({
          location: 'Final Assessment',
          field: 'Assessment Title',
          error: 'Missing',
          action: 'Enter assessment title',
          severity: 'BLOCKING'
        });
      }
      if (!finalLesson.description || finalLesson.description.trim().length < 5) {
        errors.push({
          location: 'Final Assessment',
          field: 'Instructions',
          error: 'Missing',
          action: 'Enter assessment instructions or description',
          severity: 'BLOCKING'
        });
      }
    }
  }

  // Calculate Summary
  let totalLectures = 0;
  let totalArticles = 0;
  let totalQuizzes = 0;

  sections.forEach((sec) => {
    sec.lessons.forEach((les) => {
      if (les.type === 'QUIZ') totalQuizzes += 1;
      else if (les.type === 'TEXT') totalArticles += 1;
      else totalLectures += 1;
    });
  });

  const summary: ExcelValidationSummary = {
    modulesCount: sections.length,
    lecturesCount: totalLectures,
    articlesCount: totalArticles,
    quizzesCount: totalQuizzes,
    questionsCount: totalQuestionsCount,
    hasFinalAssignment: finalAssignmentFound,
    finalAssignmentQuestionsCount,
    totalDurationMinutes: sections.length * 45
  };

  const blockingErrors = errors.filter((e) => e.severity === 'BLOCKING');
  const isValid = blockingErrors.length === 0;

  const parsedData: ParsedCourseData = {
    title: courseTitle,
    slug: courseTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    description: courseDescription,
    shortDescription: courseDescription.slice(0, 160),
    category,
    level,
    language,
    price: parsedPrice,
    discountPrice: parsedDiscount,
    currency: 'INR',
    accessType: 'LIFETIME',
    whatYouWillLearn: outcomes,
    sections
  };

  return {
    isValid,
    blockingCount: blockingErrors.length,
    warningCount: errors.filter((e) => e.severity === 'WARNING').length,
    errors,
    summary,
    parsedData: isValid ? parsedData : undefined
  };
}

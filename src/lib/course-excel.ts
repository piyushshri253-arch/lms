import * as XLSX from 'xlsx-js-style';
import { BuilderSection, BuilderLesson, LessonResourceItem } from '@/components/course-builder/CourseCurriculumStep';

export interface ParsedCourseData {
  title?: string;
  slug?: string;
  category?: string;
  level?: string;
  language?: string;
  shortDescription?: string;
  description?: string;
  whatYouWillLearn?: string[];
  requirements?: string[];
  targetAudience?: string[];
  price?: number;
  discountPrice?: number | null;
  currency?: string;
  accessType?: string;
  accessDays?: number | null;
  sections?: BuilderSection[];
}

/**
 * Strips redundant module prefixes like "Module 1:", "Module 1 -", "Section 1:", "Module 01."
 * so that only the pure title enters the text input field.
 */
export function cleanModuleTitle(raw?: string | null): string {
  if (!raw) return '';
  const original = String(raw).trim();
  let str = original;
  // If user provided a lone number like "1", "2", "01" -> "Module 1", "Module 2"
  if (/^\d+$/.test(str)) {
    return `Module ${parseInt(str, 10)}`;
  }
  // Strip leading "Module 1:", "Section 1 -", "Module 01.", "Module 1", "Section 1"
  str = str.replace(/^(module|section)\s*\d+[\s:\-\.]*/i, '').trim();
  // Strip leading numbers like "1: ", "1 - ", "1. "
  str = str.replace(/^(\d+(\.\d+)*)[\s:\-\.]+\s*/, '').trim();
  // If only a lone number or single word "Module" was left, clear it
  str = str.replace(/^\d+(\.\d+)*$/, '').trim();
  str = str.replace(/^(module|section)$/i, '').trim();
  return str || original;
}

/**
 * Strips redundant lecture prefixes like "1.1 ", "Lecture 1:", "Lecture 1 -", "01. ", "Lesson 1:"
 * so that only the pure title enters the text input field.
 */
export function cleanLectureTitle(raw?: string | null): string {
  if (!raw) return '';
  const original = String(raw).trim();
  let str = original;
  // Strip leading "Lecture 1:", "Lesson 1 -", "Lecture 01.", "Lecture 1", "Lesson 1"
  str = str.replace(/^(lecture|lesson)\s*\d+[\s:\-\.]*/i, '').trim();
  // Strip leading numbering like "1.1: ", "1.1 - ", "1.1.1 ", "1.1 ", "01. ", "1 - ", "1: ", "1. "
  str = str.replace(/^(\d+(\.\d+)*)[\s:\-\.]+\s*/, '').trim();
  // If only a lone number or decimal like "1" or "1.1" was left, clear it
  str = str.replace(/^\d+(\.\d+)*$/, '').trim();
  str = str.replace(/^(lecture|lesson)$/i, '').trim();
  return str || original;
}

/**
 * Strips redundant quiz prefixes like "Quiz 1:", "Quiz 1 -", "Quiz 1.", "Assessment 1:",
 * "Module 1 Quiz", "Section 1 Assessment", etc. so that only the pure title enters the text input field.
 */
export function cleanQuizTitle(raw?: string | null): string {
  if (!raw) return '';
  const original = String(raw).trim();
  let str = original;
  // If it's a Final Assessment or Final Assignment, preserve it cleanly as Final Assessment
  if (/final\s*(assessment|assignment|exam)/i.test(str)) {
    return 'Final Assessment';
  }
  // Strip leading module/section prefixes like "Module 1:", "Module-1 -", "Section 1.", "Sec 1:", "M1 -"
  str = str.replace(/^(?:module|section|sec|m)[\s:\-\._]*\d+[\s:\-\._]*/i, '').trim();
  // Strip leading "Quiz 1:", "Quiz 1 -", "Quiz 1.", "Assessment 1:", etc.
  str = str.replace(/^(?:quiz|assessment|mcq)[\s:\-\._]*\d*[\s:\-\._]*/i, '').trim();
  // Strip leading numbers like "1: ", "1 - ", "1. ", "01. "
  str = str.replace(/^(\d+(\.\d+)*)[\s:\-\.]+\s*/, '').trim();
  // Strip trailing "Quiz", "Assessment", "MCQ" if preceded by module/section or alone
  str = str.replace(/\s*(?:quiz|assessment|mcqs?)$/i, '').trim();
  // If only a lone number was left, clear it
  str = str.replace(/^\d+(\.\d+)*$/, '').trim();
  // If empty after stripping, default to "Quiz"
  return str || 'Quiz';
}

/**
 * Strips redundant article prefixes like "Article 1:", "Article 1 -", "Article 01.", "Reading 1:",
 * "Module 1 - Article 1", etc. so that only the pure title enters the text input field.
 */
export function cleanArticleTitle(raw?: string | null): string {
  if (!raw) return '';
  const original = String(raw).trim();
  let str = original;
  // Strip leading module/section prefixes like "Module 1:", "Module-1 -", "Sec 1:"
  str = str.replace(/^(?:module|section|sec|m)[\s:\-\._]*\d+[\s:\-\._]*/i, '').trim();
  // Strip leading "Article 1:", "Reading 1 -", "Article 01.", "Article 1", "Reading 1"
  str = str.replace(/^(article|reading|document|notes?)\s*\d*[\s:\-\.]*/i, '').trim();
  // Strip leading numbering like "1.1: ", "1.1 - ", "1.1.1 ", "1.1 ", "01. ", "1 - ", "1: ", "1. "
  str = str.replace(/^(\d+(\.\d+)*)[\s:\-\.]+\s*/, '').trim();
  // If only a lone number or decimal like "1" or "1.1" was left, clear it
  str = str.replace(/^\d+(\.\d+)*$/, '').trim();
  str = str.replace(/^(article|reading|document|notes?)$/i, '').trim();
  return str || original;
}

/**
 * Normalizes the internal ordering of lessons inside any module/section:
 * 1. Lectures (video, pdf, external resources)
 * 2. Written Articles (reading material, notes) - STRICTLY ABOVE QUIZZES!
 * 3. Quizzes & MCQs (mid-module knowledge checks) - STRICTLY AT MOST ONE PER MODULE!
 * 4. Final Assessment (strictly the final lesson of the module/course)
 */
export function sortSectionLessons(lessons: BuilderLesson[]): BuilderLesson[] {
  if (!Array.isArray(lessons) || lessons.length === 0) return lessons || [];

  const lectures: BuilderLesson[] = [];
  const articles: BuilderLesson[] = [];
  const quizzes: BuilderLesson[] = [];
  let finalAssessment: BuilderLesson | null = null;

  const getQCount = (l: BuilderLesson | any): number => {
    if (!l || !l.quizData) return 0;
    try {
      const qd = typeof l.quizData === 'string' ? JSON.parse(l.quizData) : l.quizData;
      return Array.isArray(qd?.questions) ? qd.questions.length : 0;
    } catch {
      return 0;
    }
  };

  for (const les of lessons) {
    if (!les) continue;
    const isFinal =
      Boolean(les.isFinalAssignment) ||
      (les.type === 'QUIZ' && /final\s*(assessment|assignment|exam)/i.test(les.title || '')) ||
      /final\s*(assessment|assignment|exam)/i.test(les.title || '');

    if (isFinal) {
      if (!finalAssessment || getQCount(les) > getQCount(finalAssessment)) {
        finalAssessment = {
          ...les,
          title: 'Final Assessment',
          type: 'QUIZ',
          isFinalAssignment: true
        };
      }
    } else if (les.type === 'QUIZ') {
      const cleanTitle = cleanQuizTitle(les.title) || 'Quiz';
      const cleanKey = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Check if this quiz is a duplicate of an existing quiz in the section
      const duplicateIdx = quizzes.findIndex((q) => {
        const qKey = (cleanQuizTitle(q.title) || 'Quiz').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (qKey === cleanKey) return true;
        // Generic quiz duplicate match (e.g. "Quiz" and "Module 1 Quiz" when only 1 quiz existed)
        if ((qKey === 'quiz' || cleanKey === 'quiz') && !/[0-9]/.test(qKey) && !/[0-9]/.test(cleanKey)) return true;
        return false;
      });

      if (duplicateIdx !== -1) {
        // Merge duplicate quiz into the existing one
        const existingQuiz = quizzes[duplicateIdx];
        let existingQData: any = existingQuiz.quizData;
        if (typeof existingQData === 'string') {
          try { existingQData = JSON.parse(existingQData); } catch { existingQData = { questions: [], passingScore: 70, attemptLimit: 0 }; }
        }
        let incomingQData: any = les.quizData;
        if (typeof incomingQData === 'string') {
          try { incomingQData = JSON.parse(incomingQData); } catch { incomingQData = { questions: [], passingScore: 70, attemptLimit: 0 }; }
        }

        const existingQs: any[] = Array.isArray(existingQData?.questions) ? existingQData.questions : [];
        const incomingQs: any[] = Array.isArray(incomingQData?.questions) ? incomingQData.questions : [];

        if (incomingQs.length > 0) {
          if (existingQs.length === 0) {
            existingQuiz.quizData = les.quizData;
            if (les.title) existingQuiz.title = les.title;
          } else {
            const existingTexts = new Set(
              existingQs.map((q) => String(q.question || q.title || '').trim().toLowerCase())
            );
            const combined = [...existingQs];
            incomingQs.forEach((q) => {
              const text = String(q.question || q.title || '').trim().toLowerCase();
              if (text && !existingTexts.has(text)) {
                existingTexts.add(text);
                combined.push(q);
              }
            });
            existingQuiz.quizData = {
              questions: combined,
              passingScore: typeof existingQData === 'object' && existingQData?.passingScore ? Number(existingQData.passingScore) : 70,
              attemptLimit: typeof existingQData === 'object' && existingQData?.attemptLimit ? Number(existingQData.attemptLimit) : 0
            };
          }
        }
        if (les.title && (!existingQuiz.title || existingQuiz.title === 'Quiz')) {
          existingQuiz.title = les.title;
        }
      } else {
        // Legitimate distinct quiz (e.g. Quiz 1 vs Quiz 2)
        quizzes.push({ ...les, title: les.title || cleanTitle });
      }
    } else if (les.type === 'TEXT' || (les.type as any) === 'ARTICLE' || (les.type as any) === 'DOCUMENT') {
      articles.push(les);
    } else {
      lectures.push(les);
    }
  }

  const sorted: BuilderLesson[] = [...lectures, ...articles, ...quizzes];
  if (finalAssessment) {
    sorted.push(finalAssessment);
  }

  return sorted.map((l, idx) => ({ ...l, order: idx + 1 }));
}

/**
 * Accurately resolves the target section/module for an incoming lesson, quiz, or article
 * using robust numeric matching, clean title matching, and substring heuristics.
 * Prevents creating duplicate phantom sections or misplacing items into the wrong module.
 */
export function resolveTargetSection(
  rawIdentifier: string | undefined | null,
  sections: BuilderSection[],
  activeSection?: BuilderSection | null
): BuilderSection | null {
  if (!Array.isArray(sections) || sections.length === 0) {
    return activeSection || null;
  }

  const raw = String(rawIdentifier || '').trim();

  // If identifier is completely empty, inherit activeSection or default to first section
  if (!raw) {
    if (activeSection && sections.some((s) => s.id === activeSection.id)) {
      return activeSection;
    }
    return sections[0] || null;
  }

  // Final Assessment identifier check
  if (/final\s*(assessment|assignment|exam)/i.test(raw)) {
    return sections[sections.length - 1];
  }

  // 1. Numeric Module Extraction:
  // Matches "Module 2", "Module-2", "Module_2", "Sec 2", "Section 2", "M2", "M-2", "Module 02"
  const modPatternMatch = raw.match(/(?:module|section|sec|m)[\s:\-\._]*0*(\d+)\b/i);
  // Matches "2: Child Development", "2. Child Development", "2 - Child Development", "02: ..."
  const leadingNumMatch = raw.match(/^0*(\d+)[\s:\-\._]/);
  // Matches lone numbers like "2", "02"
  const loneNumMatch = raw.match(/^0*(\d+)$/);

  const matchedNumStr =
    (modPatternMatch && modPatternMatch[1]) ||
    (leadingNumMatch && leadingNumMatch[1]) ||
    (loneNumMatch && loneNumMatch[1]);

  if (matchedNumStr) {
    const modNum = parseInt(matchedNumStr, 10);
    // a. 1-based index into sections array
    if (modNum >= 1 && modNum <= sections.length) {
      return sections[modNum - 1];
    }
    // b. Match by section.order === modNum
    const byOrder = sections.find((s) => s.order === modNum);
    if (byOrder) return byOrder;

    // c. Match by module number pattern inside existing section title
    const byTitleNum = sections.find((s) =>
      new RegExp(`(?:module|section|sec|m)[\\s:\\-\\._]*0*${modNum}\\b`, 'i').test(s.title) ||
      new RegExp(`^0*${modNum}[\\s:\\-\\._]`, 'i').test(s.title.trim())
    );
    if (byTitleNum) return byTitleNum;

    // Strict guard: An explicit module number was given (e.g. "Module 7"), but no existing section
    // has that module number. Do NOT fall through to substring matching an unrelated module!
    return null;
  }

  // Helper for pure alphanumeric normalization
  const cleanNorm = (t: string) => cleanModuleTitle(t).toLowerCase().replace(/[^a-z0-9]/g, '');
  const rawClean = cleanNorm(raw);

  // 2. Exact or clean title matching
  if (rawClean) {
    const exactMatch = sections.find((s) => cleanNorm(s.title) === rawClean);
    if (exactMatch) return exactMatch;
  }

  // 3. Substring matching (e.g. "Child Development" matches "Module 2: Child Development & Pedagogy")
  if (rawClean && rawClean.length >= 3) {
    const subMatch = sections.find((s) => {
      const sClean = cleanNorm(s.title);
      return sClean.includes(rawClean) || (sClean.length >= 3 && rawClean.includes(sClean));
    });
    if (subMatch) return subMatch;
  }

  // 4. Any remaining number in the string (fallback)
  const anyNumMatch = raw.match(/\d+/);
  if (anyNumMatch) {
    const fallbackNum = parseInt(anyNumMatch[0], 10);
    if (fallbackNum >= 1 && fallbackNum <= sections.length) {
      return sections[fallbackNum - 1];
    }
  }

  // If an explicit module identifier was provided but did not match ANY existing section,
  // return null so caller knows this is a NEW or UNMATCHED module!
  return null;
}

/**
 * Ensures that if a course has a Final Assessment lesson, it is strictly placed at the very end
 * of the course curriculum (as the last lesson of the last section).
 * This prevents any newly added modules or lessons from appearing after the Final Assessment.
 */
export function ensureFinalAssessmentAtEnd(sections: BuilderSection[]): BuilderSection[] {
  if (!Array.isArray(sections) || sections.length === 0) return sections || [];

  const getQCount = (l: BuilderLesson | any): number => {
    if (!l || !l.quizData) return 0;
    try {
      const qd = typeof l.quizData === 'string' ? JSON.parse(l.quizData) : l.quizData;
      return Array.isArray(qd?.questions) ? qd.questions.length : 0;
    } catch {
      return 0;
    }
  };

  const isFinalExamLesson = (l: BuilderLesson | any): boolean => {
    if (!l) return false;
    const rawTitle = String(l?.title || '').trim().toLowerCase();
    if (l?.type === 'QUIZ' && !/final\s*(assessment|assignment|exam)/i.test(rawTitle) && !l?.isFinalAssignment) {
      return false;
    }
    return Boolean(l?.isFinalAssignment) || /final\s*(assessment|assignment|exam)/i.test(rawTitle);
  };

  const isDedicatedFinalSec = (s: BuilderSection): boolean => {
    const lessons = Array.isArray(s.lessons) ? s.lessons : [];
    if (lessons.length === 1 && isFinalExamLesson(lessons[0])) return true;
    if (/final\s*(assessment|exam|certification)/i.test(s.title || '') && lessons.every((l) => isFinalExamLesson(l))) return true;
    return false;
  };

  // Find all final assessment candidates across ALL sections and pick the most authoritative one
  let bestFinalLesson: BuilderLesson | null = null;
  let bestQuestionCount = -1;

  for (const sec of sections) {
    for (const les of (sec.lessons || [])) {
      if (isFinalExamLesson(les)) {
        const qCount = getQCount(les);
        if (!bestFinalLesson || qCount > bestQuestionCount) {
          bestFinalLesson = {
            ...les,
            isFinalAssignment: true,
            type: 'QUIZ',
            title: 'Final Assessment'
          };
          bestQuestionCount = qCount;
        }
      }
    }
  }

  // If no final assessment exists in this course, return as is
  if (!bestFinalLesson) {
    return sections;
  }

  bestFinalLesson.title = 'Final Assessment';
  bestFinalLesson.type = 'QUIZ';
  bestFinalLesson.isFinalAssignment = true;

  // Check if there was a dedicated section for the final assessment
  const dedicatedSecIdx = sections.findIndex((s) => isDedicatedFinalSec(s));

  if (dedicatedSecIdx !== -1) {
    // Dedicated section exists!
    // Clone sections, stripping any stray final exam lessons from non-dedicated sections
    const nonDedicatedSections: BuilderSection[] = [];
    let dedicatedSec: BuilderSection | null = null;

    sections.forEach((s, idx) => {
      if (idx === dedicatedSecIdx) {
        dedicatedSec = {
          ...s,
          lessons: [{ ...bestFinalLesson!, order: 1 }]
        };
      } else {
        const cleanLessons = (s.lessons || []).filter((l) => !isFinalExamLesson(l)).map((l) => ({ ...l }));
        nonDedicatedSections.push({
          ...s,
          lessons: cleanLessons
        });
      }
    });

    const finalSections = [...nonDedicatedSections];
    if (dedicatedSec) {
      finalSections.push(dedicatedSec);
    }

    return finalSections.map((sec, sIdx) => ({
      ...sec,
      order: sIdx + 1,
      lessons: (sec.lessons || []).map((les, lIdx) => ({
        ...les,
        order: lIdx + 1
      }))
    }));
  }

  // Non-dedicated: Strip ALL final assessment lessons from all sections
  const newSections: BuilderSection[] = sections.map((s) => ({
    ...s,
    lessons: (s.lessons || []).filter((l) => !isFinalExamLesson(l)).map((l) => ({ ...l }))
  }));

  if (newSections.length === 0) {
    newSections.push({
      id: `sec-${Date.now()}-1`,
      clientKey: `sec-${Date.now()}-1`,
      title: 'Course Assessment',
      description: '',
      order: 1,
      lessons: []
    });
  }

  // Place bestFinalLesson as the VERY LAST lesson of the LAST section
  const lastSec = newSections[newSections.length - 1];
  bestFinalLesson.order = (lastSec.lessons || []).length + 1;
  lastSec.lessons.push(bestFinalLesson);

  // Re-number orders cleanly across all sections and lessons
  return newSections.map((sec, sIdx) => ({
    ...sec,
    order: sIdx + 1,
    lessons: (sec.lessons || []).map((les, lIdx) => ({
      ...les,
      order: lIdx + 1
    }))
  }));
}

/**
 * Generates and downloads the official Course Upload Template (.xlsx)
 * Fully styled with bold topics, header backgrounds, status badges, and crystal clear instructions.
 */
export function downloadCourseExcelTemplate() {
  const wb = XLSX.utils.book_new();

  // Reusable cell styles for professional presentation & visual clarity
  const styles = {
    headerDark: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E293B' } }, // Slate 800
      alignment: { vertical: 'center', horizontal: 'center', wrapText: true }
    },
    headerBlue: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E40AF' } }, // Blue 800
      alignment: { vertical: 'center', horizontal: 'center', wrapText: true }
    },
    headerTeal: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } }, // White font
      fill: { fgColor: { rgb: '0F766E' } }, // Teal 700 background
      alignment: { vertical: 'center', horizontal: 'center', wrapText: true }
    },
    headerPurple: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } }, // White font
      fill: { fgColor: { rgb: '581C87' } }, // Purple 800 background
      alignment: { vertical: 'center', horizontal: 'center', wrapText: true }
    },
    headerAmber: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } }, // White font
      fill: { fgColor: { rgb: 'B45309' } }, // Amber 700 background
      alignment: { vertical: 'center', horizontal: 'center', wrapText: true }
    },
    sectionBanner: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '1E3A8A' } },
      fill: { fgColor: { rgb: 'DBEAFE' } }, // Light blue
      alignment: { vertical: 'center', horizontal: 'left' }
    },
    boldTopic: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '0F172A' } },
      alignment: { vertical: 'center', horizontal: 'left', wrapText: true }
    },
    boldCenter: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '0F172A' } },
      alignment: { vertical: 'center', horizontal: 'center' }
    },
    requiredBadge: {
      font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'B91C1C' } },
      fill: { fgColor: { rgb: 'FEE2E2' } },
      alignment: { vertical: 'center', horizontal: 'center' }
    },
    optionalBadge: {
      font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '475569' } },
      fill: { fgColor: { rgb: 'F1F5F9' } },
      alignment: { vertical: 'center', horizontal: 'center' }
    },
    cellNormal: {
      font: { name: 'Calibri', sz: 11, color: { rgb: '1E293B' } },
      alignment: { vertical: 'center', horizontal: 'left', wrapText: true }
    },
    centerNormal: {
      font: { name: 'Calibri', sz: 11, color: { rgb: '1E293B' } },
      alignment: { vertical: 'center', horizontal: 'center' }
    },
    cellInstruction: {
      font: { name: 'Calibri', sz: 10, color: { rgb: '475569' }, italic: true },
      alignment: { vertical: 'center', horizontal: 'left', wrapText: true }
    }
  };

  // 1. Course Details Sheet Data
  const detailsAOA: any[][] = [
    [
      'Field Name (Topic)',
      'Your Value / Enter Value Here',
      'Status',
      'Instructions & Examples'
    ],
    ['📌 SECTION 1: BASIC COURSE INFORMATION', '', '', ''],
    [
      'Course Title *',
      '',
      'REQUIRED',
      'Enter the official title of your course (e.g., Complete Web Development Bootcamp 2026)'
    ],
    [
      'Course Slug',
      '',
      'OPTIONAL',
      'URL slug for the course. Leave empty to auto-generate from the title'
    ],
    [
      'Category *',
      '',
      'REQUIRED',
      'Select category: Web Development, Artificial Intelligence, Business, Design, Teacher Training, etc.'
    ],
    [
      'Skill Level *',
      '',
      'REQUIRED',
      'Select difficulty level: Foundational, Intermediate, Advanced, or All Levels'
    ],
    [
      'Language *',
      'English',
      'REQUIRED',
      'Primary language of instruction (e.g., English, Hindi, Spanish)'
    ],
    ['📝 SECTION 2: DESCRIPTIONS & LEARNING OBJECTIVES', '', '', ''],
    [
      'Short Description *',
      '',
      'REQUIRED',
      'Compelling 1-2 sentence summary for course preview cards and search results'
    ],
    [
      'Full Course Description *',
      '',
      'REQUIRED',
      'Comprehensive course overview explaining curriculum scope, target skills, and instructor value'
    ],
    [
      'What You\'ll Learn (Key Learning Outcomes) *',
      '',
      'REQUIRED',
      'Separate each learning outcome with a semicolon (;). Example: Build modern apps with Next.js; Design PostgreSQL schemas'
    ],
    [
      'Before You Begin (Prerequisites & Requirements) *',
      '',
      'REQUIRED',
      'Prerequisites or required background separated by semicolons (;). Example: Basic JavaScript; Familiarity with Git'
    ],
    [
      'Who This Course Is For (Target Audience) *',
      '',
      'REQUIRED',
      'Target learner profiles separated by semicolons (;). Example: Full-Stack Developers; DevOps Engineers; Technical Leads'
    ],
    ['💰 SECTION 3: PRICING & ENROLLMENT SETTINGS', '', '', ''],
    [
      'Course Price (INR) *',
      '',
      'REQUIRED',
      'Standard enrollment price in INR (numeric only, e.g., 2999). Enter 0 for Free courses'
    ],
    [
      'Discount Price (INR)',
      '',
      'OPTIONAL',
      'Optional discounted offer price in INR (must be lower than regular price, e.g., 999). Leave blank if no discount'
    ],
    [
      'Currency *',
      'INR',
      'REQUIRED',
      'Standard ISO currency code: INR'
    ],
    [
      'Access Type *',
      'LIFETIME',
      'REQUIRED',
      'Choose access duration: LIFETIME or LIMITED_DAYS'
    ],
    [
      'Access Days',
      '',
      'OPTIONAL',
      'Enter number of validity days if Access Type is LIMITED_DAYS (e.g., 365). Leave blank for LIFETIME'
    ]
  ];

  const wsDetails = XLSX.utils.aoa_to_sheet(detailsAOA);
  detailsAOA.forEach((row, rIdx) => {
    const isHeader = rIdx === 0;
    const isBanner = String(row[0] || '').startsWith('📌') || String(row[0] || '').startsWith('📝') || String(row[0] || '').startsWith('💰');
    for (let cIdx = 0; cIdx < row.length; cIdx++) {
      const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
      if (!wsDetails[cellRef]) wsDetails[cellRef] = { t: 's', v: '' };
      if (isHeader) {
        wsDetails[cellRef].s = styles.headerDark;
      } else if (isBanner) {
        wsDetails[cellRef].s = styles.sectionBanner;
      } else {
        if (cIdx === 0) wsDetails[cellRef].s = styles.boldTopic;
        else if (cIdx === 1) wsDetails[cellRef].s = styles.cellNormal;
        else if (cIdx === 2) wsDetails[cellRef].s = row[2] === 'REQUIRED' ? styles.requiredBadge : styles.optionalBadge;
        else if (cIdx === 3) wsDetails[cellRef].s = styles.cellInstruction;
      }
    }
  });

  wsDetails['!cols'] = [
    { wch: 42 }, // Field Name
    { wch: 65 }, // Your Value
    { wch: 18 }, // Status
    { wch: 80 }  // Instructions
  ];
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Course Details');

  // 2. Curriculum Syllabus Sheet Data
  const curriculumAOA: any[][] = [
    [
      'Module Title (Write once per module)',
      'Topic / Lesson Title *',
      'Content Type (LECTURE) *',
      'Duration (mm:ss)',
      'Free Preview (Yes / No)'
    ],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', '']
  ];

  const wsCurriculum = XLSX.utils.aoa_to_sheet(curriculumAOA);
  curriculumAOA.forEach((row, rIdx) => {
    const isHeader = rIdx === 0;
    for (let cIdx = 0; cIdx < row.length; cIdx++) {
      const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
      if (!wsCurriculum[cellRef]) wsCurriculum[cellRef] = { t: 's', v: '' };
      if (isHeader) {
        wsCurriculum[cellRef].s = styles.headerBlue;
      } else {
        if (cIdx === 0) wsCurriculum[cellRef].s = styles.boldTopic;
        else if (cIdx === 1) wsCurriculum[cellRef].s = styles.boldTopic; // Topic in BOLD
        else if (cIdx === 2) wsCurriculum[cellRef].s = styles.boldCenter;
        else if (cIdx === 3) wsCurriculum[cellRef].s = styles.centerNormal;
        else if (cIdx === 4) wsCurriculum[cellRef].s = styles.centerNormal;
      }
    }
  });

  wsCurriculum['!cols'] = [
    { wch: 42 }, // Module Title
    { wch: 48 }, // Topic / Lesson Title
    { wch: 28 }, // Content Type (LECTURE) *
    { wch: 20 }, // Duration
    { wch: 24 }  // Free Preview
  ];
  XLSX.utils.book_append_sheet(wb, wsCurriculum, 'Curriculum Syllabus');

  // 3. Articles Sheet Data (Dedicated Articles & Reading Material)
  const articlesAOA: any[][] = [
    [
      'Module (e.g. Module 1)',
      'Article Title *',
      'Reading Duration (mm:ss)',
      'Free Preview (Yes / No)',
      'Article Content / Notes (Markdown or Text) *',
      'Resource / Reference Links (Optional)'
    ],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['', '', '', '', '', '']
  ];

  const wsArticles = XLSX.utils.aoa_to_sheet(articlesAOA);
  articlesAOA.forEach((row, rIdx) => {
    const isHeader = rIdx === 0;
    for (let cIdx = 0; cIdx < row.length; cIdx++) {
      const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
      if (!wsArticles[cellRef]) wsArticles[cellRef] = { t: 's', v: '' };
      if (isHeader) {
        wsArticles[cellRef].s = styles.headerTeal;
      } else {
        if (cIdx === 0 || cIdx === 1) wsArticles[cellRef].s = styles.boldTopic;
        else if (cIdx === 2 || cIdx === 3) wsArticles[cellRef].s = styles.boldCenter;
        else wsArticles[cellRef].s = styles.cellNormal;
      }
    }
  });

  wsArticles['!cols'] = [
    { wch: 30 }, // Module
    { wch: 45 }, // Article Title
    { wch: 24 }, // Reading Duration
    { wch: 22 }, // Free Preview
    { wch: 80 }, // Article Content
    { wch: 40 }  // Resource Links
  ];
  XLSX.utils.book_append_sheet(wb, wsArticles, 'Articles');

  // 3. Quizzes & MCQs Sheet Data (Mid-Module Knowledge Checks)
  const quizzesAOA: any[][] = [
    [
      'Module (e.g. Module 1)',
      'Quiz Title (Write once per quiz)',
      'Q#',
      'Question Text *',
      'Option A *',
      'Option B *',
      'Option C *',
      'Option D *',
      'Correct Option (A/B/C/D) *',
      'Explanation (Why this option is correct)',
      'Passing Score (%)',
      'Marks / Points (e.g. 10)'
    ],
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '']
  ];

  const wsQuizzes = XLSX.utils.aoa_to_sheet(quizzesAOA);
  quizzesAOA.forEach((row, rIdx) => {
    const isHeader = rIdx === 0;
    for (let cIdx = 0; cIdx < row.length; cIdx++) {
      const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
      if (!wsQuizzes[cellRef]) wsQuizzes[cellRef] = { t: 's', v: '' };
      if (isHeader) {
        wsQuizzes[cellRef].s = styles.headerPurple;
      } else {
        if (cIdx === 0) wsQuizzes[cellRef].s = styles.boldTopic;
        else if (cIdx === 1) wsQuizzes[cellRef].s = styles.boldTopic; // Quiz Title in BOLD
        else if (cIdx === 2) wsQuizzes[cellRef].s = styles.boldCenter;
        else if (cIdx === 3) wsQuizzes[cellRef].s = styles.boldTopic; // Question in BOLD
        else if (cIdx >= 4 && cIdx <= 7) wsQuizzes[cellRef].s = styles.cellNormal;
        else if (cIdx === 8) wsQuizzes[cellRef].s = styles.boldCenter;
        else if (cIdx === 9) wsQuizzes[cellRef].s = styles.cellNormal;
        else if (cIdx === 10 || cIdx === 11) wsQuizzes[cellRef].s = styles.centerNormal;
      }
    }
  });

  wsQuizzes['!cols'] = [
    { wch: 24 }, // Module
    { wch: 35 }, // Quiz Title
    { wch: 8 },  // Q#
    { wch: 75 }, // Question Text
    { wch: 26 }, // Option A
    { wch: 26 }, // Option B
    { wch: 26 }, // Option C
    { wch: 26 }, // Option D
    { wch: 26 }, // Correct Option
    { wch: 65 }, // Explanation
    { wch: 18 }, // Passing Score (%)
    { wch: 22 }  // Marks / Points (e.g. 10)
  ];
  XLSX.utils.book_append_sheet(wb, wsQuizzes, 'Quizzes & MCQs');

  // 4. Final Assessment Sheet Data (Dedicated Certification Gate Exam)
  const finalAssessmentAOA: any[][] = [
    [
      'Assessment Title',
      'Q#',
      'Question Text *',
      'Option A *',
      'Option B *',
      'Option C *',
      'Option D *',
      'Correct Option (A/B/C/D) *',
      'Explanation (Why this option is correct)',
      'Passing Score (%)',
      'Marks / Points (e.g. 10)'
    ],
    ['', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '']
  ];

  const wsFinalAssessment = XLSX.utils.aoa_to_sheet(finalAssessmentAOA);
  finalAssessmentAOA.forEach((row, rIdx) => {
    const isHeader = rIdx === 0;
    for (let cIdx = 0; cIdx < row.length; cIdx++) {
      const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
      if (!wsFinalAssessment[cellRef]) wsFinalAssessment[cellRef] = { t: 's', v: '' };
      if (isHeader) {
        wsFinalAssessment[cellRef].s = styles.headerAmber;
      } else {
        if (cIdx === 0) wsFinalAssessment[cellRef].s = styles.boldTopic; // Assessment Title in BOLD
        else if (cIdx === 1) wsFinalAssessment[cellRef].s = styles.boldCenter; // Q#
        else if (cIdx === 2) wsFinalAssessment[cellRef].s = styles.boldTopic; // Question in BOLD
        else if (cIdx >= 3 && cIdx <= 6) wsFinalAssessment[cellRef].s = styles.cellNormal;
        else if (cIdx === 7) wsFinalAssessment[cellRef].s = styles.boldCenter;
        else if (cIdx === 8) wsFinalAssessment[cellRef].s = styles.cellNormal;
        else if (cIdx === 9 || cIdx === 10) wsFinalAssessment[cellRef].s = styles.centerNormal;
      }
    }
  });

  wsFinalAssessment['!cols'] = [
    { wch: 35 }, // Assessment Title
    { wch: 8 },  // Q#
    { wch: 75 }, // Question Text
    { wch: 26 }, // Option A
    { wch: 26 }, // Option B
    { wch: 26 }, // Option C
    { wch: 26 }, // Option D
    { wch: 26 }, // Correct Option
    { wch: 65 }, // Explanation
    { wch: 18 }, // Passing Score (%)
    { wch: 22 }  // Marks / Points (e.g. 10)
  ];
  XLSX.utils.book_append_sheet(wb, wsFinalAssessment, 'Final Assessment');

  // 5. User Guide & Format Instructions Sheet
  const wsGuide = buildGuideInstructionsSheet(styles);
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Guide & Instructions');

  // Trigger browser download
  XLSX.writeFile(wb, 'MORENA_Course_Upload_Template.xlsx');
}

/**
 * Builds the official User Guide & Format Instructions worksheet with crystal-clear rules.
 */
export function buildGuideInstructionsSheet(styles: any) {
  const guideAOA: any[][] = [
    [
      'Step / Key Topic',
      'Step-by-Step Instructions & Guidelines'
    ],
    [
      '📌 STEP 1: Complete the "Course Details" Sheet',
      '1. Navigate to the "Course Details" tab.\n2. Enter your course Title, Category, Language, Skill Level, and Pricing.\n3. All core topic fields are highlighted in BOLD font, and essential fields are marked with "REQUIRED" status.\n4. For "What Students Will Learn", "Prerequisites", and "Target Audience", separate each bullet point with a semicolon (;).'
    ],
    [
      '🎥 STEP 2: Curriculum Syllabus (Video Lectures)',
      'In the "Curriculum Syllabus" tab, specify all your course video lectures:\n• LECTURE: Enter Module Title, Topic / Lesson Title, Duration, and Free Preview flag.\n• Each module can have unlimited video lectures.\n• Dedicated tabs at the bottom handle Articles, Quizzes, and Final Assessment separately!'
    ],
    [
      '📖 STEP 3: Dedicated "Articles" Tab (Written Guides & Cheatsheets)',
      'In the dedicated "Articles" tab, configure written lessons and documentation:\n• Enter Module Name, Article Title, Reading Duration, Free Preview flag, and Article Content (Markdown or plain text).\n• You can also add external resource/documentation links separated by semicolons (;).\n• All articles sync seamlessly with the Curriculum Syllabus and Course Studio.'
    ],
    [
      '🏆 STEP 4: Dedicated "Final Assessment" Tab & Certificate Gate',
      'Every course MUST have a Final Assessment at the end of the curriculum before it can be submitted for approval!\n• Dedicated Tab: Open the dedicated "Final Assessment" tab at the bottom of this workbook to enter your certification exam questions, options, and passing score.\n• Passing Score: Default is 80%. When a student scores at or above the passing score, they immediately unlock the official verifiable Certificate of Completion.\n• Even Questions Rule: The Final Assessment must contain an EVEN number of questions (e.g. 2, 4, 6, 8, 10 questions). Odd counts are strictly rejected.\n• Always Placed at End: The Final Assessment is strictly and automatically kept as the final item in the curriculum.'
    ],
    [
      '💯 STEP 4: "Quizzes & MCQs" Tab (Mid-Module Quizzes)',
      'In the "Quizzes & MCQs" tab, configure knowledge-check quizzes for individual modules:\n• EVEN NUMBER OF QUESTIONS RULE: Every Quiz must contain an EVEN number of questions (e.g. 2, 4, 6, 8, 10 questions). Odd counts (like 1, 3, 5, 7) are strictly NOT accepted and cannot be published!\n• MARKS PER QUESTION: Specify individual marks in Column L (default 10 marks per question).\n• PASSING SCORE (%): Set the passing percentage in Column K (e.g. 70%). When a student passes, the player automatically advances.'
    ],
    [
      '📹 STEP 5: Bulk Video Uploading (Supports up to 500 MB / 300 MB Videos)',
      'Uploading videos is fast and seamless:\n1. In this Excel template, list all your video lectures with clean titles under Content Type "LECTURE" (leave video URLs blank).\n2. Upload this Excel file into the Course Builder.\n3. Open "Curriculum Studio / Batch Media Manager" and click "Bulk Select Multiple Videos".\n4. Select all your video files from your computer at once. The platform supports videos up to 500 MB each (such as 300 MB MP4/WebM videos) with smart 3.8 MB chunking and max 2 parallel uploads to ensure zero network failures, zero timeouts, and smooth real-time progress.'
    ],
    [
      '♾️ STEP 6: No Limit on Lectures Per Module (Add Unlimited Lectures)',
      'There is absolutely NO LIMIT on how many lectures you can put in a module! You can add 2, 5, 10, 25, or 50+ lectures inside any single module. Simply keep adding rows with your topic titles under that module.'
    ],
    [
      '📁 STEP 7: Module Grouping Rule (Do Not Repeat Module Names)',
      'Write the Module Title ONLY on the first lesson row of that module. For all subsequent lessons within the same module, leave the Module Title column BLANK! The system will automatically group all consecutive rows under that module until a new Module Title is specified.'
    ],
    [
      '🚫 STEP 8: Clean Titles (Avoid Redundant Numbering Prefixes)',
      'Do not manually type prefixes like "Module 1:" or "Lecture 1:" in the title cells. The LMS platform automatically numbers and formats all modules (Module 1, Module 2) and lessons (Lecture 1, Article 1, Quiz 1, Final Assessment) dynamically!'
    ],
    [
      '🚀 STEP 9: Save & Upload Spreadsheet into Course Builder',
      'After filling in your details, save your Excel spreadsheet (.xlsx). In the LMS Course Builder, click the "Upload Excel (.xlsx)" button and select your file. Your entire curriculum, articles, quizzes, and Final Assessment will be generated automatically in seconds!'
    ]
  ];

  const wsGuide = XLSX.utils.aoa_to_sheet(guideAOA);
  guideAOA.forEach((row, rIdx) => {
    const isHeader = rIdx === 0;
    for (let cIdx = 0; cIdx < row.length; cIdx++) {
      const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
      if (!wsGuide[cellRef]) wsGuide[cellRef] = { t: 's', v: '' };
      if (isHeader) {
        wsGuide[cellRef].s = styles.headerDark;
      } else {
        if (cIdx === 0) wsGuide[cellRef].s = styles.boldTopic;
        else if (cIdx === 1) wsGuide[cellRef].s = styles.cellNormal;
      }
    }
  });

  wsGuide['!cols'] = [
    { wch: 38 }, // Step / Topic
    { wch: 105 } // Easy Instructions
  ];
  return wsGuide;
}

/**
 * Exports current course state directly to an official Excel template file (.xlsx).
 * This allows instructors to download their course curriculum with all modules,
 * lectures, and details populated, make changes in Excel, and re-upload.
 */
export function exportCourseToExcelFile(course: any, targetFileName?: string) {
  const wb = XLSX.utils.book_new();

  // Ensure Final Assessment is strictly at the very end of the curriculum before exporting
  if (course && Array.isArray(course.sections)) {
    course.sections = ensureFinalAssessmentAtEnd(course.sections);
  }

  const styles = {
    headerDark: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E293B' } },
      alignment: { vertical: 'center', horizontal: 'center', wrapText: true }
    },
    headerBlue: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E40AF' } },
      alignment: { vertical: 'center', horizontal: 'center', wrapText: true }
    },
    headerTeal: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } }, // White font
      fill: { fgColor: { rgb: '0F766E' } }, // Teal 700 background
      alignment: { vertical: 'center', horizontal: 'center', wrapText: true }
    },
    headerPurple: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } }, // White font
      fill: { fgColor: { rgb: '581C87' } }, // Purple 800 background
      alignment: { vertical: 'center', horizontal: 'center', wrapText: true }
    },
    headerAmber: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } }, // White font
      fill: { fgColor: { rgb: 'B45309' } }, // Amber 700 background
      alignment: { vertical: 'center', horizontal: 'center', wrapText: true }
    },
    sectionBanner: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '1E3A8A' } },
      fill: { fgColor: { rgb: 'DBEAFE' } },
      alignment: { vertical: 'center', horizontal: 'left' }
    },
    boldTopic: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '0F172A' } },
      alignment: { vertical: 'center', horizontal: 'left', wrapText: true }
    },
    boldCenter: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '0F172A' } },
      alignment: { vertical: 'center', horizontal: 'center' }
    },
    requiredBadge: {
      font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'B91C1C' } },
      fill: { fgColor: { rgb: 'FEE2E2' } },
      alignment: { vertical: 'center', horizontal: 'center' }
    },
    optionalBadge: {
      font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '475569' } },
      fill: { fgColor: { rgb: 'F1F5F9' } },
      alignment: { vertical: 'center', horizontal: 'center' }
    },
    cellNormal: {
      font: { name: 'Calibri', sz: 11, color: { rgb: '1E293B' } },
      alignment: { vertical: 'center', horizontal: 'left', wrapText: true }
    },
    centerNormal: {
      font: { name: 'Calibri', sz: 11, color: { rgb: '1E293B' } },
      alignment: { vertical: 'center', horizontal: 'center' }
    },
    cellInstruction: {
      font: { name: 'Calibri', sz: 10, color: { rgb: '475569' }, italic: true },
      alignment: { vertical: 'center', horizontal: 'left', wrapText: true }
    }
  };

  const toMultiString = (arr: any) => {
    if (Array.isArray(arr)) return arr.filter(Boolean).join('; ');
    if (typeof arr === 'string') return arr;
    return '';
  };

  // 1. Course Details Sheet Data
  const detailsAOA: any[][] = [
    [
      'Field Name (Topic)',
      'Your Value / Enter Value Here',
      'Status',
      'Instructions & Examples'
    ],
    ['📌 SECTION 1: BASIC COURSE INFORMATION', '', '', ''],
    [
      'Course Title *',
      course.title || '',
      'REQUIRED',
      'Enter the official title of your course'
    ],
    [
      'Course Slug',
      course.slug || '',
      'OPTIONAL',
      'URL slug for the course. Leave empty to auto-generate from the title'
    ],
    [
      'Category *',
      typeof course.category === 'object' && course.category ? course.category.name || '' : String(course.category || 'Teacher Development'),
      'REQUIRED',
      'Select category'
    ],
    [
      'Skill Level *',
      course.level || 'ALL_LEVELS',
      'REQUIRED',
      'Select difficulty level: Foundational, Intermediate, Advanced, or All Levels'
    ],
    [
      'Language *',
      course.language || 'English',
      'REQUIRED',
      'Primary language of instruction'
    ],
    ['📝 SECTION 2: DESCRIPTIONS & LEARNING OBJECTIVES', '', '', ''],
    [
      'Short Description *',
      course.shortDescription || course.subtitle || '',
      'REQUIRED',
      'Compelling summary for course preview cards'
    ],
    [
      'Full Course Description',
      course.description || '',
      'OPTIONAL',
      'Detailed overview of the course'
    ],
    [
      'What You\'ll Learn (Key Learning Outcomes) *',
      toMultiString(course.whatYouWillLearn),
      'REQUIRED',
      'Separate each learning outcome with a semicolon (;)'
    ],
    [
      'Before You Begin (Prerequisites & Requirements) *',
      toMultiString(course.requirements),
      'REQUIRED',
      'Separate prerequisites with a semicolon (;)'
    ],
    [
      'Who This Course Is For (Target Audience) *',
      toMultiString(course.targetAudience),
      'REQUIRED',
      'Separate target learner groups with a semicolon (;)'
    ],
    ['💰 SECTION 3: PRICING & ENROLLMENT ACCESS', '', '', ''],
    [
      'Course Price (INR) *',
      course.price !== undefined ? course.price : 0,
      'REQUIRED',
      'Course regular price in INR (0 for Free)'
    ],
    [
      'Discount Price (INR)',
      course.discountPrice || '',
      'OPTIONAL',
      'Optional discounted price'
    ],
    [
      'Currency',
      course.currency || 'INR',
      'OPTIONAL',
      'INR or USD'
    ],
    [
      'Access Type',
      course.accessType || 'LIFETIME',
      'OPTIONAL',
      'LIFETIME or LIMITED_DAYS'
    ],
    [
      'Access Days',
      course.accessDays || '',
      'OPTIONAL',
      'Number of days access is granted if limited'
    ]
  ];

  const wsDetails = XLSX.utils.aoa_to_sheet(detailsAOA);
  detailsAOA.forEach((row, rIdx) => {
    const isHeader = rIdx === 0;
    const isBanner = String(row[0]).startsWith('📌') || String(row[0]).startsWith('📝') || String(row[0]).startsWith('💰');
    for (let cIdx = 0; cIdx < row.length; cIdx++) {
      const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
      if (!wsDetails[cellRef]) wsDetails[cellRef] = { t: 's', v: '' };
      if (isHeader) {
        wsDetails[cellRef].s = styles.headerDark;
      } else if (isBanner) {
        wsDetails[cellRef].s = styles.sectionBanner;
      } else {
        if (cIdx === 0) wsDetails[cellRef].s = styles.boldTopic;
        else if (cIdx === 1) wsDetails[cellRef].s = styles.cellNormal;
        else if (cIdx === 2) wsDetails[cellRef].s = row[2] === 'REQUIRED' ? styles.requiredBadge : styles.optionalBadge;
        else if (cIdx === 3) wsDetails[cellRef].s = styles.cellInstruction;
      }
    }
  });

  wsDetails['!cols'] = [{ wch: 32 }, { wch: 65 }, { wch: 18 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Course Details');

  // 2. Curriculum Syllabus Sheet Data
  const curriculumAOA: any[][] = [
    [
      'Module Title (Write once per module)',
      'Topic / Lesson Title *',
      'Content Type (LECTURE) *',
      'Duration (mm:ss)',
      'Free Preview (Yes / No)'
    ]
  ];

  const sections = Array.isArray(course.sections) ? course.sections : [];
  sections.forEach((sec: any) => {
    const lessons = Array.isArray(sec.lessons) ? sec.lessons : [];
    // Only lectures in Curriculum Syllabus tab, as Articles, Quizzes & Final Assessment have their dedicated tabs
    const lectures = lessons.filter((les: any) => {
      const isFinal = Boolean(les.isFinalAssignment || (les.type === 'QUIZ' && /final\s*(assessment|assignment|exam)/i.test(les.title || '')) || /final\s*(assessment|assignment|exam)/i.test(les.title || ''));
      const isArticle = les.type === 'TEXT' || les.type === 'ARTICLE' || les.type === 'DOCUMENT';
      const isQuiz = les.type === 'QUIZ';
      return !isFinal && !isArticle && !isQuiz;
    });

    if (lectures.length === 0) {
      curriculumAOA.push([sec.title || 'Untitled Module', '', '', '', '']);
    } else {
      lectures.forEach((les: any, lIdx: number) => {
        curriculumAOA.push([
          lIdx === 0 ? (sec.title || 'Module') : '',
          les.title || '',
          'LECTURE',
          les.duration || '10:00',
          les.isFree ? 'Yes' : 'No'
        ]);
      });
    }
  });

  if (curriculumAOA.length === 1) {
    curriculumAOA.push(['Module 1: Foundations', 'Orientation & Tech Stack', 'LECTURE', '10:00', 'Yes']);
  }

  const wsCurriculum = XLSX.utils.aoa_to_sheet(curriculumAOA);
  curriculumAOA.forEach((row, rIdx) => {
    const isHeader = rIdx === 0;
    for (let cIdx = 0; cIdx < row.length; cIdx++) {
      const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
      if (!wsCurriculum[cellRef]) wsCurriculum[cellRef] = { t: 's', v: '' };
      if (isHeader) {
        wsCurriculum[cellRef].s = styles.headerBlue;
      } else {
        if (cIdx === 0 || cIdx === 1) wsCurriculum[cellRef].s = styles.boldTopic;
        else if (cIdx === 2 || cIdx === 3 || cIdx === 4) wsCurriculum[cellRef].s = styles.boldCenter;
      }
    }
  });

  wsCurriculum['!cols'] = [{ wch: 38 }, { wch: 45 }, { wch: 28 }, { wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsCurriculum, 'Curriculum Syllabus');

  // 3. Articles Sheet Data (Dedicated Articles & Reading Material)
  const articlesAOA: any[][] = [
    [
      'Module (e.g. Module 1)',
      'Article Title *',
      'Reading Duration (mm:ss)',
      'Free Preview (Yes / No)',
      'Article Content / Notes (Markdown or Text) *',
      'Resource / Reference Links (Optional)'
    ]
  ];

  sections.forEach((sec: any) => {
    (sec.lessons || []).forEach((les: any) => {
      if (les.type === 'TEXT' || les.type === 'ARTICLE' || les.type === 'DOCUMENT') {
        let resString = '';
        const resList = les.resourcesList || les.resources;
        if (Array.isArray(resList)) {
          resString = resList
            .map((r: any) => (typeof r === 'string' ? r : r.url || r.name || r.title))
            .filter(Boolean)
            .join('; ');
        } else if (typeof resList === 'string') {
          resString = resList;
        }

        articlesAOA.push([
          sec.title || 'Module',
          les.title || 'Article',
          les.duration || '05:00',
          les.isFree ? 'Yes' : 'No',
          les.content || '',
          resString
        ]);
      }
    });
  });

  if (articlesAOA.length === 1) {
    articlesAOA.push(['', '', '', '', '', '']);
    articlesAOA.push(['', '', '', '', '', '']);
  }

  const wsArticles = XLSX.utils.aoa_to_sheet(articlesAOA);
  articlesAOA.forEach((row, rIdx) => {
    const isHeader = rIdx === 0;
    for (let cIdx = 0; cIdx < row.length; cIdx++) {
      const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
      if (!wsArticles[cellRef]) wsArticles[cellRef] = { t: 's', v: '' };
      if (isHeader) {
        wsArticles[cellRef].s = styles.headerTeal;
      } else {
        if (cIdx === 0 || cIdx === 1) wsArticles[cellRef].s = styles.boldTopic;
        else if (cIdx === 2 || cIdx === 3) wsArticles[cellRef].s = styles.boldCenter;
        else wsArticles[cellRef].s = styles.cellNormal;
      }
    }
  });

  wsArticles['!cols'] = [{ wch: 30 }, { wch: 45 }, { wch: 22 }, { wch: 18 }, { wch: 80 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsArticles, 'Articles');

  // 4. Quizzes & MCQs Sheet (Mid-Module Knowledge Checks)
  const quizzesAOA: any[][] = [
    [
      'Module (e.g. Module 1)',
      'Quiz Title (Write once per quiz)',
      'Q#',
      'Question Text *',
      'Option A *',
      'Option B *',
      'Option C *',
      'Option D *',
      'Correct Option (A/B/C/D) *',
      'Explanation (Why this option is correct)',
      'Passing Score (%)',
      'Marks / Points'
    ]
  ];

  // 4. Final Assessment Sheet (Dedicated Certification Gate Exam)
  const finalAssessmentAOA: any[][] = [
    [
      'Assessment Title',
      'Q#',
      'Question Text *',
      'Option A *',
      'Option B *',
      'Option C *',
      'Option D *',
      'Correct Option (A/B/C/D) *',
      'Explanation (Why this option is correct)',
      'Passing Score (%)',
      'Marks / Points'
    ]
  ];

  sections.forEach((sec: any) => {
    (sec.lessons || []).forEach((les: any) => {
      if (les.type === 'QUIZ' && les.quizData) {
        let qData: any = les.quizData;
        if (typeof qData === 'string') {
          try { qData = JSON.parse(qData); } catch {}
        }
        const questions = Array.isArray(qData?.questions) ? qData.questions : [];
        const isFinal = Boolean(les.isFinalAssignment || /final\s*(assessment|assignment|exam)/i.test(les.title || ''));
        const passingScore = qData?.passingScore || (isFinal ? 80 : 70);

        questions.forEach((q: any, qIdx: number) => {
          const opts = Array.isArray(q.options) ? q.options : [];
          const correctIdx = typeof q.correctIndex === 'number' ? q.correctIndex : 0;
          const letter = ['A', 'B', 'C', 'D'][correctIdx] || 'A';

          if (isFinal) {
            finalAssessmentAOA.push([
              qIdx === 0 ? (les.title || 'Final Assessment') : '',
              qIdx + 1,
              q.question || '',
              opts[0] || '',
              opts[1] || '',
              opts[2] || '',
              opts[3] || '',
              letter,
              q.explanation || '',
              qIdx === 0 ? passingScore : '',
              q.points || 10
            ]);
          } else {
            quizzesAOA.push([
              qIdx === 0 ? (sec.title || 'Module') : '',
              qIdx === 0 ? (les.title || 'Quiz') : '',
              qIdx + 1,
              q.question || '',
              opts[0] || '',
              opts[1] || '',
              opts[2] || '',
              opts[3] || '',
              letter,
              q.explanation || '',
              qIdx === 0 ? passingScore : '',
              q.points || 10
            ]);
          }
        });
      }
    });
  });

  if (quizzesAOA.length === 1) {
    quizzesAOA.push(['', '', '', '', '', '', '', '', '', '', '', '']);
    quizzesAOA.push(['', '', '', '', '', '', '', '', '', '', '', '']);
  }

  if (finalAssessmentAOA.length === 1) {
    finalAssessmentAOA.push(['Final Assessment', '', '', '', '', '', '', '', '', 80, 10]);
    finalAssessmentAOA.push(['', '', '', '', '', '', '', '', '', '', '']);
  }

  const wsQuizzes = XLSX.utils.aoa_to_sheet(quizzesAOA);
  quizzesAOA.forEach((row, rIdx) => {
    const isHeader = rIdx === 0;
    for (let cIdx = 0; cIdx < row.length; cIdx++) {
      const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
      if (!wsQuizzes[cellRef]) wsQuizzes[cellRef] = { t: 's', v: '' };
      if (isHeader) {
        wsQuizzes[cellRef].s = styles.headerPurple;
      } else {
        if (cIdx === 0 || cIdx === 1 || cIdx === 3) wsQuizzes[cellRef].s = styles.boldTopic;
        else if (cIdx === 2 || cIdx === 8 || cIdx === 10 || cIdx === 11) wsQuizzes[cellRef].s = styles.boldCenter;
        else wsQuizzes[cellRef].s = styles.cellNormal;
      }
    }
  });

  wsQuizzes['!cols'] = [{ wch: 22 }, { wch: 35 }, { wch: 8 }, { wch: 75 }, { wch: 26 }, { wch: 26 }, { wch: 26 }, { wch: 26 }, { wch: 26 }, { wch: 65 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsQuizzes, 'Quizzes & MCQs');

  const wsFinalAssessment = XLSX.utils.aoa_to_sheet(finalAssessmentAOA);
  finalAssessmentAOA.forEach((row, rIdx) => {
    const isHeader = rIdx === 0;
    for (let cIdx = 0; cIdx < row.length; cIdx++) {
      const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
      if (!wsFinalAssessment[cellRef]) wsFinalAssessment[cellRef] = { t: 's', v: '' };
      if (isHeader) {
        wsFinalAssessment[cellRef].s = styles.headerAmber;
      } else {
        if (cIdx === 0 || cIdx === 2) wsFinalAssessment[cellRef].s = styles.boldTopic;
        else if (cIdx === 1 || cIdx === 7 || cIdx === 9 || cIdx === 10) wsFinalAssessment[cellRef].s = styles.boldCenter;
        else wsFinalAssessment[cellRef].s = styles.cellNormal;
      }
    }
  });

  wsFinalAssessment['!cols'] = [{ wch: 35 }, { wch: 8 }, { wch: 75 }, { wch: 26 }, { wch: 26 }, { wch: 26 }, { wch: 26 }, { wch: 26 }, { wch: 65 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsFinalAssessment, 'Final Assessment');

  // 5. Append User Guide & Format Instructions Sheet
  const wsGuide = buildGuideInstructionsSheet(styles);
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Guide & Instructions');

  const finalName = targetFileName?.endsWith('.xlsx')
    ? targetFileName
    : `${(targetFileName || course.slug || 'Course_Curriculum').replace(/[^a-zA-Z0-9_\-]/g, '_')}.xlsx`;

  XLSX.writeFile(wb, finalName);
}

/**
 * Parses duration string (e.g. "12:30" or "15") into total seconds
 */
function parseDurationToSeconds(durationStr: string): number {
  if (!durationStr) return 600;
  const parts = durationStr.toString().trim().split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return mins * 60 + secs;
  }
  const mins = parseInt(durationStr, 10);
  return !isNaN(mins) ? mins * 60 : 600;
}

/**
 * Normalizes skill level string to match LMS enum values
 */
function normalizeSkillLevel(levelStr?: string): string {
  if (!levelStr) return 'ALL_LEVELS';
  const clean = levelStr.toUpperCase().trim();
  if (clean.includes('FOUND') || clean.includes('BEG')) return 'BEGINNER';
  if (clean.includes('INTER')) return 'INTERMEDIATE';
  if (clean.includes('ADV') || clean.includes('EXP')) return 'EXPERT';
  return 'ALL_LEVELS';
}

/**
 * Normalizes delimited strings (separated by semicolons, newlines, or pipes) into clean array
 */
function parseMultiItems(raw?: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
  return String(raw)
    .split(/[;\n\r|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Parses an XLSX Workbook and extracts course details and curriculum
 */
export function parseCourseExcelWorkbook(wb: XLSX.WorkBook): ParsedCourseData {
  const result: ParsedCourseData = {};

  // Find Course Details sheet (or first sheet)
  const sheetNames = wb.SheetNames;
  const detailsSheetName =
    sheetNames.find((name) => /course|detail|info|basic/i.test(name)) || sheetNames[0];

  if (detailsSheetName && wb.Sheets[detailsSheetName]) {
    const sheet = wb.Sheets[detailsSheetName];
    // Read as 2D array of rows
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const keyValues: Record<string, any> = {};

    // 1. Check if it's Key-Value format (Column A = Field Name, Column B = Value)
    for (const row of rows) {
      if (!row || row.length === 0) continue;
      const key = String(row[0] || '').trim().toLowerCase();
      const val = row[1];
      if (key && val !== undefined && val !== null && val !== '') {
        keyValues[key] = val;
      }
    }

    // 2. Also check if row 0 has column headers (e.g. Title | Category | Price)
    if (rows.length >= 2) {
      const headerRow = rows[0] || [];
      const dataRow = rows[1] || [];
      headerRow.forEach((hdr: any, idx: number) => {
        const key = String(hdr || '').trim().toLowerCase();
        if (key && dataRow[idx] !== undefined && dataRow[idx] !== null && dataRow[idx] !== '') {
          if (!keyValues[key]) {
            keyValues[key] = dataRow[idx];
          }
        }
      });
    }

    // Helper to find value by multiple possible aliases
    const findValue = (...aliases: string[]) => {
      // Pass 1: Exact matches (with or without asterisk/colons)
      for (const alias of aliases) {
        const lower = alias.toLowerCase();
        if (keyValues[lower] !== undefined && keyValues[lower] !== null && String(keyValues[lower]).trim() !== '') {
          return keyValues[lower];
        }
        const cleanAlias = lower.replace(/[*:]/g, '').trim();
        for (const [k, v] of Object.entries(keyValues)) {
          const cleanK = k.toLowerCase().replace(/[*:]/g, '').trim();
          if (cleanK === cleanAlias && v !== undefined && v !== null && String(v).trim() !== '') {
            return v;
          }
        }
      }
      // Pass 2: Substring includes search
      for (const alias of aliases) {
        const cleanAlias = alias.toLowerCase().replace(/[*:]/g, '').trim();
        for (const [k, v] of Object.entries(keyValues)) {
          const cleanK = k.toLowerCase().replace(/[*:]/g, '').trim();
          if (cleanK.includes(cleanAlias) && v !== undefined && v !== null && String(v).trim() !== '') {
            return v;
          }
        }
      }
      return undefined;
    };

    const titleVal = findValue('course title', 'title');
    if (titleVal) {
      result.title = String(titleVal).trim();
    }

    const slugVal = findValue('course slug', 'slug');
    if (slugVal) {
      result.slug = String(slugVal).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    } else if (result.title) {
      result.slug = result.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    const catVal = findValue('category');
    if (catVal) result.category = String(catVal).trim();

    const levelVal = findValue('skill level', 'level');
    if (levelVal) result.level = normalizeSkillLevel(String(levelVal));

    const langVal = findValue('language');
    if (langVal) result.language = String(langVal).trim();

    const shortDesc = findValue('short description', 'short');
    if (shortDesc) result.shortDescription = String(shortDesc).trim();

    const fullDesc = findValue('full course description', 'course description', 'description');
    if (fullDesc) result.description = String(fullDesc).trim();

    const learnVal = findValue(
      'what you\'ll learn (key learning outcomes)',
      'what you\'ll learn',
      'what you will learn',
      'what students will learn',
      'learning outcomes',
      'outcomes'
    );
    if (learnVal) result.whatYouWillLearn = parseMultiItems(learnVal);

    const reqVal = findValue(
      'before you begin (prerequisites & requirements)',
      'before you begin',
      'prerequisites & setup',
      'prerequisites',
      'requirements',
      'prior knowledge'
    );
    if (reqVal) result.requirements = parseMultiItems(reqVal);

    const audVal = findValue(
      'who this course is for (target audience)',
      'who this course is for',
      'who is this course for',
      'target audience',
      'audience',
      'who can benefit'
    );
    if (audVal) result.targetAudience = parseMultiItems(audVal);

    const priceVal = findValue('course price (inr)', 'course price', 'price');
    if (priceVal !== undefined && priceVal !== null) {
      const parsed = parseFloat(String(priceVal).replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed)) result.price = parsed;
    }

    const discVal = findValue('discount price (inr)', 'discount price', 'sale price');
    if (discVal !== undefined && discVal !== null && String(discVal).trim() !== '') {
      const parsed = parseFloat(String(discVal).replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed)) result.discountPrice = parsed;
    }

    const currVal = findValue('currency');
    if (currVal) result.currency = String(currVal).trim().toUpperCase();

    const accessVal = findValue('access type');
    if (accessVal) {
      result.accessType = String(accessVal).trim().toUpperCase().includes('LIMIT')
        ? 'LIMITED_DAYS'
        : 'LIFETIME';
    }

    const accessDaysVal = findValue('access days');
    if (accessDaysVal !== undefined && accessDaysVal !== null && String(accessDaysVal).trim() !== '') {
      const parsed = parseInt(String(accessDaysVal), 10);
      if (!isNaN(parsed)) result.accessDays = parsed;
    }
  }

  // Find Curriculum sheet
  const curriculumSheetName =
    sheetNames.find((name) => /curriculum|syllabus|modules|lessons/i.test(name)) ||
    (sheetNames.length > 1 ? sheetNames[1] : null);

  if (curriculumSheetName && wb.Sheets[curriculumSheetName]) {
    const curSheet = wb.Sheets[curriculumSheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(curSheet);

    if (rawRows.length > 0) {
      const sections: BuilderSection[] = [];
      let currentSection: BuilderSection | null = null;

      rawRows.forEach((row, idx) => {
        // Accurate column finder that matches exact keys first, then non-conflicting prefixes
        const findField = (exactKeys: string[], fallbackKeyword?: string, excludeKeyword?: string) => {
          // 1. Exact match (case-insensitive)
          for (const [rKey, rVal] of Object.entries(row)) {
            const cleanKey = rKey.trim().toLowerCase();
            if (exactKeys.some((k) => cleanKey === k.toLowerCase())) {
              if (rVal !== undefined && rVal !== null && String(rVal).trim() !== '') {
                return String(rVal).trim();
              }
            }
          }
          // 2. Fallback keyword match with exclusion guard
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
          'content type (lecture) *',
          'content type (lecture)',
          'content type (video)',
          'content type (lecture / article / quiz / final assessment) *',
          'content type (lecture / article / quiz / final assessment)',
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

        // Skip completely empty rows
        if (!rawModTitle && !rawModDesc && !rawLessonTitle && !lessonDesc) return;

        const cleanedModTitle = rawModTitle ? cleanModuleTitle(rawModTitle) : '';
        const cleanedLessonTitle = rawLessonTitle ? cleanLectureTitle(rawLessonTitle) : '';

        // 1. Module Assignment (User does not have to repeat module title on every row):
        if (rawModTitle) {
          const normModKey = cleanedModTitle.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
          const existing = sections.find((s) => {
            if (cleanedModTitle && s.title.toLowerCase().trim() === cleanedModTitle.toLowerCase().trim()) return true;
            if (normModKey && cleanModuleTitle(s.title).toLowerCase().replace(/[^a-z0-9]/g, '').trim() === normModKey) return true;
            if ((s as any)._rawModKey && (s as any)._rawModKey === rawModTitle.toLowerCase().trim()) return true;
            return false;
          });

          if (existing) {
            currentSection = existing;
            if (!currentSection.description && rawModDesc) {
              currentSection.description = rawModDesc;
            }
          } else {
            currentSection = {
              id: `sec-${Date.now()}-${sections.length + 1}-${Math.random().toString(36).substring(2, 6)}`,
              title: cleanedModTitle,
              description: rawModDesc || '',
              order: sections.length + 1,
              lessons: []
            };
            (currentSection as any)._rawModKey = rawModTitle.toLowerCase().trim();
            sections.push(currentSection);
          }
        } else {
          // Module Title is left blank on this row (automatically inherits the active module above it!)
          if (!currentSection) {
            currentSection = {
              id: `sec-${Date.now()}-1-${Math.random().toString(36).substring(2, 6)}`,
              title: 'Foundations & Orientation',
              description: rawModDesc || '',
              order: 1,
              lessons: []
            };
            sections.push(currentSection);
          } else if (!currentSection.description && rawModDesc) {
            currentSection.description = rawModDesc;
          }
        }

        // 2. Lecture / Lesson Creation:
        if (rawLessonTitle || lessonDesc || durationStr) {
          const typeUpper = (lessonTypeRaw || '').toUpperCase().trim();
          const hasQuizKeyword = /quiz|mcq/i.test(typeUpper);
          const isExplicitFinal = !hasQuizKeyword && /final\s*(assessment|assignment|exam)/i.test(typeUpper);
          const isExplicitQuiz = hasQuizKeyword || isExplicitFinal || /assessment|exam/i.test(typeUpper);
          const isExplicitArticle = !isExplicitFinal && !isExplicitQuiz && /article|text|written|note|reading/i.test(typeUpper);
          const isExplicitLecture = !isExplicitFinal && !isExplicitQuiz && !isExplicitArticle && /lecture|video/i.test(typeUpper);

          // Only fall back to title heuristics if Content Type column was blank/unspecified
          const hasExplicitType = isExplicitFinal || isExplicitQuiz || isExplicitArticle || isExplicitLecture;

          const isFinalAssignment =
            (isExplicitFinal || /final\s*(assessment|assignment|exam)/i.test(rawLessonTitle)) &&
            !/^(module\s*\d+\s*)?quiz/i.test(rawLessonTitle.trim());
          const isQuiz = isFinalAssignment || isExplicitQuiz || /quiz|mcq/i.test(rawLessonTitle) || (!hasExplicitType && /quiz|assessment|mcq/i.test(rawLessonTitle));
          const isText = !isFinalAssignment && !isQuiz && (isExplicitArticle || (!hasExplicitType && /article|notes|reading/i.test(rawLessonTitle)));
          const isPdf = !isFinalAssignment && !isQuiz && !isText && /pdf|doc|file|handout/i.test(typeUpper);

          const finalLessonTitle = isFinalAssignment
            ? 'Final Assessment'
            : isQuiz
            ? (cleanQuizTitle(rawLessonTitle) || rawLessonTitle || 'Quiz')
            : cleanedLessonTitle;
          const durationSeconds = parseDurationToSeconds(durationStr);
          const normalizedType: 'VIDEO' | 'PDF' | 'QUIZ' | 'TEXT' = isQuiz
            ? 'QUIZ'
            : isText
            ? 'TEXT'
            : isPdf
            ? 'PDF'
            : 'VIDEO';

          currentSection.lessons.push({
            id: `les-${Date.now()}-${currentSection.order}-${currentSection.lessons.length + 1}-${Math.random().toString(36).substring(2, 6)}`,
            title: finalLessonTitle,
            description: lessonDesc || (isFinalAssignment ? 'Mandatory comprehensive final assessment for certificate qualification.' : ''),
            type: normalizedType,
            duration: durationStr,
            durationSeconds,
            content:
              normalizedType === 'TEXT'
                ? articleContentRaw ||
                  `# ${finalLessonTitle || 'Article Overview'}\n\nWelcome to this written lecture. Here we break down the key concepts with structured explanations, headings, and examples.\n\n## 1. Core Principles\n\nExplain the foundational theory or architecture here:\n- Key principle A\n- Key principle B\n\n> 💡 **Instructor Tip:** Highlight critical best practices, edge cases, or industry standards for students.\n\n## 2. Practical Examples & Implementation\n\nDetail the exact workflow or implementation steps:\n1. Step 1: Initial setup\n2. Step 2: Implementation details\n3. Step 3: Verification\n\n---\n\n## Summary\n\nSummarize the key takeaways and preview what comes next in the curriculum.`
                : undefined,
            isFree,
            isPublished: true,
            isFinalAssignment: isFinalAssignment,
            order: currentSection.lessons.length + 1,
            quizData: isQuiz
              ? {
                  questions: [],
                  passingScore: isFinalAssignment ? 80 : 70,
                  attemptLimit: 0
                }
              : undefined,
            subLessons: []
          });
        }
      });

      sections.forEach((s) => {
        delete (s as any)._rawModKey;
      });

      if (sections.length > 0) {
        result.sections = sections;
      }
    }
  }

  // 3. Quizzes & MCQs Sheet Parsing (Auto-populates questions, options & answers into respective module quizzes)
  const finalAssessmentSheetName = sheetNames.find((name) =>
    /final\s*(assessment|assignment|exam)/i.test(name)
  );
  const quizSheetName = sheetNames.find((name) =>
    name !== finalAssessmentSheetName && /quiz|mcq|assessment|question/i.test(name)
  );

  if (quizSheetName && wb.Sheets[quizSheetName]) {
    const qSheet = wb.Sheets[quizSheetName];
    const quizRawRows: any[] = XLSX.utils.sheet_to_json(qSheet);

    if (quizRawRows.length > 0) {
      if (!result.sections) {
        result.sections = [];
      }
      const sections = result.sections;

      let activeSection: BuilderSection | null = null;
      let activeQuizLesson: BuilderLesson | null = null;

      quizRawRows.forEach((row, rowIdx) => {
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
        const quizTitleRaw = findQField(['quiz title', 'quiz name', 'quiz', 'assessment title'], 'quiz');
        const questionText = findQField(['question text', 'question', 'prompt', 'mcq'], 'question');
        const optA = findQField(['option a', 'choice a', 'a']);
        const optB = findQField(['option b', 'choice b', 'b']);
        const optC = findQField(['option c', 'choice c', 'c']);
        const optD = findQField(['option d', 'choice d', 'd']);
        const correctRaw = findQField(['correct option (a/b/c/d)', 'correct option', 'correct answer', 'answer', 'correct key', 'correct'], 'correct', 'explanation');
        const explanation = findQField(['explanation', 'explanation (optional)', 'rationale', 'solution'], 'explanation');
        const passScoreRaw = findQField(['passing score (%)', 'passing score', 'pass %', 'passing grade'], 'pass');
        const pointsRaw = findQField(['marks / points (e.g. 10)', 'marks / points', 'marks', 'points', 'mark', 'point', 'score per question', 'score'], 'mark');

        if (!questionText && !optA && !optB) return; // Skip empty row

        // 1. Resolve Target Module / Section:
        let foundSection = resolveTargetSection(moduleIdentifier, sections, activeSection);
        if (!foundSection) {
          const newModNum = sections.length + 1;
          const cleanedSecTitle = cleanModuleTitle(moduleIdentifier) || `Module ${newModNum}`;
          foundSection = {
            id: `sec-${Date.now()}-${newModNum}-${Math.random().toString(36).substring(2, 6)}`,
            title: cleanedSecTitle,
            description: '',
            order: newModNum,
            lessons: []
          };
          sections.push(foundSection);
        }

        // If target module switched, reset active quiz lesson
        if (!activeSection || activeSection.id !== foundSection.id) {
          activeSection = foundSection;
          activeQuizLesson = null;
        }

        const secOrder = activeSection.order || 1;
        const isFinalAssignment =
          /final\s*(assessment|assignment|exam)/i.test(quizTitleRaw) ||
          /final\s*(assessment|assignment|exam)/i.test(moduleIdentifier) ||
          (!quizTitleRaw && activeQuizLesson?.isFinalAssignment);
        const cleanedQuizTitle = isFinalAssignment
          ? 'Final Assessment'
          : quizTitleRaw
          ? cleanQuizTitle(quizTitleRaw)
          : '';

        // 2. Resolve Target Quiz Lesson:
        if (isFinalAssignment) {
          // Final Assessment resolves across any section to ensure accurate single-lesson binding
          let foundQuiz = sections
            .flatMap((s) => s.lessons)
            .find((l) => l.isFinalAssignment || /final\s*(assessment|assignment|exam)/i.test(l.title || ''));

          if (!foundQuiz) {
            const lastSec = sections[sections.length - 1] || activeSection;
            foundQuiz = lastSec.lessons.find((l) => l.type === 'QUIZ' && (!l.quizData || (l.quizData as any).questions?.length === 0));
            if (foundQuiz) {
              foundQuiz.isFinalAssignment = true;
              foundQuiz.title = 'Final Assessment';
            }
          }

          if (!foundQuiz) {
            const targetSec = sections[sections.length - 1] || activeSection;
            foundQuiz = {
              id: `les-${Date.now()}-${targetSec.order}-${targetSec.lessons.length + 1}-${Math.random().toString(36).substring(2, 6)}`,
              title: 'Final Assessment',
              description: 'Mandatory comprehensive final assessment for certificate qualification.',
              type: 'QUIZ',
              duration: '30:00',
              durationSeconds: 1800,
              isFree: false,
              isPublished: true,
              isFinalAssignment: true,
              order: targetSec.lessons.length + 1,
              quizData: {
                questions: [],
                passingScore: passScoreRaw ? parseInt(passScoreRaw, 10) || 80 : 80,
                attemptLimit: 0
              },
              subLessons: []
            };
            targetSec.lessons.push(foundQuiz);
          } else {
            foundQuiz.isFinalAssignment = true;
            if (!foundQuiz.title || /quiz/i.test(foundQuiz.title)) {
              foundQuiz.title = 'Final Assessment';
            }
          }

          activeQuizLesson = foundQuiz;
        } else {
          // Regular mid-module quiz for activeSection:
          // In Morena Teach curriculum, each module has strictly AT MOST 1 non-final quiz.
          let foundQuiz = activeQuizLesson && activeSection.lessons.some((l) => l.id === activeQuizLesson!.id && !l.isFinalAssignment)
            ? activeQuizLesson
            : activeSection.lessons.find((l) => l.type === 'QUIZ' && !l.isFinalAssignment);

          if (!foundQuiz) {
            foundQuiz = {
              id: `les-${Date.now()}-${secOrder}-${activeSection.lessons.length + 1}-${Math.random().toString(36).substring(2, 6)}`,
              title: cleanedQuizTitle || 'Quiz',
              description: `Assessment for Module ${secOrder}`,
              type: 'QUIZ',
              duration: '10:00',
              durationSeconds: 600,
              isFree: false,
              isPublished: true,
              isFinalAssignment: false,
              order: activeSection.lessons.length + 1,
              quizData: {
                questions: [],
                passingScore: passScoreRaw ? parseInt(passScoreRaw, 10) || 70 : 70,
                attemptLimit: 0
              },
              subLessons: []
            };
            activeSection.lessons.push(foundQuiz);
          } else {
            // Update quiz title and passing score on existing quiz
            if (cleanedQuizTitle && (!foundQuiz.title || foundQuiz.title === 'Quiz')) {
              foundQuiz.title = cleanedQuizTitle;
            }
            if (passScoreRaw && foundQuiz.quizData) {
              (foundQuiz.quizData as any).passingScore = parseInt(passScoreRaw, 10) || 70;
            }
          }

          activeQuizLesson = foundQuiz;
        }

        const quizLesson = activeQuizLesson;

        // Parse correct option index with intelligent normalization
        let cleanCorrect = (correctRaw || '').trim().toUpperCase();
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
          const optMatchIdx = [optA, optB, optC, optD].findIndex(
            (opt) => opt && opt.trim().toLowerCase() === correctRaw.trim().toLowerCase()
          );
          if (optMatchIdx >= 0) {
            cleanCorrect = ['A', 'B', 'C', 'D'][optMatchIdx];
          }
        }

        let correctIndex = 0;
        if (cleanCorrect === 'B' || cleanCorrect === '2') correctIndex = 1;
        else if (cleanCorrect === 'C' || cleanCorrect === '3') correctIndex = 2;
        else if (cleanCorrect === 'D' || cleanCorrect === '4') correctIndex = 3;

        const rawOptions = [optA, optB, optC, optD].filter(Boolean);
        const options = rawOptions.length >= 2 ? rawOptions : [optA || 'Option A', optB || 'Option B', optC || 'Option C', optD || 'Option D'];

        if (options.length > 0 && isNaN(parseInt(cleanCorrect, 10)) && !['A', 'B', 'C', 'D'].includes(cleanCorrect)) {
          const matchedIdx = options.findIndex((opt) => opt.toLowerCase() === cleanCorrect.toLowerCase());
          if (matchedIdx !== -1) {
            correctIndex = matchedIdx;
          }
        }

        if (correctIndex >= options.length) {
          correctIndex = 0;
        }

        const points =
          pointsRaw && !isNaN(parseInt(pointsRaw, 10)) && parseInt(pointsRaw, 10) > 0
            ? parseInt(pointsRaw, 10)
            : 10;

        const newQuestion = {
          id: `q-${Date.now()}-${rowIdx + 1}-${Math.random().toString(36).substring(2, 6)}`,
          question: questionText || `Question ${rowIdx + 1}`,
          options,
          correctIndex,
          explanation: explanation || '',
          points
        };

        if (!quizLesson.quizData || typeof quizLesson.quizData === 'string') {
          try {
            quizLesson.quizData = typeof quizLesson.quizData === 'string' ? JSON.parse(quizLesson.quizData) : { questions: [], passingScore: 70, attemptLimit: 0 };
          } catch {
            quizLesson.quizData = { questions: [], passingScore: 70, attemptLimit: 0 };
          }
        }

        const qData: any = quizLesson.quizData;
        if (!Array.isArray(qData.questions)) {
          qData.questions = [];
        }
        if (passScoreRaw && !isNaN(parseInt(passScoreRaw, 10))) {
          qData.passingScore = parseInt(passScoreRaw, 10);
        } else if (isFinalAssignment && (!qData.passingScore || qData.passingScore === 70)) {
          qData.passingScore = 80;
        }
        qData.questions.push(newQuestion);
      });
    }
  }

  // 4. Dedicated Final Assessment Sheet Parsing (Authoritative for Certificate Gate Exam)
  if (finalAssessmentSheetName && wb.Sheets[finalAssessmentSheetName]) {
    const faSheet = wb.Sheets[finalAssessmentSheetName];
    const faRawRows: any[] = XLSX.utils.sheet_to_json(faSheet);
    const validFaRows = faRawRows.filter((row) => {
      return Object.entries(row).some(([k, v]) => {
        const cleanK = k.trim().toLowerCase();
        return /question|option|correct|prompt|mcq/i.test(cleanK) && String(v || '').trim() !== '';
      });
    });

    if (validFaRows.length > 0) {
      if (!result.sections) {
        result.sections = [];
      }
      const sections = result.sections;

      // Locate or create the Final Assessment lesson
      let finalLesson = sections
        .flatMap((s) => s.lessons)
        .find((l) => l.isFinalAssignment || /final\s*(assessment|assignment|exam)/i.test(l.title || ''));

      if (!finalLesson) {
        if (sections.length === 0) {
          sections.push({
            id: `sec-${Date.now()}-1-${Math.random().toString(36).substring(2, 6)}`,
            title: 'Course Assessment',
            description: '',
            order: 1,
            lessons: []
          });
        }
        const targetSec = sections[sections.length - 1];
        finalLesson = {
          id: `les-${Date.now()}-${targetSec.order}-${targetSec.lessons.length + 1}-${Math.random().toString(36).substring(2, 6)}`,
          title: 'Final Assessment',
          description: 'Mandatory comprehensive final assessment for certificate qualification.',
          type: 'QUIZ',
          duration: '30:00',
          durationSeconds: 1800,
          isFree: false,
          isPublished: true,
          isFinalAssignment: true,
          order: targetSec.lessons.length + 1,
          quizData: {
            questions: [],
            passingScore: 80,
            attemptLimit: 0
          },
          subLessons: []
        };
        targetSec.lessons.push(finalLesson);
      } else {
        finalLesson.isFinalAssignment = true;
        if (!finalLesson.title || /quiz/i.test(finalLesson.title)) {
          finalLesson.title = 'Final Assessment';
        }
        if (!finalLesson.type) {
          finalLesson.type = 'QUIZ';
        }
      }

      if (!finalLesson.quizData || typeof finalLesson.quizData === 'string') {
        try {
          finalLesson.quizData = typeof finalLesson.quizData === 'string'
            ? JSON.parse(finalLesson.quizData)
            : { questions: [], passingScore: 80, attemptLimit: 0 };
        } catch {
          finalLesson.quizData = { questions: [], passingScore: 80, attemptLimit: 0 };
        }
      }

      const qData: any = finalLesson.quizData;
      // Dedicated tab is authoritative for final assessment questions
      qData.questions = [];

      faRawRows.forEach((row, rowIdx) => {
        const findFAField = (exactKeys: string[], fallbackKeyword?: string, excludeKeyword?: string) => {
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

        const questionText = findFAField(['question text *', 'question text', 'question', 'prompt', 'mcq'], 'question');
        const optA = findFAField(['option a *', 'option a', 'choice a', 'a']);
        const optB = findFAField(['option b *', 'option b', 'choice b', 'b']);
        const optC = findFAField(['option c *', 'option c', 'choice c', 'c']);
        const optD = findFAField(['option d *', 'option d', 'choice d', 'd']);
        const correctRaw = findFAField(['correct option (a/b/c/d) *', 'correct option (a/b/c/d)', 'correct option', 'correct answer', 'answer', 'correct key', 'correct'], 'correct', 'explanation');
        const explanation = findFAField(['explanation (why this option is correct)', 'explanation', 'explanation (optional)', 'rationale', 'solution'], 'explanation');
        const passScoreRaw = findFAField(['passing score (%)', 'passing score', 'pass %', 'passing grade'], 'pass');
        const pointsRaw = findFAField(['marks / points (e.g. 10)', 'marks / points', 'marks', 'points', 'mark', 'point', 'score per question', 'score'], 'mark');
        const titleRaw = findFAField(['assessment title', 'title', 'quiz title'], 'title');

        if (!questionText && !optA && !optB && !optC && !optD && !correctRaw) return;

        if (titleRaw && cleanQuizTitle(titleRaw) && (!finalLesson!.title || finalLesson!.title === 'Final Assessment')) {
          finalLesson!.title = cleanQuizTitle(titleRaw) || 'Final Assessment';
        }

        if (passScoreRaw && !isNaN(parseInt(passScoreRaw, 10))) {
          qData.passingScore = parseInt(passScoreRaw, 10);
        } else if (!qData.passingScore) {
          qData.passingScore = 80;
        }

        // Parse correct option index
        let cleanCorrect = (correctRaw || '').trim().toUpperCase();
        const matchLetter = cleanCorrect.match(/([A-D])/);
        const matchNum = cleanCorrect.match(/([1-4])/);
        if (['A', 'B', 'C', 'D'].includes(cleanCorrect)) {
          // valid
        } else if (matchLetter && cleanCorrect.length <= 10) {
          cleanCorrect = matchLetter[1];
        } else if (matchNum && cleanCorrect.length <= 3) {
          const numVal = parseInt(matchNum[1], 10);
          cleanCorrect = ['A', 'B', 'C', 'D'][numVal - 1] || cleanCorrect;
        } else {
          const optMatchIdx = [optA, optB, optC, optD].findIndex(
            (opt) => opt && opt.trim().toLowerCase() === correctRaw.trim().toLowerCase()
          );
          if (optMatchIdx >= 0) {
            cleanCorrect = ['A', 'B', 'C', 'D'][optMatchIdx];
          }
        }

        let correctIndex = 0;
        if (cleanCorrect === 'B' || cleanCorrect === '2') correctIndex = 1;
        else if (cleanCorrect === 'C' || cleanCorrect === '3') correctIndex = 2;
        else if (cleanCorrect === 'D' || cleanCorrect === '4') correctIndex = 3;

        const rawOptions = [optA, optB, optC, optD].filter(Boolean);
        const options = rawOptions.length >= 2 ? rawOptions : [optA || 'Option A', optB || 'Option B', optC || 'Option C', optD || 'Option D'];

        if (options.length > 0 && isNaN(parseInt(cleanCorrect, 10)) && !['A', 'B', 'C', 'D'].includes(cleanCorrect)) {
          const matchedIdx = options.findIndex((opt) => opt.toLowerCase() === cleanCorrect.toLowerCase());
          if (matchedIdx !== -1) {
            correctIndex = matchedIdx;
          }
        }

        if (correctIndex >= options.length) {
          correctIndex = 0;
        }

        const points =
          pointsRaw && !isNaN(parseInt(pointsRaw, 10)) && parseInt(pointsRaw, 10) > 0
            ? parseInt(pointsRaw, 10)
            : 10;

        const newQuestion = {
          id: `q-final-${rowIdx + 1}-${Math.random().toString(36).substring(2, 6)}`,
          question: questionText || `Question ${rowIdx + 1}`,
          options,
          correctIndex,
          explanation: explanation || '',
          points
        };

        qData.questions.push(newQuestion);
      });
    }
  }

  // Find and process dedicated Articles sheet if present
  const articlesSheetName = sheetNames.find(
    (name) => /article|reading|written|notes/i.test(name) && !/curriculum|detail|info|basic|quiz|guide|assessment/i.test(name)
  );

  if (articlesSheetName && wb.Sheets[articlesSheetName]) {
    const artSheet = wb.Sheets[articlesSheetName];
    const artRows: any[] = XLSX.utils.sheet_to_json(artSheet);
    let activeArticleSection: BuilderSection | undefined;

    artRows.forEach((row) => {
      const findArtField = (exactKeys: string[], fallbackKeyword?: string) => {
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
            if (cleanKey.includes(fallbackKeyword.toLowerCase())) {
              if (rVal !== undefined && rVal !== null && String(rVal).trim() !== '') {
                return String(rVal).trim();
              }
            }
          }
        }
        return '';
      };

      const moduleRaw = findArtField(['module (e.g. module 1)', 'module', 'module title', 'section'], 'module');
      const articleTitleRaw = findArtField(['article title *', 'article title', 'title', 'topic'], 'title');
      const durationRaw = findArtField(['reading duration (mm:ss)', 'duration (mm:ss)', 'duration', 'time'], 'duration');
      const isFreeRaw = findArtField(['free preview (yes / no)', 'free preview', 'preview', 'is free'], 'preview');
      const contentRaw = findArtField(['article content / notes (markdown or text) *', 'article content', 'content', 'notes', 'markdown'], 'content');
      const resourcesRaw = findArtField(['resource / reference links (optional)', 'resources', 'links', 'reference links'], 'resource');

      if (!articleTitleRaw) return;

      const cleanedTitle = cleanArticleTitle(articleTitleRaw) || cleanLectureTitle(articleTitleRaw) || articleTitleRaw;
      const isFree = /yes|true|1|free/i.test(isFreeRaw);
      const duration = durationRaw || '05:00';
      const durationSeconds = parseDurationToSeconds(duration);

      let resources: LessonResourceItem[] = [];
      if (resourcesRaw) {
        resources = resourcesRaw
          .split(/[;\n\r]+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((url, idx) => ({ id: `res-${idx + 1}`, name: `Resource ${idx + 1}`, url, type: 'LINK' as const }));
      }

      // Resolve Target Module for this article
      if (!result.sections) result.sections = [];
      let sec = resolveTargetSection(moduleRaw, result.sections, activeArticleSection);

      if (!sec) {
        const newNum = result.sections.length + 1;
        const newSecId = `sec-art-${Date.now()}-${newNum}-${Math.random().toString(36).substring(2, 6)}`;
        sec = {
          id: newSecId,
          clientKey: newSecId,
          tempId: newSecId,
          title: cleanModuleTitle(moduleRaw) || `Module ${newNum}`,
          description: '',
          order: newNum,
          lessons: []
        };
        result.sections.push(sec);
      }

      activeArticleSection = sec;

      // Check if this article exists in target module ONLY
      let matchedLesson: BuilderLesson | undefined;
      if (sec && sec.lessons) {
        matchedLesson = sec.lessons.find((l) => {
          if (l.isFinalAssignment || l.type === 'QUIZ') return false;
          const lTitle = l.title.toLowerCase().trim();
          const pTitle = cleanedTitle.toLowerCase().trim();
          return (
            lTitle === pTitle ||
            cleanArticleTitle(l.title).toLowerCase().trim() === cleanArticleTitle(cleanedTitle).toLowerCase().trim() ||
            cleanLectureTitle(l.title).toLowerCase().trim() === cleanLectureTitle(cleanedTitle).toLowerCase().trim()
          );
        });
      }

      if (matchedLesson) {
        matchedLesson.type = 'TEXT';
        if (contentRaw) matchedLesson.content = contentRaw;
        if (duration) matchedLesson.duration = duration;
        matchedLesson.durationSeconds = durationSeconds;
        if (isFreeRaw) matchedLesson.isFree = isFree;
        if (resources.length > 0) matchedLesson.resourcesList = resources;
      } else {
        const modIdx = (result.sections || []).indexOf(sec) + 1;
        const newId = `les-art-${Date.now()}-${modIdx}-${(sec.lessons || []).length + 1}-${Math.random().toString(36).substring(2, 7)}`;
        const newArt: BuilderLesson = {
          id: newId,
          clientKey: newId,
          tempId: newId,
          title: cleanedTitle,
          description: '',
          type: 'TEXT',
          duration,
          durationSeconds,
          content: contentRaw || '',
          isFree,
          isPublished: true,
          isNewlyAdded: true,
          order: (sec.lessons || []).length + 1,
          resourcesList: resources,
          subLessons: []
        };

        // Articles strictly ABOVE quizzes!
        const firstQuizIdx = (sec.lessons || []).findIndex((l) => l.type === 'QUIZ');
        if (firstQuizIdx !== -1) {
          sec.lessons.splice(firstQuizIdx, 0, newArt);
        } else {
          sec.lessons.push(newArt);
        }
      }
    });
  }

  // Sort each section's lessons: Lectures -> Articles (above quizzes!) -> Quizzes -> Final Assessment
  if (result.sections && result.sections.length > 0) {
    result.sections = result.sections.map((sec) => ({
      ...sec,
      lessons: sortSectionLessons(sec.lessons || [])
    }));
    result.sections = ensureFinalAssessmentAtEnd(result.sections);
  }

  return result;
}

/**
 * Parses an uploaded Excel or CSV file and extracts course details and curriculum
 */
export async function parseCourseExcelFile(file: File): Promise<ParsedCourseData> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  return parseCourseExcelWorkbook(wb);
}

/**
 * Merges parsed curriculum sections from an uploaded Excel file during "Update Version" mode (isModeB).
 * Guarantees that:
 * 1. Existing live modules and lessons are 100% preserved (original titles, IDs, attached videos, resources).
 * 2. Any modifications made in Excel to existing module titles or existing lesson titles are safely ignored.
 * 3. Newly added modules and newly added lessons in the Excel are appended.
 * 4. Final assignment questions and passing criteria can be updated if present in the Excel.
 */
export function mergeExcelSectionsForUpdateVersion(
  existingSections: BuilderSection[],
  parsedSections: BuilderSection[]
): BuilderSection[] {
  if (!parsedSections || parsedSections.length === 0) return ensureFinalAssessmentAtEnd(existingSections || []);
  if (!existingSections || existingSections.length === 0) return ensureFinalAssessmentAtEnd(parsedSections);

  const getQCount = (l: BuilderLesson | any): number => {
    if (!l || !l.quizData) return 0;
    try {
      const qd = typeof l.quizData === 'string' ? JSON.parse(l.quizData) : l.quizData;
      return Array.isArray(qd?.questions) ? qd.questions.length : 0;
    } catch {
      return 0;
    }
  };

  const isFinalExam = (l: BuilderLesson | any): boolean => {
    if (!l) return false;
    const rawTitle = String(l?.title || '').trim().toLowerCase();
    if (l?.type === 'QUIZ' && !/final\s*(assessment|assignment|exam)/i.test(rawTitle) && !l?.isFinalAssignment) {
      return false;
    }
    return Boolean(l?.isFinalAssignment) || /final\s*(assessment|assignment|exam)/i.test(rawTitle);
  };

  // 1. Authoritative Final Assessment across all parsed & existing sections
  let authoritativeFinalLesson: BuilderLesson | null = null;
  let bestQCount = -1;

  // Prioritize newly uploaded Excel sections as authoritative for Final Assessment
  for (const s of parsedSections) {
    for (const l of (s.lessons || [])) {
      if (isFinalExam(l)) {
        const qc = getQCount(l);
        if (!authoritativeFinalLesson || qc >= bestQCount) {
          authoritativeFinalLesson = {
            ...l,
            title: 'Final Assessment',
            type: 'QUIZ',
            isFinalAssignment: true
          };
          bestQCount = qc;
        }
      }
    }
  }

  // Fallback to existingSections only if Excel did not include a final assessment
  if (!authoritativeFinalLesson) {
    for (const s of existingSections) {
      for (const l of (s.lessons || [])) {
        if (isFinalExam(l)) {
          const qc = getQCount(l);
          if (!authoritativeFinalLesson || qc > bestQCount) {
            authoritativeFinalLesson = {
              ...l,
              title: 'Final Assessment',
              type: 'QUIZ',
              isFinalAssignment: true
            };
            bestQCount = qc;
          }
        }
      }
    }
  }

  const cleanSecKey = (t?: string | null) => cleanModuleTitle(t).toLowerCase().replace(/[^a-z0-9]/g, '').trim();

  const result: BuilderSection[] = [];
  const matchedExistingIndices = new Set<number>();

  // 2. Iterate over parsedSections because the Excel workbook defines the target curriculum order and structure!
  parsedSections.forEach((parsedSec, pIdx) => {
    const pKey = cleanSecKey(parsedSec.title);

    // a. Try finding exact/clean title match in existingSections
    let matchedExistingIdx = existingSections.findIndex(
      (es, eIdx) => !matchedExistingIndices.has(eIdx) && cleanSecKey(es.title) === pKey
    );

    // b. Fallback to module index if within bounds and not yet matched
    if (matchedExistingIdx === -1 && pIdx < existingSections.length && !matchedExistingIndices.has(pIdx)) {
      const origKey = cleanSecKey(existingSections[pIdx].title);
      const matchesLaterParsed = parsedSections.slice(pIdx + 1).some((otherPs) => cleanSecKey(otherPs.title) === origKey);
      if (!matchesLaterParsed) {
        matchedExistingIdx = pIdx;
      }
    }

    if (matchedExistingIdx !== -1) {
      // Existing section matched! Preserve its original ID, clientKey, and attached video/resource media!
      matchedExistingIndices.add(matchedExistingIdx);
      const origSec = existingSections[matchedExistingIdx];

      // Clone original non-final lessons
      const mergedLessons: BuilderLesson[] = [];
      let existingSectionQuiz: BuilderLesson | null = null;

      (origSec.lessons || []).forEach((l) => {
        if (isFinalExam(l)) return; // Strictly strip final assessment from section body
        if (l.type === 'QUIZ') {
          if (!existingSectionQuiz) {
            existingSectionQuiz = { ...l, title: cleanQuizTitle(l.title) || 'Quiz' };
            mergedLessons.push(existingSectionQuiz);
          } else {
            const existingQs: any[] = getQCount(existingSectionQuiz) > 0 ? (existingSectionQuiz.quizData as any).questions : [];
            const incomingQs: any[] = getQCount(l) > 0 ? (l.quizData as any).questions : [];
            if (incomingQs.length > 0 && existingQs.length === 0) {
              existingSectionQuiz.quizData = l.quizData;
            }
          }
          return;
        }
        mergedLessons.push({ ...l });
      });

      // Now merge incoming lessons from Excel for this module
      (parsedSec.lessons || []).forEach((parsedLes) => {
        if (isFinalExam(parsedLes)) return; // Placed strictly at the end of the course

        let existingIdx = -1;
        if (parsedLes.type === 'QUIZ') {
          const cleanP = (cleanQuizTitle(parsedLes.title) || 'Quiz').toLowerCase().replace(/[^a-z0-9]/g, '');
          existingIdx = mergedLessons.findIndex((l) => {
            if (l.type !== 'QUIZ' || isFinalExam(l)) return false;
            const lKey = (cleanQuizTitle(l.title) || 'Quiz').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (lKey === cleanP) return true;
            if ((lKey === 'quiz' || cleanP === 'quiz') && !/[0-9]/.test(lKey) && !/[0-9]/.test(cleanP)) return true;
            return false;
          });
        } else if (parsedLes.type === 'TEXT' || (parsedLes.type as any) === 'ARTICLE') {
          const cleanP = (cleanArticleTitle(parsedLes.title) || cleanLectureTitle(parsedLes.title)).toLowerCase().trim();
          existingIdx = mergedLessons.findIndex((l) => {
            if (l.type === 'QUIZ' || isFinalExam(l)) return false;
            const lTitle = (cleanArticleTitle(l.title) || cleanLectureTitle(l.title)).toLowerCase().trim();
            return lTitle === cleanP;
          });
        } else {
          const cleanP = cleanLectureTitle(parsedLes.title).toLowerCase().trim();
          existingIdx = mergedLessons.findIndex((l) => {
            if (l.type === 'QUIZ' || isFinalExam(l) || l.type === 'TEXT' || (l.type as any) === 'ARTICLE') return false;
            const lTitle = cleanLectureTitle(l.title).toLowerCase().trim();
            return lTitle === cleanP;
          });
        }

        if (existingIdx !== -1) {
          // Update details from Excel while strictly preserving uploaded video, resources, and IDs!
          const target = mergedLessons[existingIdx];
          if (parsedLes.type === 'QUIZ') {
            const inQc = getQCount(parsedLes);
            mergedLessons[existingIdx] = {
              ...target,
              title: parsedLes.title || target.title,
              quizData: inQc > 0 ? parsedLes.quizData : target.quizData,
              description: parsedLes.description || target.description
            };
          } else if (parsedLes.type === 'TEXT' || (parsedLes.type as any) === 'ARTICLE') {
            mergedLessons[existingIdx] = {
              ...target,
              type: 'TEXT',
              content: parsedLes.content || target.content || '',
              duration: parsedLes.duration || target.duration || '05:00',
              durationSeconds: parsedLes.durationSeconds || target.durationSeconds || 300,
              resourcesList: (parsedLes.resourcesList && parsedLes.resourcesList.length > 0)
                ? parsedLes.resourcesList
                : target.resourcesList,
              description: parsedLes.description || target.description
            };
          } else {
            // Lecture: Strictly preserve original live lecture title, videoUrl, and attached resources
            mergedLessons[existingIdx] = {
              ...target,
              title: target.title || cleanLectureTitle(parsedLes.title),
              description: target.description || parsedLes.description,
              duration: target.duration || parsedLes.duration,
              durationSeconds: target.durationSeconds || parsedLes.durationSeconds,
              isFree: target.isFree !== undefined ? target.isFree : parsedLes.isFree
            };
          }
        } else {
          // Genuinely NEW lesson, article, or quiz added in Excel for this module!
          const newLessonId = `les-${Date.now()}-${mergedLessons.length + 1}-${Math.random().toString(36).slice(2, 7)}`;
          const newLessonItem: BuilderLesson = {
            ...parsedLes,
            id: newLessonId,
            clientKey: newLessonId,
            tempId: newLessonId,
            isNewlyAdded: true,
            order: mergedLessons.length + 1
          };

          if (newLessonItem.type === 'TEXT' || (newLessonItem.type as any) === 'ARTICLE') {
            const firstQuizIdx = mergedLessons.findIndex((l) => l.type === 'QUIZ');
            if (firstQuizIdx !== -1) {
              mergedLessons.splice(firstQuizIdx, 0, newLessonItem);
            } else {
              mergedLessons.push(newLessonItem);
            }
          } else if (newLessonItem.type === 'QUIZ') {
            mergedLessons.push(newLessonItem);
          } else {
            const firstNonLectureIdx = mergedLessons.findIndex(
              (l) => l.type === 'TEXT' || (l.type as any) === 'ARTICLE' || l.type === 'QUIZ'
            );
            if (firstNonLectureIdx !== -1) {
              mergedLessons.splice(firstNonLectureIdx, 0, newLessonItem);
            } else {
              mergedLessons.push(newLessonItem);
            }
          }
        }
      });

      result.push({
        ...origSec,
        title: origSec.title || cleanModuleTitle(parsedSec.title),
        description: origSec.description || parsedSec.description,
        order: result.length + 1,
        lessons: sortSectionLessons(mergedLessons)
      });
    } else {
      // BRAND NEW SECTION / MODULE FROM EXCEL! (e.g. Module 7, Module 8)
      const newSecId = `sec-${Date.now()}-${result.length + 1}-${Math.random().toString(36).slice(2, 7)}`;
      const newLessons: BuilderLesson[] = [];

      (parsedSec.lessons || []).forEach((l, lIdx) => {
        if (isFinalExam(l)) return; // Placed at very end of course
        const newLessonId = `les-${Date.now()}-${lIdx + 1}-${Math.random().toString(36).slice(2, 7)}`;
        newLessons.push({
          ...l,
          id: newLessonId,
          clientKey: newLessonId,
          tempId: newLessonId,
          isNewlyAdded: true,
          isFinalAssignment: false,
          order: newLessons.length + 1
        });
      });

      result.push({
        ...parsedSec,
        id: newSecId,
        clientKey: newSecId,
        tempId: newSecId,
        title: cleanModuleTitle(parsedSec.title) || `Module ${result.length + 1}`,
        description: parsedSec.description || '',
        isNewlyAdded: true,
        order: result.length + 1,
        lessons: sortSectionLessons(newLessons)
      });
    }
  });

  // Retain any remaining existing sections that were not mapped in parsedSections
  existingSections.forEach((origSec, eIdx) => {
    if (!matchedExistingIndices.has(eIdx)) {
      result.push({
        ...origSec,
        order: result.length + 1,
        lessons: sortSectionLessons((origSec.lessons || []).filter((l) => !isFinalExam(l)).map((l) => ({ ...l })))
      });
    }
  });

  // Strip ALL final exam lessons from EVERY section before appending authoritative final exam!
  result.forEach((sec) => {
    sec.lessons = (sec.lessons || []).filter((l) => !isFinalExam(l));
  });

  // Append authoritative Final Assessment to the VERY LAST module of the course
  if (authoritativeFinalLesson && result.length > 0) {
    const lastSec = result[result.length - 1];
    const finalLessonClean: BuilderLesson = {
      ...authoritativeFinalLesson,
      id: authoritativeFinalLesson.id || `les-final-${Date.now()}`,
      clientKey: authoritativeFinalLesson.clientKey || authoritativeFinalLesson.id,
      title: 'Final Assessment',
      type: 'QUIZ',
      isFinalAssignment: true,
      order: lastSec.lessons.length + 1
    };
    lastSec.lessons.push(finalLessonClean);
  }

  // Re-number orders cleanly
  const cleanOrdered = result.map((sec, sIdx) => ({
    ...sec,
    order: sIdx + 1,
    lessons: (sec.lessons || []).map((les, lIdx) => ({
      ...les,
      order: lIdx + 1
    }))
  }));

  return ensureFinalAssessmentAtEnd(cleanOrdered);
}


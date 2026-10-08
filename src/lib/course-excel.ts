import * as XLSX from 'xlsx';
import { BuilderSection, BuilderLesson } from '@/components/course-builder/CourseCurriculumStep';

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
 * Generates and downloads the official Course Upload Template (.xlsx)
 */
export function downloadCourseExcelTemplate() {
  const wb = XLSX.utils.book_new();

  // 1. Course Details Sheet Data
  const courseDetailsRows = [
    {
      'Field Name': 'Course Title',
      'Your Value': 'Mastering Modern AI & Full-Stack Web Development 2026',
      'Required / Optional': 'Required',
      'Instructions': 'Full title of the masterclass.'
    },
    {
      'Field Name': 'Course Slug',
      'Your Value': 'mastering-modern-ai-fullstack-2026',
      'Required / Optional': 'Optional',
      'Instructions': 'URL slug for the course. Leave blank to auto-generate from title.'
    },
    {
      'Field Name': 'Category',
      'Your Value': 'Web Development',
      'Required / Optional': 'Required',
      'Instructions': 'e.g., Web Development, Artificial Intelligence, Teacher Development, Data Science, Business, Design'
    },
    {
      'Field Name': 'Skill Level',
      'Your Value': 'Foundational',
      'Required / Optional': 'Required',
      'Instructions': 'Choose one: Foundational, Intermediate, Advanced, or All Levels'
    },
    {
      'Field Name': 'Language',
      'Your Value': 'English',
      'Required / Optional': 'Required',
      'Instructions': 'Primary language of instruction (e.g., English, Hindi, Hinglish)'
    },
    {
      'Field Name': 'Short Description',
      'Your Value': 'Build production-ready generative AI web applications with Next.js, React 19, and Node.js.',
      'Required / Optional': 'Required',
      'Instructions': 'Catchy 1-2 sentence summary for course catalog and cards.'
    },
    {
      'Field Name': 'Full Course Description',
      'Your Value': 'This comprehensive masterclass takes you from core web principles to building scalable, production-grade AI-powered applications. Learn modern component architecture, state management, database schemas, secure authentication, and end-to-end deployment.',
      'Required / Optional': 'Required',
      'Instructions': 'In-depth description of the course curriculum and learning outcomes.'
    },
    {
      'Field Name': 'What Students Will Learn',
      'Your Value': 'Build modern full-stack web applications with Next.js & React 19; Integrate generative AI APIs and vector search pipelines; Design robust PostgreSQL database schemas and migrations; Deploy high-performance web applications with CI/CD',
      'Required / Optional': 'Required',
      'Instructions': 'Separate each learning outcome with a semicolon (;) or new lines.'
    },
    {
      'Field Name': 'Prerequisites & Setup',
      'Your Value': 'Basic computer literacy and internet access; Fundamental curiosity about programming (no prior advanced experience required)',
      'Required / Optional': 'Required',
      'Instructions': 'Separate each prerequisite with a semicolon (;) or new lines.'
    },
    {
      'Field Name': 'Target Audience',
      'Your Value': 'Aspiring software developers and web designers; Computer science students building portfolio master projects; Working professionals upskilling in modern AI and full-stack frameworks',
      'Required / Optional': 'Required',
      'Instructions': 'Separate each target audience group with a semicolon (;) or new lines.'
    },
    {
      'Field Name': 'Course Price (INR)',
      'Your Value': 2999,
      'Required / Optional': 'Required',
      'Instructions': 'Regular price in INR (numbers only, e.g. 2999).'
    },
    {
      'Field Name': 'Discount Price (INR)',
      'Your Value': 999,
      'Required / Optional': 'Optional',
      'Instructions': 'Sale price in INR (e.g. 999). Must be lower than regular price.'
    },
    {
      'Field Name': 'Currency',
      'Your Value': 'INR',
      'Required / Optional': 'Required',
      'Instructions': 'Currency code (Default: INR).'
    },
    {
      'Field Name': 'Access Type',
      'Your Value': 'LIFETIME',
      'Required / Optional': 'Required',
      'Instructions': 'Choose: LIFETIME or LIMITED_DAYS'
    },
    {
      'Field Name': 'Access Days',
      'Your Value': '',
      'Required / Optional': 'Optional',
      'Instructions': 'If Access Type is LIMITED_DAYS, enter number of days (e.g. 365). Otherwise leave blank.'
    }
  ];

  const wsDetails = XLSX.utils.json_to_sheet(courseDetailsRows);
  wsDetails['!cols'] = [
    { wch: 28 }, // Field Name
    { wch: 65 }, // Your Value
    { wch: 20 }, // Required / Optional
    { wch: 70 }  // Instructions
  ];
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Course Details');

  // 2. Curriculum Syllabus Sheet Data (Module 1 with lectures under it without repeating module columns)
  const curriculumRows = [
    {
      'Module Title': 'Module 1: Foundations of Web Architecture & Modern AI',
      'Module Description': 'Internet protocols, browser DOM rendering, Node.js runtime, and modern AI stack overview',
      'Lecture Title': '1.1 Course Orientation & Modern Tech Stack Roadmap',
      'Lecture Description': 'Overview of the master projects, dev tooling setup, and learning objectives',
      'Lecture Type (VIDEO/PDF/QUIZ)': 'VIDEO',
      'Duration (mm:ss)': '08:30',
      'Is Preview Free (Yes/No)': 'Yes'
    },
    {
      'Module Title': '', // Left blank on purpose - automatically grouped under Module 1
      'Module Description': '', // Left blank on purpose
      'Lecture Title': '1.2 Setting Up VS Code, Git, and Modern Terminal Workflow',
      'Lecture Description': 'Configuring developer environment, extensions, and version control',
      'Lecture Type (VIDEO/PDF/QUIZ)': 'VIDEO',
      'Duration (mm:ss)': '14:15',
      'Is Preview Free (Yes/No)': 'No'
    },
    {
      'Module Title': '',
      'Module Description': '',
      'Lecture Title': '1.3 Understanding Modern JavaScript & DOM Architecture',
      'Lecture Description': 'Core event loop, closures, and browser rendering lifecycle',
      'Lecture Type (VIDEO/PDF/QUIZ)': 'VIDEO',
      'Duration (mm:ss)': '12:00',
      'Is Preview Free (Yes/No)': 'No'
    },
    {
      'Module Title': 'Module 2: Frontend Engineering with Next.js & React 19',
      'Module Description': 'Component architecture, server vs client components, hooks, and responsive styling',
      'Lecture Title': '2.1 Server Components & Dynamic Routing in Next.js',
      'Lecture Description': 'Page routing, layout patterns, and data streaming techniques',
      'Lecture Type (VIDEO/PDF/QUIZ)': 'VIDEO',
      'Duration (mm:ss)': '18:45',
      'Is Preview Free (Yes/No)': 'No'
    },
    {
      'Module Title': '',
      'Module Description': '',
      'Lecture Title': '2.2 Building Responsive Master Layouts with Tailwind CSS',
      'Lecture Description': 'Flexbox, CSS grid, dark mode theming, and accessible design systems',
      'Lecture Type (VIDEO/PDF/QUIZ)': 'VIDEO',
      'Duration (mm:ss)': '22:10',
      'Is Preview Free (Yes/No)': 'No'
    },
    {
      'Module Title': 'Module 3: Backend APIs & Database Architecture',
      'Module Description': 'Database modeling, PostgreSQL schema design, Prisma ORM, and secure REST APIs',
      'Lecture Title': '3.1 Relational Database Modeling with PostgreSQL & Prisma',
      'Lecture Description': 'Tables, relations, foreign keys, migrations, and indexing strategies',
      'Lecture Type (VIDEO/PDF/QUIZ)': 'VIDEO',
      'Duration (mm:ss)': '25:30',
      'Is Preview Free (Yes/No)': 'No'
    },
    {
      'Module Title': '',
      'Module Description': '',
      'Lecture Title': '3.2 Building Secure Authentication & Role Permissions',
      'Lecture Description': 'JWT tokens, cookie security, password hashing, and role-based access control',
      'Lecture Type (VIDEO/PDF/QUIZ)': 'VIDEO',
      'Duration (mm:ss)': '28:15',
      'Is Preview Free (Yes/No)': 'No'
    },
    {
      'Module Title': '',
      'Module Description': '',
      'Lecture Title': 'Quiz 1: Foundations Knowledge Check',
      'Lecture Description': 'Verify core understanding of web protocols and AI concepts',
      'Lecture Type (VIDEO/PDF/QUIZ)': 'QUIZ',
      'Duration (mm:ss)': '10:00',
      'Is Preview Free (Yes/No)': 'No'
    },
    {
      'Module Title': '',
      'Module Description': '',
      'Lecture Title': '3.3 Module 3 Knowledge Check & Coding Quiz',
      'Lecture Description': 'Test your understanding of REST APIs, database models, and authentication',
      'Lecture Type (VIDEO/PDF/QUIZ)': 'QUIZ',
      'Duration (mm:ss)': '15:00',
      'Is Preview Free (Yes/No)': 'No'
    }
  ];

  const wsCurriculum = XLSX.utils.json_to_sheet(curriculumRows);
  wsCurriculum['!cols'] = [
    { wch: 42 }, // Module Title
    { wch: 55 }, // Module Description
    { wch: 42 }, // Lecture Title
    { wch: 55 }, // Lecture Description
    { wch: 28 }, // Lecture Type
    { wch: 22 }, // Duration
    { wch: 24 }  // Is Preview Free
  ];
  XLSX.utils.book_append_sheet(wb, wsCurriculum, 'Curriculum');

  // 3. Quizzes & MCQs Sheet Data
  const quizRows = [
    {
      'Module (e.g. Module 1)': 'Module 1',
      'Quiz Title': 'Quiz 1',
      'Question Text': 'What protocol provides encrypted communication over the World Wide Web?',
      'Option A': 'HTTP',
      'Option B': 'HTTPS',
      'Option C': 'FTP',
      'Option D': 'SMTP',
      'Correct Option (A/B/C/D)': 'B',
      'Explanation': 'HTTPS encrypts communication between the client browser and web server using TLS/SSL.',
      'Passing Score (%)': 70
    },
    {
      'Module (e.g. Module 1)': 'Module 1',
      'Quiz Title': 'Quiz 1',
      'Question Text': 'Which JavaScript engine powers Google Chrome and Node.js runtime?',
      'Option A': 'SpiderMonkey',
      'Option B': 'JavaScriptCore',
      'Option C': 'V8 Engine',
      'Option D': 'Chakra',
      'Correct Option (A/B/C/D)': 'C',
      'Explanation': 'Google’s open-source V8 engine compiles JavaScript directly to native machine code.',
      'Passing Score (%)': 70
    },
    {
      'Module (e.g. Module 1)': 'Module 2',
      'Quiz Title': 'Quiz 2',
      'Question Text': 'In React, which built-in hook is used to declare and manage local component state?',
      'Option A': 'useEffect',
      'Option B': 'useState',
      'Option C': 'useRef',
      'Option D': 'useContext',
      'Correct Option (A/B/C/D)': 'B',
      'Explanation': 'useState is the standard React hook for managing stateful values in functional components.',
      'Passing Score (%)': 70
    },
    {
      'Module (e.g. Module 1)': 'Module 3',
      'Quiz Title': 'Quiz 3',
      'Question Text': 'Which database language is primarily used for defining and querying relational databases?',
      'Option A': 'HTML',
      'Option B': 'CSS',
      'Option C': 'SQL',
      'Option D': 'JSON',
      'Correct Option (A/B/C/D)': 'C',
      'Explanation': 'SQL (Structured Query Language) is the standard query language for relational databases like PostgreSQL.',
      'Passing Score (%)': 70
    }
  ];

  const wsQuizzes = XLSX.utils.json_to_sheet(quizRows);
  wsQuizzes['!cols'] = [
    { wch: 24 }, // Module
    { wch: 20 }, // Quiz Title
    { wch: 75 }, // Question Text
    { wch: 28 }, // Option A
    { wch: 28 }, // Option B
    { wch: 28 }, // Option C
    { wch: 28 }, // Option D
    { wch: 26 }, // Correct Option
    { wch: 65 }, // Explanation
    { wch: 20 }  // Passing Score (%)
  ];
  XLSX.utils.book_append_sheet(wb, wsQuizzes, 'Quizzes & MCQs');

  // 4. User Guide & Format Instructions Sheet
  const instructionsRows = [
    {
      'Section': 'How to Fill Course Details',
      'Instructions': 'Fill your Masterclass title, category, level (Foundational, Intermediate, Advanced, All Levels), pricing, and descriptions in the "Course Details" tab.'
    },
    {
      'Section': 'How to Fill Curriculum Modules',
      'Instructions': 'Type Module Title and Module Description once. All subsequent lecture rows left blank under it will automatically be placed inside that same module! No need to repeat the module name.'
    },
    {
      'Section': 'Lectures & Descriptions',
      'Instructions': 'Each row represents one lecture. Provide Lecture Title and Lecture Description. Type can be VIDEO, PDF, or QUIZ.'
    },
    {
      'Section': 'How to Fill Quizzes & MCQs',
      'Instructions': 'Use the "Quizzes & MCQs" tab to add multiple-choice questions for each module. Specify Module (e.g. Module 1), Quiz Title (e.g. Quiz 1), Question Text, Options A-D, Correct Option (A/B/C/D), Explanation, and Passing Score.'
    },
    {
      'Section': 'Videos, Resources & Thumbnails',
      'Instructions': 'Spreadsheet auto-fills course structure, syllabus, text, and quizzes. You can upload video files and PDF resources directly using the batch uploader (2 parallel uploads queue) in Instructor Studio.'
    }
  ];
  const wsGuide = XLSX.utils.json_to_sheet(instructionsRows);
  wsGuide['!cols'] = [{ wch: 32 }, { wch: 95 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Guide & Instructions');

  // Trigger browser download
  XLSX.writeFile(wb, 'MORENA_Course_Upload_Template.xlsx');
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
 * Parses an uploaded Excel or CSV file and extracts course details and curriculum
 */
export async function parseCourseExcelFile(file: File): Promise<ParsedCourseData> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

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
      for (const alias of aliases) {
        const direct = keyValues[alias.toLowerCase()];
        if (direct !== undefined && direct !== null && String(direct).trim() !== '') return direct;
        // Fuzzy search in keys
        for (const [k, v] of Object.entries(keyValues)) {
          if (k.includes(alias.toLowerCase())) return v;
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

    const learnVal = findValue('what students will learn', 'what you will learn', 'outcomes');
    if (learnVal) result.whatYouWillLearn = parseMultiItems(learnVal);

    const reqVal = findValue('prerequisites & setup', 'prerequisites', 'requirements');
    if (reqVal) result.requirements = parseMultiItems(reqVal);

    const audVal = findValue('target audience', 'audience');
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

        const rawModTitle = findField(['module title', 'module name', 'module', 'section title', 'section name']);
        const rawModDesc = findField(['module description', 'module desc', 'section description', 'section desc'], 'module desc');
        const lessonTitle = findField(['lecture title', 'lesson title', 'lecture name', 'lesson name', 'lecture', 'lesson'], 'title', 'module');
        const lessonDesc = findField(
          ['lecture description', 'lesson description', 'lecture desc', 'lesson desc', 'lecture summary', 'lesson summary'],
          'desc',
          'module'
        );
        const lessonTypeRaw = findField(['lecture type (video/pdf/quiz)', 'lecture type', 'lesson type', 'type', 'format'], 'type') || 'VIDEO';
        const durationStr = findField(['duration (mm:ss)', 'lesson duration', 'duration', 'time', 'length'], 'duration') || '10:00';
        const isFreeRaw = findField(['is preview free (yes/no)', 'is preview free', 'is free', 'preview free', 'free preview', 'preview']);
        const isFree = /yes|true|1|free/i.test(isFreeRaw);

        // Skip completely empty rows
        if (!rawModTitle && !rawModDesc && !lessonTitle && !lessonDesc) return;

        // 1. Module Assignment (User does not have to repeat module title on every row):
        if (rawModTitle) {
          // Check if this module already exists by title
          const existing = sections.find((s) => s.title.toLowerCase().trim() === rawModTitle.toLowerCase().trim());
          if (existing) {
            currentSection = existing;
            if (!currentSection.description && rawModDesc) {
              currentSection.description = rawModDesc;
            }
          } else {
            currentSection = {
              id: `sec-${Date.now()}-${sections.length + 1}-${Math.random().toString(36).substring(2, 6)}`,
              title: rawModTitle,
              description: rawModDesc || '',
              order: sections.length + 1,
              lessons: []
            };
            sections.push(currentSection);
          }
        } else {
          // Module Title is left blank on this row (automatically inherits the active module above it!)
          if (!currentSection) {
            currentSection = {
              id: `sec-${Date.now()}-1-${Math.random().toString(36).substring(2, 6)}`,
              title: 'Module 1: Foundations & Orientation',
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
        if (lessonTitle || lessonDesc || durationStr) {
          const isQuiz = /quiz/i.test(lessonTypeRaw) || /quiz/i.test(lessonTitle);
          const finalLessonTitle = lessonTitle || (isQuiz ? `Quiz ${currentSection.order}` : `Lecture ${currentSection.lessons.length + 1}`);
          const durationSeconds = parseDurationToSeconds(durationStr);
          const normalizedType: 'VIDEO' | 'PDF' | 'QUIZ' | 'TEXT' = isQuiz
            ? 'QUIZ'
            : /pdf|doc|file|reading/i.test(lessonTypeRaw)
            ? 'PDF'
            : 'VIDEO';

          currentSection.lessons.push({
            id: `les-${Date.now()}-${currentSection.order}-${currentSection.lessons.length + 1}-${Math.random().toString(36).substring(2, 6)}`,
            title: finalLessonTitle,
            description: lessonDesc || '',
            type: normalizedType,
            duration: durationStr,
            durationSeconds,
            isFree,
            isPublished: true,
            order: currentSection.lessons.length + 1,
            quizData: isQuiz
              ? {
                  questions: [],
                  passingScore: 70,
                  attemptLimit: 0
                }
              : undefined,
            subLessons: []
          });
        }
      });

      if (sections.length > 0) {
        result.sections = sections;
      }
    }
  }

  // 3. Quizzes & MCQs Sheet Parsing (Auto-populates questions, options & answers into respective module quizzes)
  const quizSheetName = sheetNames.find((name) =>
    /quiz|mcq|assessment|question/i.test(name)
  );

  if (quizSheetName && wb.Sheets[quizSheetName]) {
    const qSheet = wb.Sheets[quizSheetName];
    const quizRawRows: any[] = XLSX.utils.sheet_to_json(qSheet);

    if (quizRawRows.length > 0) {
      if (!result.sections) {
        result.sections = [];
      }
      const sections = result.sections;

      quizRawRows.forEach((row, rowIdx) => {
        const findQField = (exactKeys: string[], fallbackKeyword?: string) => {
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

        const moduleIdentifier = findQField(['module (e.g. module 1)', 'module', 'module name', 'module #', 'section'], 'module');
        const quizTitleRaw = findQField(['quiz title', 'quiz name', 'quiz', 'assessment title'], 'quiz');
        const questionText = findQField(['question text', 'question', 'prompt', 'mcq'], 'question');
        const optA = findQField(['option a', 'choice a', 'a']);
        const optB = findQField(['option b', 'choice b', 'b']);
        const optC = findQField(['option c', 'choice c', 'c']);
        const optD = findQField(['option d', 'choice d', 'd']);
        const correctRaw = findQField(['correct option (a/b/c/d)', 'correct option', 'correct answer', 'answer', 'correct key', 'correct'], 'correct');
        const explanation = findQField(['explanation', 'explanation (optional)', 'rationale', 'solution'], 'explanation');
        const passScoreRaw = findQField(['passing score (%)', 'passing score', 'pass %', 'passing grade'], 'pass');

        if (!questionText && !optA && !optB) return; // Skip empty row

        // Find or assign target section
        let targetSection: BuilderSection | undefined;
        if (moduleIdentifier) {
          const numMatch = moduleIdentifier.match(/\d+/);
          if (numMatch) {
            const modIndex = parseInt(numMatch[0], 10) - 1;
            if (modIndex >= 0 && modIndex < sections.length) {
              targetSection = sections[modIndex];
            }
          }
          if (!targetSection) {
            targetSection = sections.find((s) =>
              s.title.toLowerCase().includes(moduleIdentifier.toLowerCase())
            );
          }
        }

        if (!targetSection) {
          if (sections.length > 0) {
            targetSection = sections[0];
          } else {
            targetSection = {
              id: `sec-${Date.now()}-1-${Math.random().toString(36).substring(2, 6)}`,
              title: 'Module 1: Foundations & Orientation',
              description: '',
              order: 1,
              lessons: []
            };
            sections.push(targetSection);
          }
        }

        const secOrder = targetSection.order || 1;
        const defaultQuizTitle = quizTitleRaw || `Quiz ${secOrder}`;

        // Find or create QUIZ lesson in this module
        let quizLesson = targetSection.lessons.find(
          (l) => l.type === 'QUIZ' && (!quizTitleRaw || l.title.toLowerCase() === quizTitleRaw.toLowerCase())
        );

        if (!quizLesson) {
          quizLesson = targetSection.lessons.find((l) => l.type === 'QUIZ');
        }

        if (!quizLesson) {
          quizLesson = {
            id: `les-${Date.now()}-${secOrder}-${targetSection.lessons.length + 1}-${Math.random().toString(36).substring(2, 6)}`,
            title: defaultQuizTitle,
            description: `Assessment for Module ${secOrder}`,
            type: 'QUIZ',
            duration: '10:00',
            durationSeconds: 600,
            isFree: false,
            isPublished: true,
            order: targetSection.lessons.length + 1,
            quizData: {
              questions: [],
              passingScore: passScoreRaw ? parseInt(passScoreRaw, 10) || 70 : 70,
              attemptLimit: 0
            },
            subLessons: []
          };
          targetSection.lessons.push(quizLesson);
        }

        // Parse correct option index
        const cleanCorrect = correctRaw.trim().toUpperCase();
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

        const newQuestion = {
          id: `q-${Date.now()}-${rowIdx + 1}-${Math.random().toString(36).substring(2, 6)}`,
          question: questionText || `Question ${rowIdx + 1}`,
          options,
          correctIndex,
          explanation: explanation || '',
          points: 1
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
        }
        qData.questions.push(newQuestion);
      });
    }
  }

  return result;
}

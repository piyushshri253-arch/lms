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
      'Your Value': 'Beginner',
      'Required / Optional': 'Required',
      'Instructions': 'Choose one: Beginner, Intermediate, Advanced, or All Levels'
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

  // 2. Curriculum Syllabus Sheet Data
  const curriculumRows = [
    {
      'Module Title': 'Module 1: Foundations of Web Architecture & AI',
      'Module Description': 'Internet protocols, browser DOM rendering, Node.js runtime, and modern AI stack overview',
      'Lesson Title': '1.1 Course Orientation & Modern Tech Stack Roadmap',
      'Lesson Description': 'Overview of the master projects, dev tooling setup, and learning objectives',
      'Lesson Duration (mm:ss)': '08:30',
      'Is Preview Free (Yes/No)': 'Yes'
    },
    {
      'Module Title': 'Module 1: Foundations of Web Architecture & AI',
      'Module Description': 'Internet protocols, browser DOM rendering, Node.js runtime, and modern AI stack overview',
      'Lesson Title': '1.2 Setting Up VS Code, Git, and Modern Terminal Workflow',
      'Lesson Description': 'Configuring developer environment, extensions, and version control',
      'Lesson Duration (mm:ss)': '14:15',
      'Is Preview Free (Yes/No)': 'No'
    },
    {
      'Module Title': 'Module 2: Frontend Engineering with Next.js & React 19',
      'Module Description': 'Component architecture, server vs client components, hooks, and responsive styling',
      'Lesson Title': '2.1 Server Components & Dynamic Routing in Next.js',
      'Lesson Description': 'Page routing, layout patterns, and data streaming techniques',
      'Lesson Duration (mm:ss)': '18:45',
      'Is Preview Free (Yes/No)': 'No'
    },
    {
      'Module Title': 'Module 2: Frontend Engineering with Next.js & React 19',
      'Module Description': 'Component architecture, server vs client components, hooks, and responsive styling',
      'Lesson Title': '2.2 Building Responsive Master Layouts with Tailwind CSS',
      'Lesson Description': 'Flexbox, CSS grid, dark mode theming, and accessible design systems',
      'Lesson Duration (mm:ss)': '22:10',
      'Is Preview Free (Yes/No)': 'No'
    },
    {
      'Module Title': 'Module 3: Backend APIs & Database Architecture',
      'Module Description': 'Database modeling, PostgreSQL schema design, Prisma ORM, and secure REST APIs',
      'Lesson Title': '3.1 Relational Database Modeling with PostgreSQL & Prisma',
      'Lesson Description': 'Tables, relations, foreign keys, migrations, and indexing strategies',
      'Lesson Duration (mm:ss)': '25:30',
      'Is Preview Free (Yes/No)': 'No'
    },
    {
      'Module Title': 'Module 3: Backend APIs & Database Architecture',
      'Module Description': 'Database modeling, PostgreSQL schema design, Prisma ORM, and secure REST APIs',
      'Lesson Title': '3.2 Building Secure Authentication & Role Permissions',
      'Lesson Description': 'JWT tokens, cookie security, password hashing, and role-based access control',
      'Lesson Duration (mm:ss)': '28:15',
      'Is Preview Free (Yes/No)': 'No'
    }
  ];

  const wsCurriculum = XLSX.utils.json_to_sheet(curriculumRows);
  wsCurriculum['!cols'] = [
    { wch: 38 }, // Module Title
    { wch: 55 }, // Module Description
    { wch: 42 }, // Lesson Title
    { wch: 50 }, // Lesson Description
    { wch: 25 }, // Lesson Duration
    { wch: 24 }  // Is Preview Free
  ];
  XLSX.utils.book_append_sheet(wb, wsCurriculum, 'Curriculum');

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
  if (clean.includes('BEG')) return 'BEGINNER';
  if (clean.includes('INTER')) return 'INTERMEDIATE';
  if (clean.includes('ADV')) return 'ADVANCED';
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
      // Group lessons by module title
      const modulesMap: Map<
        string,
        {
          title: string;
          description: string;
          lessons: BuilderLesson[];
        }
      > = new Map();

      rawRows.forEach((row, idx) => {
        // Find column values with flexible keys
        const getRowVal = (...keys: string[]) => {
          for (const key of keys) {
            for (const [rKey, rVal] of Object.entries(row)) {
              if (rKey.trim().toLowerCase() === key.toLowerCase() || rKey.trim().toLowerCase().includes(key.toLowerCase())) {
                if (rVal !== undefined && rVal !== null && String(rVal).trim() !== '') {
                  return String(rVal).trim();
                }
              }
            }
          }
          return '';
        };

        const modTitle = getRowVal('module title', 'module') || `Module ${modulesMap.size + 1}`;
        const modDesc = getRowVal('module description', 'module desc');
        const lessonTitle = getRowVal('lesson title', 'lesson', 'title') || `Lesson ${idx + 1}`;
        const lessonDesc = getRowVal('lesson description', 'lesson desc', 'description');
        const durationStr = getRowVal('lesson duration', 'duration') || '10:00';
        const isFreeRaw = getRowVal('is preview free', 'is free', 'preview');
        const isFree = /yes|true|1|free/i.test(isFreeRaw);

        if (!modulesMap.has(modTitle)) {
          modulesMap.set(modTitle, {
            title: modTitle,
            description: modDesc,
            lessons: []
          });
        }

        const modGroup = modulesMap.get(modTitle)!;
        if (!modGroup.description && modDesc) {
          modGroup.description = modDesc;
        }

        const durationSeconds = parseDurationToSeconds(durationStr);

        modGroup.lessons.push({
          id: `les-${Date.now()}-${modulesMap.size}-${modGroup.lessons.length + 1}-${Math.random().toString(36).substring(2, 6)}`,
          title: lessonTitle,
          description: lessonDesc,
          type: 'VIDEO',
          duration: durationStr,
          durationSeconds,
          isFree,
          isPublished: true,
          order: modGroup.lessons.length + 1,
          subLessons: []
        });
      });

      if (modulesMap.size > 0) {
        const sections: BuilderSection[] = [];
        let modIndex = 1;
        for (const [, group] of modulesMap) {
          sections.push({
            id: `sec-${Date.now()}-${modIndex}-${Math.random().toString(36).substring(2, 6)}`,
            title: group.title,
            description: group.description,
            order: modIndex,
            lessons: group.lessons
          });
          modIndex++;
        }
        result.sections = sections;
      }
    }
  }

  return result;
}

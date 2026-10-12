import * as XLSX from 'xlsx-js-style';
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
 * Strips redundant module prefixes like "Module 1:", "Module 1 -", "Section 1:", "Module 01."
 * so that only the pure title enters the text input field.
 */
export function cleanModuleTitle(raw?: string | null): string {
  if (!raw) return '';
  let str = String(raw).trim();
  // Strip leading "Module 1:", "Section 1 -", "Module 01.", "Module 1", "Section 1"
  str = str.replace(/^(module|section)\s*\d+[\s:\-\.]*/i, '').trim();
  // Strip leading numbers like "1: ", "1 - ", "1. "
  str = str.replace(/^(\d+(\.\d+)*)[\s:\-\.]+\s*/, '').trim();
  // If only a lone number or single word "Module" was left, clear it
  str = str.replace(/^\d+(\.\d+)*$/, '').trim();
  str = str.replace(/^(module|section)$/i, '').trim();
  return str;
}

/**
 * Strips redundant lecture prefixes like "1.1 ", "Lecture 1:", "Lecture 1 -", "01. ", "Lesson 1:"
 * so that only the pure title enters the text input field.
 */
export function cleanLectureTitle(raw?: string | null): string {
  if (!raw) return '';
  let str = String(raw).trim();
  // Strip leading "Lecture 1:", "Lesson 1 -", "Lecture 01.", "Lecture 1", "Lesson 1"
  str = str.replace(/^(lecture|lesson)\s*\d+[\s:\-\.]*/i, '').trim();
  // Strip leading numbering like "1.1: ", "1.1 - ", "1.1.1 ", "1.1 ", "01. ", "1 - ", "1: ", "1. "
  str = str.replace(/^(\d+(\.\d+)*)[\s:\-\.]+\s*/, '').trim();
  // If only a lone number or decimal like "1" or "1.1" was left, clear it
  str = str.replace(/^\d+(\.\d+)*$/, '').trim();
  str = str.replace(/^(lecture|lesson)$/i, '').trim();
  return str;
}

/**
 * Strips redundant quiz prefixes like "Quiz 1:", "Quiz 1 -", "Quiz 1.", "Assessment 1:", etc.
 * so that only the pure title enters the text input field.
 */
export function cleanQuizTitle(raw?: string | null): string {
  if (!raw) return '';
  let str = String(raw).trim();
  // Strip leading "Quiz 1:", "Quiz 1 -", "Quiz 1.", "Assessment 1:", etc.
  str = str.replace(/^(quiz|assessment)\s*\d+[\s:\-\.]*/i, '').trim();
  // Strip leading numbers like "1: ", "1 - ", "1. "
  str = str.replace(/^(\d+(\.\d+)*)[\s:\-\.]+\s*/, '').trim();
  // If only a lone number or "Quiz" was left, clear it
  str = str.replace(/^\d+(\.\d+)*$/, '').trim();
  str = str.replace(/^(quiz|assessment)$/i, '').trim();
  return str;
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
    headerPurple: {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '581C87' } }, // Purple 800
      fill: { fgColor: { rgb: '581C87' } },
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
      'Clear Instructions & Examples (Hinglish + English)'
    ],
    ['📌 SECTION 1: BASIC COURSE INFORMATION', '', '', ''],
    [
      'Course Title *',
      'Mastering Modern AI & Full-Stack Web Development 2026',
      'REQUIRED',
      'Course ka poora title yahan likhein (e.g. Complete Web Development Bootcamp 2026)'
    ],
    [
      'Course Slug',
      'mastering-modern-ai-fullstack-2026',
      'OPTIONAL',
      'Course ka URL slug. Khali chhodne par title se automatically ban jayega'
    ],
    [
      'Category *',
      'Web Development',
      'REQUIRED',
      'Category chunein: Web Development, Artificial Intelligence, Business, Design, Teacher Training, etc.'
    ],
    [
      'Skill Level *',
      'Foundational',
      'REQUIRED',
      'Level chunein: Foundational, Intermediate, Advanced, ya All Levels'
    ],
    [
      'Language *',
      'English',
      'REQUIRED',
      'Course ki primary bhasha (e.g. English, Hindi, Hinglish)'
    ],
    ['📝 SECTION 2: DESCRIPTIONS & LEARNING GOALS', '', '', ''],
    [
      'Short Description *',
      'Build production-ready generative AI web applications with Next.js, React 19, and Node.js.',
      'REQUIRED',
      'Course preview cards ke liye catchy 1-2 sentence ki summary'
    ],
    [
      'Full Course Description *',
      'This comprehensive masterclass takes you from core web principles to building scalable, production-grade AI-powered applications. Learn modern component architecture, state management, database schemas, secure authentication, and end-to-end deployment.',
      'REQUIRED',
      'Course ka poora detailed description jisme syllabus aur course ke baare me sab kuch explain ho'
    ],
    [
      'What Students Will Learn *',
      'Build modern full-stack web applications with Next.js & React 19; Integrate generative AI APIs and vector search pipelines; Design robust PostgreSQL database schemas and migrations; Deploy high-performance web applications with CI/CD',
      'REQUIRED',
      'Har learning outcome ko semicolon (;) se alag karein. Jaise: Point 1; Point 2; Point 3'
    ],
    [
      'Prerequisites & Setup *',
      'Basic computer literacy and internet access; Fundamental curiosity about programming (no prior advanced experience required)',
      'REQUIRED',
      'Course shuru karne se pehle student ko kya aana chahiye (semicolon ; se alag karein)'
    ],
    [
      'Target Audience *',
      'Aspiring software developers and web designers; Computer science students building portfolio master projects; Working professionals upskilling in modern AI and full-stack frameworks',
      'REQUIRED',
      'Yeh course kin students/professionals ke liye suitable hai (semicolon ; se alag karein)'
    ],
    ['💰 SECTION 3: PRICING & ACCESS SETTINGS', '', '', ''],
    [
      'Course Price (INR) *',
      2999,
      'REQUIRED',
      'Regular course fees INR mein (sirf number likhein, jaise 2999)'
    ],
    [
      'Discount Price (INR)',
      999,
      'OPTIONAL',
      'Sale / offer price in INR (regular price se kam hona chahiye, jaise 999). Agar discount nahi hai toh blank chhod dein'
    ],
    [
      'Currency *',
      'INR',
      'REQUIRED',
      'Default currency code: INR'
    ],
    [
      'Access Type *',
      'LIFETIME',
      'REQUIRED',
      'Choose: LIFETIME ya LIMITED_DAYS'
    ],
    [
      'Access Days',
      '',
      'OPTIONAL',
      'Agar Access Type LIMITED_DAYS hai toh days likhein (jaise 365). LIFETIME ke liye blank chhod dein'
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
    { wch: 32 }, // Field Name
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
      'Content Type (LECTURE / ARTICLE / QUIZ) *',
      'Duration (mm:ss)',
      'Free Preview (Yes / No)',
      'Written Article Content / Notes (Markdown for Written Articles)'
    ],
    [
      'Foundations of Modern Web Architecture',
      'Course Orientation & Tech Stack Roadmap',
      'LECTURE',
      '08:30',
      'Yes',
      ''
    ],
    [
      '',
      'Setting Up Developer Workspace & Tools',
      'LECTURE',
      '14:15',
      'No',
      ''
    ],
    [
      '',
      'Core Architectural Principles & System Design',
      'ARTICLE',
      '05:00',
      'No',
      '# Core Architectural Principles\n\nWelcome to this written lecture. Here we break down the key concepts with structured explanations, headings, and examples.\n\n## 1. Core Principles\n\nExplain the foundational theory or architecture here:\n- Key principle A\n- Key principle B\n\n> 💡 **Instructor Tip:** Highlight critical best practices, edge cases, or industry standards for students.\n\n## 2. Practical Examples & Implementation\n\nDetail the exact workflow or implementation steps:\n1. Step 1: Initial setup\n2. Step 2: Implementation details\n3. Step 3: Verification\n\n---\n\n## Summary\n\nSummarize the key takeaways and preview what comes next in the curriculum.'
    ],
    [
      '',
      'Module 1 Knowledge Assessment',
      'QUIZ',
      '10:00',
      'No',
      ''
    ],
    [
      'Frontend Engineering with React 19',
      'Server Components & Dynamic Routing in Next.js',
      'LECTURE',
      '18:45',
      'No',
      ''
    ],
    [
      '',
      'Building Responsive Master Layouts with Tailwind CSS',
      'LECTURE',
      '22:10',
      'No',
      ''
    ],
    [
      '',
      'State Management & Custom Hooks Guide',
      'ARTICLE',
      '05:00',
      'No',
      '# State Management Guide\nDetailed explanation of modern React 19 state patterns with practical code examples and edge cases.'
    ],
    [
      'Backend APIs & Database Architecture',
      'Relational Database Modeling with PostgreSQL & Prisma',
      'LECTURE',
      '25:30',
      'No',
      ''
    ],
    [
      '',
      'Database Schema Reference Cheatsheet',
      'ARTICLE',
      '05:00',
      'No',
      '# Database Schema Cheatsheet\nPostgreSQL table schemas, relationships, indexing rules, and migration best practices.'
    ]
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
        else if (cIdx === 5) wsCurriculum[cellRef].s = styles.cellNormal;
      }
    }
  });

  wsCurriculum['!cols'] = [
    { wch: 42 }, // Module Title
    { wch: 48 }, // Topic / Lesson Title
    { wch: 36 }, // Content Type
    { wch: 20 }, // Duration
    { wch: 24 }, // Free Preview
    { wch: 65 }  // Article Content
  ];
  XLSX.utils.book_append_sheet(wb, wsCurriculum, 'Curriculum');

  // 3. Quizzes & MCQs Sheet Data
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
      'Passing Score (%)'
    ],
    [
      'Module 1',
      'Web Architecture & Modern AI Assessment',
      1,
      'What protocol provides encrypted communication over the World Wide Web?',
      'HTTP',
      'HTTPS',
      'FTP',
      'SMTP',
      'B',
      'HTTPS encrypts communication between the client browser and web server using TLS/SSL.',
      70
    ],
    [
      '',
      '',
      2,
      'Which JavaScript engine powers Google Chrome and Node.js runtime?',
      'SpiderMonkey',
      'JavaScriptCore',
      'V8 Engine',
      'Chakra',
      'C',
      'Google open-source V8 engine compiles JavaScript directly to native machine code.',
      70
    ],
    [
      'Module 2',
      'Next.js & React 19 Component Test',
      1,
      'In React, which built-in hook is used to declare and manage local component state?',
      'useEffect',
      'useState',
      'useRef',
      'useContext',
      'B',
      'useState is the standard React hook for managing stateful values in functional components.',
      70
    ],
    [
      '',
      '',
      2,
      'Which hook is used for executing side effects like API fetching or subscriptions?',
      'useEffect',
      'useMemo',
      'useCallback',
      'useReducer',
      'A',
      'useEffect manages lifecycle side effects in React function components.',
      70
    ],
    [
      'Module 3',
      'Database & API Architecture Quiz',
      1,
      'Which database language is primarily used for defining and querying relational databases?',
      'HTML',
      'CSS',
      'SQL',
      'JSON',
      'C',
      'SQL (Structured Query Language) is the standard query language for relational databases like PostgreSQL.',
      70
    ],
    [
      '',
      '',
      2,
      'Which SQL clause is used to filter records based on a specific condition?',
      'WHERE',
      'ORDER BY',
      'GROUP BY',
      'SELECT',
      'A',
      'The WHERE clause filters rows satisfying given Boolean conditions.',
      70
    ]
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
        else if (cIdx === 10) wsQuizzes[cellRef].s = styles.centerNormal;
      }
    }
  });

  wsQuizzes['!cols'] = [
    { wch: 22 }, // Module
    { wch: 35 }, // Quiz Title
    { wch: 8 },  // Q#
    { wch: 75 }, // Question Text
    { wch: 26 }, // Option A
    { wch: 26 }, // Option B
    { wch: 26 }, // Option C
    { wch: 26 }, // Option D
    { wch: 26 }, // Correct Option
    { wch: 65 }, // Explanation
    { wch: 18 }  // Passing Score (%)
  ];
  XLSX.utils.book_append_sheet(wb, wsQuizzes, 'Quizzes & MCQs');

  // 4. User Guide & Format Instructions Sheet
  const guideAOA: any[][] = [
    [
      'Step / Important Topic',
      'Kaise Update Karein (Easy Step-by-Step Instructions in Hinglish & English)'
    ],
    [
      '📌 STEP 1: Course Details Fill Karna',
      '1. "Course Details" tab me jayein.\n2. Apne course ka Title, Category, Language, Skill Level aur Price fill karein.\n3. Sabhi important topics BOLD me diye gaye hain aur zaroori fields ke aage "REQUIRED" status likha hai.\n4. "What Students Will Learn", "Prerequisites", aur "Target Audience" me har point ko semicolon (;) se separate karein.'
    ],
    [
      '🎥 STEP 2: Curriculum (LECTURE vs ARTICLE vs QUIZ)',
      'Curriculum tab me har topic ka "Content Type" chunein:\n• LECTURE: Video lectures ke liye. (Isme sirf title likhein; video file upload agle step me Studio me hoga).\n• ARTICLE: Written notes / reading content ke liye. (Aap column F me seedha markdown content headings ke sath likh sakte hain).\n• QUIZ: Objective MCQs ke liye. (Questions "Quizzes & MCQs" tab me likhein).'
    ],
    [
      '📁 STEP 3: Module Name Baar-Baar Likhne Ki Zaroorat Nahi',
      'Module Title sirf pehli row par likhein. Uske neeche jitne bhi lectures/articles/quizzes aayenge, unka Module Title BLANK chhod dein! System unhe automatically usi module ke andar group kar dega. Jab naya module shuru ho, tabhi naya Module Title likhein.'
    ],
    [
      '🚫 STEP 4: Titles Me "Lecture 1:" Ya "Module 1:" Prefix Na Likhein',
      'Title me "Module 1:" ya "Lecture 1:" prefix na likhein. LMS system automatically sabhi modules (Module 1, Module 2) aur lectures/articles (Lecture 1, Lecture 2, Article 1, Article 2) ko continuous numbering de deta hai!'
    ],
    [
      '❓ STEP 5: Quizzes & MCQs Aasaani Se Add Karna',
      '"Quizzes & MCQs" tab me ek quiz ke pehle question par Module Name aur Quiz Title likhein. Usi quiz ke baaki questions ke liye Module aur Quiz Title BLANK chhod dein. Vo automatically usi quiz me add ho jayenge. Correct Option me sirf A, B, C, ya D likhein.'
    ],
    [
      '🚀 STEP 6: Excel File Save Karke Upload Karein',
      'Apni details fill karne ke baad Excel file (.xlsx) ko save karein. Fir LMS Course Builder me "Upload Excel" button par click karke upload karein. Aapka poora course, syllabus, articles aur quizzes instant create ho jayenge!'
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
    { wch: 100 } // Easy Instructions
  ];
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
          'content type (lecture / article / quiz) *',
          'content type (lecture / article / quiz)',
          'content type',
          'lesson type (lecture / article / quiz)',
          'lesson type',
          'lecture type (video/pdf/quiz)',
          'lecture type',
          'type',
          'format'
        ], 'type') || 'LECTURE';
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
          // Check if this module already exists by title or raw key
          const existing = sections.find((s) => {
            if (cleanedModTitle && s.title.toLowerCase().trim() === cleanedModTitle.toLowerCase().trim()) return true;
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
          const isQuiz = /quiz/i.test(lessonTypeRaw) || /quiz/i.test(rawLessonTitle);
          const isText = /article|text|written|reading|note/i.test(lessonTypeRaw);
          const isPdf = /pdf|doc|file|handout/i.test(lessonTypeRaw);

          const finalLessonTitle = isQuiz
            ? (cleanQuizTitle(rawLessonTitle) || '')
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
            description: lessonDesc || '',
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

      sections.forEach((s) => {
        delete (s as any)._rawModKey;
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

      let activeSection: BuilderSection | null = null;
      let activeQuizLesson: BuilderLesson | null = null;

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

        // 1. Resolve Target Module / Section:
        if (moduleIdentifier) {
          let foundSection: BuilderSection | undefined;
          const numMatch = moduleIdentifier.match(/\d+/);
          if (numMatch) {
            const modIndex = parseInt(numMatch[0], 10) - 1;
            if (modIndex >= 0 && modIndex < sections.length) {
              foundSection = sections[modIndex];
            }
          }
          if (!foundSection) {
            foundSection = sections.find((s) =>
              s.title.toLowerCase().includes(moduleIdentifier.toLowerCase())
            );
          }
          if (!foundSection) {
            const newModNum = sections.length + 1;
            const cleanedSecTitle = cleanModuleTitle(moduleIdentifier);
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
        } else {
          // Module is BLANK on this row: inherit activeSection!
          if (!activeSection) {
            if (sections.length > 0) {
              activeSection = sections[0];
            } else {
              activeSection = {
                id: `sec-${Date.now()}-1-${Math.random().toString(36).substring(2, 6)}`,
                title: 'Foundations & Orientation',
                description: '',
                order: 1,
                lessons: []
              };
              sections.push(activeSection);
            }
          }
        }

        const secOrder = activeSection.order || 1;
        const cleanedQuizTitle = quizTitleRaw ? cleanQuizTitle(quizTitleRaw) : '';

        // 2. Resolve Target Quiz Lesson inside activeSection:
        if (quizTitleRaw) {
          // Explicit Quiz Title given on this row:
          let foundQuiz = activeSection.lessons.find((l) => {
            if (l.type !== 'QUIZ') return false;
            if (cleanedQuizTitle && l.title.toLowerCase().trim() === cleanedQuizTitle.toLowerCase().trim()) return true;
            if (l.title.toLowerCase().trim() === quizTitleRaw.toLowerCase().trim()) return true;
            return false;
          });

          if (!foundQuiz) {
            // Check if there is an empty QUIZ lesson created by curriculum with no questions yet
            foundQuiz = activeSection.lessons.find(
              (l) => l.type === 'QUIZ' && (!l.quizData || (l.quizData as any).questions?.length === 0)
            );
            if (foundQuiz) {
              foundQuiz.title = cleanedQuizTitle;
            }
          }

          if (!foundQuiz) {
            foundQuiz = {
              id: `les-${Date.now()}-${secOrder}-${activeSection.lessons.length + 1}-${Math.random().toString(36).substring(2, 6)}`,
              title: cleanedQuizTitle,
              description: `Assessment for Module ${secOrder}`,
              type: 'QUIZ',
              duration: '10:00',
              durationSeconds: 600,
              isFree: false,
              isPublished: true,
              order: activeSection.lessons.length + 1,
              quizData: {
                questions: [],
                passingScore: passScoreRaw ? parseInt(passScoreRaw, 10) || 70 : 70,
                attemptLimit: 0
              },
              subLessons: []
            };
            activeSection.lessons.push(foundQuiz);
          }

          activeQuizLesson = foundQuiz;
        } else {
          // Quiz Title is BLANK on this row: inherit activeQuizLesson!
          if (!activeQuizLesson || !activeSection.lessons.some((l) => l.id === activeQuizLesson!.id)) {
            activeQuizLesson = activeSection.lessons.find((l) => l.type === 'QUIZ') || null;
            if (!activeQuizLesson) {
              activeQuizLesson = {
                id: `les-${Date.now()}-${secOrder}-${activeSection.lessons.length + 1}-${Math.random().toString(36).substring(2, 6)}`,
                title: '',
                description: `Assessment for Module ${secOrder}`,
                type: 'QUIZ',
                duration: '10:00',
                durationSeconds: 600,
                isFree: false,
                isPublished: true,
                order: activeSection.lessons.length + 1,
                quizData: {
                  questions: [],
                  passingScore: passScoreRaw ? parseInt(passScoreRaw, 10) || 70 : 70,
                  attemptLimit: 0
                },
                subLessons: []
              };
              activeSection.lessons.push(activeQuizLesson);
            }
          }
        }

        const quizLesson = activeQuizLesson;

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

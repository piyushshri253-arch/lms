import { mergeExcelSectionsForUpdateVersion, ensureFinalAssessmentAtEnd, sortSectionLessons } from '../src/lib/course-excel';
import { BuilderSection, BuilderLesson } from '../src/components/course-builder/CourseCurriculumStep';

console.log('================================================================');
console.log('🧪 TEST: Auto-save Excel Replace & State Reconciliation (Mode B)');
console.log('================================================================\n');

// 1. Initial 6-Module Live Course in Database
const initial6ModuleCourse: BuilderSection[] = Array.from({ length: 6 }, (_, i) => {
  const mNum = i + 1;
  const lessons: BuilderLesson[] = [
    {
      id: `les-db-${mNum}-1`,
      clientKey: `les-db-${mNum}-1`,
      title: `Lecture ${mNum * 2 - 1}: Topic A`,
      type: 'VIDEO',
      videoUrl: `https://vimeo.com/video-${mNum * 2 - 1}`,
      order: 1
    },
    {
      id: `les-db-${mNum}-2`,
      clientKey: `les-db-${mNum}-2`,
      title: `Lecture ${mNum * 2}: Topic B`,
      type: 'VIDEO',
      videoUrl: `https://vimeo.com/video-${mNum * 2}`,
      order: 2
    },
    {
      id: `les-db-${mNum}-quiz`,
      clientKey: `les-db-${mNum}-quiz`,
      title: `Module ${mNum} Quiz`,
      type: 'QUIZ',
      quizData: {
        passingScore: 70,
        attemptLimit: 0,
        questions: [{ id: `q-${mNum}`, question: `Q for mod ${mNum}`, options: ['A', 'B'], correctIndex: 0, explanation: '', points: 1 }]
      },
      order: 3
    }
  ];

  // In a 6-module course, Module 6 had the Final Assessment
  if (mNum === 6) {
    lessons.push({
      id: 'les-db-old-final',
      clientKey: 'les-db-old-final',
      title: 'Final Assessment',
      type: 'QUIZ',
      isFinalAssignment: true,
      quizData: {
        passingScore: 70,
        attemptLimit: 0,
        questions: Array.from({ length: 8 }, (_, qIdx) => ({
          id: `q-old-final-${qIdx + 1}`,
          question: `Old Final Q${qIdx + 1}`,
          options: ['A', 'B'],
          correctIndex: 0,
          explanation: '',
          points: 1
        }))
      },
      order: 4
    });
  }

  return {
    id: `sec-db-${mNum}`,
    clientKey: `sec-db-${mNum}`,
    title: `Module ${mNum}: Core Fundamentals ${mNum}`,
    order: mNum,
    lessons
  };
});

// 2. Newly uploaded Excel Workbook: 8 Modules, Article added to Module 6, Final Exam in Module 8
const excelParsedSections: BuilderSection[] = Array.from({ length: 8 }, (_, i) => {
  const mNum = i + 1;
  const lessons: BuilderLesson[] = [
    {
      id: `parsed-les-${mNum}-1`,
      title: `Lecture ${mNum * 2 - 1}: Topic A`,
      type: 'VIDEO',
      order: 1
    },
    {
      id: `parsed-les-${mNum}-2`,
      title: `Lecture ${mNum * 2}: Topic B`,
      type: 'VIDEO',
      order: 2
    }
  ];

  // Article added to Module 6
  if (mNum === 6) {
    lessons.push({
      id: `parsed-les-6-article`,
      title: 'Article 1: Advanced Industry Deep Dive',
      type: 'TEXT',
      content: '<h1>Comprehensive Guide to Industry Practices</h1><p>Detailed architectural notes...</p>',
      order: 3
    });
  }

  // Regular quiz for module
  lessons.push({
    id: `parsed-les-${mNum}-quiz`,
    title: `Module ${mNum} Quiz`,
    type: 'QUIZ',
    quizData: {
      passingScore: 70,
      attemptLimit: 0,
      questions: [{ id: `parsed-q-${mNum}`, question: `Q for mod ${mNum}`, options: ['A', 'B'], correctIndex: 0, explanation: '', points: 1 }]
    },
    order: lessons.length + 1
  });

  // Final Assessment is placed strictly in Module 8 (the last module)
  if (mNum === 8) {
    lessons.push({
      id: 'parsed-final-exam',
      title: 'Final Assessment',
      type: 'QUIZ',
      isFinalAssignment: true,
      quizData: {
        passingScore: 70,
        attemptLimit: 0,
        questions: Array.from({ length: 10 }, (_, qIdx) => ({
          id: `parsed-final-q-${qIdx + 1}`,
          question: `Authoritative Final Q${qIdx + 1}`,
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
          explanation: '',
          points: 1
        }))
      },
      order: lessons.length + 1
    });
  }

  return {
    id: `parsed-sec-${mNum}`,
    title: `Module ${mNum}: Core Fundamentals ${mNum}`,
    order: mNum,
    lessons
  };
});

// 3. User imports Excel in Update Version (Mode B)
const mergedCurriculum = mergeExcelSectionsForUpdateVersion(initial6ModuleCourse, excelParsedSections);

console.log('--- Step 1: Excel Import State (0 to ~3.5 seconds) ---');
console.log(`Total Modules: ${mergedCurriculum.length}`);
const mod6AfterImport = mergedCurriculum[5];
console.log(`Module 6 Lessons Count: ${mod6AfterImport.lessons.length}`);
console.log('Module 6 Lessons:');
mod6AfterImport.lessons.forEach((l, idx) => {
  console.log(`  [${idx + 1}] Title: "${l.title}" | Type: ${l.type} | isFinalAssignment: ${Boolean(l.isFinalAssignment)}`);
});

const mod6Article = mod6AfterImport.lessons.find((l) => l.type === 'TEXT');
if (!mod6Article || mod6Article.title !== 'Article 1: Advanced Industry Deep Dive') {
  throw new Error('FAILED: Module 6 did not contain the newly added article upon Excel import!');
}
const mod6Quizzes = mod6AfterImport.lessons.filter((l) => l.type === 'QUIZ');
if (mod6Quizzes.length !== 1) {
  throw new Error(`FAILED: Expected exactly 1 quiz in Module 6 upon Excel import, got ${mod6Quizzes.length}`);
}
console.log('✅ PASS: Excel import state is completely correct (Article added, exactly 1 quiz in Module 6).\n');

// 4. Background Auto-Save triggers: Payload is sent to PUT /api/courses/[slug]
console.log('--- Step 2: Auto-save Server PUT & Client Reconciliation (~3.5 - 5 seconds) ---');

// Simulate Server DB Processing:
// In Section 6, the server updates existing lessons, creates the Article with new cuid, and deletes old final exam
const serverSection6Lessons = [
  { id: 'les-db-6-1', title: 'Lecture 11: Topic A', type: 'VIDEO', videoUrl: 'https://vimeo.com/video-11', order: 1 },
  { id: 'les-db-6-2', title: 'Lecture 12: Topic B', type: 'VIDEO', videoUrl: 'https://vimeo.com/video-12', order: 2 },
  { id: 'cuid-server-art-6', title: 'Article 1: Advanced Industry Deep Dive', type: 'TEXT', content: '<h1>Comprehensive Guide to Industry Practices</h1><p>Detailed architectural notes...</p>', order: 3 },
  { id: 'les-db-6-quiz', title: 'Module 6 Quiz', type: 'QUIZ', quizData: JSON.stringify({ questions: [{ question: 'Q for mod 6', options: ['A', 'B'], correctIndex: 0 }] }), order: 4 }
];

// Simulate responseData returned by server to page.tsx
const serverResponseSections = mergedCurriculum.map((sec, sIdx) => {
  if (sIdx === 5) {
    return { ...sec, id: 'sec-db-6', lessons: serverSection6Lessons };
  }
  return {
    ...sec,
    id: sec.id.startsWith('sec-') ? sec.id : `cuid-sec-${sIdx + 1}`,
    lessons: sec.lessons.map((l, lIdx) => ({
      ...l,
      id: l.id.startsWith('les-db-') ? l.id : `cuid-les-${sIdx + 1}-${lIdx + 1}`,
      quizData: typeof l.quizData === 'object' ? JSON.stringify(l.quizData) : l.quizData
    }))
  };
});

// Now test our NEW post-save client reconciliation algorithm from page.tsx:
const cleanT = (t?: string | null) =>
  (t || '')
    .toLowerCase()
    .replace(/^(?:lecture|article|quiz|assessment|module|sec|section)[\s:\-\._\d]*/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

const syncedSections: BuilderSection[] = serverResponseSections.map((s: any, sIdx: number) => {
  const localSec = mergedCurriculum[sIdx];
  const serverLessonIds = new Set((s.lessons || []).map((l: any) => l.id));
  const syncedLocalLesIds = new Set<string>();
  const matchedLocalIndices = new Set<number>();

  const mappedLessons = (s.lessons || []).map((l: any, lIdx: number) => {
    // 1. Try exact ID, clientKey, or tempId match
    let localIdx = (localSec?.lessons || []).findIndex((les, idx) =>
      !matchedLocalIndices.has(idx) && (
        les.id === l.id ||
        (les.clientKey && (les.clientKey === l.id || les.clientKey === l.clientKey)) ||
        (les.tempId && (les.tempId === l.id || les.tempId === l.tempId))
      )
    );

    // 2. If no ID match, match by SAME TYPE and matching clean title
    if (localIdx === -1 && l.title) {
      const sTitleKey = cleanT(l.title);
      if (sTitleKey.length >= 3) {
        localIdx = (localSec?.lessons || []).findIndex((les, idx) =>
          !matchedLocalIndices.has(idx) &&
          les.type === l.type &&
          cleanT(les.title) === sTitleKey
        );
      }
    }

    // 3. Fallback: match by SAME TYPE among unmatched lessons in order
    // STRICT GUARD: Never match a QUIZ server lesson with a TEXT local lesson, or vice-versa!
    if (localIdx === -1) {
      localIdx = (localSec?.lessons || []).findIndex((les, idx) =>
        !matchedLocalIndices.has(idx) && les.type === l.type
      );
    }

    const localLes = localIdx !== -1 ? localSec?.lessons?.[localIdx] : undefined;
    if (localIdx !== -1) {
      matchedLocalIndices.add(localIdx);
      if (localLes?.id) syncedLocalLesIds.add(localLes.id);
      if (localLes?.clientKey) syncedLocalLesIds.add(localLes.clientKey);
      if (localLes?.tempId) syncedLocalLesIds.add(localLes.tempId);
    }

    // Lesson Type: The server's lesson type is authoritative unless local has matching type
    const resolvedType = l.type || localLes?.type || 'VIDEO';

    // Preserve any in-flight edits
    const resolvedTitle = (localLes?.title !== undefined && localLes?.type === resolvedType)
      ? localLes.title
      : (l.title || '');
    const resolvedContent = (resolvedType === 'TEXT' && localLes?.content !== undefined)
      ? localLes.content
      : (l.content || '');
    const resolvedDescription = (localLes?.description !== undefined && localLes?.type === resolvedType)
      ? localLes.description
      : (l.description || '');

    // Quiz Data: STRICTLY null for TEXT, VIDEO, PDF! Never allow quiz data to corrupt an Article!
    let resolvedQuizData: any = null;
    if (resolvedType === 'QUIZ') {
      resolvedQuizData = localLes?.quizData || null;
      if (!resolvedQuizData && l.quizData) {
        resolvedQuizData = typeof l.quizData === 'string'
          ? (() => { try { return JSON.parse(l.quizData); } catch { return null; } })()
          : l.quizData;
      }
    }

    const lessonClientKey = localLes?.clientKey || localLes?.tempId || (localLes?.id?.startsWith('les-') ? localLes.id : undefined) || l.clientKey || l.id;
    const lessonTempId = localLes?.id?.startsWith('les-') ? localLes.id : ((localLes as any)?.tempId || lessonClientKey);

    const isFinalAssignment = Boolean(
      resolvedType === 'QUIZ' && (
        localLes?.isFinalAssignment ||
        l.isFinalAssignment ||
        /final\s*(assessment|assignment|exam)/i.test(resolvedTitle)
      )
    );

    return {
      id: l.id,
      clientKey: lessonClientKey,
      tempId: lessonTempId,
      title: resolvedTitle,
      description: resolvedDescription,
      type: resolvedType,
      content: resolvedContent,
      videoUrl: localLes?.videoUrl || l.videoUrl || '',
      videoFileName: l.videoFileName,
      resourceFileName: l.resourceFileName,
      resourcesList: l.resourcesList,
      pdfUrl: l.pdfUrl || '',
      fileUrl: l.fileUrl || '',
      quizData: resolvedQuizData,
      subLessons: l.subLessons || [],
      duration: localLes?.duration || l.duration || '10:00',
      durationSeconds: localLes?.durationSeconds || l.durationSeconds || 600,
      isFree: localLes?.isFree !== undefined ? Boolean(localLes.isFree) : Boolean(l.isFree),
      isFinalAssignment,
      isPublished: l.isPublished !== false,
      order: l.order || lIdx + 1
    };
  });

  const pendingLocalLessons = (localSec?.lessons || []).filter((les, idx) => {
    if (matchedLocalIndices.has(idx)) return false;
    if (syncedLocalLesIds.has(les.id)) return false;
    if (les.clientKey && syncedLocalLesIds.has(les.clientKey)) return false;
    if (les.tempId && syncedLocalLesIds.has(les.tempId)) return false;
    return !serverLessonIds.has(les.id) && !(les.clientKey && serverLessonIds.has(les.clientKey));
  });

  return {
    id: s.id,
    clientKey: localSec?.clientKey || s.id,
    tempId: localSec?.tempId || s.id,
    title: localSec?.title !== undefined ? localSec.title : (s.title || `Module ${sIdx + 1}`),
    description: localSec?.description !== undefined ? localSec.description : (s.description || ''),
    order: s.order || sIdx + 1,
    lessons: sortSectionLessons([...mappedLessons, ...pendingLocalLessons])
  };
});

const finalReconciledCurriculum = ensureFinalAssessmentAtEnd(syncedSections);

console.log('--- Step 3: Verified Post-Save State (After 5 Seconds) ---');
console.log(`Total Modules After Auto-Save: ${finalReconciledCurriculum.length}`);
const mod6AfterSave = finalReconciledCurriculum[5];
console.log(`Module 6 Lessons Count: ${mod6AfterSave.lessons.length}`);
console.log('Module 6 Lessons:');
mod6AfterSave.lessons.forEach((l, idx) => {
  console.log(`  [${idx + 1}] Title: "${l.title}" | Type: ${l.type} | isFinalAssignment: ${Boolean(l.isFinalAssignment)} | ContentLen: ${l.content?.length || 0}`);
});

// ASSERTIONS:
// 1. Article must be in Module 6 with type 'TEXT' and content intact
const savedArt = mod6AfterSave.lessons.find((l) => l.title === 'Article 1: Advanced Industry Deep Dive');
if (!savedArt) {
  throw new Error('FAILED: Article disappeared after auto-save!');
}
if (savedArt.type !== 'TEXT') {
  throw new Error(`FAILED: Article type was corrupted to "${savedArt.type}" instead of "TEXT"!`);
}
if (!savedArt.content || savedArt.content.length === 0) {
  throw new Error('FAILED: Article content was wiped after auto-save!');
}
if (savedArt.quizData !== null) {
  throw new Error('FAILED: Article has corrupted quizData attached!');
}

// 2. Module 6 must have strictly 1 Quiz (no double quiz)
const savedQuizzesInMod6 = mod6AfterSave.lessons.filter((l) => l.type === 'QUIZ');
if (savedQuizzesInMod6.length !== 1) {
  throw new Error(`FAILED: Expected exactly 1 quiz in Module 6 after auto-save, got ${savedQuizzesInMod6.length} (Double Quiz Bug!)`);
}
if (savedQuizzesInMod6[0].title !== 'Module 6 Quiz') {
  throw new Error(`FAILED: Module 6 Quiz title unexpected: "${savedQuizzesInMod6[0].title}"`);
}
if (savedQuizzesInMod6[0].isFinalAssignment) {
  throw new Error('FAILED: Module 6 Quiz was wrongly marked as isFinalAssignment!');
}

// 3. Module 8 (last module) must have the authoritative Final Assessment
const mod8AfterSave = finalReconciledCurriculum[7];
const mod8FinalAssmt = mod8AfterSave.lessons.find((l) => l.isFinalAssignment);
if (!mod8FinalAssmt) {
  throw new Error('FAILED: Final Assessment is missing from Module 8!');
}
if (mod8FinalAssmt.title !== 'Final Assessment') {
  throw new Error(`FAILED: Final Assessment title is "${mod8FinalAssmt.title}"`);
}

// 4. Ensure no other module has a final assessment
const totalFinalAssessments = finalReconciledCurriculum.flatMap((s) => s.lessons).filter((l) => l.isFinalAssignment);
if (totalFinalAssessments.length !== 1) {
  throw new Error(`FAILED: Expected exactly 1 Final Assessment across course, found ${totalFinalAssessments.length} (Double Final Assessment Bug!)`);
}

console.log('\n================================================================');
console.log('🎉 ALL AUTO-SAVE RECONCILIATION CHECKS PASSED 100% PERFECTLY!');
console.log('   - Article remains in Module 6 with type "TEXT" and content intact.');
console.log('   - Exactly 1 Quiz in Module 6 (Double Quiz eliminated).');
console.log('   - Exactly 1 Final Assessment in Module 8 (Double Assessment eliminated).');
console.log('   - Total modules: 8 modules.');
console.log('================================================================\n');

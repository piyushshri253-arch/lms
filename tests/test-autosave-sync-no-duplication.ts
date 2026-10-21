import assert from 'assert';

console.log('🧪 Starting Test: Builder Auto-Save Sync & Module Duplication Guard...\n');

// Mock data representing 5 sections parsed from an Excel upload
const excelUploadedSections = [
  {
    id: `sec-${Date.now()}-1`,
    clientKey: `sec-${Date.now()}-1`,
    tempId: `sec-${Date.now()}-1`,
    title: 'Module 1: Introduction to Web Dev',
    order: 1,
    lessons: [
      { id: `les-${Date.now()}-1-1`, title: '1.1 Welcome', type: 'VIDEO', order: 1 }
    ]
  },
  {
    id: `sec-${Date.now()}-2`,
    clientKey: `sec-${Date.now()}-2`,
    tempId: `sec-${Date.now()}-2`,
    title: 'Module 2: HTML & Semantic Tags',
    order: 2,
    lessons: [
      { id: `les-${Date.now()}-2-1`, title: '2.1 HTML Basics', type: 'VIDEO', order: 1 }
    ]
  },
  {
    id: `sec-${Date.now()}-3`,
    clientKey: `sec-${Date.now()}-3`,
    tempId: `sec-${Date.now()}-3`,
    title: 'Module 3: Modern CSS & Flexbox',
    order: 3,
    lessons: [
      { id: `les-${Date.now()}-3-1`, title: '3.1 CSS Selectors', type: 'VIDEO', order: 1 }
    ]
  },
  {
    id: `sec-${Date.now()}-4`,
    clientKey: `sec-${Date.now()}-4`,
    tempId: `sec-${Date.now()}-4`,
    title: 'Module 4: JavaScript Fundamentals',
    order: 4,
    lessons: [
      { id: `les-${Date.now()}-4-1`, title: '4.1 Variables & Functions', type: 'VIDEO', order: 1 }
    ]
  },
  {
    id: `sec-${Date.now()}-5`,
    clientKey: `sec-${Date.now()}-5`,
    tempId: `sec-${Date.now()}-5`,
    title: 'Module 5: Final Assessment',
    order: 5,
    lessons: [
      { id: `les-${Date.now()}-5-1`, title: 'Final Assessment', type: 'QUIZ', isFinalAssignment: true, order: 1 }
    ]
  }
];

// Mock server response after PostgreSQL saves the course sections
const serverResponseSections = excelUploadedSections.map((sec, idx) => ({
  id: `cm7a_db_sec_${idx + 1}`,
  title: sec.title,
  order: idx + 1,
  lessons: sec.lessons.map((les, lIdx) => ({
    id: `cm7a_db_les_${idx + 1}_${lIdx + 1}`,
    title: les.title,
    type: les.type,
    order: lIdx + 1
  }))
}));

// Function simulating the builder sync logic (as implemented in builder/page.tsx)
function syncServerSectionsWithLocal(
  currentStateSections: any[],
  serverSections: any[]
) {
  const serverSectionIds = new Set(serverSections.map((s: any) => s.id));
  const syncedLocalSecIds = new Set<string>();

  const syncedSections = serverSections.map((s: any, sIdx: number) => {
    const localSec = (currentStateSections || []).find((sec) =>
      sec.id === s.id ||
      (sec.clientKey && sec.clientKey === s.id) ||
      (sec.tempId && sec.tempId === s.id)
    ) || currentStateSections?.[sIdx];

    if (localSec?.id) syncedLocalSecIds.add(localSec.id);
    if (localSec?.clientKey) syncedLocalSecIds.add(localSec.clientKey);
    if (localSec?.tempId) syncedLocalSecIds.add(localSec.tempId);

    const serverLessonIds = new Set((s.lessons || []).map((l: any) => l.id));
    const syncedLocalLesIds = new Set<string>();

    const mappedLessons = (s.lessons || []).map((l: any, lIdx: number) => {
      const localLes = localSec?.lessons?.find((les: any) =>
        les.id === l.id ||
        (les.clientKey && les.clientKey === l.id) ||
        (les.tempId && les.tempId === l.id)
      ) || localSec?.lessons?.[lIdx];

      if (localLes?.id) syncedLocalLesIds.add(localLes.id);
      if (localLes?.clientKey) syncedLocalLesIds.add(localLes.clientKey);
      if (localLes?.tempId) syncedLocalLesIds.add(localLes.tempId);

      return {
        id: l.id,
        title: localLes?.title || l.title,
        type: localLes?.type || l.type,
        order: l.order || lIdx + 1
      };
    });

    const pendingLocalLessons = (localSec?.lessons || []).filter((les: any, idx: number) => {
      if (idx < (s.lessons || []).length) return false;
      if (syncedLocalLesIds.has(les.id)) return false;
      if (les.clientKey && syncedLocalLesIds.has(les.clientKey)) return false;
      if (les.tempId && syncedLocalLesIds.has(les.tempId)) return false;
      return !serverLessonIds.has(les.id) && !(les.clientKey && serverLessonIds.has(les.clientKey));
    });

    return {
      id: s.id,
      title: localSec?.title || s.title,
      order: s.order || sIdx + 1,
      lessons: [...mappedLessons, ...pendingLocalLessons]
    };
  });

  const pendingLocalSections = (currentStateSections || []).filter((sec: any, sIdx: number) => {
    if (sIdx < serverSections.length) return false;
    if (syncedLocalSecIds.has(sec.id)) return false;
    if (sec.clientKey && syncedLocalSecIds.has(sec.clientKey)) return false;
    if (sec.tempId && syncedLocalSecIds.has(sec.tempId)) return false;
    return !serverSectionIds.has(sec.id) && sec.id.startsWith('sec-');
  });

  return [...syncedSections, ...pendingLocalSections];
}

// -------------------------------------------------------------
// Test 1: Excel upload with 5 modules after auto-save sync
// -------------------------------------------------------------
console.log('📌 Test 1: Excel upload of 5 modules after auto-save sync');
const resultSections1 = syncServerSectionsWithLocal(excelUploadedSections, serverResponseSections);

console.log(`  Initial modules: ${excelUploadedSections.length}`);
console.log(`  Synced modules count: ${resultSections1.length}`);
assert.strictEqual(
  resultSections1.length,
  5,
  `Expected 5 modules, got ${resultSections1.length} (Duplication detected!)`
);
console.log('  ✅ PASS: 5 modules remain exactly 5 modules (No duplication to 10!)');

// -------------------------------------------------------------
// Test 2: Consecutive auto-save sync (second auto-save tick)
// -------------------------------------------------------------
console.log('\n📌 Test 2: Second auto-save tick with already synced DB sections');
const resultSections2 = syncServerSectionsWithLocal(resultSections1, serverResponseSections);
assert.strictEqual(
  resultSections2.length,
  5,
  `Expected 5 modules on second sync, got ${resultSections2.length}`
);
console.log('  ✅ PASS: Second auto-save maintains exactly 5 modules');

// -------------------------------------------------------------
// Test 3: User adds a genuinely new 6th module while auto-save is in flight
// -------------------------------------------------------------
console.log('\n📌 Test 3: In-flight addition of a new 6th module');
const sectionsWithNewLocal = [
  ...excelUploadedSections,
  {
    id: `sec-${Date.now()}-6`,
    title: 'Module 6: Advanced Bonus Module',
    order: 6,
    lessons: [{ id: `les-${Date.now()}-6-1`, title: '6.1 Bonus Lesson', type: 'VIDEO', order: 1 }]
  }
];

const resultSections3 = syncServerSectionsWithLocal(sectionsWithNewLocal, serverResponseSections);
assert.strictEqual(
  resultSections3.length,
  6,
  `Expected 6 modules (5 server + 1 new local), got ${resultSections3.length}`
);
assert.strictEqual(
  resultSections3[5].title,
  'Module 6: Advanced Bonus Module',
  'Newly added 6th module was not retained!'
);
console.log('  ✅ PASS: Truly new in-flight local module is safely retained without duplicating previous 5');

console.log('\n=============================================================');
console.log('🎉 ALL AUTO-SAVE DUPLICATION GUARD TESTS PASSED (100%)!');
console.log('=============================================================');

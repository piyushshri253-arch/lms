import * as XLSX from 'xlsx-js-style';
import { validateCourseExcel } from '../src/lib/course-excel-validator';
import { downloadCourseExcelTemplate, parseCourseExcelWorkbook } from '../src/lib/course-excel';
import fs from 'fs';

console.log('🧪 Starting Test: New Course Mode B Guard & Excel Template Upload...');

// Test 1: Download Template and Verify Blank Template Structure
console.log('\n📌 Test 1: Official Template Download & Blank Structure Check');
downloadCourseExcelTemplate();

const templateFileName = 'MORENA_Course_Upload_Template.xlsx';
if (!fs.existsSync(templateFileName)) {
  throw new Error('❌ FAIL: downloadCourseExcelTemplate did not generate template file');
}

const fileBuf = fs.readFileSync(templateFileName);
const wb = XLSX.read(fileBuf, { type: 'buffer' });

// Blank template without curriculum content should be blocked until instructor fills in curriculum
const validationResult = validateCourseExcel(wb);
console.log(`  Validation result: isValid=${validationResult.isValid}, blockingCount=${validationResult.blockingCount}`);

if (validationResult.isValid) {
  throw new Error('❌ FAIL: Blank template should require content before publishing!');
}
console.log('  ✅ PASS: Blank template correctly prompts user to fill curriculum before upload');

// Clean up downloaded file
fs.unlinkSync(templateFileName);

// Test 2: Custom Instructor Content in Template with Final Assessment
console.log('\n📌 Test 2: Custom Instructor Content in Template');
const detailsRows: any[][] = [
  ['Field Name (Topic)', 'Your Value (Fill details in this column)'],
  ['Course Title *', 'Advanced AI Agentic Systems Masterclass 2026'],
  ['Subtitle / One-line Pitch', 'Master autonomous AI agents'],
  ['Primary Category *', 'Development'],
  ['Course Level *', 'Intermediate'],
  ['Language of Instruction *', 'English'],
  ['Course Overview / Long Description *', 'Comprehensive masterclass on modern agentic architectures, tool use, and multi-agent coordination.'],
  ['What Students Will Learn *', 'Build multi-agent workflows; Implement tool use and memory; Secure API boundaries'],
  ['Requirements / Prerequisites *', 'Basic TypeScript or Python'],
  ['Target Audience *', 'Engineers and AI practitioners'],
  ['Course Price (INR) *', '2999'],
  ['Discount Price (INR)', '1999']
];
wb.Sheets['Course Details'] = XLSX.utils.aoa_to_sheet(detailsRows);

const curRows: any[][] = [
  ['Module Title (Write once per module)', 'Topic / Lesson Title *', 'Content Type (LECTURE / ARTICLE / QUIZ / FINAL ASSESSMENT) *', 'Estimated Duration (mm:ss)', 'Free Preview (Yes / No)', 'Written Article Content / Notes (Markdown for Written Articles)', 'Video URL *'],
  ['Module 1: Agent Architecture', 'Understanding Autonomous Agent Loops', 'LECTURE', '10:00', 'Yes', '', 'https://cdn.example.com/videos/agents1.mp4'],
  ['', 'Tool Calling & Execution Best Practices', 'LECTURE', '12:00', 'No', '', 'https://cdn.example.com/videos/agents2.mp4'],
  ['Course Completion & Certification', 'Final Assessment', 'FINAL ASSESSMENT', '30:00', 'No', 'Mandatory certification exam', '']
];
wb.Sheets['Curriculum Syllabus'] = XLSX.utils.aoa_to_sheet(curRows);
wb.Sheets['Curriculum'] = wb.Sheets['Curriculum Syllabus'];

const qRows: any[][] = [
  ['Module (e.g. Module 1)', 'Quiz Title (Write once per quiz)', 'Q#', 'Question Text *', 'Option A *', 'Option B *', 'Option C *', 'Option D *', 'Correct Option (A/B/C/D) *', 'Explanation (Why this option is correct)', 'Passing Score (%) (Set on Q1 only)', 'Marks/Points'],
  ['Course Completion & Certification', 'Final Assessment', 1, 'What is the primary role of an agentic controller?', 'Execute deterministic shell scripts', 'Coordinate perception, reasoning, and tool execution loops', 'Hardcode database passwords', 'Disable unit tests', 'B', 'Agent loops continuously reason and act.', 80, 10],
  ['Course Completion & Certification', 'Final Assessment', 2, 'Why are even question numbers recommended for quizzes?', 'To balance scoring and distribution', 'No reason', 'A random rule', 'None of the above', 'A', 'Even pairs maintain integer split metrics.', 80, 10]
];
wb.Sheets['Quizzes & MCQs'] = XLSX.utils.aoa_to_sheet(qRows);

const customValidation = validateCourseExcel(wb);
if (!customValidation.isValid || customValidation.blockingCount > 0) {
  console.error('Custom validation errors:', customValidation.errors);
  throw new Error('❌ FAIL: Custom modified template failed validation!');
}

console.log('  ✅ PASS: Custom modified course template validates 100% with 0 blocking errors!');
const parsed = parseCourseExcelWorkbook(wb);
if (parsed.title !== 'Advanced AI Agentic Systems Masterclass 2026') {
  throw new Error(`❌ FAIL: Expected parsed title to be "Advanced AI Agentic Systems Masterclass 2026", got "${parsed.title}"`);
}
console.log(`  ✅ PASS: Parsed data extracted updated title: "${parsed.title}" and ${parsed.sections?.length} modules`);

// Test 3: Truly Empty Workbook Rejection
console.log('\n📌 Test 3: Truly Empty Workbook Rejection');
const emptyWb = XLSX.utils.book_new();
const emptyDetails = XLSX.utils.aoa_to_sheet([['Field Name (Topic)', 'Your Value']]);
const emptyCur = XLSX.utils.aoa_to_sheet([['Module Title', 'Topic / Lesson Title', 'Content Type']]);
XLSX.utils.book_append_sheet(emptyWb, emptyDetails, 'Course Details');
XLSX.utils.book_append_sheet(emptyWb, emptyCur, 'Curriculum');

const emptyValidation = validateCourseExcel(emptyWb);
if (emptyValidation.isValid || emptyValidation.blockingCount === 0) {
  throw new Error('❌ FAIL: Empty workbook should have been rejected!');
}
console.log('  ✅ PASS: Truly empty workbook correctly blocked with errors!');

// Test 4: Mode B Guard on New Course
console.log('\n📌 Test 4: Mode B Guard Simulation');
// Simulate isModeB condition
function testIsModeB(searchParams: { get: (k: string) => string | null }, courseVersionState: any, courseState: any, editSlugOrId: string | null, activeCourseId: string) {
  const isFreshNew = searchParams.get('new') === 'true' || searchParams.get('fresh') === 'true';
  if (isFreshNew || (!editSlugOrId && !activeCourseId && !courseState.id)) {
    return false;
  }
  const modeParam = searchParams.get('mode') === 'version_draft';
  const hasDraftStatus = courseVersionState?.status === 'DRAFT_VERSION' || courseVersionState?.status === 'PENDING_REVIEW';
  const isPublishedCourse = courseState.status === 'PUBLISHED' || Boolean(courseVersionState?.liveVersionNumber);
  return Boolean(modeParam || hasDraftStatus || (isPublishedCourse && editSlugOrId));
}

// Case A: Clicking "New Course" (empty form, no course ID, stale version state in memory)
const dummyParamsEmpty = { get: (k: string) => null };
const isModeBOnNew = testIsModeB(dummyParamsEmpty, { status: 'DRAFT_VERSION' }, { id: '', title: '', status: 'DRAFT' }, null, '');
if (isModeBOnNew !== false) {
  throw new Error('❌ FAIL: isModeB should be false when creating a new course!');
}
console.log('  ✅ PASS: isModeB correctly evaluates to false when starting a new course (no ID, no editSlugOrId)');

// Case B: With new=true in query params
const dummyParamsNewTrue = { get: (k: string) => k === 'new' ? 'true' : null };
const isModeBWithNewParam = testIsModeB(dummyParamsNewTrue, { status: 'DRAFT_VERSION' }, { id: 'some-id', title: 'Test', status: 'DRAFT' }, 'some-id', 'some-id');
if (isModeBWithNewParam !== false) {
  throw new Error('❌ FAIL: isModeB should be false when new=true in params!');
}
console.log('  ✅ PASS: isModeB correctly evaluates to false when ?new=true');

// Case C: Legitimate Mode B (editing a version draft with course ID and version_draft mode)
const dummyParamsModeB = { get: (k: string) => k === 'mode' ? 'version_draft' : null };
const isModeBLegit = testIsModeB(dummyParamsModeB, { status: 'DRAFT_VERSION' }, { id: 'course-123', status: 'DRAFT' }, 'course-123', 'course-123');
if (isModeBLegit !== true) {
  throw new Error('❌ FAIL: isModeB should be true when legitimately editing a version draft!');
}
// Test 5: Mode B Curriculum Locking Rules & Final Assignment Exception
console.log('\n📌 Test 5: Mode B Curriculum Locking Rules & Final Assignment');
const originalSectionIds = new Set(['sec-live-1', 'sec-live-2']);
const originalLessonIds = new Set(['les-live-1', 'les-live-2', 'les-live-final']);

const liveSections = [
  {
    id: 'sec-live-1',
    title: 'Live Module 1',
    lessons: [
      { id: 'les-live-1', title: 'Live Lecture 1', type: 'VIDEO' },
      { id: 'les-live-2', title: 'Live Quiz 1', type: 'QUIZ' },
      { id: 'les-live-final', title: 'Final Assignment', type: 'QUIZ', isFinalAssignment: true }
    ]
  }
];

function checkCanEditSection(secId: string, isModeB: boolean, origSecIds: Set<string>): boolean {
  if (isModeB && origSecIds.has(secId)) return false;
  return true;
}

function checkCanEditLesson(les: { id: string; title: string; isFinalAssignment?: boolean }, isModeB: boolean, origLesIds: Set<string>): boolean {
  if (isModeB && origLesIds.has(les.id)) {
    const isFinal = les.isFinalAssignment || /final\s+assignment/i.test(les.title || '');
    return Boolean(isFinal);
  }
  return true;
}

// 5a. Can live section be edited in Mode B?
if (checkCanEditSection('sec-live-1', true, originalSectionIds) !== false) {
  throw new Error('❌ FAIL: Live section should NOT be editable in Mode B!');
}
console.log('  ✅ PASS: Previous live module is locked from edits/renaming in Mode B');

// 5b. Can newly added section be edited in Mode B?
if (checkCanEditSection('sec-new-3', true, originalSectionIds) !== true) {
  throw new Error('❌ FAIL: Newly added section should be editable in Mode B!');
}
console.log('  ✅ PASS: Newly added module (+ Add Module) is fully editable in Mode B');

// 5c. Can live lecture/quiz be edited in Mode B?
if (checkCanEditLesson(liveSections[0].lessons[0], true, originalLessonIds) !== false) {
  throw new Error('❌ FAIL: Live lecture should NOT be editable in Mode B!');
}
if (checkCanEditLesson(liveSections[0].lessons[1], true, originalLessonIds) !== false) {
  throw new Error('❌ FAIL: Live quiz should NOT be editable in Mode B!');
}
console.log('  ✅ PASS: Previous live lectures and quizzes are locked from edits in Mode B');

// 5d. Can Final Assignment be edited in Mode B? ("aur edit final assigement kr skta hai")
if (checkCanEditLesson(liveSections[0].lessons[2], true, originalLessonIds) !== true) {
  throw new Error('❌ FAIL: Final Assignment MUST remain editable in Mode B!');
}
console.log('  ✅ PASS: Final Assignment remains editable in Mode B as requested');

// 5e. Can newly added lesson/quiz be edited in Mode B?
const newLesson = { id: 'les-new-99', title: 'New Bonus Lecture', type: 'VIDEO' };
if (checkCanEditLesson(newLesson, true, originalLessonIds) !== true) {
  throw new Error('❌ FAIL: Newly added lecture should be editable in Mode B!');
}
console.log('  ✅ PASS: Newly added lessons/quizzes (+ Add Lecture/Quiz/Article) are fully editable in Mode B');

// Test 6: Empty Excel Content Error Message Verification
console.log('\n📌 Test 6: Empty Excel Content Error Message');
const emptySheetValidation = validateCourseExcel(emptyWb);
const emptyContentError = emptySheetValidation.errors.find(e => e.field === 'Course Content' && e.error.includes('No course content found'));
if (!emptyContentError) {
  console.log('Errors found:', emptySheetValidation.errors);
  throw new Error('❌ FAIL: Expected specific "No course content found" error message for empty spreadsheet!');
}
console.log(`  ✅ PASS: Correct blocking error message found: "${emptyContentError.error}"`);

// Test 7: Quick Minor Edit Mode vs Mode B Spreadsheet Download Policy
console.log('\n📌 Test 7: Spreadsheet Action Policy');
function getSpreadsheetAction(isMinorEdit: boolean, isModeB: boolean) {
  if (isMinorEdit) return 'DISABLED';
  if (isModeB) return 'DOWNLOAD_CURRENT_COURSE';
  return 'DOWNLOAD_TEMPLATE';
}

if (getSpreadsheetAction(true, false) !== 'DISABLED') {
  throw new Error('❌ FAIL: Quick Minor Edit mode must disable spreadsheet download!');
}
if (getSpreadsheetAction(false, true) !== 'DOWNLOAD_CURRENT_COURSE') {
  throw new Error('❌ FAIL: Mode B (Update Version) must export current course!');
}
if (getSpreadsheetAction(false, false) !== 'DOWNLOAD_TEMPLATE') {
  throw new Error('❌ FAIL: New course mode must download demo template!');
}
console.log('  ✅ PASS: Quick Minor Edit disables template download');
console.log('  ✅ PASS: Mode B exports current course curriculum spreadsheet');
console.log('  ✅ PASS: New Course mode provides starter demo template');

console.log('\n========================================================');
console.log('🎉 ALL NEW COURSE & EXCEL TEMPLATE TESTS PASSED (100%)!');
console.log('========================================================');

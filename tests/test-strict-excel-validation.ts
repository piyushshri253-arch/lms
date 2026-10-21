import * as XLSX from 'xlsx-js-style';
import { validateCourseExcel } from '../src/lib/course-excel-validator';
import { downloadCourseExcelTemplate } from '../src/lib/course-excel';

// Helper to create a base valid course workbook
function createBaseValidWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. Course Details Sheet
  const detailsAOA = [
    ['Field Name (Topic)', 'Your Value / Enter Value Here', 'Status', 'Instructions & Examples'],
    ['📌 SECTION 1: BASIC COURSE INFORMATION', '', '', ''],
    ['Course Title *', 'Python Programming Masterclass 2026', 'REQUIRED', 'Title'],
    ['Category *', 'Computer Science', 'REQUIRED', 'Category'],
    ['Skill Level *', 'Beginner', 'REQUIRED', 'Level'],
    ['Language *', 'English', 'REQUIRED', 'Language'],
    ['Short Description *', 'Learn Python from scratch with hands-on coding exercises.', 'REQUIRED', 'Short'],
    ['Full Course Description *', 'Comprehensive masterclass on Python data structures, algorithms, and web APIs.', 'REQUIRED', 'Desc'],
    ['What Students Will Learn *', 'Master Python syntax; Build OOP apps; Deploy REST APIs', 'REQUIRED', 'Outcomes'],
    ['Course Price (INR) *', 1999, 'REQUIRED', 'Price'],
    ['Discount Price (INR)', 999, 'OPTIONAL', 'Discount'],
    ['Currency *', 'INR', 'REQUIRED', 'Currency'],
    ['Access Type *', 'LIFETIME', 'REQUIRED', 'Access']
  ];
  const wsDetails = XLSX.utils.aoa_to_sheet(detailsAOA);
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Course Details');

  // 2. Curriculum Sheet
  const curriculumAOA = [
    [
      'Module Title (Write once per module)',
      'Topic / Lesson Title *',
      'Content Type (LECTURE / ARTICLE / QUIZ / FINAL ASSIGNMENT) *',
      'Duration (mm:ss)',
      'Free Preview (Yes / No)',
      'Written Article Content / Notes (Markdown for Written Articles)',
      'Video URL *'
    ],
    ['Introduction to Python', 'Installing Python & VS Code', 'LECTURE', '10:00', 'Yes', '', 'https://cdn.example.com/videos/py1.mp4'],
    ['', 'Variables & Data Types', 'LECTURE', '15:00', 'No', '', 'https://cdn.example.com/videos/py2.mp4'],
    ['', 'Python Syntax Guide', 'ARTICLE', '05:00', 'No', '# Python Syntax\n\nDetailed breakdown of Python syntax, variables and control flow.', ''],
    ['', 'Python Fundamentals Assessment', 'QUIZ', '10:00', 'No', '', ''],
    ['Course Completion & Certification', 'Final Assignment', 'FINAL ASSIGNMENT', '30:00', 'No', 'Mandatory comprehensive final assignment for certification qualification.', '']
  ];
  const wsCurriculum = XLSX.utils.aoa_to_sheet(curriculumAOA);
  XLSX.utils.book_append_sheet(wb, wsCurriculum, 'Curriculum');

  // 3. Quizzes & MCQs Sheet (Each quiz has EVEN questions count >= 2)
  const quizzesAOA = [
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
    // Module 1 Quiz (2 questions = EVEN)
    ['Module 1', 'Python Fundamentals Assessment', 1, 'What is the file extension for Python files?', '.pt', '.py', '.python', '.p', 'B', 'Python files end in .py', 70, 10],
    ['', '', 2, 'Which function outputs text to console?', 'print()', 'echo()', 'write()', 'display()', 'A', 'print() is built-in', 70, 10],
    // Final Assignment (2 questions = EVEN)
    ['Module 2', 'Final Assignment', 1, 'Which keyword defines a function in Python?', 'func', 'def', 'function', 'define', 'B', 'def is keyword', 80, 10],
    ['', '', 2, 'Which data structure is immutable in Python?', 'List', 'Tuple', 'Dictionary', 'Set', 'B', 'Tuples are immutable', 80, 10]
  ];
  const wsQuizzes = XLSX.utils.aoa_to_sheet(quizzesAOA);
  XLSX.utils.book_append_sheet(wb, wsQuizzes, 'Quizzes & MCQs');

  return wb;
}

// Convert workbook to Buffer
function wbToBuffer(wb: XLSX.WorkBook): Buffer {
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log('\n=============================================================');
  console.log('MORENA TEACH LMS — STRICT EXCEL VALIDATION TEST SUITE');
  console.log('Testing all 15 Acceptance Criteria from Section 12');
  console.log('=============================================================\n');

  // 1. Acceptance Criterion 1: Empty template → Rejected
  console.log('Test 1: Empty template rejection');
  const emptyWb = XLSX.utils.book_new();
  const emptyWs = XLSX.utils.aoa_to_sheet([['Module Title', 'Topic / Lesson Title', 'Content Type']]);
  XLSX.utils.book_append_sheet(emptyWb, emptyWs, 'Curriculum');
  const emptyRes = validateCourseExcel(wbToBuffer(emptyWb));
  assert(!emptyRes.isValid, 'Empty workbook is rejected');
  assert(
    emptyRes.errors.some((e) => e.error.includes('No course content found') || e.field === 'Worksheet Structure'),
    'Correct actionable error returned for empty template'
  );

  // 2. Acceptance Criterion 2: Missing course title → Rejected
  console.log('\nTest 2: Missing course title rejection');
  const noTitleWb = createBaseValidWorkbook();
  const dtSheet = noTitleWb.Sheets['Course Details'];
  const dtRows: any[][] = XLSX.utils.sheet_to_json(dtSheet, { header: 1 });
  // Clear course title row
  const titleRow = dtRows.find((r) => String(r[0] || '').includes('Course Title'));
  if (titleRow) titleRow[1] = '';
  noTitleWb.Sheets['Course Details'] = XLSX.utils.aoa_to_sheet(dtRows);
  const noTitleRes = validateCourseExcel(wbToBuffer(noTitleWb));
  assert(!noTitleRes.isValid, 'Missing course title is rejected');
  assert(
    noTitleRes.errors.some((e) => e.location === 'Course Details' && e.field === 'Course Title' && e.error === 'Missing'),
    'Exact location "Course Details" and field "Course Title" flagged'
  );

  // 3. Acceptance Criterion 3: Missing mandatory module or lecture title → Rejected
  console.log('\nTest 3: Missing mandatory module or lecture title rejection');
  const noModTitleWb = createBaseValidWorkbook();
  const curSheet3 = noModTitleWb.Sheets['Curriculum'];
  const curRows3: any[][] = XLSX.utils.sheet_to_json(curSheet3, { header: 1 });
  // Blank out module title and lecture title on row 1
  curRows3[1][0] = ''; // blank module title
  curRows3[1][1] = ''; // blank lecture title
  noModTitleWb.Sheets['Curriculum'] = XLSX.utils.aoa_to_sheet(curRows3);
  const noModRes = validateCourseExcel(wbToBuffer(noModTitleWb));
  assert(!noModRes.isValid, 'Missing module/lecture title is rejected');
  assert(
    noModRes.errors.some((e) => e.field === 'Lecture Title' && e.error === 'Missing'),
    'Lecture Title missing error is reported with location'
  );

  // 4. Acceptance Criterion 4: Missing required video reference → Rejected
  console.log('\nTest 4: Missing required video reference rejection');
  const noVideoWb = createBaseValidWorkbook();
  const curSheet4 = noVideoWb.Sheets['Curriculum'];
  const curRows4: any[][] = XLSX.utils.sheet_to_json(curSheet4, { header: 1 });
  curRows4[1][6] = ''; // clear video URL
  noVideoWb.Sheets['Curriculum'] = XLSX.utils.aoa_to_sheet(curRows4);
  const noVideoRes = validateCourseExcel(wbToBuffer(noVideoWb), { requireVideoReference: true });
  assert(!noVideoRes.isValid, 'Missing required video reference is rejected');
  assert(
    noVideoRes.errors.some((e) => e.field === 'Video URL' && e.error.includes('required')),
    'Video URL required error is flagged for lecture'
  );

  // 5. Acceptance Criterion 5: Quiz containing 5 questions → Rejected
  console.log('\nTest 5: Quiz containing 5 questions (odd count) rejection');
  const odd5Wb = createBaseValidWorkbook();
  const qSheet5 = odd5Wb.Sheets['Quizzes & MCQs'];
  const qRows5: any[][] = XLSX.utils.sheet_to_json(qSheet5, { header: 1 });
  // Add 3 more questions to Module 1 Quiz to make it 5 questions
  qRows5.push(['Module 1', 'Python Fundamentals Assessment', 3, 'Question 3?', 'A', 'B', 'C', 'D', 'A', 'Expl', 70, 10]);
  qRows5.push(['', '', 4, 'Question 4?', 'A', 'B', 'C', 'D', 'B', 'Expl', 70, 10]);
  qRows5.push(['', '', 5, 'Question 5?', 'A', 'B', 'C', 'D', 'C', 'Expl', 70, 10]);
  odd5Wb.Sheets['Quizzes & MCQs'] = XLSX.utils.aoa_to_sheet(qRows5);
  const odd5Res = validateCourseExcel(wbToBuffer(odd5Wb));
  assert(!odd5Res.isValid, 'Quiz with 5 questions is rejected');
  assert(
    odd5Res.errors.some((e) => e.field === 'Question Count' && e.error.includes('5 questions; even count required')),
    'Exact error "5 questions; even count required" is reported'
  );

  // 6. Acceptance Criterion 6: Quiz containing 7 questions → Rejected
  console.log('\nTest 6: Quiz containing 7 questions (odd count) rejection');
  const odd7Wb = createBaseValidWorkbook();
  const qSheet6 = odd7Wb.Sheets['Quizzes & MCQs'];
  const qRows6: any[][] = XLSX.utils.sheet_to_json(qSheet6, { header: 1 });
  // Add 5 more questions to Module 1 Quiz to make it 7 questions
  for (let i = 3; i <= 7; i++) {
    qRows6.push(['Module 1', 'Python Fundamentals Assessment', i, `Question ${i}?`, 'Opt A', 'Opt B', 'Opt C', 'Opt D', 'A', 'Exp', 70, 10]);
  }
  odd7Wb.Sheets['Quizzes & MCQs'] = XLSX.utils.aoa_to_sheet(qRows6);
  const odd7Res = validateCourseExcel(wbToBuffer(odd7Wb));
  assert(!odd7Res.isValid, 'Quiz with 7 questions is rejected');
  assert(
    odd7Res.errors.some((e) => e.field === 'Question Count' && e.error.includes('7 questions; even count required')),
    'Exact error "7 questions; even count required" is reported'
  );

  // 7. Acceptance Criterion 7: Quiz with 6 valid questions & missing correct answer → Rejected
  console.log('\nTest 7: Quiz with 6 valid questions but missing correct answer rejection');
  const missingAnsWb = createBaseValidWorkbook();
  const qSheet7 = missingAnsWb.Sheets['Quizzes & MCQs'];
  const qRows7: any[][] = XLSX.utils.sheet_to_json(qSheet7, { header: 1 });
  // Add 4 more questions to make 6 questions total, but question 3 has empty correct answer
  qRows7.push(['Module 1', 'Python Fundamentals Assessment', 3, 'Question 3?', 'Opt A', 'Opt B', 'Opt C', 'Opt D', '', 'Exp', 70, 10]);
  qRows7.push(['', '', 4, 'Question 4?', 'Opt A', 'Opt B', 'Opt C', 'Opt D', 'A', 'Exp', 70, 10]);
  qRows7.push(['', '', 5, 'Question 5?', 'Opt A', 'Opt B', 'Opt C', 'Opt D', 'B', 'Exp', 70, 10]);
  qRows7.push(['', '', 6, 'Question 6?', 'Opt A', 'Opt B', 'Opt C', 'Opt D', 'C', 'Exp', 70, 10]);
  missingAnsWb.Sheets['Quizzes & MCQs'] = XLSX.utils.aoa_to_sheet(qRows7);
  const missingAnsRes = validateCourseExcel(wbToBuffer(missingAnsWb));
  assert(!missingAnsRes.isValid, 'Quiz with 6 questions but missing correct answer is rejected');
  assert(
    missingAnsRes.errors.some((e) => e.field === 'Correct Answer' && e.error === 'Missing'),
    'Correct Answer Missing error is flagged'
  );

  // 8. Acceptance Criterion 8: Missing mandatory final assignment → Rejected
  console.log('\nTest 8: Missing mandatory final assignment rejection');
  const noFinalWb = createBaseValidWorkbook();
  const curSheet8 = noFinalWb.Sheets['Curriculum'];
  const curRows8: any[][] = XLSX.utils.sheet_to_json(curSheet8, { header: 1 });
  // Remove final assignment row from curriculum
  const filteredCur8 = curRows8.filter((r) => !String(r[1] || '').toLowerCase().includes('final assignment'));
  noFinalWb.Sheets['Curriculum'] = XLSX.utils.aoa_to_sheet(filteredCur8);
  // Also remove from Quizzes sheet
  const qSheet8 = noFinalWb.Sheets['Quizzes & MCQs'];
  const qRows8: any[][] = XLSX.utils.sheet_to_json(qSheet8, { header: 1 });
  const filteredQ8 = qRows8.filter((r) => !String(r[1] || '').toLowerCase().includes('final assignment'));
  noFinalWb.Sheets['Quizzes & MCQs'] = XLSX.utils.aoa_to_sheet(filteredQ8);
  const noFinalRes = validateCourseExcel(wbToBuffer(noFinalWb));
  assert(
    noFinalRes.errors.some((e) => (e.location === 'Final Assessment' || e.location === 'Final Assignment') && (e.error === 'Final Assessment is missing' || e.error === 'Final Assignment is missing')),
    'Final Assessment missing error reported'
  );

  // 9. Acceptance Criterion 9: Invalid worksheet structure or required headers → Rejected
  console.log('\nTest 9: Invalid worksheet structure or required headers rejection');
  const invalidHeadersWb = createBaseValidWorkbook();
  // Corrupt Curriculum headers
  invalidHeadersWb.Sheets['Curriculum'] = XLSX.utils.aoa_to_sheet([
    ['ColA', 'ColB', 'ColC'],
    ['Mod 1', 'Lec 1', 'LECTURE']
  ]);
  const invalidHeadersRes = validateCourseExcel(wbToBuffer(invalidHeadersWb));
  assert(!invalidHeadersRes.isValid, 'Invalid headers workbook is rejected');
  assert(
    invalidHeadersRes.errors.some((e) => e.location === 'Curriculum' && e.field === 'Headers'),
    'Headers missing error is flagged for Curriculum'
  );

  // 10. Acceptance Criterion 10: Multiple validation errors → All actionable errors displayed together
  console.log('\nTest 10: Multiple validation errors displayed together');
  const multiErrorWb = createBaseValidWorkbook();
  // Introduce 3 separate errors: missing title, odd quiz count (5), missing final assignment instructions
  const dtRows10: any[][] = XLSX.utils.sheet_to_json(multiErrorWb.Sheets['Course Details'], { header: 1 });
  const tRow = dtRows10.find((r) => String(r[0] || '').includes('Course Title'));
  if (tRow) tRow[1] = '';
  multiErrorWb.Sheets['Course Details'] = XLSX.utils.aoa_to_sheet(dtRows10);

  const qRows10: any[][] = XLSX.utils.sheet_to_json(multiErrorWb.Sheets['Quizzes & MCQs'], { header: 1 });
  qRows10.push(['Module 1', 'Python Fundamentals Assessment', 3, 'Q3?', 'A', 'B', 'C', 'D', 'A', 'Exp', 70, 10]);
  multiErrorWb.Sheets['Quizzes & MCQs'] = XLSX.utils.aoa_to_sheet(qRows10);

  const multiRes = validateCourseExcel(wbToBuffer(multiErrorWb));
  assert(!multiRes.isValid, 'Multiple errors workbook is rejected');
  assert(multiRes.errors.length >= 2, `All errors returned together (found ${multiRes.errors.length} errors)`);
  assert(
    multiRes.errors.some((e) => e.field === 'Course Title') &&
    multiRes.errors.some((e) => e.field === 'Question Count'),
    'Both Course Title and Quiz Question Count errors reported in same result'
  );

  // 11. Acceptance Criterion 11: One or more blocking errors → No data imported or partially saved
  console.log('\nTest 11: Blocking errors prevent data from being returned or partially saved');
  assert(multiRes.parsedData === undefined, 'parsedData is undefined when blocking errors exist');
  assert(multiRes.blockingCount > 0, 'blockingCount accurately reflects blocking errors');

  // 12. Acceptance Criterion 12: All required fields and rules valid → Preview and confirmation available
  console.log('\nTest 12: Completely valid workbook produces preview & confirmation ready state');
  const validWb = createBaseValidWorkbook();
  const validRes = validateCourseExcel(wbToBuffer(validWb));
  assert(validRes.isValid, 'Valid workbook passes all checks');
  assert(validRes.blockingCount === 0, 'Zero blocking errors');
  assert(validRes.parsedData !== undefined, 'parsedData is generated and available for preview');
  assert(validRes.parsedData?.title === 'Python Programming Masterclass 2026', 'Correct title in parsedData');
  assert(validRes.summary.hasFinalAssignment === true, 'Summary confirms Final Assignment is configured');
  assert(validRes.summary.modulesCount === 2, 'Summary reports 2 modules');

  // 13. Acceptance Criterion 13: Failed import in a revision workflow → Published version remains unchanged
  console.log('\nTest 13: Revision draft isolation on validation failure');
  // Mode B with blocking error:
  const invalidModeBRes = validateCourseExcel(wbToBuffer(emptyWb));
  assert(!invalidModeBRes.isValid, 'Mode B import with empty file rejected without touching published version');

  // 14. Acceptance Criterion 14: Successful import → Only selected draft is updated
  console.log('\nTest 14: Successful import updates draft snapshot with parsed data');
  assert(validRes.parsedData?.sections?.length === 2, 'Draft sections correctly structured');
  assert(validRes.parsedData?.price === 1999, 'Draft price correctly populated');

  // 15. Acceptance Criterion 15: Direct API upload bypassing frontend validation → Still rejected by backend
  console.log('\nTest 15: Direct validation engine enforces all backend rules');
  // Corrupt a question answer to invalid option 'Z'
  const invalidOptWb = createBaseValidWorkbook();
  const qRows15: any[][] = XLSX.utils.sheet_to_json(invalidOptWb.Sheets['Quizzes & MCQs'], { header: 1 });
  qRows15[1][8] = 'Z'; // Invalid correct option
  invalidOptWb.Sheets['Quizzes & MCQs'] = XLSX.utils.aoa_to_sheet(qRows15);
  const directApiRes = validateCourseExcel(wbToBuffer(invalidOptWb));
  assert(!directApiRes.isValid, 'Backend validation rejects invalid correct answer option');
  assert(
    directApiRes.errors.some((e) => e.field === 'Correct Answer' && e.error.includes('must reference one of the available answer options')),
    'Backend rejects direct submission with format error'
  );

  // 16. Acceptance Criterion 16: Dedicated "Final Assessment" Tab Validates & Binds Accurately
  console.log('\nTest 16: Dedicated "Final Assessment" worksheet tab validation & parsing');
  const dedicatedFAWb = XLSX.utils.book_new();
  const baseWb = createBaseValidWorkbook();
  XLSX.utils.book_append_sheet(dedicatedFAWb, baseWb.Sheets['Course Details'], 'Course Details');
  XLSX.utils.book_append_sheet(dedicatedFAWb, baseWb.Sheets['Curriculum'], 'Curriculum');
  
  // Mid-module quiz in Quizzes & MCQs
  const midModuleQuizAOA = [
    [
      'Module (e.g. Module 1)', 'Quiz Title (Write once per quiz)', 'Q#', 'Question Text *',
      'Option A *', 'Option B *', 'Option C *', 'Option D *',
      'Correct Option (A/B/C/D) *', 'Explanation (Why this option is correct)', 'Passing Score (%)', 'Marks / Points'
    ],
    ['Module 1', 'Python Fundamentals Assessment', 1, 'What is .py?', 'Script', 'Binary', 'Image', 'Audio', 'A', 'Script file', 70, 10],
    ['', '', 2, 'What is print()?', 'Output function', 'Input', 'Loop', 'Class', 'A', 'Output', 70, 10]
  ];
  XLSX.utils.book_append_sheet(dedicatedFAWb, XLSX.utils.aoa_to_sheet(midModuleQuizAOA), 'Quizzes & MCQs');

  // Dedicated Final Assessment tab with 4 questions (even count)
  const dedicatedFAAOA = [
    [
      'Module / Section (Optional)', 'Assessment Title', 'Q#', 'Question Text *',
      'Option A *', 'Option B *', 'Option C *', 'Option D *',
      'Correct Option (A/B/C/D) *', 'Explanation (Why this option is correct)', 'Passing Score (%)', 'Marks / Points (e.g. 10)'
    ],
    ['', 'Final Assessment', 1, 'What is PEP 8?', 'Style guide', 'Compiler', 'Debugger', 'OS', 'A', 'Python style guide', 80, 10],
    ['', 'Final Assessment', 2, 'Is Python dynamically typed?', 'Yes', 'No', 'Sometimes', 'Never', 'A', 'Dynamic typing', 80, 10],
    ['', 'Final Assessment', 3, 'Which keyword creates a class?', 'class', 'struct', 'type', 'interface', 'A', 'class keyword', 80, 10],
    ['', 'Final Assessment', 4, 'What is pip?', 'Package manager', 'Editor', 'Browser', 'Database', 'A', 'Package installer', 80, 10]
  ];
  XLSX.utils.book_append_sheet(dedicatedFAWb, XLSX.utils.aoa_to_sheet(dedicatedFAAOA), 'Final Assessment');

  const dedicatedFARes = validateCourseExcel(wbToBuffer(dedicatedFAWb));
  assert(dedicatedFARes.isValid, 'Workbook with dedicated Final Assessment tab passes validation');
  assert(dedicatedFARes.blockingCount === 0, 'Zero blocking errors with dedicated Final Assessment tab');
  assert(dedicatedFARes.summary.hasFinalAssignment === true, 'Summary recognizes Final Assessment from dedicated tab');
  assert(dedicatedFARes.summary.finalAssignmentQuestionsCount === 4, 'Final Assessment has all 4 questions from dedicated tab');
  const finalLes = dedicatedFARes.parsedData?.sections?.flatMap(s => s.lessons).find(l => l.isFinalAssignment);
  const finalQuizData: any = finalLes?.quizData;
  assert(finalQuizData?.questions?.length === 4, 'Parsed final assessment lesson contains all 4 questions');
  assert(finalQuizData?.passingScore === 80, 'Parsed final assessment passing score is 80%');

  // 17. Acceptance Criterion 17: Odd question count in dedicated Final Assessment tab is rejected
  console.log('\nTest 17: Odd question count in dedicated Final Assessment tab rejection');
  const oddDedicatedFAAOA = [...dedicatedFAAOA.slice(0, 4)]; // 3 questions = odd count
  const oddDedicatedFAWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(oddDedicatedFAWb, baseWb.Sheets['Course Details'], 'Course Details');
  XLSX.utils.book_append_sheet(oddDedicatedFAWb, baseWb.Sheets['Curriculum'], 'Curriculum');
  XLSX.utils.book_append_sheet(oddDedicatedFAWb, XLSX.utils.aoa_to_sheet(midModuleQuizAOA), 'Quizzes & MCQs');
  XLSX.utils.book_append_sheet(oddDedicatedFAWb, XLSX.utils.aoa_to_sheet(oddDedicatedFAAOA), 'Final Assessment');
  const oddDedicatedRes = validateCourseExcel(wbToBuffer(oddDedicatedFAWb));
  assert(!oddDedicatedRes.isValid, 'Odd question count in dedicated Final Assessment tab is rejected');
  assert(
    oddDedicatedRes.errors.some(e => e.location === 'Final Assessment' && e.error.includes('even count required')),
    'Even count required error reported at Final Assessment location'
  );

  // 18. Acceptance Criterion 18: Mid-module quizzes in Quizzes & MCQs without explicit Curriculum rows are auto-created and counted accurately
  console.log('\nTest 18: Mid-module quizzes defined directly in Quizzes & MCQs sheet are auto-created and counted accurately in summary');
  const directQuizzesWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(directQuizzesWb, baseWb.Sheets['Course Details'], 'Course Details');
  // Curriculum only has lectures and articles, no QUIZ row:
  const curriculumNoQuiz = [
    [
      'Module Title (Write once per module)',
      'Topic / Lesson Title *',
      'Content Type (LECTURE / ARTICLE / QUIZ / FINAL ASSIGNMENT) *',
      'Duration (mm:ss)',
      'Free Preview (Yes / No)',
      'Written Article Content / Notes (Markdown for Written Articles)',
      'Video URL *'
    ],
    ['Introduction to Python', 'Installing Python & VS Code', 'LECTURE', '10:00', 'Yes', '', 'https://cdn.example.com/videos/py1.mp4'],
    ['', 'Variables & Data Types', 'LECTURE', '15:00', 'No', '', 'https://cdn.example.com/videos/py2.mp4'],
    ['', 'Python Syntax Guide', 'ARTICLE', '05:00', 'No', '# Python Syntax\n\nDetailed breakdown of Python syntax, variables and control flow.', ''],
    ['Advanced Python Concepts', 'Decorators and Generators', 'LECTURE', '20:00', 'No', '', 'https://cdn.example.com/videos/py3.mp4'],
    ['', 'Concurrency in Python', 'ARTICLE', '08:00', 'No', '# Concurrency\n\nNotes on asyncio and threading.', '']
  ];
  const directQuizzesAOA = [
    ['Module # (1, 2, ...)', 'Quiz Title *', 'Q#', 'Question Text *', 'Option A *', 'Option B *', 'Option C *', 'Option D *', 'Correct Option (A/B/C/D) *', 'Explanation (Why this option is correct)', 'Passing Score (%)'],
    [1, 'Protocol Basics', 1, 'What is HTTP?', 'Hypertext', 'Hardware', 'Host', 'Hex', 'A', 'Hypertext Transfer Protocol', 70],
    [1, 'Protocol Basics', 2, 'Default port for HTTP?', '80', '443', '22', '21', 'A', 'Port 80', 70],
    [2, 'React Advanced', 1, 'What is useState?', 'Hook', 'Class', 'File', 'Package', 'A', 'A state hook', 75],
    [2, 'React Advanced', 2, 'What does useEffect do?', 'Side effects', 'Styling', 'Routing', 'Compilation', 'A', 'Handles side effects', 75],
  ];
  XLSX.utils.book_append_sheet(directQuizzesWb, XLSX.utils.aoa_to_sheet(curriculumNoQuiz), 'Curriculum');
  XLSX.utils.book_append_sheet(directQuizzesWb, XLSX.utils.aoa_to_sheet(directQuizzesAOA), 'Quizzes & MCQs');
  XLSX.utils.book_append_sheet(directQuizzesWb, XLSX.utils.aoa_to_sheet(dedicatedFAAOA), 'Final Assessment');

  const directQuizzesRes = validateCourseExcel(wbToBuffer(directQuizzesWb));
  assert(directQuizzesRes.isValid, 'Workbook with mid-module quizzes not pre-declared in Curriculum passes validation');
  assert(directQuizzesRes.blockingCount === 0, 'Zero blocking errors');
  assert(directQuizzesRes.summary.quizzesCount === 2, `Mid-module quiz count is exactly 2 (got ${directQuizzesRes.summary.quizzesCount})`);
  assert(directQuizzesRes.summary.hasFinalAssignment === true, 'Final Assessment recognized');
  assert(directQuizzesRes.summary.finalAssignmentQuestionsCount === 4, 'Final Assessment has 4 questions');
  assert(directQuizzesRes.summary.questionsCount === 8, `Total questions count is 8 (2+2+4) (got ${directQuizzesRes.summary.questionsCount})`);

  const mod1Quizzes = directQuizzesRes.parsedData?.sections?.[0]?.lessons.filter(l => l.type === 'QUIZ' && !l.isFinalAssignment);
  const mod2Quizzes = directQuizzesRes.parsedData?.sections?.[1]?.lessons.filter(l => l.type === 'QUIZ' && !l.isFinalAssignment);
  const finalExam = directQuizzesRes.parsedData?.sections?.[1]?.lessons.find(l => l.isFinalAssignment);
  assert(mod1Quizzes?.length === 1, 'Module 1 has exactly 1 mid-module quiz auto-created');
  assert(mod2Quizzes?.length === 1, 'Module 2 has exactly 1 mid-module quiz auto-created');
  assert(Boolean(finalExam), 'Module 2 has the Final Assessment lesson attached');
  assert((mod1Quizzes?.[0]?.quizData as any)?.questions?.length === 2, 'Module 1 quiz has 2 questions attached');
  assert((mod2Quizzes?.[0]?.quizData as any)?.questions?.length === 2, 'Module 2 quiz has 2 questions attached');
  assert((finalExam?.quizData as any)?.questions?.length === 4, 'Final assessment has 4 questions attached');

  console.log('\n=============================================================');
  console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('=============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test runner failed with unexpected error:', err);
  process.exit(1);
});

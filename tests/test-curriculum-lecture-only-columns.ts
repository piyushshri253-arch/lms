import * as XLSX from 'xlsx-js-style';
import assert from 'assert';
import fs from 'fs';
import { downloadCourseExcelTemplate, exportCourseToExcelFile, parseCourseExcelWorkbook } from '../src/lib/course-excel';
import { validateCourseExcel } from '../src/lib/course-excel-validator';

console.log('🧪 Starting Test: Curriculum Sheet Lecture-Only Columns Verification...');

// Test 1: Template headers verification
console.log('\n📌 Test 1: downloadCourseExcelTemplate() Curriculum sheet columns');
downloadCourseExcelTemplate();
const templateName = 'MORENA_Course_Upload_Template.xlsx';
assert(fs.existsSync(templateName), 'Template file must exist');

const tBuf = fs.readFileSync(templateName);
const tWb = XLSX.read(tBuf, { type: 'buffer' });
fs.unlinkSync(templateName);

const curSheet = tWb.Sheets['Curriculum Syllabus'];
assert(curSheet, 'Curriculum Syllabus sheet must exist');

const curData: any[][] = XLSX.utils.sheet_to_json(curSheet, { header: 1 });
const curHeaders = curData[0];
console.log('  Curriculum Headers in Template:', curHeaders);

assert.strictEqual(curHeaders.length, 5, 'Curriculum sheet must have exactly 5 columns');
assert.strictEqual(curHeaders[0], 'Module Title (Write once per module)');
assert.strictEqual(curHeaders[1], 'Topic / Lesson Title *');
assert.strictEqual(curHeaders[2], 'Content Type (LECTURE) *');
assert.strictEqual(curHeaders[3], 'Duration (mm:ss)');
assert.strictEqual(curHeaders[4], 'Free Preview (Yes / No)');

assert(
  !curHeaders.includes('Written Article Content / Notes (Markdown for Written Articles)'),
  'Curriculum sheet must NOT contain Written Article Content column'
);
console.log('  ✅ PASS: Template Curriculum sheet has clean 5 columns with "Content Type (LECTURE) *" and no Written Article column');

// Test 2: exportCourseToExcelFile headers & lecture-only verification
console.log('\n📌 Test 2: exportCourseToExcelFile() Curriculum sheet only includes lectures');
const mockCourse = {
  title: 'Full Stack Web Mastery',
  sections: [
    {
      id: 'sec-1',
      title: 'Module 1: Foundations',
      lessons: [
        { id: 'les-1', title: 'Video Lecture 1', type: 'VIDEO', duration: '12:00', isFree: true },
        { id: 'les-2', title: 'Article Cheatsheet', type: 'TEXT', content: '# Cheatsheet notes' },
        { id: 'les-3', title: 'Quiz 1', type: 'QUIZ', quizData: { questions: [{ question: 'Q1', options: ['A','B','C','D'], correctIndex: 0 }] } },
        { id: 'les-4', title: 'Final Assessment', type: 'QUIZ', isFinalAssignment: true, quizData: { questions: [{ question: 'Q1', options: ['A','B','C','D'], correctIndex: 0 }] } }
      ]
    }
  ]
};

const exportFilename = 'test_exported_curriculum.xlsx';
exportCourseToExcelFile(mockCourse, exportFilename);
assert(fs.existsSync(exportFilename), 'Exported file must exist');

const expBuf = fs.readFileSync(exportFilename);
const expWb = XLSX.read(expBuf, { type: 'buffer' });
fs.unlinkSync(exportFilename);

const expCurSheet = expWb.Sheets['Curriculum Syllabus'];
const expCurData: any[][] = XLSX.utils.sheet_to_json(expCurSheet, { header: 1 });
const expHeaders = expCurData[0];
console.log('  Exported Curriculum Headers:', expHeaders);

assert.strictEqual(expHeaders.length, 5, 'Exported curriculum must have exactly 5 columns');
assert.strictEqual(expHeaders[2], 'Content Type (LECTURE) *');
assert(
  !expHeaders.includes('Written Article Content / Notes (Markdown for Written Articles)'),
  'Exported curriculum must NOT contain Written Article Content column'
);

// Verify rows in exported curriculum: only the VIDEO lecture should be present!
console.log('  Exported Curriculum rows:', expCurData.slice(1));
const dataRows = expCurData.slice(1);
assert.strictEqual(dataRows.length, 1, 'Only 1 lecture should be in Curriculum Syllabus sheet');
assert.strictEqual(dataRows[0][1], 'Video Lecture 1');
assert.strictEqual(dataRows[0][2], 'LECTURE');

console.log('  ✅ PASS: exportCourseToExcelFile() only placed video lectures into Curriculum tab!');

// Test 3: Dedicated Articles tab is exported and parsed properly
console.log('\n📌 Test 3: Articles tab exported and parsed');
const expArtSheet = expWb.Sheets['Articles'];
assert(expArtSheet, 'Articles sheet must exist in export');
const expArtData: any[][] = XLSX.utils.sheet_to_json(expArtSheet, { header: 1 });
console.log('  Articles tab rows:', expArtData);
assert(expArtData.length >= 2, 'Articles tab should contain the article');
assert.strictEqual(expArtData[1][1], 'Article Cheatsheet');

const parsedResult = parseCourseExcelWorkbook(expWb);
assert.strictEqual(parsedResult.sections?.length, 1);
const allLessons = parsedResult.sections[0].lessons;
console.log('  Parsed lessons types:', allLessons.map(l => ({ title: l.title, type: l.type })));
assert(allLessons.some(l => l.title === 'Video Lecture 1' && l.type === 'VIDEO'), 'Lecture parsed');
assert(allLessons.some(l => l.title === 'Article Cheatsheet' && l.type === 'TEXT'), 'Article parsed from Articles tab');
assert(allLessons.some(l => l.title === 'Final Assessment' && l.isFinalAssignment), 'Final Assessment parsed from FA tab');

console.log('  ✅ PASS: All tabs (Curriculum, Articles, Final Assessment) work in harmony!');
console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');

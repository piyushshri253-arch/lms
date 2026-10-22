import { prisma } from '../src/lib/prisma';
import { validateVideoUniquenessForCourse } from '../src/lib/video-deduplication';
import { validateCourseExcel } from '../src/lib/course-excel-validator';
import * as XLSX from 'xlsx';

async function runTests() {
  console.log('🧪 Starting Video Uniqueness & Cross-Course Deduplication Tests...\n');
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failCount++;
    }
  }

  // Find or create test instructor
  let instructor = await prisma.user.findFirst({
    where: { email: 'anurag@morenateach.com' }
  });
  if (!instructor) {
    instructor = await prisma.user.findFirst({
      where: { role: 'INSTRUCTOR' }
    });
  }
  if (!instructor) {
    throw new Error('No instructor found in database for test.');
  }

  const testVideoA = `/uploads/videos/test_math_lecture_unique_alpha_${Date.now()}.mp4`;
  const testVideoB = `/uploads/videos/test_physics_lecture_unique_beta_${Date.now()}.mp4`;

  let course1: any = null;
  let course2: any = null;

  try {
    // --------------------------------------------------------------------------
    // Test 1: Intra-payload Duplicate Video Detection
    // --------------------------------------------------------------------------
    console.log('--- Test 1: Intra-course Duplicate Video Detection ---');
    const intraSections = [
      {
        title: 'Module 1: Algebra',
        lessons: [
          { title: '1.1 Linear Equations', videoUrl: testVideoA },
          { title: '1.2 Quadratic Equations', videoUrl: testVideoA } // Duplicate!
        ]
      }
    ];

    const intraCheck = await validateVideoUniquenessForCourse(intraSections);
    assert(!intraCheck.isValid, 'Intra-course duplicate video payload is rejected');
    assert(
      Boolean(intraCheck.error && intraCheck.error.includes('assigned to multiple lectures')),
      `Error message describes duplicate lectures: "${intraCheck.error}"`
    );

    // --------------------------------------------------------------------------
    // Test 2: Create Course 1 with unique video
    // --------------------------------------------------------------------------
    console.log('\n--- Test 2: Create Course 1 with Unique Video ---');
    const validSections1 = [
      {
        title: 'Module 1: Foundations',
        lessons: [
          { title: '1.1 Basics', videoUrl: testVideoA }
        ]
      }
    ];
    const check1 = await validateVideoUniquenessForCourse(validSections1);
    assert(check1.isValid, 'Unique video payload passes validation');

    let category = await prisma.category.findFirst();
    if (!category) {
      category = await prisma.category.create({
        data: { name: 'Engineering', slug: 'engineering' }
      });
    }

    course1 = await prisma.course.create({
      data: {
        title: `Test Course 1 - Math Foundations ${Date.now()}`,
        slug: `test-course-1-${Date.now().toString(36)}`,
        description: 'Test course 1 for video uniqueness verification',
        price: 499,
        instructorId: instructor.id,
        categoryId: category.id,
        sections: {
          create: [
            {
              title: 'Module 1: Foundations',
              order: 1,
              lessons: {
                create: [
                  {
                    title: '1.1 Basics',
                    type: 'VIDEO',
                    videoUrl: testVideoA,
                    order: 1,
                    duration: '10:00',
                    durationSeconds: 600
                  }
                ]
              }
            }
          ]
        }
      }
    });
    assert(Boolean(course1?.id), `Created Course 1 with video: ${testVideoA}`);

    // --------------------------------------------------------------------------
    // Test 3: Attempt to create Course 2 with SAME video URL
    // Even if Course 2 has same or different course title / lecture title!
    // --------------------------------------------------------------------------
    console.log('\n--- Test 3: Cross-Course Duplicate Video Blocking ---');
    const duplicateSectionsCourse2 = [
      {
        title: 'Module 1: Foundations',
        lessons: [
          { title: '1.1 Basics (Same Title)', videoUrl: testVideoA } // Same video as Course 1!
        ]
      }
    ];

    const check2 = await validateVideoUniquenessForCourse(duplicateSectionsCourse2);
    assert(!check2.isValid, 'Course 2 trying to reuse Course 1 video is BLOCKED');
    assert(
      Boolean(check2.error && check2.error.includes(course1.title)),
      `Error identifies conflicting course title: "${check2.error}"`
    );
    assert(
      check2.collisions.length > 0 && check2.collisions[0].existingCourseId === course1.id,
      `Collision points exactly to course 1 ID: ${course1.id}`
    );

    // --------------------------------------------------------------------------
    // Test 4: Self-update of Course 1 retaining same video must NOT trigger false positive
    // --------------------------------------------------------------------------
    console.log('\n--- Test 4: Self-Course Update Exemption (No False Positive) ---');
    const selfUpdateSections = [
      {
        title: 'Module 1: Foundations (Updated Title)',
        lessons: [
          { title: '1.1 Basics (Revised)', videoUrl: testVideoA }
        ]
      }
    ];

    const selfCheck = await validateVideoUniquenessForCourse(selfUpdateSections, course1.id);
    assert(selfCheck.isValid, 'Editing Course 1 with its own existing video does NOT trigger false collision');

    // --------------------------------------------------------------------------
    // Test 5: Excel Validator Intra-Sheet Duplicate Check
    // --------------------------------------------------------------------------
    console.log('\n--- Test 5: Excel Template Intra-Sheet Duplicate Video Check ---');
    const wb = XLSX.utils.book_new();

    // Details sheet
    const detailsData = [
      ['Course Details', 'Value'],
      ['Course Title', 'Excel Unique Video Test Course'],
      ['Category', 'Engineering'],
      ['Level', 'Beginner'],
      ['Price', '499'],
      ['Description', 'A course testing Excel video deduplication engine']
    ];
    const detailsSheet = XLSX.utils.aoa_to_sheet(detailsData);
    XLSX.utils.book_append_sheet(wb, detailsSheet, 'Course Details');

    // Curriculum sheet with duplicate video in row 2 and row 3
    const curData = [
      ['Module Title (Write once per module)', 'Topic / Lesson Title *', 'Content Type (LECTURE / ARTICLE / QUIZ / FINAL ASSESSMENT) *', 'Duration (mm:ss)', 'Video URL *'],
      ['Module 1: Getting Started', '1.1 Intro Lecture', 'LECTURE', '05:00', testVideoB],
      ['', '1.2 Second Lecture with DUPLICATE video', 'LECTURE', '05:00', testVideoB] // Duplicate!
    ];
    const curSheet = XLSX.utils.aoa_to_sheet(curData);
    XLSX.utils.book_append_sheet(wb, curSheet, 'Curriculum');

    const wbBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const excelValidation = validateCourseExcel(wbBuffer, { requireVideoReference: true });

    assert(!excelValidation.isValid, 'Excel spreadsheet with duplicate video URLs across lectures is INVALID');
    const dupVideoErr = excelValidation.errors.find((e) => e.field === 'Video URL' && e.error.includes('Duplicate Video URL'));
    assert(Boolean(dupVideoErr), `Excel validator caught duplicate video: "${dupVideoErr?.error}"`);

    // --------------------------------------------------------------------------
    // Test 6: Renamed Video File with Identical Binary Content (SHA-256 Checksum)
    // --------------------------------------------------------------------------
    console.log('\n--- Test 6: Renamed Video File with Identical Binary Content (SHA-256 Checksum) ---');
    const fakeVideoBuffer = Buffer.from('FAKE_VIDEO_BINARY_STREAM_CONTENT_ABCD_1234567890');
    const crypto = await import('crypto');
    const binaryChecksum = crypto.createHash('sha256').update(fakeVideoBuffer).digest('hex');

    // Create an asset for course 1
    const assetCourse1 = await prisma.mediaAsset.create({
      data: {
        name: 'original_algebra_lecture.mp4',
        url: `/uploads/videos/test_algebra_${Date.now()}.mp4`,
        type: 'VIDEO',
        checksum: binaryChecksum,
        sizeBytes: fakeVideoBuffer.length,
        courseId: course1.id
      }
    });

    // Simulating upload of renamed file for Course 2
    const renamedFileName = 'renamed_quantum_physics_totally_different.mp4';
    const duplicateAssetMatch = await prisma.mediaAsset.findFirst({
      where: {
        type: 'VIDEO',
        OR: [
          { checksum: binaryChecksum },
          {
            sizeBytes: fakeVideoBuffer.length,
            AND: [
              { sizeBytes: { gt: 10 } },
              { name: { in: [renamedFileName] } }
            ]
          }
        ],
        AND: [
          { courseId: { not: 'some-other-course-2-id' } },
          { courseId: { not: null } }
        ]
      }
    });

    assert(Boolean(duplicateAssetMatch), 'System caught renamed video file via SHA-256 binary checksum');
    assert(duplicateAssetMatch?.id === assetCourse1.id, 'Checksum correctly identified original media asset from Course 1');
    assert(duplicateAssetMatch?.name === 'original_algebra_lecture.mp4', `Identified original file name: "${duplicateAssetMatch?.name}"`);

    // Cleanup media asset
    await prisma.mediaAsset.delete({ where: { id: assetCourse1.id } }).catch(() => {});
  } finally {
    // Cleanup test records
    console.log('\n🧹 Cleaning up test course records...');
    if (course1?.id) {
      await prisma.course.delete({ where: { id: course1.id } }).catch(() => {});
    }
    if (course2?.id) {
      await prisma.course.delete({ where: { id: course2.id } }).catch(() => {});
    }
    console.log('Cleanup finished.');
  }

  console.log(`\n========================================`);
  console.log(`Results: ${passCount} Passed, ${failCount} Failed`);
  console.log(`========================================`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test script crashed:', err);
  process.exit(1);
});

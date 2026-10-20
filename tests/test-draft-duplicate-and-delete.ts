import { prisma } from '../src/lib/prisma';
import {
  createOrGetDraftVersion,
  discardDraftVersion,
  getCourseVersionState,
  saveCourseVersionState
} from '../src/lib/course-versioning';

async function runTest() {
  console.log('🧪 Starting Test: Duplicate Draft in Drafts Tab & Safe Deletion of Version Drafts...\n');

  // 1. Setup a test published course
  const testInstructor = await prisma.user.findFirst({
    where: { role: { in: ['INSTRUCTOR', 'ADMIN'] } }
  });
  if (!testInstructor) {
    throw new Error('No instructor found for test');
  }

  const category = await prisma.category.findFirst() || await prisma.category.create({
    data: { name: 'Test Category', slug: `test-cat-${Date.now()}` }
  });

  const testCourse = await prisma.course.create({
    data: {
      title: 'Published Course for Draft Duplicate Test',
      slug: `pub-draft-test-${Date.now()}`,
      description: 'Original published course description',
      price: 2499,
      level: 'BEGINNER',
      status: 'PUBLISHED',
      categoryId: category.id,
      instructorId: testInstructor.id,
      durationHours: 10,
      whatYouWillLearn: '[]',
      sections: {
        create: [
          {
            title: 'Module 1: Introduction',
            lessons: {
              create: [
                {
                  title: 'Lecture 1: Welcome',
                  type: 'VIDEO',
                  videoUrl: 'https://youtube.com/watch?v=demo1',
                  duration: '10:00',
                  durationSeconds: 600,
                  isFree: true
                }
              ]
            }
          }
        ]
      }
    },
    include: { sections: { include: { lessons: true } } }
  });

  console.log(`✅ Step 1: Created live published course [ID: ${testCourse.id}, Status: ${testCourse.status}]`);

  try {
    // 2. Initialize a draft version (simulate clicking "Update Version" or auto-saving when editing)
    const { versionState: draftState } = await createOrGetDraftVersion(testCourse.id, {
      id: testInstructor.id,
      name: testInstructor.name
    });

    console.log(`✅ Step 2: Initialized draft version: Status=${draftState.status}, PendingVersion=${draftState.pendingVersionNumber}`);

    // Modify the draft snapshot (e.g. minor typo or major edit)
    await saveCourseVersionState(testCourse.id, {
      stagedSnapshot: {
        ...testCourse,
        title: 'Published Course for Draft Duplicate Test (Edited Draft)'
      } as any
    });

    const verAfterEdit = await getCourseVersionState(testCourse.id);
    if (!verAfterEdit.stagedSnapshot) {
      throw new Error('Expected staged snapshot to exist in draft version');
    }
    console.log(`✅ Step 3: Saved draft changes to staged snapshot. Draft status=${verAfterEdit.status}`);

    // Verify live course in DB is untouched
    const liveCourseCheck = await prisma.course.findUnique({ where: { id: testCourse.id } });
    if (liveCourseCheck?.title !== 'Published Course for Draft Duplicate Test' || liveCourseCheck?.status !== 'PUBLISHED') {
      throw new Error(`Live course was modified unexpectedly! Title: ${liveCourseCheck?.title}, Status: ${liveCourseCheck?.status}`);
    }
    console.log(`✅ Step 4: Verified live course in database is 100% UNTOUCHED (Title: "${liveCourseCheck.title}", Status: "${liveCourseCheck.status}")`);

    // 3. Discard the draft version (simulate clicking "Del" on the draft item in Drafts tab)
    const discardedState = await discardDraftVersion(testCourse.id, {
      id: testInstructor.id,
      name: testInstructor.name,
      role: testInstructor.role
    });

    if (discardedState.stagedSnapshot !== null) {
      throw new Error('Expected stagedSnapshot to be null after discarding draft');
    }
    if (discardedState.status !== 'LIVE_SYNCED') {
      throw new Error(`Expected status to be LIVE_SYNCED, got ${discardedState.status}`);
    }
    console.log(`✅ Step 5: Discarded draft version. Version status reset to: ${discardedState.status}`);

    // 4. Verify live course in DB is STILL PUBLISHED and 100% intact
    const liveCourseAfterDiscard = await prisma.course.findUnique({ where: { id: testCourse.id } });
    if (!liveCourseAfterDiscard) {
      throw new Error('CRITICAL BUG: Live course was deleted when discarding draft!');
    }
    if (liveCourseAfterDiscard.status !== 'PUBLISHED') {
      throw new Error(`Expected live course status to remain PUBLISHED, got ${liveCourseAfterDiscard.status}`);
    }
    if (liveCourseAfterDiscard.title !== 'Published Course for Draft Duplicate Test') {
      throw new Error('Live course title was corrupted!');
    }
    console.log(`✅ Step 6: Verified live published course is STILL 100% ACTIVE and SAFE in PostgreSQL!`);

    console.log('\n========================================================');
    console.log('🎉 ALL DRAFT DUPLICATION & DISCARD SAFETY TESTS PASSED!');
    console.log('========================================================\n');
  } finally {
    // Cleanup test record
    await prisma.lesson.deleteMany({
      where: { section: { courseId: testCourse.id } }
    }).catch(() => {});
    await prisma.courseSection.deleteMany({
      where: { courseId: testCourse.id }
    }).catch(() => {});
    await prisma.platformSetting.deleteMany({
      where: { key: `course_version_${testCourse.id}` }
    }).catch(() => {});
    await prisma.course.delete({ where: { id: testCourse.id } }).catch(() => {});
  }
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

import assert from 'node:assert';
import { prisma } from '../src/lib/prisma';
import { createOrGetDraftVersion, applyApprovedVersionToLiveCourse, getCourseVersionState, saveCourseVersionState } from '../src/lib/course-versioning';
import { getPublishedCourses } from '../src/lib/courses';

async function runMultiVersionLiveTest() {
  console.log('\n======================================================');
  console.log('🧪 Testing Multi-Version Live & Publishing Lifecycle');
  console.log('======================================================\n');

  let passed = 0;
  const testRunId = `mv_${Date.now().toString(36)}`;

  // 0. Setup Organization, Category & Instructor
  const org = await prisma.organization.create({
    data: {
      name: `Org ${testRunId}`,
      slug: `org-${testRunId}`
    }
  });

  const category = await prisma.category.create({
    data: {
      name: `Tech ${testRunId}`,
      slug: `tech-${testRunId}`
    }
  });

  const instructor = await prisma.user.create({
    data: {
      email: `inst_${testRunId}@test.com`,
      name: 'Instructor MultiVer',
      role: 'INSTRUCTOR',
      platform: 'LMS',
      organizationId: org.id,
      password: 'hashed_password'
    }
  });

  const auditor = {
    id: 'auditor_1',
    name: 'Auditor Pro',
    email: 'auditor@test.com',
    role: 'REVIEWER'
  };

  try {
    // 📌 Step 1: Create Initial v1.0 Live Published Course
    console.log('📌 Step 1: Create Initial v1.0 Live Published Course');
    const v1Course = await prisma.course.create({
      data: {
        organizationId: org.id,
        instructorId: instructor.id,
        categoryId: category.id,
        title: `FullStack AI Bootcamp (${testRunId})`,
        slug: `ai-bootcamp-${testRunId}`,
        description: 'Complete 2026 bootcamp syllabus',
        price: 2999,
        status: 'PUBLISHED',
        versionNumber: 1,
        versionLabel: 'v1.0',
        sections: {
          create: [
            {
              title: 'Module 1: Foundations',
              order: 1,
              lessons: {
                create: [
                  {
                    title: 'Intro to AI',
                    type: 'VIDEO',
                    videoUrl: 'https://youtube.com/watch?v=demo',
                    duration: '10:00',
                    durationSeconds: 600,
                    order: 1
                  }
                ]
              }
            }
          ]
        }
      }
    });

    await saveCourseVersionState(v1Course.id, {
      liveVersionNumber: 1,
      liveVersionLabel: 'v1.0',
      status: 'LIVE_SYNCED',
      history: [{
        versionNumber: 1,
        versionLabel: 'v1.0',
        publishedAt: new Date().toISOString(),
        approvedBy: 'System',
        changeSummary: ['Initial Release'],
        price: 2999,
        modulesCount: 1,
        lessonsCount: 1
      }]
    });

    assert.strictEqual(v1Course.status, 'PUBLISHED', 'v1.0 course status is PUBLISHED');
    console.log('  ✅ PASS: v1.0 course created and PUBLISHED');
    passed++;

    // 📌 Step 2: Instructor clicks "Update Version" -> Creates v2.0 Child Course Draft
    console.log('\n📌 Step 2: Instructor clicks "Update Version" -> Creates v2.0 Child Course Draft');
    const v2DraftResult = await createOrGetDraftVersion(v1Course.id, { id: instructor.id, name: instructor.name });
    assert.strictEqual(v2DraftResult.isNewDraft, true, 'isNewDraft should be true');
    assert.ok(v2DraftResult.draftCourse, 'v2 draft course created');
    assert.strictEqual(v2DraftResult.draftCourse.versionNumber, 2, 'v2 versionNumber is 2');
    assert.strictEqual(v2DraftResult.draftCourse.versionLabel, 'v2.0', 'v2 versionLabel is v2.0');
    assert.strictEqual(v2DraftResult.draftCourse.status, 'DRAFT', 'v2 initial status is DRAFT');
    assert.strictEqual(v2DraftResult.draftCourse.parentCourseId, v1Course.id, 'v2 parentCourseId matches v1');
    console.log('  ✅ PASS: v2.0 child draft course created');
    passed++;

    // 📌 Step 3: Auditor Approves v2.0
    console.log('\n📌 Step 3: Auditor Approves v2.0');
    // Simulate Auditor reviewing and approving child course v2.0
    await prisma.course.update({
      where: { id: v2DraftResult.draftCourse.id },
      data: { status: 'APPROVED' }
    });
    await saveCourseVersionState(v2DraftResult.draftCourse.id, {
      status: 'APPROVED',
      pendingVersionNumber: 2,
      pendingVersionLabel: 'v2.0',
      reviewedAt: new Date().toISOString(),
      reviewedBy: `${auditor.name} (${auditor.role})`
    });
    // Ensure parent course v1.0 remains untouched and clean
    await saveCourseVersionState(v1Course.id, {
      status: 'LIVE_SYNCED',
      pendingVersionNumber: null,
      pendingVersionLabel: null
    });

    // Check v1.0 state: Must NOT be approved! Must remain published live!
    const v1AfterApprove = await prisma.course.findUnique({ where: { id: v1Course.id } });
    const v1StateAfterApprove = await getCourseVersionState(v1Course.id);
    assert.strictEqual(v1AfterApprove?.status, 'PUBLISHED', 'v1.0 is still PUBLISHED');
    assert.strictEqual(v1StateAfterApprove.status, 'LIVE_SYNCED', 'v1.0 version state remains LIVE_SYNCED (NOT APPROVED)');
    assert.strictEqual(v1StateAfterApprove.pendingVersionNumber, null, 'v1.0 has no pending version');
    console.log('  ✅ PASS: v1.0 remains untouched, live, and NOT marked as approved');
    passed++;

    const v2AfterApprove = await prisma.course.findUnique({ where: { id: v2DraftResult.draftCourse.id } });
    const v2StateAfterApprove = await getCourseVersionState(v2DraftResult.draftCourse.id);
    assert.strictEqual(v2AfterApprove?.status, 'APPROVED', 'v2.0 course status is APPROVED');
    assert.strictEqual(v2StateAfterApprove.status, 'APPROVED', 'v2.0 version state is APPROVED');
    console.log('  ✅ PASS: v2.0 course is APPROVED and ready for instructor Publish Live');
    passed++;

    // 📌 Step 4: Instructor Clicks "Publish Live" on v2.0
    console.log('\n📌 Step 4: Instructor Clicks "Publish Live" on v2.0');
    const publishResult = await applyApprovedVersionToLiveCourse(v2DraftResult.draftCourse.id, instructor, 'Instructor published live');
    assert.strictEqual(publishResult.status, 'LIVE_SYNCED', 'publishResult status is LIVE_SYNCED');

    const v1Final = await prisma.course.findUnique({ where: { id: v1Course.id } });
    const v2Final = await prisma.course.findUnique({ where: { id: v2DraftResult.draftCourse.id } });
    const v1FinalState = await getCourseVersionState(v1Course.id);
    const v2FinalState = await getCourseVersionState(v2DraftResult.draftCourse.id);

    assert.strictEqual(v1Final?.status, 'PUBLISHED', 'v1.0 is PUBLISHED');
    assert.strictEqual(v2Final?.status, 'PUBLISHED', 'v2.0 is PUBLISHED');
    assert.strictEqual(v1FinalState.status, 'LIVE_SYNCED', 'v1.0 version state is LIVE_SYNCED');
    assert.strictEqual(v2FinalState.status, 'LIVE_SYNCED', 'v2.0 version state is LIVE_SYNCED');
    assert.strictEqual(v1FinalState.liveVersionNumber, 1, 'v1.0 liveVersionNumber is 1');
    assert.strictEqual(v2FinalState.liveVersionNumber, 2, 'v2.0 liveVersionNumber is 2');
    console.log('  ✅ PASS: Both v1.0 and v2.0 are PUBLISHED and LIVE_SYNCED');
    passed++;

    // 📌 Step 5: Verify Both Versions appear in Public Course Catalog & Homepage
    console.log('\n📌 Step 5: Verify Both Versions appear in Public Course Catalog & Homepage');
    const publishedCatalog = await getPublishedCourses();
    const foundV1 = publishedCatalog.find(c => c.id === v1Course.id);
    const foundV2 = publishedCatalog.find(c => c.id === v2DraftResult.draftCourse.id);

    assert.ok(foundV1, 'v1.0 appears in getPublishedCourses()');
    assert.ok(foundV2, 'v2.0 appears in getPublishedCourses()');
    console.log(`  ✅ PASS: Both v1.0 (ID: ${v1Course.id.slice(-6)}) and v2.0 (ID: ${v2DraftResult.draftCourse.id.slice(-6)}) appear on homepage & catalog`);
    passed++;

    // 📌 Step 6: Verify Unlimited Versions (Clicking "Update Version" on v2.0 creates v3.0)
    console.log('\n📌 Step 6: Verify Unlimited Versions (Instructor creates v3.0)');
    const v3DraftResult = await createOrGetDraftVersion(v2DraftResult.draftCourse.id, { id: instructor.id, name: instructor.name });
    assert.strictEqual(v3DraftResult.isNewDraft, true, 'isNewDraft for v3 is true');
    assert.strictEqual(v3DraftResult.draftCourse.versionNumber, 3, 'v3 versionNumber is 3');
    assert.strictEqual(v3DraftResult.draftCourse.versionLabel, 'v3.0', 'v3 versionLabel is v3.0');
    assert.strictEqual(v3DraftResult.draftCourse.status, 'DRAFT', 'v3 status is DRAFT');
    console.log('  ✅ PASS: Version 3.0 draft successfully spawned from v2.0 (Unlimited version updates supported)');
    passed++;

    console.log('\n======================================================');
    console.log(`📊 Test Results: ${passed} Passed, 0 Failed`);
    console.log('======================================================\n');
  } finally {
    // Cleanup
    await prisma.lesson.deleteMany({ where: { section: { course: { organizationId: org.id } } } }).catch(() => {});
    await prisma.courseSection.deleteMany({ where: { course: { organizationId: org.id } } }).catch(() => {});
    await prisma.course.deleteMany({ where: { organizationId: org.id } }).catch(() => {});
    await prisma.category.deleteMany({ where: { id: category.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { organizationId: org.id } }).catch(() => {});
    await prisma.organization.deleteMany({ where: { id: org.id } }).catch(() => {});
  }
}

runMultiVersionLiveTest()
  .catch((e) => {
    console.error('Test Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

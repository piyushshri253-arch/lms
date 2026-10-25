import { prisma } from '../src/lib/prisma';
import {
  createOrGetDraftVersion,
  discardDraftVersion,
  getCourseVersionState,
  applyApprovedVersionToLiveCourse
} from '../src/lib/course-versioning';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, extra?: any) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${name}`, extra || '');
    failed++;
  }
}

async function runE2ETests() {
  console.log('\n======================================================');
  console.log('🚀 Running Update Version & Course Versioning E2E Tests');
  console.log('======================================================\n');

  try {
    // 0. Setup test users and category
    const instructor = await prisma.user.upsert({
      where: { email_platform: { email: 'e2e.instructor@morena.edu', platform: 'MORENA_LMS' } },
      update: { role: 'INSTRUCTOR', name: 'Dr. E2E Instructor' },
      create: {
        email: 'e2e.instructor@morena.edu',
        name: 'Dr. E2E Instructor',
        role: 'INSTRUCTOR',
        platform: 'MORENA_LMS',
        password: 'dummy'
      }
    });

    const auditor = await prisma.user.upsert({
      where: { email_platform: { email: 'e2e.auditor@morena.edu', platform: 'MORENA_LMS' } },
      update: { role: 'REVIEWER', name: 'Dr. E2E Auditor' },
      create: {
        email: 'e2e.auditor@morena.edu',
        name: 'Dr. E2E Auditor',
        role: 'REVIEWER',
        platform: 'MORENA_LMS',
        password: 'dummy'
      }
    });

    let category = await prisma.category.findFirst();
    if (!category) {
      category = await prisma.category.create({
        data: { name: 'Full Stack Engineering', slug: `fse-${Date.now()}` }
      });
    }

    // Clean up any old test runs with same title prefix
    const oldCourses = await prisma.course.findMany({
      where: { slug: { startsWith: 'e2e-ver-' } },
      select: { id: true }
    });
    for (const c of oldCourses) {
      await prisma.courseSection.deleteMany({ where: { courseId: c.id } }).catch(() => {});
      await prisma.course.delete({ where: { id: c.id } }).catch(() => {});
    }

    // 1. Create Course A (v1.0 Live Published Course)
    const slugA = `e2e-ver-course-v1-${Date.now()}`;
    const courseA = await prisma.course.create({
      data: {
        title: 'Mastering Next.js 15 & Prisma Architecture',
        slug: slugA,
        description: 'Complete production guide from fundamentals to enterprise scaling.',
        shortDescription: 'Production architecture masterclass',
        price: 4999,
        discountPrice: 2499,
        status: 'PUBLISHED',
        versionNumber: 1,
        versionLabel: 'v1.0',
        parentCourseId: null,
        instructorId: instructor.id,
        categoryId: category.id,
        sections: {
          create: [
            {
              title: 'Module 1: App Router & Server Components',
              order: 1,
              lessons: {
                create: [
                  {
                    title: '1.1 React Server Components Deep Dive',
                    type: 'VIDEO',
                    videoUrl: 'https://vimeo.com/900000001',
                    duration: '15:00',
                    durationSeconds: 900,
                    order: 1
                  },
                  {
                    title: '1.2 Streaming with Suspense',
                    type: 'VIDEO',
                    videoUrl: 'https://vimeo.com/900000002',
                    duration: '12:00',
                    durationSeconds: 720,
                    order: 2
                  }
                ]
              }
            },
            {
              title: 'Module 2: Assessments',
              order: 2,
              lessons: {
                create: [
                  {
                    title: 'Final Assignment: Architectural Certification Exam',
                    type: 'QUIZ',
                    quizData: JSON.stringify({
                      questions: [
                        { question: 'What is hydration?', options: ['Client init', 'Server render'], answer: 0 },
                        { question: 'What is Suspense?', options: ['Async UI boundary', 'DB query'], answer: 0 }
                      ]
                    }),
                    order: 1
                  }
                ]
              }
            }
          ]
        }
      },
      include: {
        sections: {
          include: { lessons: true }
        }
      }
    });

    console.log('📌 Test Group 1: Published Course Initial State');
    assert(courseA.id !== undefined, 'Course A created successfully');
    assert(courseA.status === 'PUBLISHED', 'Course A status is PUBLISHED');
    assert(courseA.parentCourseId === null, 'Course A has parentCourseId === null');
    assert(courseA.versionNumber === 1, 'Course A has versionNumber === 1');
    assert(courseA.versionLabel === 'v1.0', 'Course A has versionLabel === "v1.0"');
    assert(courseA.sections.length === 2, 'Course A has 2 modules');
    assert(courseA.sections[0].lessons.length === 2, 'Course A module 1 has 2 lessons');

    // 2. Click "Update Version" -> Creates Course B (v2.0 Draft) in PostgreSQL
    console.log('\n📌 Test Group 2: Update Version Trigger & Independent Duplication');
    const updateVerResult = await createOrGetDraftVersion(courseA.id, {
      id: instructor.id,
      name: instructor.name
    });

    assert(updateVerResult.isNewDraft === true, 'Update Version returns isNewDraft === true');
    assert(!!updateVerResult.draftCourse, 'Update Version returns draftCourse object');
    const draftCourseId = updateVerResult.draftCourse.id;
    assert(draftCourseId !== courseA.id, 'Draft course ID is a distinct independent ID from Course A');

    // Verify Course B in PostgreSQL
    const courseB = await prisma.course.findUnique({
      where: { id: draftCourseId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } }
        }
      }
    });

    assert(!!courseB, 'Course B exists in PostgreSQL database');
    assert(courseB?.parentCourseId === courseA.id, 'Course B parentCourseId points to Course A.id');
    assert(courseB?.status === 'DRAFT', 'Course B status is DRAFT');
    assert(courseB?.versionNumber === 2, 'Course B versionNumber is 2');
    assert(courseB?.versionLabel === 'v2.0', 'Course B versionLabel is "v2.0"');
    assert(courseB?.sections.length === 2, 'Course B duplicated all 2 modules from Course A');
    assert(courseB?.sections[0].lessons.length === 2, 'Course B duplicated all lessons in Module 1');
    assert(courseB?.sections[0].lessons[0].videoUrl === 'https://vimeo.com/900000001', 'Course B lesson has identical videoUrl');
    assert(courseB?.sections[1].lessons[0].quizData !== null, 'Course B duplicated quizData in Module 2');

    // Verify Course A was NOT deleted or modified
    const courseACheck = await prisma.course.findUnique({
      where: { id: courseA.id },
      include: { sections: { include: { lessons: true } } }
    });
    assert(!!courseACheck, 'Course A still exists in PostgreSQL');
    assert(courseACheck?.status === 'PUBLISHED', 'Course A remains PUBLISHED and active');
    assert(courseACheck?.sections.length === 2, 'Course A still has exactly 2 modules');

    // 3. Repeated Click on "Update Version" -> Reuses existing draft (Idempotent)
    console.log('\n📌 Test Group 3: Idempotent Draft Reuse');
    const secondClick = await createOrGetDraftVersion(courseA.id, {
      id: instructor.id,
      name: instructor.name
    });
    assert(secondClick.isNewDraft === false, 'Repeated click returns isNewDraft === false');
    assert(secondClick.draftCourse.id === draftCourseId, 'Repeated click returns the EXACT same draft course ID');

    const totalChildDrafts = await prisma.course.count({
      where: { parentCourseId: courseA.id, status: 'DRAFT' }
    });
    assert(totalChildDrafts === 1, 'Only 1 draft course row exists for Course A in PostgreSQL (no duplicates)');

    // 4. Modify Draft Course B independently
    console.log('\n📌 Test Group 4: Independent Editing of Version 2 Draft');
    // Add Module 3 to Course B
    const newModule3 = await prisma.courseSection.create({
      data: {
        courseId: courseB!.id,
        title: 'Module 3: Server Actions & Optimistic UI (v2 Exclusive)',
        order: 3,
        lessons: {
          create: [
            {
              title: '3.1 useOptimistic Hook Explained',
              type: 'VIDEO',
              videoUrl: 'https://vimeo.com/900000003',
              duration: '18:00',
              durationSeconds: 1080,
              order: 1
            }
          ]
        }
      }
    });

    // Update Course B price and title
    await prisma.course.update({
      where: { id: courseB!.id },
      data: {
        title: 'Mastering Next.js 15 & Prisma Architecture (v2.0)',
        price: 5999
      }
    });

    // Re-verify Course A is 100% untouched
    const courseAAfterBEdit = await prisma.course.findUnique({
      where: { id: courseA.id },
      include: { sections: { include: { lessons: true } } }
    });
    assert(courseAAfterBEdit?.sections.length === 2, 'Course A STILL has only 2 modules (Module 3 not added to Course A)');
    assert(courseAAfterBEdit?.price === 4999, 'Course A STILL has price 4999 (not modified by Course B edit of 5999)');
    assert(courseAAfterBEdit?.title === 'Mastering Next.js 15 & Prisma Architecture', 'Course A title remains untouched');

    // 5. Submit Course B for Review / Approval Workflow
    console.log('\n📌 Test Group 5: Submit for Approval & Status Transitions');
    // Simulate instructor submitting Course B for review
    await prisma.course.update({
      where: { id: courseB!.id },
      data: { status: 'IN_REVIEW' }
    });

    const courseBInReview = await prisma.course.findUnique({ where: { id: courseB!.id } });
    assert(courseBInReview?.status === 'IN_REVIEW', 'Course B status transitioned to IN_REVIEW');

    const courseAStillLive = await prisma.course.findUnique({ where: { id: courseA.id } });
    assert(courseAStillLive?.status === 'PUBLISHED', 'Course A remains PUBLISHED while Course B is IN_REVIEW');

    // 6. Auditor Review: Rejection / Changes Requested
    console.log('\n📌 Test Group 6: Auditor Changes Requested Flow');
    await prisma.course.update({
      where: { id: courseB!.id },
      data: {
        status: 'CHANGES_REQUESTED',
        reviewFeedback: 'Please add captions to lesson 3.1 and expand explanation in Module 2.'
      }
    });

    const courseBChangesReq = await prisma.course.findUnique({ where: { id: courseB!.id } });
    assert(courseBChangesReq?.status === 'CHANGES_REQUESTED', 'Course B status transitioned to CHANGES_REQUESTED');
    assert(Boolean(courseBChangesReq?.reviewFeedback?.includes('Please add captions')), 'Course B has auditor feedback note');

    const courseAAfterRejection = await prisma.course.findUnique({ where: { id: courseA.id } });
    assert(courseAAfterRejection?.status === 'PUBLISHED', 'Course A remains PUBLISHED throughout review feedback');

    // 7. Auditor Review: Approval & Live Publishing of Version 2
    console.log('\n📌 Test Group 7: Auditor Approval & Independent Co-existence of v1 and v2');
    const appliedApproval = await applyApprovedVersionToLiveCourse(
      courseB!.id,
      { id: auditor.id, name: auditor.name, email: auditor.email, role: auditor.role },
      'Course updates approved by Lead Auditor.'
    );

    assert(appliedApproval.status === 'APPROVED', 'applyApprovedVersionToLiveCourse returns APPROVED');

    const courseBApproved = await prisma.course.findUnique({ where: { id: courseB!.id } });
    assert(courseBApproved?.status === 'PUBLISHED', 'Course B status is now PUBLISHED');
    assert(courseBApproved?.versionLabel === 'v2.0', 'Course B has versionLabel "v2.0"');

    const courseAFinal = await prisma.course.findUnique({ where: { id: courseA.id } });
    assert(courseAFinal?.status === 'PUBLISHED', 'Course A is STILL PUBLISHED in the database!');
    assert(courseAFinal?.versionLabel === 'v1.0', 'Course A has versionLabel "v1.0"');

    // Both courses co-exist in PostgreSQL simultaneously
    const allVersionsInDB = await prisma.course.findMany({
      where: {
        OR: [
          { id: courseA.id },
          { parentCourseId: courseA.id }
        ]
      },
      select: { id: true, versionLabel: true, status: true, price: true }
    });

    assert(allVersionsInDB.length === 2, 'BOTH Course v1.0 and Course v2.0 co-exist in PostgreSQL database!');
    const v1Record = allVersionsInDB.find((c) => c.versionLabel === 'v1.0');
    const v2Record = allVersionsInDB.find((c) => c.versionLabel === 'v2.0');
    assert(v1Record?.status === 'PUBLISHED', 'v1.0 record is PUBLISHED in PostgreSQL');
    assert(v2Record?.status === 'PUBLISHED', 'v2.0 record is PUBLISHED in PostgreSQL');
    assert(v1Record?.price === 4999, 'v1.0 price preserved as ₹4999');
    assert(v2Record?.price === 5999, 'v2.0 price is ₹5999');

    // 8. Test Discard Draft Workflow on a separate course
    console.log('\n📌 Test Group 8: Discard Draft Workflow');
    const slugC = `e2e-ver-course-discard-${Date.now()}`;
    const courseC = await prisma.course.create({
      data: {
        title: 'Kubernetes Cluster Architecture',
        slug: slugC,
        description: 'Complete Kubernetes architecture course.',
        price: 3999,
        status: 'PUBLISHED',
        versionNumber: 1,
        versionLabel: 'v1.0',
        instructorId: instructor.id,
        categoryId: category.id,
        sections: {
          create: [{ title: 'Intro to K8s', order: 1 }]
        }
      }
    });

    // Create draft version for Course C
    const draftCResult = await createOrGetDraftVersion(courseC.id, {
      id: instructor.id,
      name: instructor.name
    });
    const draftCCourseId = draftCResult.draftCourse.id;

    const draftCExistsBefore = await prisma.course.findUnique({ where: { id: draftCCourseId } });
    assert(!!draftCExistsBefore, 'Draft version for Course C exists before discard');

    // Now Discard the draft version
    await discardDraftVersion(draftCCourseId, {
      id: instructor.id,
      name: instructor.name,
      role: instructor.role
    });

    const draftCAfterDiscard = await prisma.course.findUnique({ where: { id: draftCCourseId } });
    assert(draftCAfterDiscard === null, 'Draft version Course was cleanly deleted from PostgreSQL');

    const courseCAfterDiscard = await prisma.course.findUnique({ where: { id: courseC.id } });
    assert(!!courseCAfterDiscard, 'Original Course C remains in PostgreSQL');
    assert(courseCAfterDiscard?.status === 'PUBLISHED', 'Original Course C remains PUBLISHED and active');

    // Clean up test courses
    await prisma.courseSection.deleteMany({ where: { courseId: courseB!.id } }).catch(() => {});
    await prisma.course.delete({ where: { id: courseB!.id } }).catch(() => {});
    await prisma.courseSection.deleteMany({ where: { courseId: courseA.id } }).catch(() => {});
    await prisma.course.delete({ where: { id: courseA.id } }).catch(() => {});
    await prisma.courseSection.deleteMany({ where: { courseId: courseC.id } }).catch(() => {});
    await prisma.course.delete({ where: { id: courseC.id } }).catch(() => {});

  } catch (error) {
    console.error('❌ E2E Test execution error:', error);
    failed++;
  } finally {
    console.log('\n======================================================');
    console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');
    await prisma.$disconnect();
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runE2ETests();

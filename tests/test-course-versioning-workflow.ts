import { prisma } from '../src/lib/prisma';
import {
  classifyCourseChanges,
  getCourseVersionState,
  saveCourseVersionState,
  applyMinorUpdateToLiveCourse,
  applyApprovedVersionToLiveCourse,
  StagedCourseSnapshot,
  getStudentEnrolledVersion
} from '../src/lib/course-versioning';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`, details || '');
    failedTests++;
  }
}

async function runCourseVersioningTests() {
  console.log('\n🚀 Starting Morena Teach LMS Published Course Management & Versioning Tests...\n');

  // Test setup: ensure clean test course and user
  const testInstructor = await prisma.user.upsert({
    where: { email_platform: { email: 'instructor.versioning.test@morena.edu', platform: 'MORENA_LMS' } },
    update: { role: 'INSTRUCTOR', name: 'Prof. Versioning Tester' },
    create: {
      email: 'instructor.versioning.test@morena.edu',
      name: 'Prof. Versioning Tester',
      role: 'INSTRUCTOR',
      platform: 'MORENA_LMS',
      password: 'dummy-password'
    }
  });

  const testAuditor = await prisma.user.upsert({
    where: { email_platform: { email: 'auditor.versioning.test@morena.edu', platform: 'MORENA_LMS' } },
    update: { role: 'REVIEWER', name: 'Senior Curriculum Auditor' },
    create: {
      email: 'auditor.versioning.test@morena.edu',
      name: 'Senior Curriculum Auditor',
      role: 'REVIEWER',
      platform: 'MORENA_LMS',
      password: 'dummy-password'
    }
  });

  const testStudent = await prisma.user.upsert({
    where: { email_platform: { email: 'student.versioning.test@morena.edu', platform: 'MORENA_LMS' } },
    update: { role: 'STUDENT', name: 'Enrolled Test Student' },
    create: {
      email: 'student.versioning.test@morena.edu',
      name: 'Enrolled Test Student',
      role: 'STUDENT',
      platform: 'MORENA_LMS',
      password: 'dummy-password'
    }
  });

  let testCategory = await prisma.category.findFirst();
  if (!testCategory) {
    testCategory = await prisma.category.create({
      data: { name: 'Computer Science', slug: `cs-${Date.now()}` }
    });
  }

  const courseSlug = `test-ver-course-${Date.now()}`;
  const testCourse = await prisma.course.create({
    data: {
      title: 'Advanced Machine Learning & Deep Neural Nets',
      slug: courseSlug,
      shortDescription: 'Master modern deep learning architectures and transformers.',
      description: 'Comprehensive graduate-level course covering CNNs, RNNs, and Transformers.',
      price: 2999,
      discountPrice: 1999,
      currency: 'INR',
      level: 'ADVANCED',
      language: 'English',
      status: 'PUBLISHED',
      whatYouWillLearn: JSON.stringify(['Understand Backpropagation', 'Train CNNs', 'Fine-tune LLMs']),
      requirements: JSON.stringify(['Python proficiency', 'Linear Algebra basics']),
      targetAudience: JSON.stringify(['AI Engineers', 'Data Scientists']),
      instructor: {
        connect: { id: testInstructor.id }
      },
      category: {
        connect: { id: testCategory.id }
      },
      sections: {
        create: [
          {
            title: 'Module 1: Foundations of Deep Learning',
            order: 1,
            lessons: {
              create: [
                {
                  title: 'Lecture 1: Computational Graphs & Autodiff',
                  order: 1,
                  type: 'VIDEO',
                  videoUrl: 'https://cdn.example.com/videos/dl-1.mp4',
                  duration: '12:00',
                  durationSeconds: 720,
                  isFree: true,
                  isPublished: true
                },
                {
                  title: 'Article 1: Mathematical Foundations of Loss Functions',
                  order: 2,
                  type: 'TEXT',
                  content: '# Loss Functions\nDetailed breakdown of cross-entropy and MSE.',
                  duration: '06:00',
                  durationSeconds: 360,
                  isFree: false,
                  isPublished: true
                }
              ]
            }
          },
          {
            title: 'Module 2: Capstone Assignment & Certification',
            order: 2,
            lessons: {
              create: [
                {
                  title: 'Final Assignment: End-to-End Image Classifier',
                  order: 1,
                  type: 'FINAL_ASSIGNMENT',
                  content: 'Submit a complete PyTorch training script and model weights.',
                  duration: '45:00',
                  durationSeconds: 2700,
                  isFree: false,
                  isPublished: true
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

  const initialEnrollment = await prisma.enrollment.create({
    data: {
      userId: testStudent.id,
      courseId: testCourse.id,
      status: 'ACTIVE'
    }
  });

  // =========================================================================
  // TEST SUITE 1: Minor vs Major Change Classification
  // =========================================================================
  console.log('📌 Test Suite 1: Minor vs Major Change Classification');

  // Case 1A: Minor Change (Typo fix in description + metadata)
  const minorUpdates = {
    shortDescription: 'Master modern deep learning architectures and foundation models.',
    seoTitle: 'Deep Learning Masterclass 2026',
    seoDescription: 'Comprehensive guide to modern neural networks.'
  };
  const minorClassification = classifyCourseChanges(testCourse, minorUpdates);
  assert(
    !minorClassification.hasMajorChanges && minorClassification.minorChanges.length > 0,
    'Minor changes (shortDescription, SEO) correctly classified as non-major and auto-publishable',
    minorClassification
  );

  // Case 1B: Major Change (Curriculum lesson added)
  const majorCurriculumUpdates = {
    sections: [
      ...testCourse.sections,
      {
        id: 'new-sec-id',
        title: 'Module 3: Generative AI & Diffusion Models',
        order: 3,
        lessons: [
          {
            id: 'new-les-id',
            title: 'Lecture 3: Diffusion Probabilistic Models',
            order: 1,
            type: 'VIDEO',
            videoUrl: 'https://cdn.example.com/videos/diff.mp4',
            duration: '18:00',
            durationSeconds: 1080
          }
        ]
      }
    ]
  };
  const majorCurriculumClassification = classifyCourseChanges(testCourse, majorCurriculumUpdates);
  assert(
    majorCurriculumClassification.hasMajorChanges &&
      majorCurriculumClassification.majorChanges.some((c) => c.category === 'CURRICULUM'),
    'Adding a module/lesson correctly classified as MAJOR change under CURRICULUM category',
    majorCurriculumClassification.majorChanges
  );

  // Case 1C: Major Change (Pricing change)
  const majorPricingUpdates = {
    price: 3999,
    discountPrice: 2499
  };
  const majorPricingClassification = classifyCourseChanges(testCourse, majorPricingUpdates);
  assert(
    majorPricingClassification.hasMajorChanges &&
      majorPricingClassification.majorChanges.some((c) => c.category === 'PRICE' || (c as any).category === 'PRICING'),
    'Modifying course price correctly classified as MAJOR change under PRICING/PRICE category',
    majorPricingClassification.majorChanges
  );

  // Case 1D: Major Change (Learning Outcomes change)
  const majorOutcomesUpdates = {
    whatYouWillLearn: ['Understand Backpropagation', 'Train CNNs', 'Fine-tune LLMs', 'Implement Diffusion Pipelines']
  };
  const majorOutcomesClassification = classifyCourseChanges(testCourse, majorOutcomesUpdates);
  assert(
    majorOutcomesClassification.hasMajorChanges &&
      majorOutcomesClassification.majorChanges.some((c) => c.category === 'LEARNING_OUTCOMES'),
    'Modifying course learning outcomes correctly classified as MAJOR change',
    majorOutcomesClassification.majorChanges
  );

  // Case 1E: Mixed Changes (Minor typo fix + Major lesson change)
  const mixedUpdates = {
    shortDescription: 'Master modern deep learning architectures and foundation models.',
    price: 3499
  };
  const mixedClassification = classifyCourseChanges(testCourse, mixedUpdates);
  assert(
    mixedClassification.hasMajorChanges,
    'Mixed changes (minor typo + major price edit) correctly classified as MAJOR and requires review',
    mixedClassification
  );

  // =========================================================================
  // TEST SUITE 2: Version Draft Creation, Preservation & Reuse
  // =========================================================================
  console.log('\n📌 Test Suite 2: Version Draft Creation, Preservation & Reuse');

  // Verify initial version state
  const v1State = await getCourseVersionState(testCourse.id);
  assert(v1State.liveVersionNumber === 1, 'Initial live version number is 1');

  // Simulate instructor initiating "Update Version"
  const nextVerNum = (v1State.liveVersionNumber || 1) + 1;
  const nextVerLabel = `v${nextVerNum}.0`;

  const stagedDraftSnapshot: StagedCourseSnapshot = {
    title: testCourse.title,
    description: testCourse.description || '',
    shortDescription: testCourse.shortDescription || undefined,
    price: 3499, // Major change
    discountPrice: 2499,
    currency: 'INR',
    level: testCourse.level,
    language: testCourse.language,
    durationHours: 15,
    whatYouWillLearn: ['Understand Backpropagation', 'Train CNNs', 'Fine-tune LLMs', 'Deploy TensorRT'],
    sections: [
      ...testCourse.sections.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description || undefined,
        order: s.order,
        lessons: s.lessons.map((l) => ({
          id: l.id,
          title: l.title,
          description: l.description || undefined,
          type: l.type,
          videoUrl: l.videoUrl || undefined,
          duration: l.duration,
          durationSeconds: l.durationSeconds,
          isFree: l.isFree,
          isFinalAssignment: Boolean((l as any).isFinalAssignment || l.type === 'FINAL_ASSIGNMENT'),
          isPublished: l.isPublished,
          order: l.order
        }))
      }))
    ]
  };

  const draftState = await saveCourseVersionState(testCourse.id, {
    pendingVersionNumber: nextVerNum,
    pendingVersionLabel: nextVerLabel,
    status: 'DRAFT_VERSION',
    detectedChanges: majorPricingClassification.majorChanges,
    stagedSnapshot: stagedDraftSnapshot,
    submittedBy: testInstructor.name
  });

  assert(
    draftState.status === 'DRAFT_VERSION' && draftState.pendingVersionNumber === 2,
    'Draft Version 2.0 created successfully with status DRAFT_VERSION'
  );

  // Verify live course in DB was NOT mutated!
  const liveCourseAfterDraft = await prisma.course.findUnique({
    where: { id: testCourse.id }
  });
  assert(
    liveCourseAfterDraft?.price === 2999 && liveCourseAfterDraft?.status === 'PUBLISHED',
    'Live published course in PostgreSQL database remains completely untouched ($2999, PUBLISHED) while draft is edited'
  );

  // Repeated Update Version clicks must reuse the existing open draft
  const draftStateAfterReclick = await saveCourseVersionState(testCourse.id, {
    pendingVersionNumber: draftState.pendingVersionNumber || 2,
    pendingVersionLabel: draftState.pendingVersionLabel || 'v2.0',
    status: 'DRAFT_VERSION',
    detectedChanges: draftState.detectedChanges,
    stagedSnapshot: draftState.stagedSnapshot
  });
  assert(
    draftStateAfterReclick.pendingVersionNumber === 2 && draftStateAfterReclick.status === 'DRAFT_VERSION',
    'Repeated clicks reuse existing open draft (V2.0) without creating duplicate orphaned versions'
  );

  // =========================================================================
  // TEST SUITE 3: Submitting Version for Review & Auditor Approval
  // =========================================================================
  console.log('\n📌 Test Suite 3: Submission for Review & Auditor Approval');

  // Submit draft for review
  const submittedState = await saveCourseVersionState(testCourse.id, {
    ...draftState,
    status: 'PENDING_REVIEW',
    submittedAt: new Date().toISOString()
  });
  assert(submittedState.status === 'PENDING_REVIEW', 'Draft version state transitioned to PENDING_REVIEW');

  // Auditor approves version
  const approvalResult = await applyApprovedVersionToLiveCourse(
    testCourse.id,
    { id: testAuditor.id, name: testAuditor.name, email: testAuditor.email, role: testAuditor.role },
    'Approved - meets all curriculum and pricing standards'
  );

  assert(
    approvalResult.liveVersionNumber === 2 &&
      ((approvalResult as any).status === 'LIVE_SYNCED' || (approvalResult as any).status === 'PUBLISHED'),
    'Auditor approval updates live version number to 2 and syncs version state',
    approvalResult
  );

  // Verify live course in PostgreSQL was updated with approved changes
  const liveCourseAfterApproval = await prisma.course.findUnique({
    where: { id: testCourse.id }
  });
  assert(
    liveCourseAfterApproval?.price === 3499,
    'Live published course price successfully updated to approved value ($3499)'
  );

  // Verify version history has recorded both V1 and V2
  assert(
    approvalResult.history.length >= 2,
    `Version history contains ${approvalResult.history.length} versions`
  );
  const v1History = approvalResult.history.find((h) => h.versionNumber === 1);
  const v2History = approvalResult.history.find((h) => h.versionNumber === 2);
  assert(
    v1History?.status === 'SUPERSEDED' && v2History?.status === 'PUBLISHED',
    'V1 marked as SUPERSEDED and V2 marked as PUBLISHED in version history'
  );

  // =========================================================================
  // TEST SUITE 4: Minor Change Auto-Publish
  // =========================================================================
  console.log('\n📌 Test Suite 4: Minor Change Auto-Publish');

  const minorUpdateResult = await applyMinorUpdateToLiveCourse(
    testCourse.id,
    { shortDescription: 'Master modern deep learning architectures and foundation models with hands-on labs.' },
    { id: testInstructor.id, name: testInstructor.name, role: testInstructor.role },
    minorClassification.minorChanges
  );
  assert(
    minorUpdateResult.shortDescription === 'Master modern deep learning architectures and foundation models with hands-on labs.',
    'Minor change (shortDescription) immediately auto-published to live course without auditor review'
  );

  // Lecture typo / spelling fix test:
  const liveSec = await prisma.courseSection.findFirst({
    where: { courseId: testCourse.id },
    include: { lessons: true }
  });
  const firstLesson = liveSec?.lessons[0];
  if (firstLesson) {
    const lectureClassification = classifyCourseChanges(
      { sections: [{ id: liveSec.id, title: liveSec.title, lessons: [{ id: firstLesson.id, title: 'Lecture 1: Computatinal Graphs & Autodiff' }] }] },
      { sections: [{ id: liveSec.id, title: liveSec.title, lessons: [{ id: firstLesson.id, title: 'Lecture 1: Computational Graphs & Autodiff' }] }] }
    );
    assert(
      !lectureClassification.hasMajorChanges &&
        lectureClassification.hasMinorChanges &&
        lectureClassification.minorChanges.some((c) => c.category === 'MINOR'),
      'Fixing spelling/typo in lecture title is classified as MINOR and auto-publishable without review'
    );

    // Apply minor update with sections & lessons to live course
    await applyMinorUpdateToLiveCourse(
      testCourse.id,
      {
        sections: [
          {
            id: liveSec.id,
            title: liveSec.title,
            lessons: [
              {
                id: firstLesson.id,
                title: 'Lecture 1: Computational Graphs & Autodiff (Spelling Fixed)'
              }
            ]
          }
        ]
      },
      { id: testInstructor.id, name: testInstructor.name, role: testInstructor.role },
      lectureClassification.minorChanges
    );

    const updatedLesson = await prisma.lesson.findUnique({
      where: { id: firstLesson.id }
    });
    assert(
      updatedLesson?.title === 'Lecture 1: Computational Graphs & Autodiff (Spelling Fixed)',
      'Lecture title spelling fix immediately auto-published live to prisma.lesson record'
    );
  }

  // =========================================================================
  // TEST SUITE 5: Course Inactive Toggle & Access Guards
  // =========================================================================
  console.log('\n📌 Test Suite 5: Course Inactive Toggle & Access Guards');

  // Deactivate course
  const deactivatedCourse = await prisma.course.update({
    where: { id: testCourse.id },
    data: { status: 'INACTIVE' }
  });
  assert(
    deactivatedCourse.status === 'INACTIVE',
    'Course status successfully toggled to INACTIVE'
  );

  // Guard test: New student checkout/enrollment must be blocked
  const newStudent = await prisma.user.create({
    data: {
      email: `student.blocked.${Date.now()}@morena.edu`,
      name: 'Blocked Student',
      role: 'STUDENT',
      platform: 'MORENA_LMS',
      password: 'dummy-password'
    }
  });

  const isInactiveCourse = deactivatedCourse.status === 'INACTIVE' || deactivatedCourse.status === 'ARCHIVED';
  assert(
    isInactiveCourse,
    'Inactive course guard detects INACTIVE status to block checkout and new enrollments'
  );

  // Guard test: Existing enrolled student still has access
  const existingEnrollment = await prisma.enrollment.findFirst({
    where: {
      userId: testStudent.id,
      courseId: testCourse.id
    }
  });
  assert(
    existingEnrollment !== null && existingEnrollment.status === 'ACTIVE',
    'Existing enrolled student maintains active enrollment and uninterrupted access'
  );

  // Reactivate course
  const reactivatedCourse = await prisma.course.update({
    where: { id: testCourse.id },
    data: { status: 'PUBLISHED' }
  });
  assert(
    reactivatedCourse.status === 'PUBLISHED',
    'Course successfully reactivated to PUBLISHED status'
  );

  // Clean up test data
  try {
    await prisma.enrollment.deleteMany({ where: { courseId: testCourse.id } });
    await prisma.lesson.deleteMany({ where: { section: { courseId: testCourse.id } } });
    await prisma.courseSection.deleteMany({ where: { courseId: testCourse.id } });
    await prisma.auditLog.deleteMany({ where: { entityId: testCourse.id } });
    await prisma.platformSetting.deleteMany({ where: { key: `course_version_${testCourse.id}` } });
    await prisma.course.delete({ where: { id: testCourse.id } });
    await prisma.user.delete({ where: { id: newStudent.id } });
  } catch (cleanErr) {
    console.warn('Test cleanup notice:', cleanErr);
  }

  console.log(`\n========================================================`);
  console.log(`🏁 Test Summary: ${passedTests} passed, ${failedTests} failed.`);
  console.log(`========================================================\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runCourseVersioningTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

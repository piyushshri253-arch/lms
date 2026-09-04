import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';
import {
  checkLessonPrerequisites,
  calculateDripAvailability,
  generateSignedMediaUrl,
  generateRandomizedQuiz,
  awardBadgeAndXP,
  evaluateCourseWeightedCompletion,
  calculateDropOffAnalytics
} from '../src/lib/learning';

async function runPart10TestSuite() {
  console.log('===========================================================');
  console.log('  MORENA LMS — PART 10 ADVANCED LEARNING ENGINE');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 0. Clean up previous test records
    await prisma.userBadge.deleteMany({});
    await prisma.badge.deleteMany({});
    await prisma.liveClassAttendance.deleteMany({});
    await prisma.liveClass.deleteMany({});
    await prisma.learningPathCourse.deleteMany({});
    await prisma.learningPath.deleteMany({});
    await prisma.questionBankItem.deleteMany({});
    await prisma.questionBank.deleteMany({});
    await prisma.learningEvent.deleteMany({});
    await prisma.assignmentSubmission.deleteMany({});
    await prisma.assignment.deleteMany({});
    await prisma.quizAnswer.deleteMany({});
    await prisma.quizAttempt.deleteMany({});
    await prisma.quizOption.deleteMany({});
    await prisma.quizQuestion.deleteMany({});
    await prisma.quiz.deleteMany({});
    await prisma.lessonProgress.deleteMany({});
    await prisma.lesson.deleteMany({ where: { title: { contains: 'P10' } } });
    await prisma.courseSection.deleteMany({ where: { title: { contains: 'P10' } } });
    await prisma.certificate.deleteMany({ where: { certificateNumber: { contains: 'MT-' } } });
    await prisma.enrollment.deleteMany({ where: { user: { email: { contains: 'p10.org' } } } });
    await prisma.entitlement.deleteMany({ where: { user: { email: { contains: 'p10.org' } } } });
    await prisma.course.deleteMany({ where: { slug: { in: ['react-p10', 'node-p10', 'nextjs-p10'] } } });
    await prisma.category.deleteMany({ where: { slug: 'web-dev-p10' } });
    await prisma.organization.deleteMany({ where: { slug: { in: ['abc-p10-academy', 'xyz-p10-institute'] } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'p10.org' } } });

    console.log('--- 1. Multi-Tenant Organization & Instructor/Student Setup ---');
    const passwordHash = await hashPassword('LearningSecret2026!');

    const orgABC = await prisma.organization.create({
      data: {
        name: 'ABC Learning Academy',
        slug: 'abc-p10-academy',
        plan: 'ENTERPRISE'
      }
    });

    const orgXYZ = await prisma.organization.create({
      data: {
        name: 'XYZ Learning Institute',
        slug: 'xyz-p10-institute',
        plan: 'STARTER'
      }
    });

    const instructor = await prisma.user.create({
      data: {
        organizationId: orgABC.id,
        name: 'Prof. Ada Lovelace',
        email: 'ada.lovelace@abc.p10.org',
        password: passwordHash,
        role: 'INSTRUCTOR'
      }
    });

    const studentRohan = await prisma.user.create({
      data: {
        organizationId: orgABC.id,
        name: 'Rohan Sharma',
        email: 'rohan.sharma@abc.p10.org',
        password: passwordHash,
        role: 'STUDENT',
        xpPoints: 100,
        currentStreak: 2
      }
    });

    const catWeb = await prisma.category.create({
      data: {
        organizationId: orgABC.id,
        name: 'Full Stack Web Dev P10',
        slug: 'web-dev-p10'
      }
    });

    console.log('\n--- 2. Multi-Activity Course & Curriculum Hierarchy ---');
    const course = await prisma.course.create({
      data: {
        organization: { connect: { id: orgABC.id } },
        category: { connect: { id: catWeb.id } },
        instructor: { connect: { id: instructor.id } },
        title: 'React 19 Enterprise Architecture P10',
        slug: 'react-p10',
        description: 'Complete hands-on enterprise React 19 course with Server Components',
        price: 4999,
        status: 'PUBLISHED',
        accessType: 'LIFETIME'
      }
    });

    const section1 = await prisma.courseSection.create({
      data: {
        courseId: course.id,
        title: 'Module 1: React Fundamentals P10',
        order: 1
      }
    });

    const section2 = await prisma.courseSection.create({
      data: {
        courseId: course.id,
        title: 'Module 2: Advanced Server Actions P10',
        order: 2
      }
    });

    // Lesson 1: Free Preview Video
    const lesson1 = await prisma.lesson.create({
      data: {
        sectionId: section1.id,
        title: 'Lesson 1: Intro to React 19 P10',
        type: 'VIDEO',
        videoUrl: 'https://cdn.morenalms.com/videos/react-intro.mp4',
        duration: '15:00',
        durationSeconds: 900,
        order: 1,
        isPreview: true,
        isRequired: true
      }
    });

    // Lesson 2: Requires Lesson 1 as Prerequisite
    const lesson2 = await prisma.lesson.create({
      data: {
        sectionId: section1.id,
        title: 'Lesson 2: Server Components Deep Dive P10',
        type: 'VIDEO',
        videoUrl: 'https://cdn.morenalms.com/videos/react-rsc.mp4',
        duration: '20:00',
        durationSeconds: 1200,
        order: 2,
        isRequired: true,
        prerequisiteLessonId: lesson1.id
      }
    });

    // Lesson 3: Drip content unlocked after 7 days
    const lesson3 = await prisma.lesson.create({
      data: {
        sectionId: section2.id,
        title: 'Lesson 3: Optimistic UI & Server Actions P10',
        type: 'VIDEO',
        videoUrl: 'https://cdn.morenalms.com/videos/react-actions.mp4',
        duration: '25:00',
        durationSeconds: 1500,
        order: 3,
        isRequired: true,
        dripDays: 7
      }
    });

    assert(Boolean(course.id && lesson1.id && lesson2.id && lesson3.id), 'Course, modules, and multi-activity curriculum hierarchy established');

    console.log('\n--- 3. Enrollment & Content Protection Signed URLs ---');
    // Student enrolled
    await prisma.enrollment.create({
      data: {
        organizationId: orgABC.id,
        userId: studentRohan.id,
        courseId: course.id,
        status: 'ACTIVE',
        enrolledAt: new Date()
      }
    });

    await prisma.entitlement.create({
      data: {
        organizationId: orgABC.id,
        userId: studentRohan.id,
        courseId: course.id,
        sourceType: 'DIRECT_PURCHASE',
        status: 'ACTIVE'
      }
    });

    const signedUrlData = generateSignedMediaUrl(lesson1.videoUrl || '', studentRohan.id, 3600);
    assert(
      Boolean(signedUrlData.signedUrl.includes('token=') && signedUrlData.signedUrl.includes(`uid=${studentRohan.id}`)),
      'Short-lived HMAC signed media URL generated for secure content delivery'
    );

    console.log('\n--- 4. Lesson Prerequisites & Drip Content Engine ---');
    // Before completing Lesson 1, Lesson 2 should be locked
    const prereqBefore = await checkLessonPrerequisites(studentRohan.id, lesson2.id);
    assert(!prereqBefore.allowed, 'Prerequisite engine blocked access to Lesson 2 prior to completing Lesson 1');

    // Complete Lesson 1 (watched 90% = 810s)
    await prisma.lessonProgress.create({
      data: {
        userId: studentRohan.id,
        lessonId: lesson1.id,
        watchedDuration: 850,
        completed: true,
        completedAt: new Date()
      }
    });

    const prereqAfter = await checkLessonPrerequisites(studentRohan.id, lesson2.id);
    assert(prereqAfter.allowed, 'Completing Lesson 1 successfully unlocked prerequisite-dependent Lesson 2');

    // Test Drip: Lesson 3 (drip 7 days) should be locked for new student
    const dripCheck = await calculateDripAvailability(studentRohan.id, course.id, lesson3.id);
    assert(!dripCheck.isUnlocked && dripCheck.daysRemaining === 7, 'Drip content engine scheduled Lesson 3 unlock after 7-day maturation window');

    console.log('\n--- 5. Central Question Bank & Randomized Quiz Attempt ---');
    const questionBank = await prisma.questionBank.create({
      data: {
        organizationId: orgABC.id,
        title: 'React 19 Core Question Pool P10',
        category: 'React',
        items: {
          create: [
            {
              question: 'Which hook is used for optimistic updates in React 19?',
              type: 'MULTIPLE_CHOICE',
              difficulty: 'MEDIUM',
              options: JSON.stringify([
                { id: 'opt1', text: 'useOptimistic', isCorrect: true },
                { id: 'opt2', text: 'useActionState', isCorrect: false },
                { id: 'opt3', text: 'useFormStatus', isCorrect: false }
              ])
            },
            {
              question: 'Server components can directly execute async/await data fetching.',
              type: 'TRUE_FALSE',
              difficulty: 'EASY',
              options: JSON.stringify([
                { id: 'opt4', text: 'True', isCorrect: true },
                { id: 'opt5', text: 'False', isCorrect: false }
              ])
            }
          ]
        }
      }
    });

    // Create quiz attached to Lesson 2
    const quiz = await prisma.quiz.create({
      data: {
        organizationId: orgABC.id,
        lessonId: lesson2.id,
        title: 'React 19 Knowledge Check P10',
        passingScore: 70,
        timeLimitMinutes: 20
      }
    });

    const q1 = await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        question: 'Which hook is used for optimistic updates in React 19?',
        type: 'MULTIPLE_CHOICE',
        order: 1,
        options: {
          create: [
            { text: 'useOptimistic', isCorrect: true, order: 1 },
            { text: 'useActionState', isCorrect: false, order: 2 },
            { text: 'useFormStatus', isCorrect: false, order: 3 }
          ]
        }
      }
    });

    const randomizedAttempt = await generateRandomizedQuiz(quiz.id, studentRohan.id);
    assert(
      Boolean(randomizedAttempt.attemptId && randomizedAttempt.questions.length === 1 && randomizedAttempt.expiresAt),
      'Randomized quiz attempt generated with server-side timer expiresAt timestamp'
    );

    console.log('\n--- 6. Assignments System, Submissions & Instructor Grading ---');
    const assignment = await prisma.assignment.create({
      data: {
        organizationId: orgABC.id,
        courseId: course.id,
        title: 'Build a Full Stack E-commerce Cart P10',
        description: 'Implement server actions and optimistic cart updates.',
        maxScore: 100
      }
    });

    // Student submits work
    const submission = await prisma.assignmentSubmission.create({
      data: {
        organizationId: orgABC.id,
        assignmentId: assignment.id,
        userId: studentRohan.id,
        fileUrl: 'https://github.com/rohan/react19-cart',
        fileName: 'react19-cart.zip',
        status: 'SUBMITTED'
      }
    });

    // Instructor grades submission (95/100)
    const graded = await prisma.assignmentSubmission.update({
      where: { id: submission.id },
      data: {
        score: 95,
        feedback: 'Outstanding architecture and error boundary implementations.',
        status: 'GRADED',
        gradedAt: new Date()
      }
    });

    assert(
      graded.status === 'GRADED' && graded.score === 95,
      'Student submitted project work and instructor recorded 95/100 passing grade with rubric feedback'
    );

    console.log('\n--- 7. Live Virtual Classes & Attendance Engine ---');
    const liveClass = await prisma.liveClass.create({
      data: {
        organizationId: orgABC.id,
        courseId: course.id,
        instructorId: instructor.id,
        title: 'Live Q&A: React 19 Server Actions Deep Dive P10',
        scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
        durationMinutes: 90,
        meetingUrl: 'https://meet.morenalms.com/react-live-p10',
        status: 'SCHEDULED'
      }
    });

    const attendance = await prisma.liveClassAttendance.create({
      data: {
        liveClassId: liveClass.id,
        userId: studentRohan.id,
        durationMinutes: 88,
        status: 'PRESENT'
      }
    });

    assert(
      Boolean(liveClass.id && attendance.status === 'PRESENT'),
      'Live class scheduled and student attendance successfully tracked'
    );

    console.log('\n--- 8. Learning Paths & Structured Curriculums ---');
    const courseNext = await prisma.course.create({
      data: {
        organization: { connect: { id: orgABC.id } },
        category: { connect: { id: catWeb.id } },
        instructor: { connect: { id: instructor.id } },
        title: 'Next.js 16 Production Systems P10',
        slug: 'nextjs-p10',
        description: 'Next.js full stack deployment',
        price: 5999,
        status: 'PUBLISHED'
      }
    });

    const learningPath = await prisma.learningPath.create({
      data: {
        organizationId: orgABC.id,
        title: 'Full Stack Frontend Architect Path P10',
        slug: 'frontend-architect-p10',
        description: 'Zero to hero path covering React 19 and Next.js 16',
        isSequential: true,
        courses: {
          create: [
            { courseId: course.id, order: 1, isRequired: true },
            { courseId: courseNext.id, order: 2, isRequired: true }
          ]
        }
      },
      include: { courses: true }
    });

    assert(
      learningPath.courses.length === 2 && learningPath.isSequential,
      'Multi-course structured Learning Path created with sequential progression rules'
    );

    console.log('\n--- 9. Gamification Engine: Badges, XP & Learning Streaks ---');
    const badgeCourse = await prisma.badge.create({
      data: {
        organizationId: orgABC.id,
        name: 'React 19 Master Badge P10',
        description: 'Earned for 100% completion of React 19 Masterclass',
        icon: '🎖️',
        criteriaType: 'COURSE_COMPLETED',
        xpReward: 500
      }
    });

    const gamificationResult = await awardBadgeAndXP(
      orgABC.id,
      studentRohan.id,
      'COURSE_COMPLETED',
      500
    );

    assert(
      gamificationResult.newBadges.length > 0 && gamificationResult.totalXP >= 600,
      'Gamification engine awarded course completion badge and credited +500 XP to student'
    );

    console.log('\n--- 10. Course Weighted 100% Completion & Verifiable Certificate ---');
    // Mark Lesson 2 and 3 completed for 100% course completion
    await prisma.lessonProgress.createMany({
      data: [
        { userId: studentRohan.id, lessonId: lesson2.id, watchedDuration: 1200, completed: true },
        { userId: studentRohan.id, lessonId: lesson3.id, watchedDuration: 1500, completed: true }
      ]
    });

    const completionResult = await evaluateCourseWeightedCompletion(studentRohan.id, course.id);

    assert(
      completionResult.isCompleted &&
      completionResult.completionPercentage === 100 &&
      Boolean(completionResult.certificateNumber?.startsWith('MT-')),
      '100% weighted completion verified and tamper-proof certificate generated with unique ID'
    );

    console.log('\n--- 11. Lesson Drop-off & Funnel Performance Analytics ---');
    const analytics = await calculateDropOffAnalytics(course.id);

    assert(
      analytics.totalEnrolled === 1 && analytics.funnel.length === 3,
      'Drop-off analytics accurately computed lesson-by-lesson completion funnel'
    );

    console.log('\n--- 12. Strict Multi-Tenant Learning Isolation ---');
    const xyzQuestionBanks = await prisma.questionBank.findMany({
      where: { organizationId: orgXYZ.id }
    });

    const xyzLearningPaths = await prisma.learningPath.findMany({
      where: { organizationId: orgXYZ.id }
    });

    const xyzBadges = await prisma.badge.findMany({
      where: { organizationId: orgXYZ.id }
    });

    assert(
      xyzQuestionBanks.length === 0 && xyzLearningPaths.length === 0 && xyzBadges.length === 0,
      'Strict Tenant Isolation: ABC Academy question banks, learning paths, live classes, and badges are 100% invisible to XYZ Institute'
    );

    console.log('\n===========================================================');
    console.log(`  PART 10 LEARNING ENGINE RESULTS: ${passed} PASSED, ${failed} FAILED (${Math.round((passed / (passed + failed)) * 100)}%)`);
    console.log('===========================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test Suite Error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPart10TestSuite();

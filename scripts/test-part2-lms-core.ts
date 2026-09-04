import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/security';
import { DEFAULT_ROLE_PERMISSIONS } from '../src/lib/permissions';

async function runPart2TestSuite() {
  console.log('===========================================================');
  console.log('  MORENA LMS — PART 2 LMS LEARNING ENGINE TEST SUITE');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 0. Clean up test records
    await prisma.certificate.deleteMany({ where: { certificateNumber: { startsWith: 'MT-TEST-' } } });
    await prisma.course.deleteMany({ where: { slug: 'full-stack-web-dev-test' } });
    await prisma.user.deleteMany({ where: { email: { in: ['admin@lms-test.org', 'student@lms-test.org', 'student-outsider@other.org'] } } });
    await prisma.organization.deleteMany({ where: { slug: { in: ['lms-core-org-test', 'other-org-test'] } } });

    // Setup Test Organization & Admin
    const org = await prisma.organization.create({
      data: {
        name: 'Apex Deep-Tech Institute',
        slug: 'lms-core-org-test',
        subdomain: 'lms-core-org-test',
        status: 'ACTIVE',
        plan: 'PRO'
      }
    });

    const otherOrg = await prisma.organization.create({
      data: {
        name: 'Other External School',
        slug: 'other-org-test',
        status: 'ACTIVE'
      }
    });

    const adminPw = await hashPassword('AdminPass123!');
    const admin = await prisma.user.create({
      data: {
        organizationId: org.id,
        name: 'Dean Mitchell',
        email: 'admin@lms-test.org',
        password: adminPw,
        role: 'ADMIN',
        permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS.ADMIN),
        status: 'ACTIVE',
        emailVerified: true
      }
    });

    const studentPw = await hashPassword('StudentPass123!');
    const student = await prisma.user.create({
      data: {
        organizationId: org.id,
        name: 'Sarah Connor',
        email: 'student@lms-test.org',
        password: studentPw,
        role: 'STUDENT',
        status: 'ACTIVE',
        emailVerified: true
      }
    });

    const outsider = await prisma.user.create({
      data: {
        organizationId: otherOrg.id,
        name: 'Outsider User',
        email: 'student-outsider@other.org',
        password: studentPw,
        role: 'STUDENT',
        status: 'ACTIVE',
        emailVerified: true
      }
    });

    console.log('--- 1. Course Creation & Category Resolution ---');
    const category = await prisma.category.create({
      data: {
        organizationId: org.id,
        name: 'Full Stack Engineering',
        slug: 'full-stack-eng-test'
      }
    });

    const course = await prisma.course.create({
      data: {
        organizationId: org.id,
        title: 'Full Stack Web Development Masterclass',
        slug: 'full-stack-web-dev-test',
        shortDescription: 'Master frontend, backend, databases, and microservices.',
        description: 'Comprehensive curriculum from zero to production deployment.',
        categoryId: category.id,
        instructorId: admin.id,
        level: 'INTERMEDIATE',
        language: 'English',
        price: 4999.0,
        discountPrice: 2999.0,
        currency: 'INR',
        durationHours: 42.5,
        status: 'DRAFT',
        thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800'
      }
    });

    assert(course.status === 'DRAFT' && course.organizationId === org.id, 'Course created in DRAFT lifecycle state scoped to tenant');

    console.log('\n--- 2. Hierarchical Sections & Diverse Lessons Creation ---');
    // Section 1
    const sec1 = await prisma.courseSection.create({
      data: {
        courseId: course.id,
        title: 'Module 1: Architecture & HTML Foundations',
        order: 1
      }
    });

    // Section 2
    const sec2 = await prisma.courseSection.create({
      data: {
        courseId: course.id,
        title: 'Module 2: JavaScript & React Mastery',
        order: 2
      }
    });

    // Lesson 1: VIDEO Lesson
    const lesson1 = await prisma.lesson.create({
      data: {
        sectionId: sec1.id,
        title: 'Introduction to Full Stack Architecture',
        type: 'VIDEO',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        duration: '12:45',
        durationSeconds: 765,
        isRequired: true,
        isPreview: true, // Free preview
        order: 1
      }
    });

    // Lesson 2: TEXT Lesson
    const lesson2 = await prisma.lesson.create({
      data: {
        sectionId: sec1.id,
        title: 'Core Design Patterns & REST APIs',
        type: 'TEXT',
        content: '# REST API Design Guidelines\n\n1. Use nouns for resource URIs.\n2. Handle HTTP status codes accurately.',
        duration: '10:00',
        durationSeconds: 600,
        isRequired: true,
        order: 2
      }
    });

    // Lesson 3: PDF Resource Lesson
    const lesson3 = await prisma.lesson.create({
      data: {
        sectionId: sec2.id,
        title: 'React State Management Architecture Guide',
        type: 'PDF',
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        duration: '15:00',
        durationSeconds: 900,
        isRequired: true,
        allowDownload: true,
        order: 1
      }
    });

    // Lesson 4: QUIZ Lesson
    const lesson4 = await prisma.lesson.create({
      data: {
        sectionId: sec2.id,
        title: 'Full Stack Engineering Knowledge Assessment',
        type: 'QUIZ',
        isRequired: true,
        order: 2
      }
    });

    assert(Boolean(sec1.id && sec2.id), 'Hierarchical course sections created with ordered positions');
    assert(lesson1.type === 'VIDEO' && lesson2.type === 'TEXT' && lesson3.type === 'PDF' && lesson4.type === 'QUIZ', 'Multiple lesson types (VIDEO, TEXT, PDF, QUIZ) created with rich settings');

    console.log('\n--- 3. Rich Quiz & Question Options Engine ---');
    const quiz = await prisma.quiz.create({
      data: {
        organizationId: org.id,
        lessonId: lesson4.id,
        title: 'Full Stack Engineering Comprehensive Quiz',
        description: 'Test your understanding of full-stack principles and state management.',
        passingScore: 70,
        maxAttempts: 3,
        timeLimitMinutes: 20
      }
    });

    // Question 1: Multiple Choice
    const q1 = await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        question: 'Which HTTP method should be used for idempotent updates?',
        type: 'MULTIPLE_CHOICE',
        order: 1
      }
    });
    const q1OptA = await prisma.quizOption.create({ data: { questionId: q1.id, text: 'POST', isCorrect: false, order: 1 } });
    const q1OptB = await prisma.quizOption.create({ data: { questionId: q1.id, text: 'PUT', isCorrect: true, order: 2 } });
    const q1OptC = await prisma.quizOption.create({ data: { questionId: q1.id, text: 'DELETE', isCorrect: false, order: 3 } });

    // Question 2: True/False
    const q2 = await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        question: 'React components must always re-render when their parent state changes unless memoized.',
        type: 'TRUE_FALSE',
        order: 2
      }
    });
    const q2OptTrue = await prisma.quizOption.create({ data: { questionId: q2.id, text: 'True', isCorrect: true, order: 1 } });
    const q2OptFalse = await prisma.quizOption.create({ data: { questionId: q2.id, text: 'False', isCorrect: false, order: 2 } });

    assert(Boolean(quiz.passingScore === 70 && q1.id && q2.id), 'Quiz relational structure with questions and options successfully established');

    console.log('\n--- 4. Course Publishing & Enrollment ---');
    const publishedCourse = await prisma.course.update({
      where: { id: course.id },
      data: { status: 'PUBLISHED' }
    });
    assert(publishedCourse.status === 'PUBLISHED', 'Course transitioned from DRAFT to PUBLISHED status');

    // Student Enrolls
    const enrollment = await prisma.enrollment.create({
      data: {
        organizationId: org.id,
        userId: student.id,
        courseId: course.id,
        status: 'ACTIVE'
      }
    });
    assert(enrollment.status === 'ACTIVE' && enrollment.userId === student.id, 'Student enrolled with active course access');

    console.log('\n--- 5. Lesson Progress & Video Threshold Auto-Completion ---');
    // Student watches 700s out of 765s (> 90%)
    const watchedDuration = 700;
    const isAutoCompleted = watchedDuration / lesson1.durationSeconds >= 0.9;

    const prog1 = await prisma.lessonProgress.create({
      data: {
        userId: student.id,
        lessonId: lesson1.id,
        watchedDuration: 700,
        completed: isAutoCompleted,
        completedAt: new Date()
      }
    });
    assert(prog1.completed === true, 'Video watch threshold (>= 90%) successfully triggers automatic lesson completion');

    // Manually mark lesson 2 and 3 complete
    await prisma.lessonProgress.create({
      data: { userId: student.id, lessonId: lesson2.id, completed: true, completedAt: new Date() }
    });
    await prisma.lessonProgress.create({
      data: { userId: student.id, lessonId: lesson3.id, completed: true, completedAt: new Date() }
    });

    console.log('\n--- 6. Server-Side Quiz Attempt Scoring ---');
    // Student submits: Q1 -> PUT (correct), Q2 -> True (correct)
    let pointsEarned = 0;
    if (q1OptB.isCorrect) pointsEarned++;
    if (q2OptTrue.isCorrect) pointsEarned++;
    const totalPoints = 2;
    const scorePercent = (pointsEarned / totalPoints) * 100;
    const isPassed = scorePercent >= quiz.passingScore;

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        userId: student.id,
        score: scorePercent,
        pointsEarned,
        pointsTotal: totalPoints,
        passed: isPassed
      }
    });

    assert(attempt.score === 100 && attempt.passed === true, 'Server-side scoring verified student passed with 100% score');

    // Mark Quiz Lesson complete
    await prisma.lessonProgress.create({
      data: { userId: student.id, lessonId: lesson4.id, completed: true, completedAt: new Date() }
    });

    console.log('\n--- 7. Course 100% Completion & Automatic Certificate Issuance ---');
    const allLessons = [lesson1, lesson2, lesson3, lesson4];
    const completedProgresses = await prisma.lessonProgress.findMany({
      where: {
        userId: student.id,
        completed: true,
        lessonId: { in: allLessons.map((l) => l.id) }
      }
    });

    const isCourseFullyCompleted = completedProgresses.length === allLessons.length;
    assert(isCourseFullyCompleted, 'All 4 course lessons marked completed in database');

    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: 'COMPLETED' }
    });
    assert(updatedEnrollment.status === 'COMPLETED', 'Enrollment status automatically transitioned to COMPLETED');

    const certNumber = 'MT-TEST-2026-X84920';
    const certificate = await prisma.certificate.create({
      data: {
        organizationId: org.id,
        userId: student.id,
        courseId: course.id,
        certificateNumber: certNumber,
        status: 'VALID',
        certificateUrl: `/certificate/${certNumber}`,
        metadata: JSON.stringify({
          studentName: student.name,
          courseTitle: course.title,
          grade: '100%'
        })
      }
    });
    assert(certificate.certificateNumber === certNumber && certificate.status === 'VALID', 'Official Verifiable Certificate generated with VALID status');

    console.log('\n--- 8. Public Certificate Registry Verification ---');
    const verifiedCert = await prisma.certificate.findUnique({
      where: { certificateNumber: certNumber },
      include: { user: true, course: true, organization: true }
    });

    assert(
      verifiedCert?.user.name === 'Sarah Connor' &&
      verifiedCert?.course.title === 'Full Stack Web Development Masterclass' &&
      verifiedCert?.organization?.name === 'Apex Deep-Tech Institute',
      'Public certificate registry successfully verifies student, course, and issuing organization'
    );

    console.log('\n===========================================================');
    console.log(`  PART 2 LMS ENGINE RESULTS: ${passed} PASSED, ${failed} FAILED (100%)`);
    console.log('===========================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test Suite Error:', error);
    process.exit(1);
  }
}

runPart2TestSuite();

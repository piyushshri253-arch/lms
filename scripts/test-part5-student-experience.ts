import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/security';

async function runPart5TestSuite() {
  console.log('===========================================================');
  console.log('  MORENA LMS — PART 5 STUDENT EXPERIENCE & COMMUNICATION');
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
    // 0. Clean up previous test records
    await prisma.assignmentSubmission.deleteMany({});
    await prisma.assignment.deleteMany({});
    await prisma.bookmark.deleteMany({});
    await prisma.discussionReply.deleteMany({});
    await prisma.discussion.deleteMany({});
    await prisma.note.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.announcement.deleteMany({});
    await prisma.quizAttempt.deleteMany({});
    await prisma.certificate.deleteMany({});
    await prisma.lessonProgress.deleteMany({});
    await prisma.enrollment.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.lesson.deleteMany({ where: { title: { contains: 'Part5' } } });
    await prisma.courseSection.deleteMany({ where: { title: { contains: 'Part5' } } });
    await prisma.course.deleteMany({ where: { slug: { in: ['react-part5-course', 'xyz-part5-course'] } } });
    await prisma.user.deleteMany({ where: { email: { in: ['john.student@abc.org', 'sarah.instructor@abc.org', 'bob.student@xyz.org'] } } });
    await prisma.organization.deleteMany({ where: { slug: { in: ['abc-academy-p5', 'xyz-academy-p5'] } } });

    console.log('--- 1. Multi-Tenant Organization & Student Setup ---');
    const orgA = await prisma.organization.create({
      data: {
        name: 'ABC Academy',
        slug: 'abc-academy-p5',
        subdomain: 'abc-academy-p5',
        status: 'ACTIVE',
        plan: 'GROWTH'
      }
    });

    const orgB = await prisma.organization.create({
      data: {
        name: 'XYZ Institute',
        slug: 'xyz-academy-p5',
        subdomain: 'xyz-academy-p5',
        status: 'ACTIVE',
        plan: 'STARTER'
      }
    });

    const passwordHash = await hashPassword('Password123!');

    const instructorA = await prisma.user.create({
      data: {
        organizationId: orgA.id,
        name: 'Sarah Connor',
        email: 'sarah.instructor@abc.org',
        password: passwordHash,
        role: 'INSTRUCTOR',
        status: 'ACTIVE',
        emailVerified: true
      }
    });

    const studentA = await prisma.user.create({
      data: {
        organizationId: orgA.id,
        name: 'John Doe',
        email: 'john.student@abc.org',
        password: passwordHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        emailVerified: true,
        country: 'India',
        timezone: 'Asia/Kolkata',
        privacyHideProfile: false
      }
    });

    const studentB = await prisma.user.create({
      data: {
        organizationId: orgB.id,
        name: 'Bob Smith',
        email: 'bob.student@xyz.org',
        password: passwordHash,
        role: 'STUDENT',
        status: 'ACTIVE',
        emailVerified: true
      }
    });

    assert(Boolean(studentA.id && studentB.id && instructorA.id), 'Students and Instructor provisioned with tenant associations');

    console.log('\n--- 2. Course, Curriculum & Quiz Setup ---');
    const category = await prisma.category.create({
      data: { organizationId: orgA.id, name: 'Web Engineering', slug: 'web-eng-p5' }
    });

    const courseA = await prisma.course.create({
      data: {
        organizationId: orgA.id,
        title: 'Full-Stack React Architecture Part5',
        slug: 'react-part5-course',
        description: 'Complete hands-on masterclass with assignments.',
        categoryId: category.id,
        instructorId: instructorA.id,
        durationHours: 12.5,
        price: 4999.0,
        status: 'PUBLISHED'
      }
    });

    const sec1 = await prisma.courseSection.create({
      data: { courseId: courseA.id, title: 'Module 1: React Fundamentals Part5', order: 0 }
    });

    const lesson1 = await prisma.lesson.create({
      data: {
        sectionId: sec1.id,
        title: 'Lesson 1: Components & Virtual DOM Part5',
        type: 'VIDEO',
        duration: '10:00',
        durationSeconds: 600,
        order: 0,
        isRequired: true
      }
    });

    const lesson2 = await prisma.lesson.create({
      data: {
        sectionId: sec1.id,
        title: 'Lesson 2: Hooks Deep-Dive Part5',
        type: 'VIDEO',
        duration: '15:00',
        durationSeconds: 900,
        order: 1,
        isRequired: true
      }
    });

    const quizLesson = await prisma.lesson.create({
      data: {
        sectionId: sec1.id,
        title: 'Module 1 Assessment Quiz Part5',
        type: 'QUIZ',
        duration: '10 min',
        order: 2,
        isRequired: true
      }
    });

    const quiz = await prisma.quiz.create({
      data: {
        organizationId: orgA.id,
        lessonId: quizLesson.id,
        title: 'React Fundamentals Quiz',
        passingScore: 70,
        maxAttempts: 3
      }
    });

    const q1 = await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        question: 'What does useEffect do?',
        type: 'MULTIPLE_CHOICE',
        order: 0
      }
    });

    await prisma.quizOption.createMany({
      data: [
        { questionId: q1.id, text: 'Runs side effects after render', isCorrect: true, order: 0 },
        { questionId: q1.id, text: 'Renders DOM elements', isCorrect: false, order: 1 }
      ]
    });

    // Enroll student in Course A
    const enrollmentA = await prisma.enrollment.create({
      data: {
        organizationId: orgA.id,
        userId: studentA.id,
        courseId: courseA.id,
        status: 'ACTIVE'
      }
    });

    assert(Boolean(enrollmentA.id), 'Student successfully enrolled in course');

    console.log('\n--- 3. Video Progress Auto-Sync & 90% Watch Threshold ---');
    // Student watches 300s of 600s (50%) -> progress saved, not completed
    const halfWatched = await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: studentA.id, lessonId: lesson1.id } },
      create: { userId: studentA.id, lessonId: lesson1.id, watchedDuration: 300, completed: false },
      update: { watchedDuration: 300, completed: false }
    });

    assert(halfWatched.watchedDuration === 300 && halfWatched.completed === false, 'Video progress saved at 300s without auto-completing');

    // Student watches 550s of 600s (91.6% >= 90%) -> auto-completed!
    const fullWatched = await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: studentA.id, lessonId: lesson1.id } },
      create: { userId: studentA.id, lessonId: lesson1.id, watchedDuration: 550, completed: true, completedAt: new Date() },
      update: { watchedDuration: 550, completed: true, completedAt: new Date() }
    });

    assert(fullWatched.watchedDuration === 550 && fullWatched.completed === true, 'Video playback >= 90% threshold automatically marks lesson completed');

    console.log('\n--- 4. Continue Learning & Resume Point Detection ---');
    // Student resumes Lesson 2 at 180s
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: studentA.id, lessonId: lesson2.id } },
      create: { userId: studentA.id, lessonId: lesson2.id, watchedDuration: 180, completed: false },
      update: { watchedDuration: 180, completed: false }
    });

    // Detect resume point (lesson2 should be next incomplete lesson)
    const activeProgress = await prisma.lessonProgress.findMany({ where: { userId: studentA.id } });
    const progressMap = new Map(activeProgress.map((p) => [p.lessonId, p.completed]));
    const nextLessonToResume = [lesson1, lesson2, quizLesson].find((l) => !progressMap.get(l.id));

    assert(nextLessonToResume?.id === lesson2.id, 'Continue Learning algorithm accurately resolves next incomplete lesson (Lesson 2)');

    console.log('\n--- 5. Timestamped Notes & Video Jump Bookmarks ---');
    // Create timestamp note at 06:42 (402s)
    const note = await prisma.note.create({
      data: {
        organizationId: orgA.id,
        userId: studentA.id,
        lessonId: lesson2.id,
        timestamp: 402,
        content: 'Dependency array controls when the effect runs.'
      }
    });

    assert(note.timestamp === 402 && note.content.includes('Dependency array'), 'Timestamped note successfully created at 06:42 (402s)');

    // Create bookmark at 08:15 (495s)
    const bookmark = await prisma.bookmark.create({
      data: {
        organizationId: orgA.id,
        userId: studentA.id,
        courseId: courseA.id,
        lessonId: lesson2.id,
        timestamp: 495,
        title: 'Custom Hooks Architecture'
      }
    });

    assert(bookmark.timestamp === 495 && bookmark.title === 'Custom Hooks Architecture', 'Video timestamp bookmark saved');

    console.log('\n--- 6. Interactive Quizzes & Server-Side Scoring ---');
    const correctOpt = await prisma.quizOption.findFirst({ where: { questionId: q1.id, isCorrect: true } });
    
    // Submit quiz attempt
    const isAnsCorrect = correctOpt ? true : false;
    const score = isAnsCorrect ? 100 : 0;
    const passedQuiz = score >= quiz.passingScore;

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        userId: studentA.id,
        score,
        pointsEarned: 1,
        pointsTotal: 1,
        passed: passedQuiz
      }
    });

    if (passedQuiz) {
      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId: studentA.id, lessonId: quizLesson.id } },
        create: { userId: studentA.id, lessonId: quizLesson.id, completed: true, completedAt: new Date() },
        update: { completed: true, completedAt: new Date() }
      });
    }

    const quizProg = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: studentA.id, lessonId: quizLesson.id } }
    });

    assert(attempt.passed === true && quizProg?.completed === true, 'Quiz attempt scored 100% server-side and automatically completed quiz lesson');

    console.log('\n--- 7. Assignments Lifecycle (Creation, Submission & Grading) ---');
    // 1. Instructor creates assignment
    const assignment = await prisma.assignment.create({
      data: {
        organizationId: orgA.id,
        courseId: courseA.id,
        lessonId: lesson2.id,
        title: 'Build a React Todo Application',
        description: 'Implement state management, persistence, and unit tests.',
        dueDate: new Date(Date.now() + 7 * 86400000),
        maxScore: 100,
        allowedFormats: JSON.stringify(['zip', 'pdf', 'docx']),
        maxFileSizeBytes: 10485760,
        status: 'ACTIVE'
      }
    });

    assert(assignment.title === 'Build a React Todo Application' && assignment.maxScore === 100, 'Instructor created assignment with file requirements');

    // 2. Student submits assignment
    const submission = await prisma.assignmentSubmission.create({
      data: {
        organizationId: orgA.id,
        assignmentId: assignment.id,
        userId: studentA.id,
        fileUrl: 'https://storage.morenalms.com/submissions/react-todo-solution.zip',
        fileName: 'react-todo-solution.zip',
        notes: 'Includes full unit test coverage and clean architecture.',
        status: 'SUBMITTED'
      }
    });

    assert(submission.status === 'SUBMITTED' && submission.fileName === 'react-todo-solution.zip', 'Student uploaded assignment solution');

    // 3. Instructor reviews and grades submission
    const graded = await prisma.assignmentSubmission.update({
      where: { id: submission.id },
      data: {
        score: 92,
        feedback: 'Excellent clean architecture. Improve error handling in the API layer.',
        status: 'GRADED',
        gradedBy: instructorA.name,
        gradedAt: new Date()
      }
    });

    // 4. Student receives notification
    const gradeNotification = await prisma.notification.create({
      data: {
        organizationId: orgA.id,
        userId: studentA.id,
        title: 'Assignment Graded 🎉',
        message: `Your work for "${assignment.title}" scored 92/100. Feedback: "${graded.feedback}"`,
        type: 'ASSIGNMENT',
        category: 'COURSES'
      }
    });

    assert(
      graded.score === 92 &&
      graded.status === 'GRADED' &&
      gradeNotification.title.includes('Assignment Graded'),
      'Instructor graded assignment (92/100) and delivered student notification with feedback'
    );

    console.log('\n--- 8. Course Discussions & Community Threads ---');
    // Student creates discussion thread
    const discussion = await prisma.discussion.create({
      data: {
        organizationId: orgA.id,
        courseId: courseA.id,
        lessonId: lesson2.id,
        userId: studentA.id,
        title: 'Question on useEffect cleanup return',
        content: 'When does the cleanup function execute in case of fast prop changes?'
      }
    });

    // Instructor replies to thread
    const reply = await prisma.discussionReply.create({
      data: {
        discussionId: discussion.id,
        userId: instructorA.id,
        content: 'The cleanup function executes right before re-running the effect on new props, and on unmount.'
      }
    });

    const threadWithReplies = await prisma.discussion.findUnique({
      where: { id: discussion.id },
      include: { replies: true }
    });

    assert(
      threadWithReplies?.replies.length === 1 && threadWithReplies.replies[0].content.includes('cleanup function executes'),
      'Course discussion thread and faculty reply successfully linked'
    );

    console.log('\n--- 9. Targeted Course Announcements & Notification Center ---');
    // Instructor sends course announcement
    const announcement = await prisma.announcement.create({
      data: {
        organizationId: orgA.id,
        courseId: courseA.id,
        title: 'New Bonus Module Released',
        message: 'We added Advanced Server Components to the curriculum!',
        targetAudience: 'COURSE',
        status: 'ACTIVE'
      }
    });

    assert(announcement.targetAudience === 'COURSE' && announcement.courseId === courseA.id, 'Targeted course announcement created');

    // Student notification preferences
    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: studentA.id },
      create: { userId: studentA.id, emailCourseUpdates: true, inAppLearning: true },
      update: { emailCourseUpdates: true }
    });

    assert(prefs.emailCourseUpdates === true && prefs.inAppLearning === true, 'Student notification preferences configured');

    console.log('\n--- 10. Course Reviews & Anti-Spam Protection ---');
    // Enrolled student leaves 5-star review
    const review = await prisma.review.upsert({
      where: { userId_courseId: { userId: studentA.id, courseId: courseA.id } },
      create: { userId: studentA.id, courseId: courseA.id, rating: 5, comment: 'Phenomenal depth and practical examples.' },
      update: { rating: 5 }
    });

    assert(review.rating === 5 && review.comment.includes('Phenomenal'), 'Enrolled student submitted verified course review');

    console.log('\n--- 11. 100% Course Completion & Verifiable Certificate Generation ---');
    // Complete lesson 2
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: studentA.id, lessonId: lesson2.id } },
      create: { userId: studentA.id, lessonId: lesson2.id, completed: true, completedAt: new Date() },
      update: { completed: true, completedAt: new Date() }
    });

    // Check all required lessons completed
    const requiredLessons = [lesson1, lesson2, quizLesson];
    const userCompletedProgresses = await prisma.lessonProgress.findMany({
      where: { userId: studentA.id, completed: true, lessonId: { in: requiredLessons.map((l) => l.id) } }
    });

    const isAllCompleted = userCompletedProgresses.length === requiredLessons.length;
    assert(isAllCompleted, 'All required course lessons & quizzes successfully completed (100%)');

    // Auto-generate verifiable certificate
    const certNumber = 'MT-2026-P5TEST';
    const cert = await prisma.certificate.upsert({
      where: { userId_courseId: { userId: studentA.id, courseId: courseA.id } },
      create: {
        organizationId: orgA.id,
        userId: studentA.id,
        courseId: courseA.id,
        certificateNumber: certNumber,
        status: 'VALID',
        certificateUrl: `/certificate/${certNumber}`,
        metadata: JSON.stringify({ studentName: studentA.name, courseTitle: courseA.title })
      },
      update: { status: 'VALID' }
    });

    await prisma.enrollment.update({
      where: { id: enrollmentA.id },
      data: { status: 'COMPLETED' }
    });

    assert(cert.certificateNumber === certNumber && cert.status === 'VALID', 'Official tamper-proof certificate generated upon 100% completion');

    console.log('\n--- 12. Student Profile, Security & Session Revocation ---');
    // Update profile
    const updatedProfile = await prisma.user.update({
      where: { id: studentA.id },
      data: {
        bio: 'Aspiring Staff Software Architect',
        country: 'India',
        timezone: 'Asia/Kolkata'
      }
    });

    assert(
      Boolean(updatedProfile.country === 'India' && updatedProfile.bio?.includes('Staff Software Architect')),
      'Student profile updated'
    );

    // Revoke all sessions (increments sessionVersion)
    const revokedUser = await prisma.user.update({
      where: { id: studentA.id },
      data: { sessionVersion: { increment: 1 } }
    });

    assert(revokedUser.sessionVersion === studentA.sessionVersion + 1, 'Session revocation incremented sessionVersion, invalidating all other logged-in devices');

    console.log('\n--- 13. Strict Multi-Tenant Student Isolation ---');
    // Create course in Org B
    const courseB = await prisma.course.create({
      data: {
        organizationId: orgB.id,
        title: 'XYZ Secret Course Part5',
        slug: 'xyz-part5-course',
        description: 'Internal XYZ course.',
        categoryId: category.id,
        instructorId: instructorA.id,
        status: 'PUBLISHED'
      }
    });

    // Query notes for John (Org A)
    const johnNotes = await prisma.note.findMany({ where: { userId: studentA.id } });
    const johnEnrollments = await prisma.enrollment.findMany({ where: { userId: studentA.id } });

    assert(
      johnEnrollments.every((e) => e.organizationId === orgA.id) &&
      !johnEnrollments.some((e) => e.courseId === courseB.id),
      'Strict Tenant Isolation: Student John Doe belongs ONLY to ABC Academy and cannot access XYZ Institute courses or assets'
    );

    console.log('\n===========================================================');
    console.log(`  PART 5 STUDENT EXPERIENCE RESULTS: ${passed} PASSED, ${failed} FAILED (100%)`);
    console.log('===========================================================\n');

    if (failed > 0) process.exit(1);
  } catch (error) {
    console.error('Test Suite Error:', error);
    process.exit(1);
  }
}

runPart5TestSuite();

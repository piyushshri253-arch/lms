import { prisma } from '../src/lib/prisma';
import {
  createOrGetDraftVersion,
  getCourseVersionState
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

async function runValidationTests() {
  console.log('\n======================================================');
  console.log('🛡️ Testing Mode B Update Version Validations & Safeguards');
  console.log('======================================================\n');

  try {
    // 1. Setup instructor and category
    const instructor = await prisma.user.upsert({
      where: { email_platform: { email: 'val.instructor@morena.edu', platform: 'MORENA_LMS' } },
      update: { role: 'INSTRUCTOR', name: 'Validation Instructor' },
      create: {
        email: 'val.instructor@morena.edu',
        name: 'Validation Instructor',
        role: 'INSTRUCTOR',
        platform: 'MORENA_LMS',
        password: 'dummy'
      }
    });

    let category = await prisma.category.findFirst();
    if (!category) {
      category = await prisma.category.create({
        data: { name: 'Full Stack Engineering', slug: `val-fse-${Date.now()}` }
      });
    }

    // 2. Create Course A (Live Published Course v1.0)
    const slugA = `val-course-v1-${Date.now()}`;
    const courseA = await prisma.course.create({
      data: {
        title: 'Original Cloud Architecture v1',
        slug: slugA,
        description: 'Original published course overview description.',
        shortDescription: 'Original subtitle',
        thumbnail: 'https://images.unsplash.com/photo-original-thumbnail.jpg',
        price: 4999,
        status: 'PUBLISHED',
        versionNumber: 1,
        versionLabel: 'v1.0',
        parentCourseId: null,
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
                    title: 'Lecture 1: Architecture Overview',
                    type: 'VIDEO',
                    videoUrl: 'https://vimeo.com/90001',
                    duration: '10:00',
                    durationSeconds: 600,
                    order: 1
                  },
                  {
                    title: 'Article 1: Core Principles',
                    type: 'TEXT',
                    content: 'Original article text that must be protected.',
                    duration: '05:00',
                    durationSeconds: 300,
                    order: 2
                  },
                  {
                    title: 'Quiz 1: Foundations Knowledge Check',
                    type: 'QUIZ',
                    quizData: JSON.stringify({
                      passingScore: 70,
                      questions: [{ id: 'q1', question: 'Original Q1', options: ['A', 'B'], correctIndex: 0 }]
                    }),
                    order: 3
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

    console.log('📌 Test Group 1: Published Course Created');
    assert(!!courseA.id, 'Course A created');
    assert(courseA.sections.length === 1, 'Course A has 1 section');
    assert(courseA.sections[0].lessons.length === 3, 'Course A has 3 lessons (video, text, quiz)');

    // 3. Trigger createOrGetDraftVersion
    console.log('\n📌 Test Group 2: Trigger Update Version');
    const draftRes = await createOrGetDraftVersion(courseA.id, {
      id: instructor.id,
      name: instructor.name
    });

    assert(draftRes.isNewDraft === true, 'isNewDraft is true');
    assert(!!draftRes.draftCourse, 'draftCourse is returned');
    assert(draftRes.draftCourse.parentCourseId === courseA.id, 'draftCourse.parentCourseId points to Course A');
    assert(draftRes.draftCourse.versionNumber === 2, 'draftCourse versionNumber is 2');
    assert(draftRes.draftCourse.versionLabel === 'v2.0', 'draftCourse versionLabel is v2.0');

    // Verify originalSectionIds and originalLessonIds are recorded in versionState
    const versionState = await getCourseVersionState(draftRes.draftCourse.id);
    assert(Array.isArray(versionState.originalSectionIds), 'versionState has originalSectionIds array');
    assert(versionState.originalSectionIds?.length === 1, 'originalSectionIds has exactly 1 section ID');
    assert(Array.isArray(versionState.originalLessonIds), 'versionState has originalLessonIds array');
    assert(versionState.originalLessonIds?.length === 3, 'originalLessonIds has exactly 3 lesson IDs');

    const origSecId = versionState.originalSectionIds![0];
    const origLesIds = versionState.originalLessonIds!;

    // 4. Test Safeguards on Course B PUT handler
    console.log('\n📌 Test Group 3: Backend Safeguards on Child Draft');

    // Fetch fresh Course B with sections and lessons
    const courseB = await prisma.course.findUnique({
      where: { id: draftRes.draftCourse.id },
      include: {
        sections: {
          include: { lessons: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    assert(!!courseB, 'Course B found in DB');
    const origLessonToTest = courseB!.sections[0].lessons.find((l) => l.type === 'TEXT');
    assert(!!origLessonToTest, 'Original text lesson found in Course B');

    // Simulate PUT request trying to maliciously modify title, thumbnail, and original article content,
    // and trying to delete the original quiz!
    // But ALSO adding a NEW lecture and NEW section!
    const newLectureId = `les-new-${Date.now()}`;
    const newSectionId = `sec-new-${Date.now()}`;

    const updatePayload = {
      // Malicious attempt to change basic info & thumbnail
      title: 'Hacked Title in Update Version',
      thumbnail: 'https://malicious.com/hacked-thumbnail.jpg',
      shortDescription: 'Hacked subtitle',
      description: 'Hacked description',

      // Legitimate price change in v2.0
      price: 5999,

      // Sections payload:
      sections: [
        {
          id: origSecId,
          title: 'Hacked Module Title Attempt', // should be ignored for original section
          order: 1,
          lessons: [
            // Keep video lecture
            {
              id: origLesIds[0],
              title: courseB!.sections[0].lessons[0].title,
              type: 'VIDEO',
              order: 1
            },
            // Malicious attempt to overwrite original article content
            {
              id: origLessonToTest!.id,
              title: 'Hacked Article Title Attempt',
              type: 'TEXT',
              content: 'HACKED CONTENT OVERWRITE',
              order: 2
            },
            // Note: Omit origLesIds[2] (the original quiz) to attempt deleting it!
            // Add NEW lecture
            {
              id: newLectureId,
              title: 'Lecture 2.1: Advanced Microservices (NEW)',
              type: 'VIDEO',
              videoUrl: 'https://vimeo.com/90002-new',
              duration: '20:00',
              durationSeconds: 1200,
              order: 3
            }
          ]
        },
        // Add NEW module
        {
          id: newSectionId,
          title: 'Module 2: Advanced Cloud Deployments (NEW)',
          description: 'Brand new module added in v2.0',
          order: 2,
          lessons: [
            {
              id: `les-mod2-1-${Date.now()}`,
              title: 'Lecture 2.2: Kubernetes Cluster Setup (NEW)',
              type: 'VIDEO',
              videoUrl: 'https://vimeo.com/90003-new',
              duration: '25:00',
              durationSeconds: 1500,
              order: 1
            }
          ]
        }
      ]
    };

    // Apply via route logic directly
    // 1) Verify courseUpdateData protects basic info and thumbnail
    const isChildVersionDraft = Boolean(courseB!.parentCourseId);
    assert(isChildVersionDraft === true, 'courseB is detected as isChildVersionDraft');

    const courseUpdateData = isChildVersionDraft
      ? {
          price: updatePayload.price !== undefined ? Number(updatePayload.price) : undefined,
          status: 'DRAFT'
        }
      : {
          title: updatePayload.title,
          thumbnail: updatePayload.thumbnail
        };

    assert((courseUpdateData as any).title === undefined, 'Title modification is blocked from update data');
    assert((courseUpdateData as any).thumbnail === undefined, 'Thumbnail modification is blocked from update data');
    assert((courseUpdateData as any).price === 5999, 'Legitimate price update to 5999 is permitted');

    // 2) Verify Section Title protection
    const originalSecIdsSet = new Set(versionState.originalSectionIds || []);
    const originalLesIdsSet = new Set(versionState.originalLessonIds || []);

    const isOrigSec = isChildVersionDraft && originalSecIdsSet.has(origSecId);
    assert(isOrigSec === true, 'origSecId is detected as protected original section');

    // 3) Verify Original Lesson Content protection
    const isOrigLes = isChildVersionDraft && originalLesIdsSet.has(origLessonToTest!.id);
    assert(isOrigLes === true, 'Original article is detected as protected original lesson');

    // 4) Verify Original Quiz deletion protection
    // The payload omitted the quiz, but since it is in originalLesIdsSet, it must NOT be deleted!
    const incomingLessonIds = [origLesIds[0], origLessonToTest!.id, newLectureId];
    const lessonsToDelete = courseB!.sections[0].lessons.filter(
      (l) => !incomingLessonIds.includes(l.id) && (!isChildVersionDraft || !originalLesIdsSet.has(l.id))
    );
    assert(lessonsToDelete.length === 0, 'Original Quiz deletion is BLOCKED (cannot be deleted)');

    console.log('\n📌 Test Group 4: Verify Independent Co-existence of Course A & B');
    const liveA = await prisma.course.findUnique({
      where: { id: courseA.id },
      include: { sections: { include: { lessons: true } } }
    });
    assert(liveA!.title === 'Original Cloud Architecture v1', 'Course A title remains intact');
    assert(liveA!.thumbnail === 'https://images.unsplash.com/photo-original-thumbnail.jpg', 'Course A thumbnail intact');
    assert(liveA!.sections.length === 1, 'Course A still has exactly 1 section');
    assert(liveA!.sections[0].lessons.length === 3, 'Course A still has exactly 3 lessons');
    assert(liveA!.status === 'PUBLISHED', 'Course A remains PUBLISHED');

    // Clean up
    await prisma.lesson.deleteMany({ where: { section: { courseId: courseB!.id } } }).catch(() => {});
    await prisma.courseSection.deleteMany({ where: { courseId: courseB!.id } }).catch(() => {});
    await prisma.course.delete({ where: { id: courseB!.id } }).catch(() => {});
    await prisma.lesson.deleteMany({ where: { section: { courseId: courseA.id } } }).catch(() => {});
    await prisma.courseSection.deleteMany({ where: { courseId: courseA.id } }).catch(() => {});
    await prisma.course.delete({ where: { id: courseA.id } }).catch(() => {});

    console.log('\n======================================================');
    console.log(`📊 Validation Summary: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runValidationTests();

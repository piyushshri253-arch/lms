import { prisma } from '../src/lib/prisma';
import {
  createOrGetDraftVersion,
  discardDraftVersion,
  getCourseVersionState
} from '../src/lib/course-versioning';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('🧪 Testing Draft Tab Inclusion & Discard/Delete Draft');
  console.log('======================================================\n');

  try {
    // 1. Get or create test organization & instructor
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: 'Test Academy',
          slug: `test-academy-${Date.now()}`
        }
      });
    }

    let instructor = await prisma.user.findFirst({
      where: { role: 'INSTRUCTOR' }
    });
    if (!instructor) {
      instructor = await prisma.user.create({
        data: {
          email: `instructor-${Date.now()}@example.com`,
          name: 'Lead Instructor',
          role: 'INSTRUCTOR',
          password: 'dummy-hash'
        }
      });
    }

    let category = await prisma.category.findFirst();
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'Web Development',
          slug: `web-dev-${Date.now()}`
        }
      });
    }

    console.log('📌 Test Group 1: Create Live Course and Spawn Version Draft');
    const liveCourse = await prisma.course.create({
      data: {
        title: 'Full Stack Masterclass',
        slug: `fs-master-${Date.now()}`,
        description: 'Complete full stack course',
        price: 2999,
        status: 'PUBLISHED',
        versionNumber: 1,
        versionLabel: 'v1.0',
        categoryId: category.id,
        instructorId: instructor.id,
        organizationId: org.id,
        sections: {
          create: [
            {
              title: 'Module 1: Introduction',
              order: 1,
              lessons: {
                create: [
                  { title: 'Lecture 1.1', type: 'VIDEO', order: 1 }
                ]
              }
            }
          ]
        }
      }
    });

    assert(Boolean(liveCourse.id), 'Live published course created');

    // Trigger Update Version
    const draftResult = await createOrGetDraftVersion(liveCourse.id, {
      id: instructor.id,
      name: instructor.name
    });

    assert(draftResult.isNewDraft === true, 'isNewDraft is true');
    assert(Boolean(draftResult.draftCourse), 'Child draft course record created');
    const childCourseId = draftResult.draftCourse!.id;

    // Simulate Auditor reviewing and requesting changes
    await prisma.course.update({
      where: { id: childCourseId },
      data: {
        status: 'CHANGES_REQUESTED',
        reviewFeedback: 'Please add 2 more lectures to Module 1 before approval.'
      }
    });

    const updatedChild = await prisma.course.findUnique({ where: { id: childCourseId } });
    assert(updatedChild?.status === 'CHANGES_REQUESTED', 'Child course status updated to CHANGES_REQUESTED');

    console.log('\n📌 Test Group 2: Verify isDraftCourse Logic');
    // Mirror instructor page isDraftCourse function
    const isDraftCourse = (c: any, allCourses: any[]) => {
      if (c.status === 'DRAFT') return true;
      if (
        Boolean(c.parentCourseId) &&
        c.status !== 'PUBLISHED' &&
        c.status !== 'APPROVED' &&
        c.status !== 'IN_REVIEW' &&
        c.status !== 'PENDING' &&
        c.status !== 'PENDING_APPROVAL'
      ) {
        return true;
      }
      const hasSeparateChild = allCourses.some((other) => other.parentCourseId === c.id);
      if (
        !hasSeparateChild &&
        c.hasDraftVersion &&
        c.versionStatus !== 'PENDING_REVIEW' &&
        c.versionStatus !== 'APPROVED'
      ) {
        return true;
      }
      return false;
    };

    const mockCourses = [liveCourse, updatedChild];
    const isChildInDrafts = isDraftCourse(updatedChild, mockCourses);
    assert(isChildInDrafts === true, 'Child version draft with CHANGES_REQUESTED is included in Drafts tab!');

    console.log('\n📌 Test Group 3: Resume Existing Draft with CHANGES_REQUESTED');
    // When clicking update version on the course again, it must resume the existing child draft instead of making a duplicate
    const resumeResult = await createOrGetDraftVersion(liveCourse.id, {
      id: instructor.id,
      name: instructor.name
    });
    assert(resumeResult.isNewDraft === false, 'Existing draft was reused (isNewDraft === false)');
    assert(resumeResult.draftCourse.id === childCourseId, 'Reused the existing child draft record');

    console.log('\n📌 Test Group 4: Discard Draft Revision');
    // Call discardDraftVersion on the child draft
    const stateAfterDiscard = await discardDraftVersion(childCourseId, {
      id: instructor.id,
      name: instructor.name,
      role: 'INSTRUCTOR'
    });

    assert(stateAfterDiscard.status === 'LIVE_SYNCED', 'Root version state reset to LIVE_SYNCED');
    assert(stateAfterDiscard.pendingVersionNumber === null, 'pendingVersionNumber is null');

    // Verify child course record was permanently removed from database
    const deletedChild = await prisma.course.findUnique({ where: { id: childCourseId } });
    assert(deletedChild === null, 'Child draft course record permanently deleted from PostgreSQL');

    // Verify live published course is completely safe and still PUBLISHED
    const liveCourseCheck = await prisma.course.findUnique({
      where: { id: liveCourse.id },
      include: { sections: { include: { lessons: true } } }
    });
    assert(liveCourseCheck?.status === 'PUBLISHED', 'Live published course is STILL PUBLISHED');
    assert(liveCourseCheck?.title === 'Full Stack Masterclass', 'Live course title untouched');
    assert(liveCourseCheck?.sections.length === 1, 'Live course sections untouched');
    assert(liveCourseCheck?.sections[0].lessons.length === 1, 'Live course lessons untouched');

    // Clean up test course
    await prisma.courseSection.deleteMany({ where: { courseId: liveCourse.id } }).catch(() => {});
    await prisma.course.delete({ where: { id: liveCourse.id } }).catch(() => {});
    await prisma.platformSetting.delete({ where: { key: `course_version_${liveCourse.id}` } }).catch(() => {});

    console.log('\n======================================================');
    console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err: any) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

main();

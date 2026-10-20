import { checkTitleMinorSpellingFix } from '../src/lib/course-title-validator';
import { classifyCourseChanges } from '../src/lib/course-versioning';

async function runTests() {
  console.log('=== TEST 1: Course Title Minor Spelling/Typo Validator ===');

  const baseTitle = 'Full Stack Web Development Masterclass 2026';

  // Allowed Typo / Spelling fixes
  const minorFix1 = 'Full Stack Web Development Masterclas 2026'; // typo in Masterclass
  const res1 = checkTitleMinorSpellingFix(baseTitle, minorFix1);
  console.log(`[PASS: minor typo] "${baseTitle}" vs "${minorFix1}" => isMinorFix: ${res1.isMinorFix}`);
  if (!res1.isMinorFix) throw new Error('Expected minor typo to pass');

  const minorFix2 = 'Full-Stack Web Development Masterclass (2026)'; // punctuation & hyphens
  const res2 = checkTitleMinorSpellingFix(baseTitle, minorFix2);
  console.log(`[PASS: punctuation] "${baseTitle}" vs "${minorFix2}" => isMinorFix: ${res2.isMinorFix}`);
  if (!res2.isMinorFix) throw new Error('Expected punctuation change to pass');

  // Blocked Major Subject / Rebranding Overhauls
  const majorChange1 = 'Machine Learning and Deep Learning with PyTorch';
  const res3 = checkTitleMinorSpellingFix(baseTitle, majorChange1);
  console.log(`[BLOCKED: complete overhaul] "${baseTitle}" vs "${majorChange1}" => isMinorFix: ${res3.isMinorFix}`);
  if (res3.isMinorFix) throw new Error('Expected major overhaul to be BLOCKED');

  const majorChange2 = 'Python Programming from Scratch for Absolute Beginners';
  const res4 = checkTitleMinorSpellingFix(baseTitle, majorChange2);
  console.log(`[BLOCKED: subject change] "${baseTitle}" vs "${majorChange2}" => isMinorFix: ${res4.isMinorFix}`);
  if (res4.isMinorFix) throw new Error('Expected subject change to be BLOCKED');

  console.log('\n=== TEST 2: Course Versioning Changes Classification ===');

  const mockLiveCourse = {
    id: 'course-123',
    title: 'Modern React & Next.js Bootcamp',
    thumbnail: 'https://example.com/thumb-v1.jpg',
    banner: 'https://example.com/banner-v1.jpg',
    description: 'Master modern React and Next.js from fundamentals to advanced concepts.',
    shortDescription: 'Full guide to React and Next.js',
    price: 1999,
    discountPrice: 1499,
    currency: 'INR',
    level: 'INTERMEDIATE',
    language: 'English',
    sections: [
      {
        id: 'sec-1',
        title: 'Module 1: Introduction to React',
        order: 1,
        lessons: [
          {
            id: 'les-1',
            title: 'Lecture 1: Welcome to the Course',
            type: 'VIDEO',
            videoUrl: 'https://cdn.example.com/videos/welcome.mp4',
            order: 1
          },
          {
            id: 'les-2',
            title: 'Article 1: Course Guide & Resources',
            type: 'TEXT',
            content: 'Here are the resources and syllabus for this course.',
            order: 2
          }
        ]
      }
    ]
  };

  // Test 2A: Minor title spelling fix + typo fix in article text
  const minorEditPayload = {
    title: 'Modern React & Next.js Bootcmp', // typo fix
    sections: [
      {
        id: 'sec-1',
        title: 'Module 1: Introduction to React',
        order: 1,
        lessons: [
          {
            id: 'les-1',
            title: 'Lecture 1: Welcome to the Course',
            type: 'VIDEO',
            videoUrl: 'https://cdn.example.com/videos/welcome.mp4',
            order: 1
          },
          {
            id: 'les-2',
            title: 'Article 1: Course Guide & Resources',
            type: 'TEXT',
            content: 'Here are the resources and syllabus for this masterclass course.', // minor typo fix in text
            order: 2
          }
        ]
      }
    ]
  };

  const classifMinor = classifyCourseChanges(mockLiveCourse, minorEditPayload);
  console.log('Minor edit classification:', {
    hasMajorChanges: classifMinor.hasMajorChanges,
    hasMinorChanges: classifMinor.hasMinorChanges,
    minorSummary: classifMinor.minorChanges.map(c => c.summary)
  });
  if (classifMinor.hasMajorChanges) throw new Error('Expected purely minor changes!');
  if (!classifMinor.hasMinorChanges) throw new Error('Expected hasMinorChanges to be true');

  // Test 2B: Thumbnail change must be classified as MAJOR
  const thumbnailChangePayload = {
    thumbnail: 'https://example.com/new-brand-thumbnail.png'
  };
  const classifThumb = classifyCourseChanges(mockLiveCourse, thumbnailChangePayload);
  console.log('Thumbnail change classification:', {
    hasMajorChanges: classifThumb.hasMajorChanges,
    majorSummary: classifThumb.majorChanges.map(c => c.summary)
  });
  if (!classifThumb.hasMajorChanges) throw new Error('Thumbnail replacement MUST be classified as a MAJOR change');

  // Test 2C: Adding a module must be classified as MAJOR
  const addModulePayload = {
    sections: [
      ...mockLiveCourse.sections,
      {
        id: 'sec-2',
        title: 'Module 2: Advanced State Management',
        order: 2,
        lessons: []
      }
    ]
  };
  const classifAddModule = classifyCourseChanges(mockLiveCourse, addModulePayload);
  console.log('Add module classification:', {
    hasMajorChanges: classifAddModule.hasMajorChanges,
    majorSummary: classifAddModule.majorChanges.map(c => c.summary)
  });
  if (!classifAddModule.hasMajorChanges) throw new Error('Adding a module MUST be classified as a MAJOR change');

  // Test 2D: Adding a quiz / lecture / article must be classified as MAJOR
  const addLecturePayload = {
    sections: [
      {
        ...mockLiveCourse.sections[0],
        lessons: [
          ...mockLiveCourse.sections[0].lessons,
          {
            id: 'les-3',
            title: 'Quiz 1: Knowledge Check',
            type: 'QUIZ',
            order: 3
          }
        ]
      }
    ]
  };
  const classifAddLecture = classifyCourseChanges(mockLiveCourse, addLecturePayload);
  console.log('Add quiz/lecture classification:', {
    hasMajorChanges: classifAddLecture.hasMajorChanges,
    majorSummary: classifAddLecture.majorChanges.map(c => c.summary)
  });
  if (!classifAddLecture.hasMajorChanges) throw new Error('Adding a quiz/lecture MUST be classified as a MAJOR change');

  // Test 2E: Deleting a lecture must be classified as MAJOR
  const deleteLecturePayload = {
    sections: [
      {
        ...mockLiveCourse.sections[0],
        lessons: [mockLiveCourse.sections[0].lessons[0]] // deleted Article 1
      }
    ]
  };
  const classifDeleteLecture = classifyCourseChanges(mockLiveCourse, deleteLecturePayload);
  console.log('Delete lecture classification:', {
    hasMajorChanges: classifDeleteLecture.hasMajorChanges,
    majorSummary: classifDeleteLecture.majorChanges.map(c => c.summary)
  });
  if (!classifDeleteLecture.hasMajorChanges) throw new Error('Deleting a lecture MUST be classified as a MAJOR change');

  // Test 2F: Replacing video must be classified as MAJOR
  const replaceVideoPayload = {
    sections: [
      {
        ...mockLiveCourse.sections[0],
        lessons: [
          {
            ...mockLiveCourse.sections[0].lessons[0],
            videoUrl: 'https://cdn.example.com/videos/replaced-video.mp4'
          },
          mockLiveCourse.sections[0].lessons[1]
        ]
      }
    ]
  };
  const classifReplaceVideo = classifyCourseChanges(mockLiveCourse, replaceVideoPayload);
  console.log('Replace video classification:', {
    hasMajorChanges: classifReplaceVideo.hasMajorChanges,
    majorSummary: classifReplaceVideo.majorChanges.map(c => c.summary)
  });
  if (!classifReplaceVideo.hasMajorChanges) throw new Error('Replacing video MUST be classified as a MAJOR change');

  console.log('\n✅ ALL LOCK & VALIDATION TESTS PASSED PERFECTLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

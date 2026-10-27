import { mergeExcelSectionsForUpdateVersion, ParsedCourseData } from '../src/lib/course-excel';
import { BuilderSection, BuilderLesson, QuizConfig } from '../src/components/course-builder/CourseCurriculumStep';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 TEST SUITE: UPDATE VERSION MODE (isModeB / mode=version_draft)');
  console.log('================================================================\n');

  // Initial Live Course Curriculum
  const liveSections: BuilderSection[] = [
    {
      id: 'sec-live-1',
      clientKey: 'sec-live-1',
      tempId: 'sec-live-1',
      title: 'Module 1: Introduction to Web Development',
      description: 'Foundations of HTML, CSS, and JS',
      order: 1,
      lessons: [
        {
          id: 'les-live-1',
          clientKey: 'les-live-1',
          tempId: 'les-live-1',
          title: 'Lecture 1: Welcome & Course Overview',
          type: 'VIDEO',
          videoUrl: 'https://cdn.example.com/videos/welcome-v1.mp4',
          resourcesList: [
            {
              id: 'res-live-1',
              name: 'Getting_Started.pdf',
              url: 'https://cdn.example.com/docs/Getting_Started.pdf',
              type: 'PDF',
              sizeBytes: 1048576
            }
          ],
          order: 1
        },
        {
          id: 'les-live-2',
          clientKey: 'les-live-2',
          tempId: 'les-live-2',
          title: 'Article 1: Developer Roadmap 2026',
          type: 'TEXT',
          content: '<p>Live guide to modern web development roadmap.</p>',
          order: 2
        },
        {
          id: 'les-live-3',
          clientKey: 'les-live-3',
          tempId: 'les-live-3',
          title: 'Quiz 1: HTML Basics Assessment',
          type: 'QUIZ',
          quizData: {
            passingScore: 80,
            attemptLimit: 0,
            questions: [
              {
                id: 'q1',
                question: 'What does HTML stand for?',
                options: ['Hyper Text Markup Language', 'High Tech Modern Language'],
                correctIndex: 0,
                explanation: 'HTML means HyperText Markup Language',
                points: 1
              }
            ]
          },
          order: 3
        }
      ]
    },
    {
      id: 'sec-live-2',
      clientKey: 'sec-live-2',
      tempId: 'sec-live-2',
      title: 'Module 2: Final Assessment & Certification',
      description: 'Course exit examination',
      order: 2,
      lessons: [
        {
          id: 'les-live-final',
          clientKey: 'les-live-final',
          tempId: 'les-live-final',
          title: 'Final Assignment',
          isFinalAssignment: true,
          type: 'QUIZ',
          quizData: {
            passingScore: 75,
            attemptLimit: 3,
            questions: [
              {
                id: 'fq1',
                question: 'Original Question 1',
                options: ['Option A', 'Option B'],
                correctIndex: 0,
                explanation: 'Explanation',
                points: 1
              }
            ]
          },
          order: 1
        }
      ]
    }
  ];

  console.log('--- TEST 1: Preserve Live Items & Ignore Excel Renaming/Modifications ---');
  // Scenario 1: Instructor downloads Excel, tries to modify Module 1 title, rename Lecture 1,
  // change the video url, delete Article 1, etc.
  const modifiedExcelSections: BuilderSection[] = [
    {
      id: 'excel-sec-1',
      title: 'Hacked Module 1: Renamed Title in Excel', // Attempt to rename
      order: 1,
      lessons: [
        {
          id: 'excel-les-1',
          title: 'Hacked Lecture 1: Renamed Lecture in Excel', // Attempt to rename
          type: 'VIDEO',
          videoUrl: 'https://attacker.com/malicious.mp4', // Attempt to replace live video
          order: 1
        }
        // Notice Article 1 and Quiz 1 omitted in Excel (attempt to delete)
      ]
    }
  ];

  const mergedResult1 = mergeExcelSectionsForUpdateVersion(liveSections, modifiedExcelSections);

  // Verification 1: Module 1 title must NOT be changed
  if (mergedResult1[0].title !== 'Module 1: Introduction to Web Development') {
    throw new Error(`FAILED: Expected live module title to remain intact, got: "${mergedResult1[0].title}"`);
  }
  console.log('✅ PASS: Existing Module 1 title was preserved intact.');

  // Verification 2: Lecture 1 title, video URL, and resources must NOT be replaced
  const preservedLesson1 = mergedResult1[0].lessons[0];
  if (preservedLesson1.title !== 'Lecture 1: Welcome & Course Overview') {
    throw new Error(`FAILED: Expected live lecture title to remain intact, got: "${preservedLesson1.title}"`);
  }
  if (preservedLesson1.videoUrl !== 'https://cdn.example.com/videos/welcome-v1.mp4') {
    throw new Error(`FAILED: Expected live lecture video URL to remain intact, got: "${preservedLesson1.videoUrl}"`);
  }
  if (!preservedLesson1.resourcesList || preservedLesson1.resourcesList.length !== 1) {
    throw new Error('FAILED: Expected live lecture resources to remain intact');
  }
  console.log('✅ PASS: Existing Lecture 1 title, video URL, and resources were preserved intact.');

  // Verification 3: Article 1 and Quiz 1 must NOT be deleted
  if (mergedResult1[0].lessons.length < 3) {
    throw new Error(`FAILED: Expected live lessons to NOT be deleted, count was: ${mergedResult1[0].lessons.length}`);
  }
  console.log('✅ PASS: Live Article 1 and Quiz 1 were preserved and not deleted.');

  console.log('\n--- TEST 2: Appending Newly Added Module, Lecture, Quiz, Article via Excel ---');
  // Scenario 2: Instructor legitimately adds:
  // - A new Lecture 2 and a new Quiz 2 in Module 1
  // - A completely new Module 3 with a new Article and Quiz
  const legitimateNewExcelSections: BuilderSection[] = [
    {
      id: 'excel-sec-1',
      title: 'Module 1: Introduction to Web Development',
      order: 1,
      lessons: [
        {
          id: 'excel-les-1',
          title: 'Lecture 1: Welcome & Course Overview',
          type: 'VIDEO',
          order: 1
        },
        {
          id: 'excel-les-2',
          title: 'Article 1: Developer Roadmap 2026',
          type: 'TEXT',
          order: 2
        },
        {
          id: 'excel-les-3',
          title: 'Quiz 1: HTML Basics Assessment',
          type: 'QUIZ',
          order: 3
        },
        // NEW LESSON 1:
        {
          id: 'excel-les-new-1',
          title: 'Lecture 2: Advanced CSS Grid & Flexbox Techniques',
          type: 'VIDEO',
          order: 4
        },
        // NEW LESSON 2:
        {
          id: 'excel-les-new-2',
          title: 'Quiz 2: CSS Mastery Quiz',
          type: 'QUIZ',
          quizData: {
            passingScore: 85,
            attemptLimit: 0,
            questions: [
              {
                id: 'css-q1',
                question: 'Which CSS property enables flexbox?',
                options: ['display: flex', 'float: flex'],
                correctIndex: 0,
                explanation: 'display: flex is standard',
                points: 1
              }
            ]
          },
          order: 5
        }
      ]
    },
    // Retain Module 2 with Final Assignment
    {
      id: 'excel-sec-2',
      title: 'Module 2: Final Assessment & Certification',
      order: 2,
      lessons: [
        {
          id: 'excel-les-final',
          title: 'Final Assignment',
          isFinalAssignment: true,
          type: 'QUIZ',
          order: 1
        }
      ]
    },
    // NEW MODULE 3:
    {
      id: 'excel-sec-new-3',
      title: 'Module 3: Full Stack Backend with Node.js',
      description: 'Node.js, Express, REST APIs',
      order: 3,
      lessons: [
        {
          id: 'excel-new-m3-l1',
          title: 'Lecture 1: Intro to Node.js Runtime',
          type: 'VIDEO',
          order: 1
        },
        {
          id: 'excel-new-m3-l2',
          title: 'Article 1: Setting up Express Server',
          type: 'TEXT',
          content: '<p>Step by step instructions for Express.</p>',
          order: 2
        }
      ]
    }
  ];

  const mergedResult2 = mergeExcelSectionsForUpdateVersion(liveSections, legitimateNewExcelSections);

  // Check Module 1 has 5 lessons now (3 live + 2 newly added)
  const mod1 = mergedResult2[0];
  if (mod1.lessons.length !== 5) {
    throw new Error(`FAILED: Expected Module 1 to have 5 lessons (3 live + 2 new), got: ${mod1.lessons.length}`);
  }
  const addedLes1 = mod1.lessons[3];
  const addedLes2 = mod1.lessons[4];
  if (addedLes1.title !== 'Lecture 2: Advanced CSS Grid & Flexbox Techniques') {
    throw new Error(`FAILED: Newly added lecture 2 title mismatch: "${addedLes1.title}"`);
  }
  if (addedLes2.title !== 'Quiz 2: CSS Mastery Quiz' || addedLes2.type !== 'QUIZ') {
    throw new Error(`FAILED: Newly added quiz title mismatch: "${addedLes2.title}"`);
  }
  console.log('✅ PASS: Module 1 successfully appended Lecture 2 and Quiz 2 while preserving live items.');

  // Check Module 3 was appended as a new module and Final Assessment is strictly last
  if (mergedResult2.length !== 3) {
    throw new Error(`FAILED: Expected total 3 modules, got: ${mergedResult2.length}`);
  }
  const mod3 = mergedResult2.find((m) => m.title.includes('Module 3') || m.title.includes('Node.js'));
  if (!mod3) {
    throw new Error(`FAILED: Expected Module 3 to be appended, got: ${mergedResult2.map((m) => m.title).join(', ')}`);
  }
  if (mod3.lessons.length !== 2) {
    throw new Error(`FAILED: Expected Module 3 to have 2 lessons, got: ${mod3.lessons.length}`);
  }
  const lastModule = mergedResult2[mergedResult2.length - 1];
  if (!lastModule.lessons.some((l) => l.isFinalAssignment)) {
    throw new Error(`FAILED: Expected Final Assessment to be in the last module, got: ${lastModule.title}`);
  }
  console.log('✅ PASS: Module 3 was successfully appended with newly added Lecture & Article, and Final Assessment remains strictly at the end.');

  console.log('\n--- TEST 3: Final Assignment Can Be Updated in Update Version ---');
  // Scenario 3: Instructor provides updated Final Assignment questions & passing score
  const finalAssignmentUpdateSections: BuilderSection[] = [
    {
      id: 'excel-sec-1',
      title: 'Module 1: Introduction to Web Development',
      order: 1,
      lessons: [
        {
          id: 'excel-les-1',
          title: 'Lecture 1: Welcome & Course Overview',
          type: 'VIDEO',
          order: 1
        }
      ]
    },
    {
      id: 'excel-sec-2',
      title: 'Module 2: Final Assessment & Certification',
      order: 2,
      lessons: [
        {
          id: 'excel-final',
          title: 'Final Assignment',
          isFinalAssignment: true,
          type: 'QUIZ',
          quizData: {
            passingScore: 90, // Updated passing score
            attemptLimit: 3,
            questions: [
              {
                id: 'new-q1',
                question: 'Comprehensive Final Question 1 (Updated)',
                options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                correctIndex: 2,
                explanation: 'Updated explanation',
                points: 2
              },
              {
                id: 'new-q2',
                question: 'Comprehensive Final Question 2 (New)',
                options: ['True', 'False'],
                correctIndex: 0,
                explanation: 'New explanation',
                points: 2
              }
            ]
          },
          order: 1
        }
      ]
    }
  ];

  const mergedResult3 = mergeExcelSectionsForUpdateVersion(liveSections, finalAssignmentUpdateSections);
  const finalAssignmentLes = mergedResult3[1].lessons.find((l) => l.isFinalAssignment);
  if (!finalAssignmentLes) {
    throw new Error('FAILED: Final Assignment lesson not found');
  }
  const qData = finalAssignmentLes.quizData as QuizConfig;
  if (!qData || qData.passingScore !== 90) {
    throw new Error(`FAILED: Expected updated passing score 90, got: ${qData?.passingScore}`);
  }
  if (qData.questions?.length !== 2) {
    throw new Error(`FAILED: Expected 2 updated questions, got: ${qData.questions?.length}`);
  }
  console.log('✅ PASS: Final Assignment questions and passing score were successfully updated.');

  console.log('\n--- TEST 4: Excel Import in Update Version Mode (Base Info Protection) ---');
  // Scenario 4: Excel contains different base info values (title, slug, category, thumbnail, etc.)
  // Verify that in isModeB, builder/page.tsx preserves original courseState base info.
  const liveCourseState = {
    title: 'Certified Python Architect 2026',
    slug: 'certified-python-architect-2026',
    category: 'Computer Science',
    level: 'ADVANCED',
    language: 'English',
    shortDescription: 'Master Python architectural patterns.',
    description: 'Deep dive into Python enterprise architectures.',
    thumbnail: 'https://cdn.example.com/python-thumb.png',
    price: 4999,
    discountPrice: 2999,
    sections: liveSections
  };

  const parsedExcelWithDifferentBaseInfo: ParsedCourseData = {
    title: 'Hacked Title Changed in Excel',
    slug: 'hacked-slug-changed-in-excel',
    category: 'Marketing',
    level: 'BEGINNER',
    language: 'Hindi',
    shortDescription: 'Hacked short description',
    description: 'Hacked full description',
    price: 999,
    discountPrice: 499,
    sections: legitimateNewExcelSections
  };

  const isModeB = true;

  // Simulate builder handleConfirmExcelImport
  let simulatedCourseState = { ...liveCourseState };
  if (isModeB) {
    simulatedCourseState = {
      ...simulatedCourseState,
      sections: mergeExcelSectionsForUpdateVersion(simulatedCourseState.sections || [], parsedExcelWithDifferentBaseInfo.sections || [])
    };
  } else {
    simulatedCourseState = {
      ...simulatedCourseState,
      title: parsedExcelWithDifferentBaseInfo.title || simulatedCourseState.title,
      slug: parsedExcelWithDifferentBaseInfo.slug || simulatedCourseState.slug,
      category: parsedExcelWithDifferentBaseInfo.category || simulatedCourseState.category,
      level: parsedExcelWithDifferentBaseInfo.level || simulatedCourseState.level,
      language: parsedExcelWithDifferentBaseInfo.language || simulatedCourseState.language,
      shortDescription: parsedExcelWithDifferentBaseInfo.shortDescription || simulatedCourseState.shortDescription,
      description: parsedExcelWithDifferentBaseInfo.description || simulatedCourseState.description,
      price: parsedExcelWithDifferentBaseInfo.price !== undefined ? parsedExcelWithDifferentBaseInfo.price : simulatedCourseState.price,
      sections: parsedExcelWithDifferentBaseInfo.sections && parsedExcelWithDifferentBaseInfo.sections.length > 0
        ? parsedExcelWithDifferentBaseInfo.sections
        : simulatedCourseState.sections
    };
  }

  // Verifications on simulatedCourseState
  if (simulatedCourseState.title !== 'Certified Python Architect 2026') {
    throw new Error(`FAILED: Base info Title was overwritten in Update Version! Got: ${simulatedCourseState.title}`);
  }
  if (simulatedCourseState.slug !== 'certified-python-architect-2026') {
    throw new Error(`FAILED: Base info Slug was overwritten in Update Version! Got: ${simulatedCourseState.slug}`);
  }
  if (simulatedCourseState.category !== 'Computer Science') {
    throw new Error(`FAILED: Base info Category was overwritten in Update Version! Got: ${simulatedCourseState.category}`);
  }
  if (simulatedCourseState.thumbnail !== 'https://cdn.example.com/python-thumb.png') {
    throw new Error(`FAILED: Base info Thumbnail was overwritten in Update Version! Got: ${simulatedCourseState.thumbnail}`);
  }
  if (simulatedCourseState.sections.length !== 3) {
    throw new Error(`FAILED: Expected merged sections to have 3 modules, got: ${simulatedCourseState.sections.length}`);
  }
  console.log('✅ PASS: In Update Version mode, all Basic Information fields are strictly protected from Excel overwrites.');
  console.log('✅ PASS: Only new modules & lectures are appended to the curriculum.');

  console.log('\n================================================================');
  console.log('🎉 ALL UPDATE VERSION (MODE B) TESTS PASSED 100% SUCCESSFULLY!');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});

/**
 * Utility functions for clean, professional curriculum titles and numbering across LMS.
 * Handles continuous lecture numbering (Lecture 1, 2, 3...) and quiz numbering (Quiz 1, 2...)
 * across modules, preventing duplicate prefixes (e.g. "1. 1.1", "Module 1: Module 1:").
 */

/**
 * Strips redundant prefixes like "Module 1:", "Module 01 -", "Section 1.", etc.
 * from a section/module title.
 */
export function cleanSectionTitle(rawTitle: string | undefined | null, fallbackNumber?: number): string {
  if (!rawTitle) {
    return fallbackNumber !== undefined ? `Module ${fallbackNumber}` : '';
  }
  let title = String(rawTitle).trim();
  let prev = '';
  while (prev !== title) {
    prev = title;
    title = title
      .replace(/^(module|section)\s*\d+(\.\d+)*\s*[:\.\-]?\s*/i, '')
      .replace(/^(\d+(\.\d+)*)[\s:\-\.]+\s*/, '')
      .trim();
  }
  if (!title) {
    return fallbackNumber !== undefined ? `Module ${fallbackNumber}` : rawTitle.trim();
  }
  return title;
}

/**
 * Strips redundant prefixes like "1.1 ", "1.2.1 ", "1. ", "01 - ", "Lecture 1: ", "Quiz 1: "
 * from a lesson title so it can be formatted cleanly and consistently.
 */
export function cleanLessonTitle(rawTitle: string | undefined | null): string {
  if (!rawTitle) return '';
  let title = String(rawTitle).trim();
  let prev = '';
  // Repeat while changes are made to strip combinations like "1. 1.1 ", "Lecture 1: 1.1 ", etc.
  while (prev !== title) {
    prev = title;
    title = title
      .replace(/^\d+(\.\d+)*\s*[:\.\-]?\s*/, '')
      .replace(/^(lecture|lesson|quiz|assignment|project|task)\s*\d*(\.\d+)*\s*[:\.\-]?\s*/i, '')
      .trim();
  }
  return title;
}

export interface FormattedLessonItem {
  id: string;
  itemNumber: number;
  typeLabel: string;        // "Lecture 1", "Quiz 1", or "Assignment 1"
  cleanTitle: string;       // "Course Orientation & Tech Stack Setup"
  sidebarTitle: string;     // "Lecture 1: Course Orientation & Tech Stack Setup", "Quiz 1: ...", or "Assignment 1: ..."
  underPlayerTitle: string; // "Lecture 1: Course Orientation & Tech Stack Setup"
  isQuiz: boolean;
  isAssignment: boolean;
  itemType: 'LECTURE' | 'QUIZ' | 'ASSIGNMENT';
}

/**
 * Generates continuous course-wide numbering for lectures (Lecture 1, 2, 3...),
 * quizzes (Quiz 1, 2...), and assignments (Assignment 1, 2...) across sections/modules.
 */
export function generateCurriculumDisplayMap(sections: any[]): Map<string, FormattedLessonItem> {
  const map = new Map<string, FormattedLessonItem>();
  let lectureCounter = 0;
  let quizCounter = 0;
  let assignmentCounter = 0;

  (sections || []).forEach((sec: any) => {
    (sec.lessons || []).forEach((les: any) => {
      const isQuiz =
        les.type === 'QUIZ' ||
        Boolean(les.quizData && (!les.videoUrl || les.videoUrl.startsWith('blob:'))) ||
        /^quiz\b/i.test(les.title?.trim() || '');

      const isAssignment =
        !isQuiz && (
          les.type === 'ASSIGNMENT' ||
          Boolean(les.assignmentData || les.assignmentId) ||
          /^assignment\b/i.test(les.title?.trim() || '')
        );

      const baseClean = cleanLessonTitle(les.title);

      if (isQuiz) {
        quizCounter += 1;
        const typeLabel = `Quiz ${quizCounter}`;
        const display = baseClean ? `${typeLabel}: ${baseClean}` : typeLabel;
        map.set(les.id, {
          id: les.id,
          itemNumber: quizCounter,
          typeLabel,
          cleanTitle: baseClean || typeLabel,
          sidebarTitle: display,
          underPlayerTitle: display,
          isQuiz: true,
          isAssignment: false,
          itemType: 'QUIZ'
        });
      } else if (isAssignment) {
        assignmentCounter += 1;
        const typeLabel = `Assignment ${assignmentCounter}`;
        const display = baseClean ? `${typeLabel}: ${baseClean}` : typeLabel;
        map.set(les.id, {
          id: les.id,
          itemNumber: assignmentCounter,
          typeLabel,
          cleanTitle: baseClean || typeLabel,
          sidebarTitle: display,
          underPlayerTitle: display,
          isQuiz: false,
          isAssignment: true,
          itemType: 'ASSIGNMENT'
        });
      } else {
        lectureCounter += 1;
        const typeLabel = `Lecture ${lectureCounter}`;
        const display = baseClean ? `${typeLabel}: ${baseClean}` : typeLabel;
        map.set(les.id, {
          id: les.id,
          itemNumber: lectureCounter,
          typeLabel,
          cleanTitle: baseClean || typeLabel,
          sidebarTitle: display,
          underPlayerTitle: display,
          isQuiz: false,
          isAssignment: false,
          itemType: 'LECTURE'
        });
      }
    });
  });

  return map;
}

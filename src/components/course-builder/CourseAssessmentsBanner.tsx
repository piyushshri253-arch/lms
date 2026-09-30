'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

interface CourseAssessmentsBannerProps {
  courseId?: string;
}

function CourseAssessmentsBannerInner({ courseId: propCourseId }: CourseAssessmentsBannerProps) {
  const searchParams = useSearchParams();
  const courseId =
    propCourseId ||
    searchParams.get('id') ||
    searchParams.get('courseId') ||
    searchParams.get('slug') ||
    '';
  const querySuffix = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';

  return (
    <div className="rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/90 p-6 sm:p-7 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Icon name="quiz" size={22} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              Course Quizzes &amp; Assignments Integration
            </h3>
            <p className="text-xs text-slate-500 max-w-xl leading-relaxed mt-0.5">
              Attach timed MCQ/Multiple-Answer quizzes, randomized question banks, or graded file/text assignments to this course, module, or lesson.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('open-course-builder-preview'));
            }
          }}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Icon name="visibility" size={16} />
          <span>Preview Course (Live Student View)</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-indigo-100">
        <Link
          href={`/instructor/quizzes/create${querySuffix}`}
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Icon name="add_circle" size={16} />
          <span>Add Quiz</span>
        </Link>
        <Link
          href={`/instructor/assignments/create${querySuffix}`}
          className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Icon name="assignment" size={16} />
          <span>Add Assignment</span>
        </Link>
        <Link
          href={`/instructor/quizzes`}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1 shadow-2xs"
        >
          <Icon name="fact_check" size={15} />
          <span>Manage Quizzes</span>
        </Link>
        <Link
          href={`/instructor/assignments`}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1 shadow-2xs"
        >
          <Icon name="assignment" size={15} />
          <span>Manage Assignments</span>
        </Link>
        <Link
          href={`/instructor/question-bank`}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1 shadow-2xs"
        >
          <Icon name="library_books" size={15} />
          <span>Question Bank</span>
        </Link>
        <Link
          href={`/instructor/questions${querySuffix}`}
          className="px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1"
        >
          <Icon name="forum" size={15} />
          <span>Student Q&amp;A</span>
        </Link>
        <Link
          href={`/instructor/course-seo${querySuffix}`}
          className="px-3.5 py-2 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-black flex items-center gap-1.5 shadow-sm"
        >
          <Icon name="travel_explore" size={16} />
          <span>Course SEO</span>
        </Link>
        <Link
          href={`/instructor/course-versions${querySuffix}`}
          className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1.5 shadow-sm"
        >
          <Icon name="verified_user" size={16} />
          <span>Version Protection &amp; Review</span>
        </Link>
        {courseId && (
          <Link
            href={`/instructor/course/${encodeURIComponent(courseId)}/review`}
            className="px-3.5 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-black flex items-center gap-1.5 shadow-sm"
          >
            <Icon name="fact_check" size={16} />
            <span>Auditor Feedback</span>
          </Link>
        )}
      </div>
    </div>
  );
}

export function CourseAssessmentsBanner(props: CourseAssessmentsBannerProps) {
  return (
    <Suspense fallback={null}>
      <CourseAssessmentsBannerInner {...props} />
    </Suspense>
  );
}

export default CourseAssessmentsBanner;

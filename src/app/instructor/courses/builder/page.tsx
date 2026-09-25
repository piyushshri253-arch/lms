'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';
import CourseBuilderPage from '@/app/admin/courses/builder/page';
import { useApp } from '@/context/AppContext';

function CourseAssessmentsBanner() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get('id') || searchParams.get('courseId') || '';
  const querySuffix = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';

  return (
    <div className="mb-6 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/90 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">quiz</span>
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900">Course Quizzes & Assignments Integration</h3>
          <p className="text-xs text-slate-500">
            Attach timed MCQ/Multiple-Answer quizzes, randomized question banks, or graded file/text assignments to this course, module, or lesson.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/instructor/quizzes/create${querySuffix}`}
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">add_circle</span>
          Add Quiz
        </Link>
        <Link
          href={`/instructor/assignments/create${querySuffix}`}
          className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">assignment_add</span>
          Add Assignment
        </Link>
        <Link
          href={`/instructor/quizzes`}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[15px]">fact_check</span>
          Manage Quizzes
        </Link>
        <Link
          href={`/instructor/assignments`}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[15px]">assignment</span>
          Manage Assignments
        </Link>
        <Link
          href={`/instructor/question-bank`}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[15px]">library_books</span>
          Question Bank
        </Link>
      </div>
    </div>
  );
}

export default function InstructorCourseBuilderWrapperPage() {
  const { currentUser } = useApp();

  return (
    <InstructorPortalShell
      title="Create & Edit Course Curriculum"
      subtitle="Configure course info, thumbnail/video media, syllabus modules, quizzes, assignments, pricing, and submit for approval"
      profile={{
        name: currentUser?.name || 'Instructor',
        email: currentUser?.email || '',
        role: 'INSTRUCTOR',
        emailVerified: true
      }}
    >
      <Suspense fallback={null}>
        <CourseAssessmentsBanner />
      </Suspense>
      <CourseBuilderPage />
    </InstructorPortalShell>
  );
}


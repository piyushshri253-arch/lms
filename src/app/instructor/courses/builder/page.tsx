'use client';

import React from 'react';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';
import CourseBuilderPage from '@/app/admin/courses/builder/page';
import { useApp } from '@/context/AppContext';

export default function InstructorCourseBuilderWrapperPage() {
  const { currentUser } = useApp();

  return (
    <InstructorPortalShell
      title="Create & Edit Course Curriculum"
      subtitle="Configure course info, thumbnail/video media, curriculum sections and lectures, quizzes, assignments, pricing, and submit for approval"
      profile={{
        name: currentUser?.name || 'Instructor',
        email: currentUser?.email || '',
        role: 'INSTRUCTOR',
        emailVerified: true
      }}
    >
      <CourseBuilderPage />
    </InstructorPortalShell>
  );
}


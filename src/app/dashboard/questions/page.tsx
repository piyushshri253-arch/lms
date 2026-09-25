'use client';

import React, { Suspense } from 'react';
import { StudentQuestionsView } from '@/components/student/StudentQuestionsView';

export default function StudentDashboardQuestionsPage() {
  return (
    <Suspense fallback={null}>
      <StudentQuestionsView />
    </Suspense>
  );
}

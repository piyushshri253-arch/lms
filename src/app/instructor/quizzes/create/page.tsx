'use client';

import React, { Suspense } from 'react';
import QuizStudioBuilder from '@/components/instructor/QuizStudioBuilder';

export default function CreateInstructorQuizPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm">Loading Quiz Studio...</div>}>
      <QuizStudioBuilder />
    </Suspense>
  );
}

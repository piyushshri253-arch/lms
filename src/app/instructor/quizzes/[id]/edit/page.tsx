'use client';

import React, { Suspense, use } from 'react';
import QuizStudioBuilder from '@/components/instructor/QuizStudioBuilder';

export default function EditInstructorQuizPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm">Loading Quiz Editor...</div>}>
      <QuizStudioBuilder quizId={id} />
    </Suspense>
  );
}

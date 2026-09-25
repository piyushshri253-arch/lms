'use client';

import React, { Suspense } from 'react';
import { LmsLayout } from '@/components/lms/LmsLayout';
import { LMS_ROUTES } from '@/lib/lms-routes';
import { StudentQuestionsView } from '@/app/dashboard/questions/page';

export default function LmsQuestionsPage() {
  return (
    <LmsLayout activePath={LMS_ROUTES.LMS_QUESTIONS} pageTitle="Ask Instructor & Course Q&A">
      <div className="bg-slate-50 rounded-3xl p-4 sm:p-6">
        <Suspense fallback={null}>
          <StudentQuestionsView />
        </Suspense>
      </div>
    </LmsLayout>
  );
}

'use client';

import React, { Suspense } from 'react';
import AssignmentStudioBuilder from '@/components/instructor/AssignmentStudioBuilder';

export default function CreateInstructorAssignmentPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm">Loading Assignment Studio...</div>}>
      <AssignmentStudioBuilder />
    </Suspense>
  );
}

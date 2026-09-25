'use client';

import React, { Suspense, use } from 'react';
import AssignmentStudioBuilder from '@/components/instructor/AssignmentStudioBuilder';

export default function EditInstructorAssignmentPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm">Loading Assignment Editor...</div>}>
      <AssignmentStudioBuilder assignmentId={id} />
    </Suspense>
  );
}

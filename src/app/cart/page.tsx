'use client';

import React, { Suspense } from 'react';
import StudentCartPage from '@/app/student/cart/page';

export const dynamic = 'force-dynamic';

export default function CartPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <StudentCartPage />
    </Suspense>
  );
}

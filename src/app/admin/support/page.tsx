'use client';

import React, { Suspense } from 'react';
import { SupportDeskHub } from '@/components/support/SupportDeskHub';

export default function AdminSupportPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-outline flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Loading Support Desk...</span>
        </div>
      }
    >
      <SupportDeskHub portal="admin" />
    </Suspense>
  );
}

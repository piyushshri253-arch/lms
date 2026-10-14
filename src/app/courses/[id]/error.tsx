'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export default function CourseDetailError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Course detail error caught by error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-white">
      <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
        <Icon name="error_outline" size={32} />
      </div>

      <h1 className="text-2xl font-bold text-[#2d2f31] mb-2 tracking-tight">
        Unable to load course
      </h1>
      <p className="text-sm text-[#6a6f73] max-w-md mx-auto mb-6 leading-relaxed">
        We encountered a temporary issue loading this course. Please try reloading or explore other courses in our catalog.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 bg-[#2d2f31] hover:bg-[#1c1d1f] text-white text-sm font-bold rounded-none sm:rounded-[4px] transition-colors cursor-pointer"
        >
          Try Again
        </button>

        <Link
          href="/courses"
          className="px-5 py-2.5 border border-[#2d2f31] hover:bg-[#f7f9fa] text-[#2d2f31] text-sm font-bold rounded-none sm:rounded-[4px] transition-colors"
        >
          Browse All Courses
        </Link>
      </div>

      <Link
        href="/"
        className="mt-6 text-xs text-[#5022c3] font-bold hover:underline"
      >
        ← Return to Homepage
      </Link>
    </div>
  );
}

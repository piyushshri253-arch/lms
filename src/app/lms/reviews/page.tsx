'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LMS_ROUTES } from '@/lib/lms-routes';
import { LmsLayout } from '@/components/lms/LmsLayout';

export default function LmsReviewsPage() {
  const reviews = [
    {
      id: 'rev-1',
      courseTitle: 'Full-Stack Next.js 16 Masterclass',
      rating: 5,
      comment: 'Incredible deep dive into Server Actions and cache strategies. Truly production-ready material.',
      date: 'August 20, 2026'
    }
  ];

  return (
    <LmsLayout activePath={LMS_ROUTES.REVIEWS} pageTitle="My Reviews">
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.03] p-6 rounded-3xl border border-emerald-500/20 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 mb-1">
              <Link href={LMS_ROUTES.DASHBOARD} className="hover:text-emerald-400 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-emerald-400">Feedback</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              My Course Reviews & Testimonials
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Feedback submitted for instructors and educational masterclasses.
            </p>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4 max-w-3xl">
          {reviews.map((r) => (
            <div key={r.id} className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white">{r.courseTitle}</h3>
                <span className="text-xs font-mono text-amber-400">{'★'.repeat(r.rating)}</span>
              </div>
              <p className="text-xs text-slate-300 italic">"{r.comment}"</p>
              <div className="text-[11px] font-mono text-slate-400">Submitted on {r.date}</div>
            </div>
          ))}
        </div>
      </div>
    </LmsLayout>
  );
}

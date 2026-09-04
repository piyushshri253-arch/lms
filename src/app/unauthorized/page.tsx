'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const customMessage = searchParams.get('msg');

  return (
    <div className="min-h-screen w-full bg-[#060814] text-white flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden antialiased selection:bg-rose-500/30 selection:text-rose-200">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-grid-pattern opacity-15 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-rose-600/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-amber-600/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-xl bg-[#0c1024] border border-white/10 rounded-3xl sm:rounded-[32px] shadow-2xl shadow-black/80 overflow-hidden p-8 sm:p-12 relative z-10 backdrop-blur-xl text-center space-y-6">
        {/* Lock / Shield Icon */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-950/40">
          <Icon name="lock" size={40} />
        </div>

        {/* Status code & title */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/20 px-3 py-1 rounded-full">
            HTTP 403 &bull; Access Denied
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Administrator Access Restricted
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
            {customMessage ||
              'You are authenticated, but your account role does not have permission to view or manage this administrative area.'}
          </p>
        </div>

        {/* Role Explanation Note */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-left text-xs text-slate-400 space-y-2">
          <div className="font-bold text-slate-300 flex items-center gap-2">
            <Icon name="info" size={16} className="text-amber-400" />
            <span>Why am I seeing this?</span>
          </div>
          <p className="leading-relaxed">
            Routes starting with <code className="text-white font-mono bg-white/10 px-1 py-0.5 rounded text-[11px]">/admin/*</code> require platform administrator privileges. If you are an instructor or student, please access your dedicated portal.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/lms/dashboard"
            className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Icon name="dashboard" size={18} />
            <span>Learning Dashboard</span>
          </Link>

          <Link
            href="/login"
            className="flex-1 py-3.5 px-5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Icon name="swap_horiz" size={18} />
            <span>Switch Account</span>
          </Link>
        </div>

        {/* Return Home */}
        <div className="pt-2">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1.5"
          >
            <Icon name="arrow_back" size={14} />
            <span>Back to Homepage</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-[#060814] flex items-center justify-center text-slate-400 text-sm">
          Loading...
        </div>
      }
    >
      <UnauthorizedContent />
    </Suspense>
  );
}

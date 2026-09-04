'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';

export const AadhyaraFinalCtaSection: React.FC = () => {
  return (
    <section className="py-24 sm:py-32 bg-[#060814] text-white border-t border-white/10 relative overflow-hidden text-center">
      {/* Background Cosmic Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] sm:w-[950px] h-[450px] bg-gradient-to-tr from-indigo-600/25 via-purple-600/25 to-pink-600/15 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-xs font-mono uppercase text-indigo-300 font-bold tracking-wider mb-8">
          <span>🚀 Launch In Minutes</span>
        </div>

        {/* Heading */}
        <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Ready to Build Your Online Business?
        </h2>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
          Create your website, sell your products, manage your customers and grow with AI.
        </p>

        {/* Action CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/company-signup"
            className="w-full sm:w-auto px-9 py-4 rounded-2xl font-extrabold text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-2xl shadow-indigo-600/40 hover:shadow-indigo-600/70 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border border-white/20 flex items-center justify-center gap-2.5 cursor-pointer group"
          >
            <span>🚀</span>
            <span>Start with AADHYARA Sales</span>
            <Icon name="arrow_forward" size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/courses"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-sm text-slate-200 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 hover:border-white/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🎓</span>
            <span>Start Learning</span>
          </Link>
        </div>

        {/* Sub-text */}
        <div className="mt-6 text-xs text-slate-400 font-medium flex items-center justify-center gap-3">
          <span>No credit card required</span>
          <span>•</span>
          <span>Instant setup</span>
          <span>•</span>
          <span>Full white-label freedom</span>
        </div>
      </div>
    </section>
  );
};

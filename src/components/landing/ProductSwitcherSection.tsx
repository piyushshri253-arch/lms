'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';

export const ProductSwitcherSection: React.FC = () => {
  return (
    <section id="platform" className="py-24 bg-[#080b1e] text-white border-y border-white/10 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs font-mono uppercase text-indigo-300 font-bold tracking-wider mb-4">
            <span>Unified Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            One ecosystem. Two powerful platforms.
          </h2>
          <p className="text-base sm:text-lg text-slate-300 mt-4 leading-relaxed font-normal">
            Whether you are teaching courses or scaling a full-fledged digital commerce business, AADHYARA provides
            dedicated, specialized platforms built to work seamlessly together.
          </p>
        </div>

        {/* 2 Large Product Cards Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Card 1: 🎓 AADHYARA Learning */}
          <div
            id="learning-overview"
            className="rounded-3xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/15 hover:border-emerald-500/40 p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 shadow-xl group hover:shadow-emerald-950/20"
          >
            <div>
              {/* Product Badge */}
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-3xl shadow-lg group-hover:scale-105 transition-transform">
                  🎓
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold uppercase tracking-wider">
                  LEARNING &amp; LMS
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                AADHYARA Learning
              </h3>
              <p className="text-sm font-semibold text-emerald-400 mt-1">
                Your complete learning platform.
              </p>
              <p className="text-xs sm:text-sm text-slate-300 mt-3 leading-relaxed">
                Deliver immersive masterclasses, interactive video lessons, quizzes, accredited certificates, and comprehensive student lifecycle tracking.
              </p>

              {/* Target Audience */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <span className="text-[11px] font-mono font-bold uppercase text-slate-400 tracking-wider block mb-2">
                  Built for:
                </span>
                <div className="flex flex-wrap gap-2">
                  {['Students', 'Instructors', 'Academies', 'Training Teams'].map((item) => (
                    <span
                      key={item}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-200 font-medium"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Feature Checklist */}
              <div className="mt-6 space-y-2.5">
                <span className="text-[11px] font-mono font-bold uppercase text-slate-400 tracking-wider block mb-2">
                  Core Capabilities:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-200">
                  {[
                    'Interactive Courses',
                    'High-Speed Video Streaming',
                    'Quizzes & Knowledge Checks',
                    'Assignments & Grading',
                    'Accredited Certificates',
                    'Student CRM Management',
                    'Instructor Studio Tools',
                    'Granular Learning Analytics'
                  ].map((feat) => (
                    <div key={feat} className="flex items-center gap-2">
                      <Icon name="check" size={14} className="text-emerald-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTAs for Learning */}
            <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/courses"
                className="w-full sm:flex-1 py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 transition-all cursor-pointer"
              >
                <span>Explore Learning</span>
                <Icon name="arrow_forward" size={14} />
              </Link>

              <Link
                href="/login?portal=student"
                className="w-full sm:w-auto py-3.5 px-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Learning Login</span>
              </Link>
            </div>
          </div>

          {/* Card 2: 🚀 AADHYARA Sales (Featured Standout) */}
          <div
            id="sales-overview"
            className="rounded-3xl bg-gradient-to-b from-indigo-950/40 via-purple-950/20 to-slate-950 border-2 border-indigo-500/50 hover:border-indigo-400 p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 shadow-2xl shadow-indigo-950/40 relative group"
          >
            {/* Top Standout Ribbon */}
            <div className="absolute -top-3.5 right-8 px-3.5 py-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-[11px] font-extrabold uppercase rounded-full shadow-lg border border-white/20 tracking-wider">
              🔥 Business Operating System
            </div>

            <div>
              {/* Product Badge */}
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-3xl shadow-lg group-hover:scale-105 transition-transform">
                  🚀
                </div>
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-mono font-bold uppercase tracking-wider">
                  COMMERCE &amp; GROWTH
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                AADHYARA Sales
              </h3>
              <p className="text-sm font-semibold text-indigo-400 mt-1">
                Build and grow your online business.
              </p>
              <p className="text-xs sm:text-sm text-slate-200 mt-3 leading-relaxed">
                Everything you need to build your branded website, connect your custom domain, sell digital products, software licenses &amp; services, collect payments, and scale with AI.
              </p>

              {/* Target Audience */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <span className="text-[11px] font-mono font-bold uppercase text-indigo-300 tracking-wider block mb-2">
                  Built for:
                </span>
                <div className="flex flex-wrap gap-2">
                  {['Creators', 'Coaches', 'Academies', 'Businesses', 'Institutes'].map((item) => (
                    <span
                      key={item}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 font-semibold"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Feature Checklist */}
              <div className="mt-6 space-y-2.5">
                <span className="text-[11px] font-mono font-bold uppercase text-indigo-300 tracking-wider block mb-2">
                  Core Capabilities:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-200">
                  {[
                    'No-Code Website Builder',
                    'Custom Domain Integration',
                    'Universal Product Studio',
                    '1-Click Razorpay & Stripe',
                    'Software Licensing Engine',
                    'Lead & Order Management',
                    'Automated Seller Wallet',
                    'AI Business Architect'
                  ].map((feat) => (
                    <div key={feat} className="flex items-center gap-2">
                      <Icon name="check" size={14} className="text-indigo-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTAs for Sales */}
            <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/company-signup"
                className="w-full sm:flex-1 py-3.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/40 hover:shadow-indigo-600/60 hover:scale-[1.02] transition-all cursor-pointer border border-white/20"
              >
                <span>Start Sales →</span>
              </Link>

              <Link
                href="/login?portal=admin"
                className="w-full sm:w-auto py-3.5 px-5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Sales Login</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

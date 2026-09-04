'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export default function LoginSelectionPage() {
  return (
    <div className="min-h-screen w-full bg-[#060814] text-white flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background Ambient Glows & Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-indigo-600/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[550px] h-[550px] bg-purple-600/15 blur-[140px] rounded-full pointer-events-none" />

      {/* Main Card Container */}
      <div className="w-full max-w-4xl bg-[#0c1024] border border-white/15 rounded-3xl sm:rounded-[36px] shadow-2xl shadow-black/80 overflow-hidden p-6 sm:p-10 lg:p-12 relative z-10 backdrop-blur-xl space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-11 h-11 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg group-hover:scale-105 transition-transform border border-white/20">
              A
            </div>
            <div>
              <span className="font-black text-xl text-white tracking-tight block">
                AADHYARA
              </span>
              <span className="text-[10px] text-indigo-300 font-mono uppercase font-bold tracking-wider">
                Create &bull; Learn &bull; Sell
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 bg-white/[0.04] px-3.5 py-2 rounded-xl border border-white/10 self-start sm:self-auto"
          >
            <Icon name="arrow_back" size={14} />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Hero Title */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1 rounded-full">
            Product Access Portal
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            What do you want to access?
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            AADHYARA provides two dedicated product environments. Select the platform you want to sign into.
          </p>
        </div>

        {/* 2 Primary Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Card 1: AADHYARA Learning */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-emerald-950/20 via-slate-900 to-[#0c1024] border border-emerald-500/30 hover:border-emerald-400 transition-all duration-300 flex flex-col justify-between space-y-6 group shadow-xl hover:scale-[1.01]">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform">
                🎓
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-emerald-300 transition-colors">
                  AADHYARA Learning
                </h2>
                <div className="text-xs font-mono font-bold text-emerald-400 uppercase mt-0.5">
                  Learn &bull; Teach &bull; Excel
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-2.5 leading-relaxed">
                  Access your enrolled courses, video lessons, quiz assessments, certificates, study streaks, and instructor teaching tools.
                </p>
              </div>

              {/* Roles badge */}
              <div className="pt-2 flex flex-wrap gap-1.5 text-[11px] font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">Students</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">Instructors</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">LMS Admins</span>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-white/10">
              <Link
                href="/learning/login"
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <span>Learning Login</span>
                <Icon name="arrow_forward" size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="text-center">
                <Link
                  href="/learning/register"
                  className="text-xs text-slate-400 hover:text-emerald-300 transition-colors"
                >
                  New learner? Create Learning Account &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: AADHYARA Sales */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-indigo-950/30 via-slate-900 to-[#0c1024] border border-indigo-500/30 hover:border-indigo-400 transition-all duration-300 flex flex-col justify-between space-y-6 group shadow-xl hover:scale-[1.01]">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform">
                🚀
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-indigo-300 transition-colors">
                  AADHYARA Sales
                </h2>
                <div className="text-xs font-mono font-bold text-indigo-400 uppercase mt-0.5">
                  Build &bull; Sell &bull; Grow
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-2.5 leading-relaxed">
                  Manage your business website storefront, digital products, checkout orders, customer leads, campaigns, and AI growth copilot.
                </p>
              </div>

              {/* Roles badge */}
              <div className="pt-2 flex flex-wrap gap-1.5 text-[11px] font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">Business Owners</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">Creators</span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">Coaches</span>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-white/10">
              <Link
                href="/sales/login"
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <span>Sales Login</span>
                <Icon name="arrow_forward" size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="text-center">
                <Link
                  href="/sales/register"
                  className="text-xs text-slate-400 hover:text-indigo-300 transition-colors"
                >
                  New business? Create Sales Workspace &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Helper Note */}
        <div className="pt-4 border-t border-white/10 text-center text-xs text-slate-500">
          Need assistance with your account? <Link href="/support" className="text-indigo-400 hover:underline">Contact Platform Support</Link>
        </div>
      </div>
    </div>
  );
}

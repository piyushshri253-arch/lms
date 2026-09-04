'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';

export const BusinessAnalyticsSection: React.FC = () => {
  return (
    <section id="sales-analytics" className="py-24 bg-[#080b1e] text-white border-t border-white/10 relative overflow-hidden">
      {/* Glow Ambience */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-mono uppercase text-indigo-300 font-bold tracking-wider mb-4">
            <span>Actionable Intelligence</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Know What Is Driving Your Business
          </h2>
          <p className="text-base sm:text-lg text-slate-300 mt-4 leading-relaxed font-normal">
            Real-time multi-channel telemetry and predictive AI insights give you total clarity across every visitor, cart, and conversion.
          </p>
        </div>

        {/* Analytics Visualization Board */}
        <div className="max-w-5xl mx-auto rounded-3xl bg-[#0a0d24] border border-white/15 p-6 sm:p-10 shadow-2xl space-y-8">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="text-[11px] font-mono text-slate-400">Total Revenue</div>
              <div className="text-lg sm:text-xl font-extrabold text-white mt-1">₹4,82,500</div>
              <div className="text-[10px] text-emerald-400 font-bold mt-0.5">+28.4% this mo</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="text-[11px] font-mono text-slate-400">Visitors</div>
              <div className="text-lg sm:text-xl font-extrabold text-white mt-1">42,800</div>
              <div className="text-[10px] text-emerald-400 font-bold mt-0.5">+18.0% unique</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="text-[11px] font-mono text-slate-400">Leads Captured</div>
              <div className="text-lg sm:text-xl font-extrabold text-white mt-1">3,490</div>
              <div className="text-[10px] text-indigo-400 font-bold mt-0.5">8.15% opt-in</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="text-[11px] font-mono text-slate-400">Paid Orders</div>
              <div className="text-lg sm:text-xl font-extrabold text-white mt-1">1,248</div>
              <div className="text-[10px] text-emerald-400 font-bold mt-0.5">99.8% success</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="text-[11px] font-mono text-slate-400">Conversion Rate</div>
              <div className="text-lg sm:text-xl font-extrabold text-white mt-1">4.82%</div>
              <div className="text-[10px] text-purple-400 font-bold mt-0.5">Benchmark: 2.5%</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="text-[11px] font-mono text-slate-400">Customers</div>
              <div className="text-lg sm:text-xl font-extrabold text-white mt-1">892</div>
              <div className="text-[10px] text-emerald-400 font-bold mt-0.5">34% repeat</div>
            </div>
          </div>

          {/* AI Insight Highlight Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-slate-950 border border-purple-500/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300">
                  AI Insight &amp; Growth Recommendation
                </span>
              </div>
              <p className="text-sm font-semibold text-white leading-relaxed">
                Your landing page received <span className="text-emerald-400">18% more visitors</span> this week, but checkout conversion decreased by <span className="text-rose-400">4%</span>.
              </p>
            </div>

            <Link
              href="/company-signup"
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs whitespace-nowrap shadow-md shadow-purple-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <span>View Recommendations</span>
              <Icon name="arrow_forward" size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

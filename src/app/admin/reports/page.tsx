'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useAdmin } from '@/context/AdminContext';
import { useApp } from '@/context/AppContext';

function ReportsPageContent() {
  const searchParams = useSearchParams();
  const { hasPermission, hasAnyPermission, activeFacility } = useAdmin();
  const { showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'students' | 'courses' | 'revenue'>('students');
  const [dateRange, setDateRange] = useState<'30D' | '90D' | '1Y'>('30D');

  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'students' && hasPermission('report.student')) setActiveTab('students');
    else if (type === 'courses' && hasPermission('report.course')) setActiveTab('courses');
    else if (type === 'revenue' && hasPermission('report.payment')) setActiveTab('revenue');
    else {
      // Auto select first permitted tab
      if (hasPermission('report.student')) setActiveTab('students');
      else if (hasPermission('report.course')) setActiveTab('courses');
      else if (hasPermission('report.payment')) setActiveTab('revenue');
    }
  }, [searchParams, hasPermission]);

  // RBAC Access Guard: Must have at least one report permission
  if (!hasAnyPermission(['report.student', 'report.course', 'report.payment', 'report.learning'])) {
    return (
      <div className="p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-3xl space-y-3 max-w-lg mx-auto mt-12">
        <div className="w-12 h-12 rounded-full bg-error-container/30 text-error flex items-center justify-center mx-auto">
          <Icon name="lock" size={24} />
        </div>
        <h2 className="text-base font-extrabold text-on-surface">Access Denied</h2>
        <p className="text-xs text-outline">
          Your administrator account does not possess reporting permissions (report.student, report.course, report.payment) for{' '}
          {activeFacility?.name || 'this facility'}.
        </p>
      </div>
    );
  }

  const handleExportCSV = () => {
    showToast(`Exporting ${activeTab} report for ${activeFacility?.name} (${dateRange})`, 'success');
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
              Reports &amp; Institutional Analytics
            </h1>
            <span className="text-[11px] font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full">
              {activeFacility?.name}
            </span>
          </div>
          <p className="text-xs text-outline font-medium mt-1">
            Audit learner drop-off rates, course ratings, cohort completions, and fiscal settlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date range selector */}
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl">
            {(['30D', '90D', '1Y'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDateRange(range)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateRange === range
                    ? 'bg-surface-container-lowest text-on-surface shadow-2xs'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
          >
            <Icon name="download" size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Report Module Tabs (Auto-Hides based on granular report.* keys) */}
      <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-5 shadow-2xs space-y-6">
        <div className="border-b border-outline-variant/40 flex gap-6 overflow-x-auto">
          {hasPermission('report.student') && (
            <button
              onClick={() => setActiveTab('students')}
              className={`pb-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 ${
                activeTab === 'students'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              Student Growth &amp; Demographics
            </button>
          )}

          {hasPermission('report.course') && (
            <button
              onClick={() => setActiveTab('courses')}
              className={`pb-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 ${
                activeTab === 'courses'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              Course Performance &amp; Completion
            </button>
          )}

          {hasPermission('report.payment') && (
            <button
              onClick={() => setActiveTab('revenue')}
              className={`pb-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 ${
                activeTab === 'revenue'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              Revenue &amp; Gateway Analytics
            </button>
          )}
        </div>

        {/* Tab 1: Student Reports */}
        {activeTab === 'students' && hasPermission('report.student') && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low/40">
                <p className="text-[11px] font-mono text-outline">Total Active Learners</p>
                <h4 className="text-xl font-black text-on-surface mt-1">1,240</h4>
                <p className="text-[10px] text-emerald-600 font-bold">+14.8% vs last period</p>
              </div>
              <div className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low/40">
                <p className="text-[11px] font-mono text-outline">Average Daily Study Time</p>
                <h4 className="text-xl font-black text-on-surface mt-1">42 mins</h4>
                <p className="text-[10px] text-indigo-600 font-bold">Top cohort: Engineering 2026</p>
              </div>
              <div className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low/40">
                <p className="text-[11px] font-mono text-outline">Course Completion Rate</p>
                <h4 className="text-xl font-black text-on-surface mt-1">78.4%</h4>
                <p className="text-[10px] text-emerald-600 font-bold">+4.2% higher than industry benchmark</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low/20">
              <h4 className="font-bold text-xs text-on-surface mb-3">Student Engagement by Cohort</h4>
              <div className="space-y-3 text-xs">
                {[
                  { name: 'Engineering Batch 2026', students: 48, activeRate: 94 },
                  { name: 'AI & Data Science Cohort', students: 34, activeRate: 88 },
                  { name: 'Cloud Computing Guild', students: 56, activeRate: 82 }
                ].map((cohort, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between font-medium">
                      <span>{cohort.name} ({cohort.students} students)</span>
                      <span className="font-mono font-bold text-primary">{cohort.activeRate}% Active</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div style={{ width: `${cohort.activeRate}%` }} className="h-full bg-primary rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Course Performance */}
        {activeTab === 'courses' && hasPermission('report.course') && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-outline uppercase font-mono text-[10px] border-b border-outline-variant/40">
                  <tr>
                    <th className="p-3">Course Title</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-center">Enrolled</th>
                    <th className="p-3 text-center">Graduated</th>
                    <th className="p-3 text-center">Completion Rate</th>
                    <th className="p-3 text-center">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 font-medium text-on-surface">
                  {[
                    { title: 'Full-Stack Next.js 15 & Turbopack', cat: 'Engineering', enrolled: 540, comp: 454, rate: 84, rating: 4.9 },
                    { title: 'Production AI Agents with LangGraph', cat: 'AI', enrolled: 420, comp: 332, rate: 79, rating: 4.95 },
                    { title: 'Modern Distributed Systems with Go', cat: 'Backend', enrolled: 260, comp: 187, rate: 72, rating: 4.85 },
                    { title: 'Enterprise PostgreSQL Optimization', cat: 'Database', enrolled: 200, comp: 176, rate: 88, rating: 4.88 }
                  ].map((c, i) => (
                    <tr key={i} className="hover:bg-surface-container-low/40">
                      <td className="p-3 font-bold">{c.title}</td>
                      <td className="p-3 font-mono text-outline">{c.cat}</td>
                      <td className="p-3 text-center font-mono font-bold">{c.enrolled}</td>
                      <td className="p-3 text-center font-mono text-emerald-600 font-bold">{c.comp}</td>
                      <td className="p-3 text-center font-mono font-bold">{c.rate}%</td>
                      <td className="p-3 text-center font-mono text-amber-500 font-bold">⭐ {c.rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Revenue Analytics */}
        {activeTab === 'revenue' && hasPermission('report.payment') && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low/40">
                <p className="text-[11px] font-mono text-outline">Gross Sales</p>
                <h4 className="text-xl font-black text-on-surface mt-1">₹4,20,000</h4>
              </div>
              <div className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low/40">
                <p className="text-[11px] font-mono text-outline">Refunds Deducted</p>
                <h4 className="text-xl font-black text-rose-600 mt-1">₹11,498</h4>
              </div>
              <div className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low/40">
                <p className="text-[11px] font-mono text-outline">Gateway Fees (~2%)</p>
                <h4 className="text-xl font-black text-outline mt-1">₹8,400</h4>
              </div>
              <div className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low/40">
                <p className="text-[11px] font-mono text-outline">Net Payout to Facility</p>
                <h4 className="text-xl font-black text-emerald-600 mt-1">₹4,00,102</h4>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportsAdminPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-outline">Loading Reports...</div>}>
      <ReportsPageContent />
    </Suspense>
  );
}

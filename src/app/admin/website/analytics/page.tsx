'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';

export default function WebsiteAnalyticsPage() {
  const { showToast } = useApp();
  const [range, setRange] = useState('30D');
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics(range);
  }, [range]);

  const fetchAnalytics = async (r: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/website/analytics?range=${r}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.analytics);
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to fetch analytics.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const a = {
    websiteVisitors: 0,
    pageViews: 0,
    courseViews: 0,
    registrations: 0,
    enrollments: 0,
    totalSales: 0,
    conversionRate: 0.0,
    ...(analytics || {})
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-primary mb-1">
            <Icon name="query_stats" size={16} />
            <span>REAL-TIME TRAFFIC &amp; CONVERSIONS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Storefront Analytics
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Real visitor counts, course page engagement, new student registrations, and purchase conversion rate.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/40">
          {['TODAY', '7D', '30D', 'ALL'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                range === r ? 'bg-primary text-on-primary shadow-xs' : 'text-outline hover:text-on-surface'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Visitors */}
        <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center font-bold">
              <Icon name="visibility" size={20} />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
              Traffic
            </span>
          </div>
          <div>
            <span className="text-xs font-bold text-outline uppercase font-mono">Total Visitors</span>
            <p className="text-2xl font-black text-on-surface font-mono tracking-tight mt-0.5">
              {a.websiteVisitors.toLocaleString()}
            </p>
          </div>
          <p className="text-[11px] text-on-surface-variant font-mono">
            {a.pageViews} Total Page Views
          </p>
        </div>

        {/* Course Views */}
        <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-700 flex items-center justify-center font-bold">
              <Icon name="school" size={20} />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              Catalog Engagement
            </span>
          </div>
          <div>
            <span className="text-xs font-bold text-outline uppercase font-mono">Course Views</span>
            <p className="text-2xl font-black text-on-surface font-mono tracking-tight mt-0.5">
              {a.courseViews.toLocaleString()}
            </p>
          </div>
          <p className="text-[11px] text-on-surface-variant font-mono">
            Direct syllabus &amp; checkout intent
          </p>
        </div>

        {/* Registrations */}
        <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-700 flex items-center justify-center font-bold">
              <Icon name="person_add" size={20} />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
              Learners
            </span>
          </div>
          <div>
            <span className="text-xs font-bold text-outline uppercase font-mono">New Registrations</span>
            <p className="text-2xl font-black text-on-surface font-mono tracking-tight mt-0.5">
              {a.registrations.toLocaleString()}
            </p>
          </div>
          <p className="text-[11px] text-on-surface-variant font-mono">
            Students onboarded to academy
          </p>
        </div>

        {/* Enrollments */}
        <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
              <Icon name="workspace_premium" size={20} />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Conversions
            </span>
          </div>
          <div>
            <span className="text-xs font-bold text-outline uppercase font-mono">Course Enrollments</span>
            <p className="text-2xl font-black text-on-surface font-mono tracking-tight mt-0.5">
              {a.enrollments.toLocaleString()}
            </p>
          </div>
          <p className="text-[11px] text-on-surface-variant font-mono">
            Active course purchases &amp; grants
          </p>
        </div>

        {/* Total Sales Inflow */}
        <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <Icon name="payments" size={20} />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Revenue
            </span>
          </div>
          <div>
            <span className="text-xs font-bold text-outline uppercase font-mono">Gross Sales Inflow</span>
            <p className="text-2xl font-black text-emerald-700 font-mono tracking-tight mt-0.5">
              ₹{a.totalSales.toLocaleString()}
            </p>
          </div>
          <p className="text-[11px] text-on-surface-variant font-mono">
            Direct to your merchant account
          </p>
        </div>

        {/* Conversion Rate */}
        <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-700 flex items-center justify-center font-bold">
              <Icon name="trending_up" size={20} />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
              Funnel
            </span>
          </div>
          <div>
            <span className="text-xs font-bold text-outline uppercase font-mono">Visitor Conversion Rate</span>
            <p className="text-2xl font-black text-primary font-mono tracking-tight mt-0.5">
              {a.conversionRate}%
            </p>
          </div>
          <p className="text-[11px] text-on-surface-variant font-mono">
            Enrollments per unique visitor
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export default function SuperAdminAnalyticsPage() {
  const [range, setRange] = useState('30D');
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async (r: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/super-admin/analytics?range=${r}`);
      if (res.ok) {
        const d = await res.json();
        setAnalytics(d);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(range);
  }, [range]);

  const chartData = analytics?.chartData || [];
  const maxRevenue = Math.max(...chartData.map((d: any) => d.revenue), 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/super-admin" className="hover:text-primary">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Analytics</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Platform Financial &amp; Enrollment Analytics
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Deep-dive multi-period revenue trends, conversion velocities, and order distributions
          </p>
        </div>

        {/* Range Filters */}
        <div className="flex flex-wrap items-center gap-1 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/40">
          {['TODAY', '7D', '30D', '3M', '6M', '1Y', 'ALL'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                range === r
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 bg-surface-container-lowest border border-outline-variant/80 rounded-3xl space-y-1">
          <span className="text-[10px] font-mono uppercase font-bold text-outline">Range Revenue</span>
          <p className="text-2xl font-black font-mono text-emerald-800">${analytics?.totalRevenue || 0}</p>
        </div>
        <div className="p-5 bg-surface-container-lowest border border-outline-variant/80 rounded-3xl space-y-1">
          <span className="text-[10px] font-mono uppercase font-bold text-outline">Orders Completed</span>
          <p className="text-2xl font-black font-mono text-primary">{analytics?.totalOrders || 0}</p>
        </div>
        <div className="p-5 bg-surface-container-lowest border border-outline-variant/80 rounded-3xl space-y-1">
          <span className="text-[10px] font-mono uppercase font-bold text-outline">New Enrollments</span>
          <p className="text-2xl font-black font-mono text-on-surface">{analytics?.totalEnrollments || 0}</p>
        </div>
        <div className="p-5 bg-surface-container-lowest border border-outline-variant/80 rounded-3xl space-y-1">
          <span className="text-[10px] font-mono uppercase font-bold text-outline">Refunds Processed</span>
          <p className="text-2xl font-black font-mono text-rose-600">{analytics?.totalRefunds || 0}</p>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant/80 shadow-xs space-y-6">
        <h3 className="font-extrabold text-base text-on-surface">Revenue Velocity Chart</h3>

        <div className="h-72 flex items-end gap-3 sm:gap-6 pt-6 pb-2 px-2 border-b border-outline-variant/60">
          {chartData.map((point: any, idx: number) => {
            const heightPercent = Math.max(8, Math.round((point.revenue / maxRevenue) * 100));

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] font-mono font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  ${point.revenue}
                </div>
                <div
                  className="w-full bg-gradient-to-t from-primary to-primary-container rounded-t-xl group-hover:brightness-110 transition-all cursor-pointer shadow-xs min-w-[14px]"
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="text-[10px] font-mono text-outline font-bold truncate max-w-[40px]">
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

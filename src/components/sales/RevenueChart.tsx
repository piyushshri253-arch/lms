'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

interface RevenueChartProps {
  chartData: { date: string; revenue: number; orders: number; refunds: number }[];
  totalRevenue: number;
  netRevenue: number;
  refunds: number;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  chartData,
  totalRevenue,
  netRevenue,
  refunds
}) => {
  const [timeGranularity, setTimeGranularity] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1000);

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-[#090d24] border border-white/15 space-y-6 shadow-xl relative overflow-hidden">
      {/* Top Bar: Title & Time Granularity Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-white">Revenue Overview</h2>
            <span className="text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">
              Live Flow
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Real-time revenue velocity &amp; completed checkout transactions</p>
        </div>

        {/* Time Granularity Selector */}
        <div className="inline-flex p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono font-bold">
          {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTimeGranularity(t)}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                timeGranularity === t
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Interactive Chart Canvas */}
      <div className="relative pt-6 pb-2">
        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div className="absolute top-0 right-4 p-2.5 rounded-xl bg-black/90 border border-white/20 text-xs shadow-2xl z-20 space-y-1 animate-fadeIn">
            <div className="font-bold text-white font-mono">{hoveredPoint.date}</div>
            <div className="text-emerald-400 font-bold">Revenue: ₹{hoveredPoint.revenue.toLocaleString('en-IN')}</div>
            <div className="text-indigo-300">Orders: {hoveredPoint.orders} completed</div>
          </div>
        )}

        {/* Bar Visualizer */}
        <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 pt-8 px-2 border-b border-white/10">
          {chartData.map((item, idx) => {
            const heightPercent = maxRevenue > 0 ? Math.round((item.revenue / maxRevenue) * 100) : 10;

            return (
              <div
                key={item.date}
                onMouseEnter={() => setHoveredPoint(item)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative"
              >
                {/* Bar */}
                <div
                  className="w-full max-w-[48px] rounded-t-xl bg-gradient-to-t from-indigo-600/50 via-indigo-500 to-purple-500 group-hover:from-indigo-500 group-hover:to-purple-400 transition-all duration-200 relative shadow-lg shadow-indigo-600/20"
                  style={{ height: `${Math.max(12, heightPercent)}%` }}
                >
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold bg-indigo-900 text-indigo-200 px-1.5 py-0.5 rounded shadow whitespace-nowrap transition-opacity">
                    ₹{item.revenue.toLocaleString()}
                  </div>
                </div>

                {/* Date Label */}
                <div className="text-[11px] font-mono text-slate-400 group-hover:text-white mt-2">
                  {item.date}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metric Breakdown Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="text-[11px] font-mono text-slate-400 uppercase font-bold">Total Gross Volume</div>
          <div className="text-xl font-black text-white mt-1">₹{totalRevenue.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-emerald-400 mt-0.5 font-bold">+18.4% this period</div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="text-[11px] font-mono text-slate-400 uppercase font-bold">Net Seller Revenue</div>
          <div className="text-xl font-black text-indigo-300 mt-1">₹{netRevenue.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Post 10% platform commission</div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="text-[11px] font-mono text-slate-400 uppercase font-bold">Refunds &amp; Disputes</div>
          <div className="text-xl font-black text-slate-300 mt-1">₹{refunds.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-emerald-400 mt-0.5 font-bold">0.0% Low dispute rate</div>
        </div>
      </div>
    </div>
  );
};

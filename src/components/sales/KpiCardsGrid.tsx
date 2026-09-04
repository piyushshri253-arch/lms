'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface KpiCardsGridProps {
  metrics: any;
}

export const KpiCardsGrid: React.FC<KpiCardsGridProps> = ({ metrics }) => {
  const kpiList = [
    {
      label: 'Gross Revenue',
      value: `₹${(metrics?.grossRevenue || 0).toLocaleString('en-IN')}`,
      change: metrics?.growthRate?.revenue || '+18.4%',
      isPositive: true,
      comparison: 'vs previous period',
      icon: 'payments',
      color: 'from-indigo-600/20 to-indigo-950/40 border-indigo-500/30 text-indigo-400',
      href: '/admin/wallet'
    },
    {
      label: 'Paid Orders',
      value: (metrics?.ordersCount || 0).toLocaleString(),
      change: metrics?.growthRate?.orders || '+12.8%',
      isPositive: true,
      comparison: 'vs last 30 days',
      icon: 'shopping_bag',
      color: 'from-purple-600/20 to-purple-950/40 border-purple-500/30 text-purple-400',
      href: '/admin/orders'
    },
    {
      label: 'Active Customers',
      value: (metrics?.customersCount || 0).toLocaleString(),
      change: metrics?.growthRate?.customers || '+9.2%',
      isPositive: true,
      comparison: 'vs last 30 days',
      icon: 'group',
      color: 'from-emerald-600/20 to-emerald-950/40 border-emerald-500/30 text-emerald-400',
      href: '/admin/students'
    },
    {
      label: 'Website Visitors',
      value: (metrics?.visitorsCount || 0).toLocaleString(),
      change: metrics?.growthRate?.visitors || '+21.4%',
      isPositive: true,
      comparison: 'unique sessions',
      icon: 'language',
      color: 'from-blue-600/20 to-blue-950/40 border-blue-500/30 text-blue-400',
      href: '/admin/website/analytics'
    },
    {
      label: 'Conversion Rate',
      value: `${metrics?.conversionRate || 0}%`,
      change: metrics?.growthRate?.conversion || '+0.8%',
      isPositive: true,
      comparison: 'checkout success',
      icon: 'query_stats',
      color: 'from-pink-600/20 to-pink-950/40 border-pink-500/30 text-pink-400',
      href: '/admin/website/analytics'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {kpiList.map((kpi) => (
        <Link
          key={kpi.label}
          href={kpi.href}
          className={`p-5 rounded-3xl bg-gradient-to-b ${kpi.color} border hover:border-white/30 transition-all duration-200 flex flex-col justify-between group shadow-lg hover:scale-[1.01] cursor-pointer`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              {kpi.label}
            </span>
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform">
              <Icon name={kpi.icon} size={18} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {kpi.value}
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-emerald-400 font-bold font-mono">{kpi.change}</span>
              <span className="text-slate-500 text-[10px] truncate">{kpi.comparison}</span>
            </div>
          </div>

          {/* Mini Sparkline Visualization */}
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-white">
            <span>View Analytics</span>
            <Icon name="arrow_forward" size={12} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      ))}
    </div>
  );
};

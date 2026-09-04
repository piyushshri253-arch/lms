'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface MarketingPerformanceCardProps {
  marketing: any;
}

export const MarketingPerformanceCard: React.FC<MarketingPerformanceCardProps> = ({ marketing }) => {
  return (
    <div className="p-6 rounded-3xl bg-[#090d24] border border-white/15 space-y-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-white">Marketing &amp; Ad Attribution</h3>
          <p className="text-xs text-slate-400">Omni-channel campaigns &amp; return on ad spend</p>
        </div>

        <Link
          href="/admin/marketing/campaigns"
          className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
        >
          <span>View Marketing</span>
          <Icon name="arrow_forward" size={14} />
        </Link>
      </div>

      {/* Metrics Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Active Campaigns</div>
          <div className="text-lg font-black text-white mt-1">{marketing?.campaignsCount || 4}</div>
          <div className="text-[10px] text-emerald-400 font-bold">● Running</div>
        </div>

        <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Leads Generated</div>
          <div className="text-lg font-black text-white mt-1">{(marketing?.leadsGenerated || 842).toLocaleString()}</div>
          <div className="text-[10px] text-indigo-400 font-bold">Email &amp; Ads</div>
        </div>

        <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Return on Ad Spend</div>
          <div className="text-lg font-black text-emerald-400 font-mono mt-1">{marketing?.roas || '4.2x'}</div>
          <div className="text-[10px] text-slate-400">ROAS Efficiency</div>
        </div>
      </div>
    </div>
  );
};

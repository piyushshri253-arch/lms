'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface LeadsFunnelCardProps {
  visitors: number;
  leads: number;
  qualified: number;
  customers: number;
}

export const LeadsFunnelCard: React.FC<LeadsFunnelCardProps> = ({
  visitors,
  leads,
  qualified,
  customers
}) => {
  const steps = [
    { label: 'Website Visitors', count: visitors, percent: '100%', color: 'from-blue-600 to-indigo-600' },
    { label: 'Leads Captured', count: leads, percent: `${visitors > 0 ? ((leads / visitors) * 100).toFixed(1) : 0}%`, color: 'from-indigo-600 to-purple-600' },
    { label: 'Qualified Inquiries', count: qualified, percent: `${leads > 0 ? ((qualified / leads) * 100).toFixed(1) : 0}%`, color: 'from-purple-600 to-pink-600' },
    { label: 'Paying Customers', count: customers, percent: `${qualified > 0 ? ((customers / qualified) * 100).toFixed(1) : 0}%`, color: 'from-emerald-600 to-teal-500' }
  ];

  return (
    <div className="p-6 rounded-3xl bg-[#090d24] border border-white/15 space-y-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-white">Leads &amp; Conversion Funnel</h3>
          <p className="text-xs text-slate-400">Visitor acquisition to checkout completion</p>
        </div>

        <Link
          href="/admin/website/leads"
          className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
        >
          <span>Manage Leads</span>
          <Icon name="arrow_forward" size={14} />
        </Link>
      </div>

      {/* Funnel Horizontal Stages */}
      <div className="space-y-3">
        {steps.map((s, idx) => (
          <div key={s.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 font-bold">0{idx + 1}</span>
                <span>{s.label}</span>
              </span>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-extrabold text-white">{s.count.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400">({s.percent})</span>
              </div>
            </div>

            <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${s.color} transition-all duration-500`}
                style={{ width: `${Math.max(15, 100 - idx * 22)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

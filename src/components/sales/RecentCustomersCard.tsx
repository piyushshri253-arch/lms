'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface RecentCustomersCardProps {
  customers: any[];
}

export const RecentCustomersCard: React.FC<RecentCustomersCardProps> = ({ customers }) => {
  return (
    <div className="p-6 rounded-3xl bg-[#090d24] border border-white/15 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-white">Recent Customers</h3>
          <p className="text-xs text-slate-400">Newly registered learners &amp; buyers</p>
        </div>

        <Link
          href="/admin/students"
          className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
        >
          <span>View Customers</span>
          <Icon name="arrow_forward" size={14} />
        </Link>
      </div>

      {/* Customer List */}
      <div className="space-y-2.5">
        {customers.length === 0 ? (
          <div className="py-8 text-center text-slate-500 font-mono text-xs">
            No customer profiles yet.
          </div>
        ) : (
          customers.map((c) => (
            <div
              key={c.id}
              className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 flex items-center justify-between gap-3 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-md">
                  {c.name?.charAt(0)?.toUpperCase() || 'C'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{c.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{c.email}</div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs font-mono font-bold text-emerald-400">
                  {c.amount > 0 ? `₹${c.amount.toLocaleString('en-IN')}` : 'Enrolled'}
                </div>
                <div className="text-[10px] font-mono text-slate-500">{c.date}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

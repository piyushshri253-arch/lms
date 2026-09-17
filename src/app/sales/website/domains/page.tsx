'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export default function SalesDomainsPage() {
  return (
    <div className="min-h-screen bg-[#060814] text-white p-6 sm:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Custom Domain Management</h1>
          <p className="text-xs text-slate-400">Connect and verify your custom brand domain</p>
        </div>
        <Link href="/sales/dashboard" className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-all">
          ← Back to Sales Dashboard
        </Link>
      </div>

      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 max-w-2xl space-y-4">
        <h3 className="text-sm font-bold text-white">DNS Configuration (CNAME / A Records)</h3>
        <p className="text-xs text-slate-300">
          Point your domain's CNAME record to <code className="px-2 py-0.5 rounded bg-white/10 text-indigo-300 font-mono">cname.morenateach.com</code> or A Record to <code className="px-2 py-0.5 rounded bg-white/10 text-indigo-300 font-mono">76.76.21.21</code>.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. store.mybrand.com"
            className="flex-1 bg-white/[0.05] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition-all cursor-pointer">
            Connect Domain
          </button>
        </div>
      </div>
    </div>
  );
}

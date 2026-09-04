'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export const SecurityStatusWidget: React.FC = () => {
  return (
    <div className="p-6 rounded-3xl bg-[#090d24] border border-white/15 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="shield" size={18} className="text-emerald-400" />
          <h3 className="text-sm font-black text-white">Security &amp; Isolation</h3>
        </div>

        <Link
          href="/admin/settings?tab=security"
          className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
        >
          Security Settings →
        </Link>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
          <span className="text-slate-300">Tenant Scoped Isolation</span>
          <span className="text-emerald-400 font-mono font-bold">✓ Active</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
          <span className="text-slate-300">Custom Domain TLS/SSL</span>
          <span className="text-emerald-400 font-mono font-bold">✓ Enforced</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
          <span className="text-slate-300">Active Admin Session</span>
          <span className="text-indigo-400 font-mono font-bold">Encrypted</span>
        </div>
      </div>
    </div>
  );
};

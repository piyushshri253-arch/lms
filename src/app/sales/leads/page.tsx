'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export default function SalesLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/website/leads')
      .then((res) => res.json())
      .then((d) => setLeads(d.leads || []))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#060814] text-white p-6 sm:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Lead Funnel &amp; Inquiries</h1>
          <p className="text-xs text-slate-400">Captured leads from website landing pages and contact forms</p>
        </div>
        <Link href="/sales/dashboard" className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-all">
          ← Back to Sales Dashboard
        </Link>
      </div>

      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
        <h3 className="text-sm font-bold text-white">Captured Leads ({leads.length})</h3>
        {leads.length === 0 ? (
          <p className="text-xs text-slate-400">No leads captured yet. Traffic submitting forms on your landing pages will appear here in real-time.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {leads.map((l) => (
              <div key={l.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{l.name || l.email}</p>
                  <p className="text-[11px] text-slate-400">{l.email} • {l.phone || 'No phone'}</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                  {l.status || 'NEW'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

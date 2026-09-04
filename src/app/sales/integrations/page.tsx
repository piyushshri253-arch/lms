'use client';

import React from 'react';
import Link from 'next/link';

export default function SalesIntegrationsPage() {
  return (
    <div className="min-h-screen bg-[#060814] text-white p-6 sm:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Integrations &amp; Webhooks</h1>
          <p className="text-xs text-slate-400">Connect Stripe, Razorpay, Zapier, and Custom Webhooks</p>
        </div>
        <Link href="/sales/dashboard" className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-all">
          ← Back to Sales Dashboard
        </Link>
      </div>

      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4 max-w-2xl">
        <h3 className="text-sm font-bold text-white">Connected Gateways</h3>
        <p className="text-xs text-slate-400">Payment processors and webhook listeners configured for your business.</p>
      </div>
    </div>
  );
}

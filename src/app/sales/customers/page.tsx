'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export default function SalesCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch customers
    setIsLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-[#060814] text-white p-6 sm:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Customers &amp; Clients</h1>
          <p className="text-xs text-slate-400">View and manage paying customers and business contacts</p>
        </div>
        <Link href="/sales/dashboard" className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-all">
          ← Back to Sales Dashboard
        </Link>
      </div>

      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Customer Roster</h3>
          <span className="text-xs text-indigo-400 font-bold font-mono">0 Active Customers</span>
        </div>
        <p className="text-xs text-slate-400">New customer signups from your storefront and checkout will appear here.</p>
      </div>
    </div>
  );
}

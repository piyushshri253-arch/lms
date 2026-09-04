'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export default function SuperAdminRefundsPage() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRefunds = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/super-admin/orders?status=REFUNDED');
      if (res.ok) {
        const d = await res.json();
        setRefunds(d.orders || []);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/super-admin" className="hover:text-primary">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Refunds</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Settled Refunds &amp; Dispute Log
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Audit history of all reimbursed orders and cancelled enrollments
          </p>
        </div>

        <span className="text-xs font-mono font-bold px-3 py-1 bg-rose-500/10 text-rose-700 rounded-full border border-rose-500/20">
          {refunds.length} Total Refunds
        </span>
      </div>

      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden">
        {refunds.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/70 border-b border-outline-variant/60 text-outline uppercase font-extrabold tracking-wider text-[10px]">
                <tr>
                  <th className="p-4 pl-6">Transaction ID</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Course</th>
                  <th className="p-4">Reimbursed Amount</th>
                  <th className="p-4">Gateway</th>
                  <th className="p-4 pr-6">Refund Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {refunds.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="p-4 pl-6 font-mono font-bold text-rose-600">#{r.transactionId}</td>
                    <td className="p-4 font-bold text-on-surface">{r.user?.name}</td>
                    <td className="p-4 font-bold text-on-surface">{r.course?.title}</td>
                    <td className="p-4 font-mono font-bold text-rose-600">${r.amount}</td>
                    <td className="p-4 font-mono uppercase text-[10px]">{r.provider}</td>
                    <td className="p-4 pr-6 font-mono text-outline">{r.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-outline text-xs">No refunded transactions on record.</div>
        )}
      </div>
    </div>
  );
}

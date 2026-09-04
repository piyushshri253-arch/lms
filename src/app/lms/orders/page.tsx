'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LMS_ROUTES } from '@/lib/lms-routes';
import { LmsLayout } from '@/components/lms/LmsLayout';

export default function LmsOrdersPage() {
  const orders = [
    {
      id: 'ORD-2026-9812',
      courseTitle: 'Full-Stack Next.js 16 Masterclass',
      amount: '$149.00',
      date: 'August 10, 2026',
      status: 'PAID',
      method: 'Credit Card (Stripe)'
    },
    {
      id: 'ORD-2026-7731',
      courseTitle: 'Applied Generative AI & Fine-Tuning LLMs',
      amount: '$199.00',
      date: 'July 02, 2026',
      status: 'PAID',
      method: 'Razorpay UPI'
    }
  ];

  return (
    <LmsLayout activePath={LMS_ROUTES.ORDERS} pageTitle="Orders & Receipts">
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.03] p-6 rounded-3xl border border-emerald-500/20 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 mb-1">
              <Link href={LMS_ROUTES.DASHBOARD} className="hover:text-emerald-400 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-emerald-400">Billing History</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Orders & Course Receipts
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Review transaction histories, GST invoices, and enrollment receipts.
            </p>
          </div>
        </div>

        {/* Orders Table */}
        <div className="rounded-3xl bg-white/[0.03] border border-white/10 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-white/[0.04] text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Curriculum / Course</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Payment Method</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 font-mono font-bold text-emerald-400">{ord.id}</td>
                    <td className="p-4 font-bold text-white">{ord.courseTitle}</td>
                    <td className="p-4 font-mono text-slate-400">{ord.date}</td>
                    <td className="p-4 font-mono font-bold text-white">{ord.amount}</td>
                    <td className="p-4 text-slate-400">{ord.method}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </LmsLayout>
  );
}

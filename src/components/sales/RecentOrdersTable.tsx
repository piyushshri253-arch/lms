'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface RecentOrdersTableProps {
  orders: any[];
}

export const RecentOrdersTable: React.FC<RecentOrdersTableProps> = ({ orders }) => {
  return (
    <div className="p-6 rounded-3xl bg-[#090d24] border border-white/15 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-white">Recent Orders</h3>
          <p className="text-xs text-slate-400">Live stream of customer purchases &amp; payments</p>
        </div>

        <Link
          href="/admin/orders"
          className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
        >
          <span>View All Orders</span>
          <Icon name="arrow_forward" size={14} />
        </Link>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-slate-500 font-mono text-[10px] uppercase">
              <th className="pb-3 font-bold">Order ID</th>
              <th className="pb-3 font-bold">Customer</th>
              <th className="pb-3 font-bold">Product</th>
              <th className="pb-3 font-bold">Amount</th>
              <th className="pb-3 font-bold">Status</th>
              <th className="pb-3 font-bold text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 font-mono text-xs">
                  No orders recorded yet. Share your storefront link to start making sales!
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr
                  key={o.id}
                  className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                >
                  <td className="py-3.5 font-mono font-bold text-indigo-400">
                    #{o.id}
                  </td>
                  <td className="py-3.5">
                    <div className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {o.customerName}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{o.customerEmail}</div>
                  </td>
                  <td className="py-3.5 text-slate-300 font-medium max-w-[180px] truncate">
                    {o.productTitle}
                  </td>
                  <td className="py-3.5 font-mono font-bold text-white">
                    ₹{(o.amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        o.status === 'PAID' || o.status === 'COMPLETED'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : o.status === 'PENDING'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                          : 'bg-rose-500/15 text-rose-300 border border-rose-500/20'
                      }`}
                    >
                      {o.status || 'PAID'}
                    </span>
                  </td>
                  <td className="py-3.5 text-right font-mono text-slate-400 text-[11px]">
                    {o.date}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

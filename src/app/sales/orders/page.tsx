'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/super-admin/orders')
      .then((res) => res.json())
      .then((d) => setOrders(d.orders || []))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#060814] text-white p-6 sm:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Orders &amp; Transactions</h1>
          <p className="text-xs text-slate-400">View sales transactions, checkout receipts, and fulfilled items</p>
        </div>
        <Link href="/sales/dashboard" className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-all">
          ← Back to Sales Dashboard
        </Link>
      </div>

      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
        <h3 className="text-sm font-bold text-white">Recent Orders ({orders.length})</h3>
        {orders.length === 0 ? (
          <p className="text-xs text-slate-400">No orders placed yet. Orders from Razorpay, Stripe, and UPI checkouts will appear here.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {orders.map((o) => (
              <div key={o.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Order #{o.id.slice(-8)}</p>
                  <p className="text-[11px] text-slate-400">{o.user?.email || 'Guest'} • ₹{o.amount || o.totalAmount || 0}</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  {o.status || 'PAID'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export default function StudentOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/student/orders');
      if (res.ok) {
        const d = await res.json();
        setOrders(d.orders || []);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/dashboard" className="hover:text-primary">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Orders</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Order &amp; Payment History
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Verified receipts for all enrolled curricula and gateway transactions
          </p>
        </div>

        <span className="text-xs font-mono font-bold px-3 py-1 bg-primary/10 text-primary rounded-full">
          {orders.length} Receipts
        </span>
      </div>

      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden">
        {orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/70 border-b border-outline-variant/60 text-outline uppercase font-extrabold tracking-wider text-[10px]">
                <tr>
                  <th className="p-4 pl-6">Transaction ID</th>
                  <th className="p-4">Course</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Provider</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="p-4 pl-6 font-mono font-bold text-primary">#{o.transactionId}</td>
                    <td className="p-4 font-bold text-on-surface max-w-sm truncate">{o.course?.title}</td>
                    <td className="p-4 font-mono font-bold text-emerald-600">${o.amount}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold bg-surface-container">
                        {o.provider}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          o.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : o.status === 'REFUNDED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 font-mono text-outline">{o.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-surface-container text-outline flex items-center justify-center mx-auto">
              <Icon name="receipt_long" size={24} />
            </div>
            <p className="font-bold text-sm text-on-surface">No order transactions found</p>
            <p className="text-xs text-outline">When you purchase or enroll in courses, your receipts will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

export default function SuperAdminOrdersPage() {
  const { showToast } = useApp();
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Refund Modal State
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('Student dissatisfaction / technical issue');
  const [revokeAccess, setRevokeAccess] = useState(true);
  const [isRefunding, setIsRefunding] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/super-admin/orders?q=${encodeURIComponent(search)}&status=${statusFilter}&provider=${providerFilter}`
      );
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
  }, [search, statusFilter, providerFilter]);

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setIsRefunding(true);

    try {
      const res = await fetch('/api/super-admin/orders/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          reason: refundReason,
          revokeEnrollment: revokeAccess
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process refund');

      showToast({ title: 'Refund Settled', description: data.message, type: 'success' });
      setIsRefundOpen(false);
      await fetchOrders();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/super-admin" className="hover:text-primary">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Orders</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Orders &amp; Payment Ledger
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Real-time Stripe &amp; Razorpay payment audit, invoice verification, and 1-click refund processing
          </p>
        </div>

        <Link
          href="/api/super-admin/export?type=orders"
          target="_blank"
          className="px-4 py-2.5 bg-surface-container-low border border-outline-variant hover:border-primary text-on-surface font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Icon name="download" size={16} />
          <span>Export Orders CSV</span>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Icon
            name="search"
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by transaction ID, student, course..."
            className="w-full bg-surface-container-lowest border border-outline-variant/80 rounded-2xl pl-10 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {['ALL', 'SUCCESS', 'PENDING', 'FAILED', 'REFUNDED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-lowest border border-outline-variant/80 text-outline hover:text-on-surface'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden">
        {orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/70 border-b border-outline-variant/60 text-outline uppercase font-extrabold tracking-wider text-[10px]">
                <tr>
                  <th className="p-4 pl-6">Transaction ID</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Course</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Provider</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="p-4 pl-6 font-mono font-bold text-primary">#{o.transactionId}</td>
                    <td className="p-4">
                      <div>
                        <span className="font-bold text-on-surface block">{o.user?.name}</span>
                        <span className="font-mono text-[10px] text-outline">{o.user?.email}</span>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-on-surface max-w-xs truncate">{o.course?.title}</td>
                    <td className="p-4 font-mono font-bold text-emerald-800">${o.amount}</td>
                    <td className="p-4 font-mono font-bold text-[10px] uppercase">{o.provider}</td>
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
                    <td className="p-4 font-mono text-outline">{o.createdAt}</td>
                    <td className="p-4 pr-6 text-right">
                      {o.status === 'SUCCESS' && (
                        <button
                          onClick={() => {
                            setSelectedOrder(o);
                            setIsRefundOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white font-bold text-[10px] transition-all cursor-pointer"
                        >
                          Process Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-outline text-xs">No orders found matching filters.</div>
        )}
      </div>

      {/* Refund Processor Modal */}
      <Modal
        isOpen={isRefundOpen}
        onClose={() => setIsRefundOpen(false)}
        maxWidth="md"
        title="Process Transaction Refund"
        subtitle={`Settling refund for Transaction #${selectedOrder?.transactionId}`}
      >
        <form onSubmit={handleProcessRefund} className="space-y-4">
          <div className="p-4 bg-surface-container-low rounded-2xl space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-outline">Student:</span>
              <span className="font-bold text-on-surface">{selectedOrder?.user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-outline">Curriculum:</span>
              <span className="font-bold text-on-surface truncate max-w-[200px]">{selectedOrder?.course?.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-outline">Refund Amount:</span>
              <span className="font-bold text-rose-600">${selectedOrder?.amount} {selectedOrder?.currency}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Administrative Refund Reason
            </label>
            <textarea
              rows={3}
              required
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
            <div>
              <p className="font-bold text-xs text-on-surface">Revoke Course Enrollment</p>
              <p className="text-[10px] text-outline">Cancel student access to course upon refund</p>
            </div>
            <input
              type="checkbox"
              checked={revokeAccess}
              onChange={(e) => setRevokeAccess(e.target.checked)}
              className="w-4 h-4 text-rose-600 rounded cursor-pointer"
            />
          </div>

          <div className="pt-3 border-t border-outline-variant/40 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsRefundOpen(false)}
              className="px-4 py-2 text-xs rounded-xl border border-outline-variant cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRefunding}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-xs cursor-pointer"
            >
              {isRefunding ? 'Processing Refund...' : 'Authorize Refund & Update Ledger'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

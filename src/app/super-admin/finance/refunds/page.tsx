'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { FinancePageHeader } from '@/components/finance/FinancePageHeader';
import { formatINR } from '@/lib/finance-service';

export default function CoursesRefundedFinancePage() {
  const { showToast } = useApp();
  const [refunds, setRefunds] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Selected refund modal
  const [selectedRefund, setSelectedRefund] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Rejection modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Processing refund state
  const [isProcessing, setIsProcessing] = useState(false);

  // New refund creation modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createOrderId, setCreateOrderId] = useState('');
  const [createAmount, setCreateAmount] = useState('');
  const [createReason, setCreateReason] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchRefunds = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/super-admin/finance/refunds');
      if (res.ok) {
        const json = await res.json();
        setRefunds(json.refunds || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const handleApprove = async (refundId: string) => {
    try {
      const res = await fetch('/api/super-admin/finance/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE', refundId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve refund');
      showToast({ title: 'Refund Approved', description: 'Refund is approved and queued for gateway execution.', type: 'success' });
      fetchRefunds();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefund || !rejectReason) return;
    setIsRejecting(true);
    try {
      const res = await fetch('/api/super-admin/finance/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          refundId: selectedRefund.id,
          rejectionReason: rejectReason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject refund');
      showToast({ title: 'Refund Rejected', description: 'Refund has been marked as rejected.', type: 'info' });
      setIsRejectModalOpen(false);
      setRejectReason('');
      fetchRefunds();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleProcessRefund = async (refundId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/super-admin/finance/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PROCESS_REFUND', refundId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process refund');
      showToast({ title: 'Refund Disbursed', description: data.message, type: 'success' });
      fetchRefunds();
    } catch (err: any) {
      showToast({ title: 'Gateway Error', description: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createOrderId) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/super-admin/finance/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_REQUEST',
          orderId: createOrderId,
          amount: createAmount ? parseFloat(createAmount) : undefined,
          reason: createReason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register refund request');
      showToast({ title: 'Refund Request Created', description: 'New refund request has been registered.', type: 'success' });
      setIsCreateModalOpen(false);
      setCreateOrderId('');
      setCreateAmount('');
      setCreateReason('');
      fetchRefunds();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  const filteredRefunds = refunds.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.refundNumber?.toLowerCase().includes(q) ||
        r.orderNumber?.toLowerCase().includes(q) ||
        r.studentName?.toLowerCase().includes(q) ||
        r.studentEmail?.toLowerCase().includes(q) ||
        r.courseTitle?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <FinancePageHeader
        title="Courses Refunded &amp; Dispute Management"
        subtitle="Manage student refund workflows, verify gateway reversal status, inspect reasons, and maintain double-entry reverse ledgers."
        badge={`${refunds.length} REFUND CASES`}
        onRefresh={fetchRefunds}
        actions={
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
          >
            <Icon name="add" size={16} />
            <span>Register Refund Request</span>
          </button>
        }
      />

      {/* Filter / Search Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          <div className="relative flex-1">
            <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by refund ID, order number, student, or course..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-bold focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Statuses ({refunds.length})</option>
            <option value="REQUESTED">Requested</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="PROCESSING">Processing</option>
            <option value="REFUNDED">Refunded (Completed)</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <span className="text-xs font-mono font-bold text-outline shrink-0">
          Showing {filteredRefunds.length} cases
        </span>
      </div>

      {/* Refunds Table */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-on-surface-variant font-medium">
            Fetching refund registry...
          </div>
        ) : !filteredRefunds.length ? (
          <div className="p-12 text-center text-xs text-on-surface-variant">
            No refund cases found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/50 border-b border-outline-variant/60 text-[10px] font-mono uppercase tracking-wider text-outline">
                <tr>
                  <th className="py-3.5 px-4 font-extrabold">Refund ID</th>
                  <th className="py-3.5 px-3 font-extrabold">Order / Student</th>
                  <th className="py-3.5 px-3 font-extrabold">Course / Instructor</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Original Paid</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Refund Amount</th>
                  <th className="py-3.5 px-3 font-extrabold text-center">Status</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Date</th>
                  <th className="py-3.5 px-4 font-extrabold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-medium">
                {filteredRefunds.map((r) => {
                  const isCompleted = r.status === 'REFUNDED' || r.status === 'COMPLETED';
                  const isApproved = r.status === 'APPROVED';
                  const isRequested = r.status === 'REQUESTED' || r.status === 'UNDER_REVIEW';

                  return (
                    <tr key={r.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        <p className="font-extrabold text-on-surface">{r.refundNumber}</p>
                        <p className="text-[10px] text-outline truncate max-w-[120px]">{r.gatewayReference}</p>
                      </td>

                      <td className="py-3.5 px-3">
                        <p className="font-bold text-on-surface">{r.studentName}</p>
                        <p className="text-[11px] font-mono text-outline">{r.orderNumber}</p>
                      </td>

                      <td className="py-3.5 px-3 max-w-xs">
                        <p className="font-bold text-on-surface truncate">{r.courseTitle}</p>
                        <p className="text-[11px] text-primary truncate font-medium">{r.instructorName}</p>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-on-surface-variant">
                        {formatINR(r.originalPayment)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-black text-rose-600">
                        -{formatINR(r.refundAmount)}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border inline-block ${
                            isCompleted
                              ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                              : isApproved
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : r.status === 'REJECTED'
                              ? 'bg-surface-container text-outline border-outline-variant'
                              : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-[11px] text-outline">
                        {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRefund(r);
                              setIsDetailOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                            title="Inspect Refund"
                          >
                            <Icon name="visibility" size={15} />
                          </button>

                          {isRequested && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(r.id)}
                                className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition-colors shadow-xs"
                                title="Approve Refund"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRefund(r);
                                  setIsRejectModalOpen(true);
                                }}
                                className="px-2 py-1 rounded-lg border border-rose-300 text-rose-600 font-bold text-[11px] hover:bg-rose-50 transition-colors"
                                title="Reject Refund"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleProcessRefund(r.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700 transition-colors shadow-xs flex items-center gap-1"
                              title="Process Gateway Refund"
                            >
                              <Icon name="currency_exchange" size={12} />
                              <span>Disburse</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refund Details Modal */}
      {selectedRefund && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Refund Case Inspection — ${selectedRefund.refundNumber}`}
          size="md"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/60 space-y-2">
              <div className="flex justify-between">
                <span className="text-outline">Order Reference:</span>
                <span className="font-mono font-bold text-on-surface">{selectedRefund.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Student:</span>
                <span className="font-bold text-on-surface">{selectedRefund.studentName} ({selectedRefund.studentEmail})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Course:</span>
                <span className="font-bold text-on-surface">{selectedRefund.courseTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Assigned Instructor:</span>
                <span className="font-bold text-primary">{selectedRefund.instructorName}</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/60 space-y-1">
              <span className="text-[10px] font-mono text-outline uppercase block font-bold">Stated Reason:</span>
              <p className="text-on-surface text-xs italic">{selectedRefund.reason}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60">
                <span className="text-[10px] text-outline uppercase block">Original Payment:</span>
                <span className="text-base font-bold text-on-surface mt-0.5">{formatINR(selectedRefund.originalPayment)}</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-[10px] text-rose-600 uppercase block font-bold">Reversal Amount:</span>
                <span className="text-base font-black text-rose-600 mt-0.5">{formatINR(selectedRefund.refundAmount)}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {selectedRefund && (
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title={`Reject Refund Request — ${selectedRefund.refundNumber}`}
          size="sm"
        >
          <form onSubmit={handleReject} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Rejection Justification
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
                placeholder="e.g. Student has already completed 85% of course content and received certificate"
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/60">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-outline-variant font-bold text-on-surface hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRejecting}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-xs"
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Refund Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Register Manual Refund Request"
        size="md"
      >
        <form onSubmit={handleCreateRefund} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Order ID or Order Number
            </label>
            <input
              type="text"
              value={createOrderId}
              onChange={(e) => setCreateOrderId(e.target.value)}
              required
              placeholder="e.g. cmvi3vqef000flh08s1t8qqh5 or ORD-2026-78GXE"
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-mono focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Refund Amount (₹) — Leave blank for full order amount
            </label>
            <input
              type="number"
              step="0.01"
              value={createAmount}
              onChange={(e) => setCreateAmount(e.target.value)}
              placeholder="e.g. 1768.82"
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-mono focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Reason for Refund
            </label>
            <textarea
              rows={2}
              value={createReason}
              onChange={(e) => setCreateReason(e.target.value)}
              placeholder="e.g. Student requested cancellation within 7-day guarantee window"
              className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/60">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-outline-variant font-bold text-on-surface hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 shadow-xs"
            >
              {isCreating ? 'Registering...' : 'Register Refund'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

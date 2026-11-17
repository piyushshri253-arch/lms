'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { FinancePageHeader } from '@/components/finance/FinancePageHeader';
import { formatINR } from '@/lib/finance-service';

export default function InstructorPayoutsFinancePage() {
  const { showToast, currentUser } = useApp();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Selected payout for detail / actions
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Manual Transfer Settlement Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  // Reject Modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const fetchPayouts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/super-admin/finance/payouts');
      if (res.ok) {
        const json = await res.json();
        setPayouts(json.payouts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleApprove = async (payoutId: string) => {
    try {
      const res = await fetch('/api/super-admin/finance/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE', payoutId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve payout');
      showToast({ title: 'Payout Approved', description: 'Payout request is approved for bank disbursement.', type: 'success' });
      fetchPayouts();
    } catch (err: any) {
      showToast({ title: 'Approval Error', description: err.message, type: 'error' });
    }
  };

  const handleHold = async (payoutId: string) => {
    try {
      const res = await fetch('/api/super-admin/finance/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'HOLD', payoutId, adminNotes: 'Flagged for compliance review' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to hold payout');
      showToast({ title: 'Payout Put On Hold', description: 'Disbursement temporarily suspended.', type: 'info' });
      fetchPayouts();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleRecordTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayout || !utrNumber) return;
    setIsSubmittingTransfer(true);
    try {
      const res = await fetch('/api/super-admin/finance/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECORD_TRANSFER',
          payoutId: selectedPayout.id,
          referenceNumber: utrNumber,
          adminNotes: transferNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record bank transfer');
      showToast({ title: 'Disbursement Completed', description: 'Payout marked as paid and posted to financial ledger.', type: 'success' });
      setIsTransferModalOpen(false);
      setUtrNumber('');
      setTransferNotes('');
      fetchPayouts();
    } catch (err: any) {
      showToast({ title: 'Transfer Error', description: err.message, type: 'error' });
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleRejectPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayout || !rejectionReason) return;
    setIsRejecting(true);
    try {
      const res = await fetch('/api/super-admin/finance/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          payoutId: selectedPayout.id,
          rejectionReason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject payout');
      showToast({ title: 'Payout Rejected', description: 'Payout request has been declined.', type: 'info' });
      setIsRejectModalOpen(false);
      setRejectionReason('');
      fetchPayouts();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsRejecting(false);
    }
  };

  const filteredPayouts = payouts.filter((p) => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.user?.name?.toLowerCase().includes(q) ||
        p.user?.email?.toLowerCase().includes(q) ||
        p.referenceNumber?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <FinancePageHeader
        title="Instructor Payments &amp; Disbursements"
        subtitle="Manage faculty payout queues, verify bank accounts, enforce two-person rule approval controls, and record UTR bank settlements."
        badge={`${payouts.length} PAYOUTS`}
        onRefresh={fetchPayouts}
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
              placeholder="Search by instructor name, email, or UTR reference..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-bold focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Statuses ({payouts.length})</option>
            <option value="REQUESTED">Requested</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid / Disbursed</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <span className="text-xs font-mono font-bold text-outline shrink-0">
          Showing {filteredPayouts.length} records
        </span>
      </div>

      {/* Payouts Table */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-on-surface-variant font-medium">
            Fetching instructor payouts...
          </div>
        ) : !filteredPayouts.length ? (
          <div className="p-12 text-center text-xs text-on-surface-variant">
            No payouts match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/50 border-b border-outline-variant/60 text-[10px] font-mono uppercase tracking-wider text-outline">
                <tr>
                  <th className="py-3.5 px-4 font-extrabold">Instructor</th>
                  <th className="py-3.5 px-3 font-extrabold">Destination Bank</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Gross Amount</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Net Payable</th>
                  <th className="py-3.5 px-3 font-extrabold text-center">Status</th>
                  <th className="py-3.5 px-3 font-extrabold">UTR / Reference</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Requested Date</th>
                  <th className="py-3.5 px-4 font-extrabold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-medium">
                {filteredPayouts.map((p) => {
                  const isPaid = p.status === 'PAID';
                  const isApproved = p.status === 'APPROVED';
                  const isPending = p.status === 'REQUESTED' || p.status === 'PENDING_APPROVAL' || p.status === 'PENDING';
                  const isSelf = currentUser?.id === p.userId;

                  return (
                    <tr key={p.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-extrabold text-on-surface">{p.user?.name || 'Faculty'}</p>
                        <p className="text-[11px] text-outline truncate">{p.user?.email}</p>
                      </td>

                      <td className="py-3.5 px-3">
                        {p.bankAccount ? (
                          <div>
                            <p className="font-bold text-on-surface">{p.bankAccount.bankName}</p>
                            <p className="text-[11px] font-mono text-outline">{p.bankAccount.accountNumberMasked}</p>
                          </div>
                        ) : (
                          <span className="text-outline italic">Manual UPI / Bank</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-on-surface-variant">
                        {formatINR(p.amount)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-600">
                        {formatINR(p.netAmount || p.amount)}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border inline-block ${
                            isPaid
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : isApproved
                              ? 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20'
                              : p.status === 'ON_HOLD'
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : p.status === 'REJECTED'
                              ? 'bg-surface-container text-outline border-outline-variant'
                              : 'bg-primary/10 text-primary border-primary/20'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-outline">
                        {p.referenceNumber || 'Pending Transfer'}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-[11px] text-outline">
                        {new Date(p.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPayout(p);
                              setIsDetailOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                            title="View Payout Breakdown"
                          >
                            <Icon name="visibility" size={15} />
                          </button>

                          {isPending && (
                            <>
                              <button
                                type="button"
                                disabled={isSelf}
                                onClick={() => handleApprove(p.id)}
                                className={`px-2 py-1 rounded-lg text-white font-bold text-[11px] transition-colors shadow-xs ${
                                  isSelf ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                                }`}
                                title={isSelf ? 'Cannot self-approve payout' : 'Approve Payout'}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleHold(p.id)}
                                className="px-2 py-1 rounded-lg border border-amber-300 text-amber-600 font-bold text-[11px] hover:bg-amber-50 transition-colors"
                                title="Hold Payout"
                              >
                                Hold
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPayout(p);
                                  setIsRejectModalOpen(true);
                                }}
                                className="px-2 py-1 rounded-lg border border-rose-300 text-rose-600 font-bold text-[11px] hover:bg-rose-50 transition-colors"
                                title="Reject Payout"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPayout(p);
                                setUtrNumber(`UTR-${Date.now().toString().slice(-8)}`);
                                setIsTransferModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-bold text-[11px] hover:bg-primary/90 transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                              title="Record Bank Transfer"
                            >
                              <Icon name="check" size={13} />
                              <span>Settle UTR</span>
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

      {/* Payout Breakdown Detail Modal */}
      {selectedPayout && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Payout Breakdown — ${selectedPayout.user?.name || 'Faculty'}`}
          size="md"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/60 space-y-2">
              <div className="flex justify-between">
                <span className="text-outline">Faculty Name:</span>
                <span className="font-bold text-on-surface">{selectedPayout.user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Email / Contact:</span>
                <span className="font-bold text-on-surface">{selectedPayout.user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Payout Method:</span>
                <span className="font-mono font-bold text-primary">{selectedPayout.payoutMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Current Status:</span>
                <span className="font-mono font-bold text-emerald-600">{selectedPayout.status}</span>
              </div>
            </div>

            {selectedPayout.bankAccount && (
              <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/60 space-y-1">
                <span className="text-[10px] font-mono text-outline uppercase block font-bold">Disbursement Target Bank:</span>
                <p className="font-bold text-on-surface">{selectedPayout.bankAccount.bankName} — A/C: {selectedPayout.bankAccount.accountNumberMasked}</p>
                <p className="font-mono text-outline text-[11px]">IFSC: {selectedPayout.bankAccount.ifscCode} &bull; Holder: {selectedPayout.bankAccount.accountHolderName}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60">
                <span className="text-[10px] text-outline uppercase block">Gross Request:</span>
                <span className="text-base font-bold text-on-surface mt-0.5">{formatINR(selectedPayout.amount)}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-600 uppercase block font-bold">Net Disbursed:</span>
                <span className="text-base font-black text-emerald-600 mt-0.5">{formatINR(selectedPayout.netAmount || selectedPayout.amount)}</span>
              </div>
            </div>

            {selectedPayout.referenceNumber && (
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 flex items-center justify-between font-mono">
                <span className="text-outline">Bank UTR Reference:</span>
                <span className="font-bold text-on-surface">{selectedPayout.referenceNumber}</span>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Record Transfer Modal */}
      {selectedPayout && (
        <Modal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          title={`Confirm Bank Transfer Settlement — ${selectedPayout.user?.name}`}
          size="md"
        >
          <form onSubmit={handleRecordTransfer} className="space-y-4 text-xs">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 space-y-1">
              <p className="font-extrabold text-sm text-emerald-700">Ready for Bank Disbursement</p>
              <p className="text-on-surface-variant font-mono">
                Disbursement Net Amount: <strong>{formatINR(selectedPayout.netAmount || selectedPayout.amount)}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Bank UTR / IMPS Reference Number *
              </label>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                required
                placeholder="e.g. UTR-20261104-XXXX"
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-mono font-bold focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Disbursement Notes / Transaction Proof Info
              </label>
              <textarea
                rows={2}
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="e.g. Disbursed via Corporate Net Banking IMPS from HDFC Bank"
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/60">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-outline-variant font-bold text-on-surface hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingTransfer}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-xs"
              >
                {isSubmittingTransfer ? 'Recording...' : 'Confirm & Mark Paid'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reject Modal */}
      {selectedPayout && (
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title={`Reject Payout Request`}
          size="sm"
        >
          <form onSubmit={handleRejectPayout} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Rejection Reason
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
                placeholder="e.g. Discrepancy in bank credentials or unverified PAN documentation"
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
                {isRejecting ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

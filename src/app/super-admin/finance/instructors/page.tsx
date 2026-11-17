'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useApp } from '@/context/AppContext';
import { FinancePageHeader } from '@/components/finance/FinancePageHeader';
import { formatINR } from '@/lib/finance-service';

export default function AllInstructorsFinancePage() {
  const { showToast } = useApp();
  const [instructors, setInstructors] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Selected instructor for detail modal
  const [selectedInst, setSelectedInst] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Payout initiation modal
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  const fetchInstructors = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/super-admin/finance/instructors?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const json = await res.json();
        setInstructors(json.instructors || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstructors();
  }, [search]);

  const handleInitiatePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst || !payoutAmount) return;
    setIsSubmittingPayout(true);

    try {
      const res = await fetch('/api/super-admin/finance/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'INITIATE_PAYOUT',
          instructorId: selectedInst.id,
          amount: parseFloat(payoutAmount),
          adminNotes: payoutNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initiate payout');

      showToast({ title: 'Payout Scheduled', description: 'Instructor payout request created successfully.', type: 'success' });
      setIsPayoutModalOpen(false);
      setPayoutAmount('');
      setPayoutNotes('');
      fetchInstructors();
    } catch (err: any) {
      showToast({ title: 'Payout Error', description: err.message, type: 'error' });
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const handleExportCSV = () => {
    if (!instructors.length) return;
    const headers = [
      'Instructor ID',
      'Name',
      'Email',
      'Phone',
      'Total Courses',
      'Courses Sold',
      'Gross Earnings',
      'TDS Deducted',
      'Gateway Fees',
      'Net Earnings',
      'Total Paid',
      'Pending Payable',
      'Bank Status'
    ];
    const rows = instructors.map((i) => [
      i.id,
      `"${i.name}"`,
      i.email,
      i.phone,
      i.totalCourses,
      i.totalCoursesSold,
      i.grossEarnings,
      i.tdsDeducted,
      i.gatewayFeeAllocation,
      i.netEarnings,
      i.totalPaid,
      i.pendingPayable,
      i.bankVerificationStatus
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MorenaTeach_Faculty_Finance_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <FinancePageHeader
        title="All Instructors Financial Hub"
        subtitle="Manage faculty gross sales, net commission earnings, TDS withholding, verified bank accounts, and payout disbursements."
        badge={`${instructors.length} INSTRUCTORS`}
        onRefresh={fetchInstructors}
        onExport={handleExportCSV}
      />

      {/* Filter / Search Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search instructor by name, email, or phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary font-medium"
          />
        </div>
        <span className="text-xs font-mono font-bold text-outline">
          Showing {instructors.length} active faculty partners
        </span>
      </div>

      {/* Instructors Financial Table */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-on-surface-variant font-medium">
            Fetching instructor financial records...
          </div>
        ) : !instructors.length ? (
          <div className="p-12 text-center text-xs text-on-surface-variant">
            No instructors matched your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/50 border-b border-outline-variant/60 text-[10px] font-mono uppercase tracking-wider text-outline">
                <tr>
                  <th className="py-3.5 px-4 font-extrabold">Instructor</th>
                  <th className="py-3.5 px-3 font-extrabold text-center">Courses / Sold</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Gross (60%)</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">TDS (2%)</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Net Share</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Disbursed</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Payable</th>
                  <th className="py-3.5 px-3 font-extrabold text-center">Bank Status</th>
                  <th className="py-3.5 px-4 font-extrabold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-medium">
                {instructors.map((inst) => {
                  const isVerified = inst.bankVerificationStatus === 'VERIFIED';
                  return (
                    <tr key={inst.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={inst.name}
                            avatar={inst.avatar}
                            size="sm"
                            shape="rounded"
                            className="w-8 h-8"
                          />
                          <div className="min-w-0">
                            <p className="font-extrabold text-on-surface truncate">{inst.name}</p>
                            <p className="text-[11px] text-outline truncate">{inst.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono">
                        <span className="font-bold text-on-surface">{inst.totalCourses}</span>
                        <span className="text-outline"> / </span>
                        <span className="font-bold text-primary">{inst.totalCoursesSold} sold</span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-on-surface">
                        {formatINR(inst.grossEarnings)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-amber-600">
                        {inst.tdsDeducted > 0 ? `-${formatINR(inst.tdsDeducted)}` : '₹0'}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600">
                        {formatINR(inst.netEarnings)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-on-surface-variant">
                        {formatINR(inst.totalPaid)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-black text-primary">
                        {formatINR(inst.pendingPayable)}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border inline-block ${
                            isVerified
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : inst.bankVerificationStatus === 'PENDING_VERIFICATION'
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : 'bg-surface-container text-outline border-outline-variant'
                          }`}
                        >
                          {inst.bankVerificationStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInst(inst);
                              setIsDetailOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                            title="View Financial Statement"
                          >
                            <Icon name="visibility" size={16} />
                          </button>

                          {inst.pendingPayable > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInst(inst);
                                setPayoutAmount(String(inst.pendingPayable));
                                setIsPayoutModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-bold text-[11px] hover:bg-primary/90 transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                              title="Disburse Payout"
                            >
                              <Icon name="send" size={12} />
                              <span>Pay</span>
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

      {/* Instructor Financial Breakdown Modal */}
      {selectedInst && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Financial Profile & Ledger — ${selectedInst.name}`}
          size="lg"
        >
          <div className="space-y-5 text-xs">
            {/* Quick Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/60">
              <div>
                <p className="text-[10px] font-mono uppercase text-outline font-bold">Gross Earnings</p>
                <p className="text-base font-black text-on-surface mt-0.5">{formatINR(selectedInst.grossEarnings)}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase text-outline font-bold">TDS Withheld (2%)</p>
                <p className="text-base font-black text-amber-600 mt-0.5">{formatINR(selectedInst.tdsDeducted)}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase text-outline font-bold">Total Paid Out</p>
                <p className="text-base font-black text-emerald-600 mt-0.5">{formatINR(selectedInst.totalPaid)}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase text-outline font-bold">Pending Payable</p>
                <p className="text-base font-black text-primary mt-0.5">{formatINR(selectedInst.pendingPayable)}</p>
              </div>
            </div>

            {/* Bank Information */}
            <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/80 space-y-2">
              <h4 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
                <Icon name="account_balance" size={16} className="text-primary" />
                <span>Verified Banking Credentials</span>
              </h4>
              {selectedInst.bankAccount ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-outline text-[10px] block">Account Holder:</span>
                    <span className="font-bold text-on-surface">{selectedInst.bankAccount.accountHolderName}</span>
                  </div>
                  <div>
                    <span className="text-outline text-[10px] block">Bank Name:</span>
                    <span className="font-bold text-on-surface">{selectedInst.bankAccount.bankName}</span>
                  </div>
                  <div>
                    <span className="text-outline text-[10px] block">Account Number:</span>
                    <span className="font-mono font-bold text-on-surface">{selectedInst.bankAccount.accountNumberMasked}</span>
                  </div>
                  <div>
                    <span className="text-outline text-[10px] block">IFSC Code:</span>
                    <span className="font-mono font-bold text-on-surface">{selectedInst.bankAccount.ifscCode}</span>
                  </div>
                  <div>
                    <span className="text-outline text-[10px] block">PAN:</span>
                    <span className="font-mono font-bold text-on-surface">{selectedInst.bankAccount.panNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-outline text-[10px] block">Status:</span>
                    <span className="font-bold text-emerald-600">{selectedInst.bankAccount.status}</span>
                  </div>
                </div>
              ) : (
                <p className="text-outline text-xs italic">No bank account has been connected yet.</p>
              )}
            </div>

            {/* Courses Authored Breakdown */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-sm text-on-surface">Course Sales Breakdown</h4>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-outline-variant/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-[10px] font-mono text-outline uppercase sticky top-0">
                    <tr>
                      <th className="p-2.5">Course Title</th>
                      <th className="p-2.5 text-right">Price</th>
                      <th className="p-2.5 text-right">Sold Copies</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40">
                    {selectedInst.courses?.map((c: any) => (
                      <tr key={c.id}>
                        <td className="p-2.5 font-bold text-on-surface">{c.title}</td>
                        <td className="p-2.5 text-right font-mono">{formatINR(c.price)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-primary">{c.soldCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payout History */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-sm text-on-surface">Disbursement History</h4>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-outline-variant/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-[10px] font-mono text-outline uppercase sticky top-0">
                    <tr>
                      <th className="p-2.5">Requested Date</th>
                      <th className="p-2.5 text-right">Amount</th>
                      <th className="p-2.5">Reference No</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40">
                    {selectedInst.payouts?.length ? (
                      selectedInst.payouts.map((p: any) => (
                        <tr key={p.id}>
                          <td className="p-2.5 text-on-surface font-mono">
                            {new Date(p.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                            {formatINR(p.netAmount || p.amount)}
                          </td>
                          <td className="p-2.5 font-mono text-outline">{p.referenceNumber || 'N/A'}</td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold bg-primary/10 text-primary">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-outline">
                          No previous payouts recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Payout Initiation Modal */}
      {selectedInst && (
        <Modal
          isOpen={isPayoutModalOpen}
          onClose={() => setIsPayoutModalOpen(false)}
          title={`Initiate Payout — ${selectedInst.name}`}
          size="md"
        >
          <form onSubmit={handleInitiatePayout} className="space-y-4 text-xs">
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 space-y-1">
              <p className="font-extrabold text-sm text-primary">Instructor Commission Settlement</p>
              <p className="text-on-surface-variant">
                Available Pending Payable: <strong>{formatINR(selectedInst.pendingPayable)}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Disbursement Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                max={selectedInst.pendingPayable}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant font-mono font-bold text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Internal Remarks &amp; Bank Notes
              </label>
              <textarea
                rows={2}
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                placeholder="e.g. Monthly revenue share settlement via NEFT / IMPS"
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/60">
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-outline-variant font-bold text-on-surface hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingPayout}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 transition-colors shadow-xs"
              >
                {isSubmittingPayout ? 'Processing...' : 'Confirm & Request Payout'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

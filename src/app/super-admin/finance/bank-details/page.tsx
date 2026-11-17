'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { FinancePageHeader } from '@/components/finance/FinancePageHeader';

export default function InstructorBankDetailsFinancePage() {
  const { showToast } = useApp();
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [instructorsList, setInstructorsList] = useState<any[]>([]);
  const [unmask, setUnmask] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Selected bank account for inspection
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Reject Modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Request Update Modal
  const [isUpdateReqModalOpen, setIsUpdateReqModalOpen] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

  // Add / Edit Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [targetInstructorId, setTargetInstructorId] = useState('');
  const [holderName, setHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accNumber, setAccNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accType, setAccType] = useState('SAVINGS');
  const [pan, setPan] = useState('');
  const [upi, setUpi] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchBankAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/super-admin/finance/bank-details?unmask=${unmask}`);
      if (res.ok) {
        const json = await res.json();
        setBankAccounts(json.bankAccounts || []);
      }

      // Also fetch instructors list for creation dropdown
      const instRes = await fetch('/api/super-admin/finance/instructors');
      if (instRes.ok) {
        const instJson = await instRes.json();
        setInstructorsList(instJson.instructors || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBankAccounts();
  }, [unmask]);

  const handleVerify = async (bankAccountId: string) => {
    try {
      const res = await fetch('/api/super-admin/finance/bank-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'VERIFY', bankAccountId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to verify bank account');
      showToast({ title: 'Bank Account Verified', description: 'Instructor is now eligible for automated disbursements.', type: 'success' });
      fetchBankAccounts();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank || !rejectReason) return;
    setIsRejecting(true);
    try {
      const res = await fetch('/api/super-admin/finance/bank-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', bankAccountId: selectedBank.id, rejectionReason: rejectReason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject bank account');
      showToast({ title: 'Bank Account Rejected', description: 'Notification sent to faculty member.', type: 'info' });
      setIsRejectModalOpen(false);
      setRejectReason('');
      fetchBankAccounts();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleRequestUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank || !updateMessage) return;
    setIsRequesting(true);
    try {
      const res = await fetch('/api/super-admin/finance/bank-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REQUEST_UPDATE', bankAccountId: selectedBank.id, updateMessage })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request update');
      showToast({ title: 'Update Requested', description: 'Faculty partner prompted to review details.', type: 'success' });
      setIsUpdateReqModalOpen(false);
      setUpdateMessage('');
      fetchBankAccounts();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInstructorId || !accNumber || !ifsc) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/super-admin/finance/bank-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_OR_UPDATE',
          instructorId: targetInstructorId,
          accountHolderName: holderName,
          bankName,
          accountNumber: accNumber,
          ifscCode: ifsc,
          accountType: accType,
          panNumber: pan,
          upiId: upi
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save bank details');
      showToast({ title: 'Bank Record Added', description: 'Faculty bank credentials stored securely.', type: 'success' });
      setIsCreateModalOpen(false);
      setTargetInstructorId('');
      setHolderName('');
      setBankName('');
      setAccNumber('');
      setIfsc('');
      setPan('');
      setUpi('');
      fetchBankAccounts();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = bankAccounts.filter((b) => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        b.instructorName?.toLowerCase().includes(q) ||
        b.instructorEmail?.toLowerCase().includes(q) ||
        b.bankName?.toLowerCase().includes(q) ||
        b.ifscCode?.toLowerCase().includes(q) ||
        b.panNumber?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <FinancePageHeader
        title="Instructor Bank Details &amp; KYC Verification"
        subtitle="Manage and verify instructor bank accounts, IFSC routing codes, UPI handles, PAN taxation documentation, and disbursement eligibility."
        badge={`${bankAccounts.length} BANK ACCOUNTS`}
        onRefresh={fetchBankAccounts}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUnmask(!unmask)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                unmask
                  ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
                  : 'border-outline-variant hover:bg-surface-container text-on-surface'
              }`}
              title="Toggle Security Unmasking"
            >
              <Icon name={unmask ? 'visibility_off' : 'visibility'} size={16} />
              <span>{unmask ? 'Mask Account Numbers' : 'Unmask Numbers'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
            >
              <Icon name="add" size={16} />
              <span>Link Bank Account</span>
            </button>
          </div>
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
              placeholder="Search by instructor name, email, bank name, IFSC, or PAN..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-bold focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Statuses ({bankAccounts.length})</option>
            <option value="VERIFIED">Verified</option>
            <option value="PENDING_VERIFICATION">Pending Verification</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <span className="text-xs font-mono font-bold text-outline shrink-0">
          Showing {filtered.length} bank records
        </span>
      </div>

      {/* Bank Accounts Table */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-on-surface-variant font-medium">
            Fetching banking records...
          </div>
        ) : !filtered.length ? (
          <div className="p-12 text-center text-xs text-on-surface-variant">
            No bank accounts found. Use &quot;Link Bank Account&quot; to register bank credentials for an instructor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/50 border-b border-outline-variant/60 text-[10px] font-mono uppercase tracking-wider text-outline">
                <tr>
                  <th className="py-3.5 px-4 font-extrabold">Instructor</th>
                  <th className="py-3.5 px-3 font-extrabold">Bank Name</th>
                  <th className="py-3.5 px-3 font-extrabold">Account Number</th>
                  <th className="py-3.5 px-3 font-extrabold">IFSC Code</th>
                  <th className="py-3.5 px-3 font-extrabold">PAN Card</th>
                  <th className="py-3.5 px-3 font-extrabold text-center">Status</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Submitted</th>
                  <th className="py-3.5 px-4 font-extrabold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-medium">
                {filtered.map((b) => {
                  const isVerified = b.status === 'VERIFIED';
                  const isPending = b.status === 'PENDING_VERIFICATION';

                  return (
                    <tr key={b.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-extrabold text-on-surface">{b.instructorName}</p>
                        <p className="text-[11px] text-outline truncate">{b.instructorEmail}</p>
                      </td>

                      <td className="py-3.5 px-3">
                        <p className="font-bold text-on-surface">{b.bankName}</p>
                        <p className="text-[11px] text-outline truncate">{b.accountHolderName}</p>
                      </td>

                      <td className="py-3.5 px-3 font-mono font-bold text-on-surface">
                        {b.accountNumber}
                      </td>

                      <td className="py-3.5 px-3 font-mono font-bold text-primary">
                        {b.ifscCode}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-outline">
                        {b.panNumber || 'NOT_SUBMITTED'}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border inline-block ${
                            isVerified
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : isPending
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-[11px] text-outline">
                        {new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBank(b);
                              setIsDetailOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                            title="Inspect KYC Documents"
                          >
                            <Icon name="visibility" size={15} />
                          </button>

                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleVerify(b.id)}
                                className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition-colors shadow-xs"
                                title="Approve & Verify Account"
                              >
                                Verify
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBank(b);
                                  setIsRejectModalOpen(true);
                                }}
                                className="px-2 py-1 rounded-lg border border-rose-300 text-rose-600 font-bold text-[11px] hover:bg-rose-50 transition-colors"
                                title="Reject Account"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBank(b);
                              setIsUpdateReqModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                            title="Request Re-verification"
                          >
                            <Icon name="sync" size={15} />
                          </button>
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

      {/* Detail Modal */}
      {selectedBank && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Banking Record — ${selectedBank.instructorName}`}
          size="md"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/60 space-y-2">
              <div className="flex justify-between">
                <span className="text-outline">Account Holder:</span>
                <span className="font-bold text-on-surface">{selectedBank.accountHolderName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Bank Name:</span>
                <span className="font-bold text-on-surface">{selectedBank.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Account Number:</span>
                <span className="font-mono font-bold text-on-surface">{selectedBank.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">IFSC Code:</span>
                <span className="font-mono font-bold text-primary">{selectedBank.ifscCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Account Type:</span>
                <span className="font-mono font-bold text-on-surface">{selectedBank.accountType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">PAN Card:</span>
                <span className="font-mono font-bold text-on-surface">{selectedBank.panNumber || 'N/A'}</span>
              </div>
              {selectedBank.upiId && (
                <div className="flex justify-between">
                  <span className="text-outline">UPI ID:</span>
                  <span className="font-mono font-bold text-primary">{selectedBank.upiId}</span>
                </div>
              )}
            </div>

            {selectedBank.rejectionReason && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700">
                <p className="font-bold">Rejection Note:</p>
                <p className="mt-0.5">{selectedBank.rejectionReason}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {selectedBank && (
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title={`Reject Bank Account — ${selectedBank.instructorName}`}
          size="sm"
        >
          <form onSubmit={handleReject} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Rejection Reason
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
                placeholder="e.g. IFSC code mismatch or account holder name doesn't match government ID"
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

      {/* Request Update Modal */}
      {selectedBank && (
        <Modal
          isOpen={isUpdateReqModalOpen}
          onClose={() => setIsUpdateReqModalOpen(false)}
          title={`Request Bank Information Update`}
          size="sm"
        >
          <form onSubmit={handleRequestUpdate} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Instructions for Faculty
              </label>
              <textarea
                rows={3}
                value={updateMessage}
                onChange={(e) => setUpdateMessage(e.target.value)}
                required
                placeholder="e.g. Please upload a cancelled cheque or bank passbook copy for account verification"
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/60">
              <button
                type="button"
                onClick={() => setIsUpdateReqModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-outline-variant font-bold text-on-surface hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRequesting}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 shadow-xs"
              >
                {isRequesting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Link / Add Bank Account Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Link Faculty Bank Credentials"
        size="md"
      >
        <form onSubmit={handleSaveBank} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Select Faculty Member *
            </label>
            <select
              value={targetInstructorId}
              onChange={(e) => setTargetInstructorId(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-bold focus:outline-none focus:border-primary"
            >
              <option value="">-- Choose Instructor --</option>
              {instructorsList.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Account Holder Name *
              </label>
              <input
                type="text"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                required
                placeholder="e.g. Dr. Ananya Mehra"
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Bank Name *
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
                placeholder="e.g. HDFC Bank Ltd"
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono">
            <div>
              <label className="block text-xs font-bold text-on-surface font-sans mb-1">
                Account Number *
              </label>
              <input
                type="text"
                value={accNumber}
                onChange={(e) => setAccNumber(e.target.value)}
                required
                placeholder="e.g. 50100234567890"
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-mono font-bold focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface font-sans mb-1">
                IFSC Code *
              </label>
              <input
                type="text"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                required
                placeholder="e.g. HDFC0000123"
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-mono font-bold focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Account Type
              </label>
              <select
                value={accType}
                onChange={(e) => setAccType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-bold focus:outline-none focus:border-primary"
              >
                <option value="SAVINGS">Savings</option>
                <option value="CURRENT">Current</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                PAN Number
              </label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="e.g. ABCDE1234F"
                maxLength={10}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-mono focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                UPI ID (Optional)
              </label>
              <input
                type="text"
                value={upi}
                onChange={(e) => setUpi(e.target.value)}
                placeholder="e.g. user@okaxis"
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-mono focus:outline-none focus:border-primary"
              />
            </div>
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
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 shadow-xs"
            >
              {isSaving ? 'Saving...' : 'Link Bank Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

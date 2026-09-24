'use client';

import React, { useEffect, useState } from 'react';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';
import {
  Landmark,
  ShieldCheck,
  Clock,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function InstructorBankDetailsPage() {
  const [bank, setBank] = useState<any>(null);
  const [form, setForm] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    accountType: 'SAVINGS',
    branchName: '',
    upiId: '',
    panNumber: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadBank = () => {
    setLoading(true);
    fetch('/api/instructor/bank-details')
      .then((r) => r.json())
      .then((res) => {
        if (res.bankAccount) {
          setBank(res.bankAccount);
          setForm((prev) => ({
            ...prev,
            accountHolderName: res.bankAccount.accountHolderName || '',
            bankName: res.bankAccount.bankName || '',
            ifscCode: res.bankAccount.ifscCode || '',
            accountType: res.bankAccount.accountType || 'SAVINGS',
            branchName: res.bankAccount.branchName || '',
            upiId: res.bankAccount.upiId || '',
            panNumber: res.bankAccount.panNumber || ''
          }));
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBank();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.accountNumber.trim() !== form.confirmAccountNumber.trim()) {
      setError('Account Number and Confirm Account Number do not match.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/instructor/bank-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save bank details.');
      } else {
        setBank(data.bankAccount);
        setForm((prev) => ({ ...prev, accountNumber: '', confirmAccountNumber: '' }));
        setSuccess(data.message || 'Bank account submitted for verification!');
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <InstructorPortalShell title="Bank Account & Payout Verification">
        <div className="py-24 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      </InstructorPortalShell>
    );
  }

  const status = bank?.status || 'NOT_ADDED';

  return (
    <InstructorPortalShell
      title="Bank Account & Payout Verification"
      subtitle="Add or update your bank account for course earnings payouts"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Add / Update Bank Account Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Banner */}
          {status === 'VERIFIED' && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-emerald-900">
                  Bank Account Verified &amp; Active for Payouts
                </div>
                <p className="text-xs text-emerald-700 mt-1">
                  Verified by {bank.verifiedByName || 'Administration'}{' '}
                  {bank.verifiedAt ? `on ${new Date(bank.verifiedAt).toLocaleDateString()}` : ''}. Note: Updating your bank account will reset its status to Pending Verification.
                </p>
              </div>
            </div>
          )}

          {status === 'PENDING_VERIFICATION' && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3.5">
              <Clock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-amber-900">
                  Pending Admin Verification
                </div>
                <p className="text-xs text-amber-800 mt-1">
                  Your bank account ({bank.bankName} — {bank.accountNumberMasked}) has been submitted and is awaiting review by Super Admin / Admin.
                </p>
              </div>
            </div>
          )}

          {status === 'REJECTED' && (
            <div className="p-5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3.5">
              <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-red-900">
                  Bank Verification Rejected — Please Correct &amp; Resubmit
                </div>
                <p className="text-xs text-red-700 mt-1">
                  <strong>Reason:</strong> {bank.rejectionReason || 'Account details could not be verified.'}
                </p>
                {bank.rejectedAt && (
                  <p className="text-[11px] text-red-600 mt-1">
                    Rejected on {new Date(bank.rejectedAt).toLocaleString()} by {bank.verifiedByName || 'Admin'}
                  </p>
                )}
              </div>
            </div>
          )}

          {status === 'DISABLED' && (
            <div className="p-5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3.5">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-red-900">
                  Bank Account Disabled by Administration
                </div>
                <p className="text-xs text-red-700 mt-1">
                  {bank.rejectionReason || 'Please submit a new active bank account or contact support.'}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-700 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4"
          >
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-violet-600" />
              {status === 'NOT_ADDED' ? 'Add Payout Bank Account' : 'Update / Resubmit Bank Account Details'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Holder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.accountHolderName}
                  onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
                  placeholder="As printed on bank passbook"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  placeholder="e.g. HDFC Bank / State Bank of India"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Bank Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                  placeholder="Enter full account number"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-violet-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm Bank Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.confirmAccountNumber}
                  onChange={(e) => setForm({ ...form, confirmAccountNumber: e.target.value })}
                  placeholder="Re-enter full account number"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-violet-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  IFSC / Routing Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.ifscCode}
                  onChange={(e) => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })}
                  placeholder="HDFC0001234"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 font-mono uppercase focus:outline-none focus:bg-white focus:border-violet-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.accountType}
                  onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                >
                  <option value="SAVINGS">Savings Account</option>
                  <option value="CURRENT">Current Account</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={form.branchName}
                  onChange={(e) => setForm({ ...form, branchName: e.target.value })}
                  placeholder="e.g. Nariman Point"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  UPI ID (Optional)
                </label>
                <input
                  type="text"
                  value={form.upiId}
                  onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                  placeholder="name@okhdfcbank"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  PAN / Tax Identification Number (Optional)
                </label>
                <input
                  type="text"
                  value={form.panNumber}
                  onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })}
                  placeholder="ABCDE1234F"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 uppercase font-mono focus:outline-none focus:bg-white focus:border-violet-600"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm inline-flex items-center gap-2 shadow-md shadow-violet-600/20 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>
                  {status === 'REJECTED'
                    ? 'Resubmit Bank Account for Verification'
                    : 'Save & Submit for Verification'}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Current Masked Bank Account Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs h-fit space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
              Current Linked Account
            </h2>
            <ShieldCheck className="w-5 h-5 text-violet-600" />
          </div>

          {status === 'NOT_ADDED' ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No bank account has been added yet. Submit your bank details on the left to enable course payouts.
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200">
                <div className="text-[10px] uppercase tracking-widest text-violet-700 font-bold">
                  {bank.bankName} ({bank.accountType})
                </div>
                <div className="mt-2 text-lg font-mono font-extrabold tracking-widest text-slate-900">
                  {bank.accountNumberMasked}
                </div>
                <div className="mt-2 flex items-center justify-between text-slate-700 font-medium">
                  <span>{bank.accountHolderName}</span>
                  <span className="font-mono">{bank.ifscCode}</span>
                </div>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Verification Status</span>
                <span
                  className={`font-bold ${
                    status === 'VERIFIED'
                      ? 'text-emerald-600'
                      : status === 'PENDING_VERIFICATION'
                      ? 'text-amber-600'
                      : 'text-red-600'
                  }`}
                >
                  {status}
                </span>
              </div>

              {bank.branchName && (
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Branch</span>
                  <span className="text-slate-800 font-medium">{bank.branchName}</span>
                </div>
              )}

              {bank.upiId && (
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">UPI ID</span>
                  <span className="text-slate-800 font-mono">{bank.upiId}</span>
                </div>
              )}

              {bank.panNumber && (
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">PAN Number</span>
                  <span className="text-slate-800 font-mono">{bank.panNumber}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </InstructorPortalShell>
  );
}

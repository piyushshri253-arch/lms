'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';
import {
  Wallet,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function InstructorPayoutsPage() {
  const [data, setData] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'BANK_TRANSFER' | 'UPI'>('BANK_TRANSFER');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadPayouts = () => {
    setLoading(true);
    fetch('/api/instructor/payouts')
      .then((r) => r.json())
      .then((res) => setData(res))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPayouts();
  }, []);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/instructor/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(amount),
          payoutMethod
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Could not submit payout request.');
      } else {
        setSuccess(json.message || 'Payout request submitted!');
        setAmount('');
        loadPayouts();
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <InstructorPortalShell title="Payout Requests & History">
        <div className="py-24 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      </InstructorPortalShell>
    );
  }

  const eligibility = data?.eligibility || {};
  const canRequest =
    eligibility.isAccountActive &&
    eligibility.isEmailVerified &&
    eligibility.isBankVerified &&
    eligibility.hasMinimumBalance;

  return (
    <InstructorPortalShell
      title="Payout Requests & Withdrawal History"
      subtitle="Withdraw your available course earnings to your verified bank account"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Request Payout & Payout History */}
        <div className="lg:col-span-2 space-y-6">
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

          {/* Request Payout Form */}
          <form
            onSubmit={handleRequestPayout}
            className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                Request New Payout
              </h2>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                Available Balance: ₹{Number(data?.availableBalance || 0).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Withdrawal Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={eligibility.minimumPayoutAmount || 500}
                  max={data?.availableBalance || 0}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Min ₹${eligibility.minimumPayoutAmount || 500}`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Payout Method
                </label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                >
                  <option value="BANK_TRANSFER">
                    Verified Bank Account ({data?.bankAccount?.accountNumberMasked || 'Not Verified'})
                  </option>
                  <option value="UPI">UPI Transfer</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canRequest || submitting}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-sm inline-flex items-center gap-2 shadow-md shadow-violet-600/20 cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              <span>Submit Payout Request</span>
            </button>
          </form>

          {/* Payout History Table */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 mb-4">
              Payout History
            </h2>

            {data?.payouts?.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No payout requests submitted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2.5 font-semibold">Requested Date</th>
                      <th className="py-2.5 font-semibold">Amount</th>
                      <th className="py-2.5 font-semibold">Method</th>
                      <th className="py-2.5 font-semibold">Reference / Notes</th>
                      <th className="py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.payouts?.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-3 text-slate-600">
                          {new Date(p.requestedAt).toLocaleString()}
                        </td>
                        <td className="py-3 font-extrabold text-slate-900">
                          ₹{Number(p.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 text-slate-600">{p.payoutMethod}</td>
                        <td className="py-3 text-slate-600">
                          {p.referenceNumber ? (
                            <span className="font-mono text-emerald-600 font-bold">Ref: {p.referenceNumber}</span>
                          ) : p.rejectionReason ? (
                            <span className="text-red-600">{p.rejectionReason}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              p.status === 'PAID' || p.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : ['REQUESTED', 'PENDING', 'PROCESSING'].includes(p.status)
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Mandatory Payout Eligibility Checklist */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs h-fit space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
            Payout Eligibility Checklist
          </h2>
          <p className="text-xs text-slate-500">
            All 4 security &amp; financial requirements must be met before submitting a withdrawal request:
          </p>

          <div className="space-y-3 text-xs">
            {[
              {
                ok: eligibility.isAccountActive,
                label: 'Instructor Account is Active'
              },
              {
                ok: eligibility.isEmailVerified,
                label: 'Email Address is Verified (OTP)'
              },
              {
                ok: eligibility.isBankVerified,
                label: 'Bank Account is Verified by Admin',
                actionHref: !eligibility.isBankVerified ? '/instructor/bank-details' : undefined,
                actionLabel: 'Verify Bank →'
              },
              {
                ok: eligibility.hasMinimumBalance,
                label: `Minimum Available Balance (₹${eligibility.minimumPayoutAmount || 500})`
              }
            ].map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  item.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  {item.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <span className="font-semibold">{item.label}</span>
                </div>
                {item.actionHref && (
                  <Link
                    href={item.actionHref}
                    className="text-[11px] font-bold text-violet-600 hover:text-violet-700"
                  >
                    {item.actionLabel}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </InstructorPortalShell>
  );
}

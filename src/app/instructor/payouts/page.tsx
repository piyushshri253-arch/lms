'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';
import {
  Wallet,
  Landmark,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
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
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
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
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Request Payout Form */}
          <form
            onSubmit={handleRequestPayout}
            className="p-6 rounded-2xl bg-[#0f131d] border border-slate-800/80 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
                Request New Payout
              </h2>
              <span className="text-xs font-bold text-emerald-400">
                Available Balance: ₹{Number(data?.availableBalance || 0).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Withdrawal Amount (₹) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min={eligibility.minimumPayoutAmount || 500}
                  max={data?.availableBalance || 0}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Min ₹${eligibility.minimumPayoutAmount || 500}`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Payout Method
                </label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white"
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
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-sm inline-flex items-center gap-2 shadow-lg shadow-violet-600/25"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              <span>Submit Payout Request</span>
            </button>
          </form>

          {/* Payout History Table */}
          <div className="p-6 rounded-2xl bg-[#0f131d] border border-slate-800/80">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 mb-4">
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
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 font-semibold">Requested Date</th>
                      <th className="py-2.5 font-semibold">Amount</th>
                      <th className="py-2.5 font-semibold">Method</th>
                      <th className="py-2.5 font-semibold">Reference / Notes</th>
                      <th className="py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {data?.payouts?.map((p: any) => (
                      <tr key={p.id}>
                        <td className="py-3 text-slate-300">
                          {new Date(p.requestedAt).toLocaleString()}
                        </td>
                        <td className="py-3 font-extrabold text-white">
                          ₹{Number(p.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 text-slate-400">{p.payoutMethod}</td>
                        <td className="py-3 text-slate-400">
                          {p.referenceNumber ? (
                            <span className="font-mono text-emerald-400">Ref: {p.referenceNumber}</span>
                          ) : p.rejectionReason ? (
                            <span className="text-red-400">{p.rejectionReason}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'PAID' || p.status === 'APPROVED'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : ['REQUESTED', 'PENDING', 'PROCESSING'].includes(p.status)
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-red-500/15 text-red-400'
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
        <div className="p-6 rounded-2xl bg-[#0f131d] border border-slate-800/80 h-fit space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
            Payout Eligibility Checklist
          </h2>
          <p className="text-xs text-slate-400">
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
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  {item.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span className="font-semibold">{item.label}</span>
                </div>
                {item.actionHref && (
                  <Link
                    href={item.actionHref}
                    className="text-[11px] font-bold text-violet-400 hover:text-violet-300"
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

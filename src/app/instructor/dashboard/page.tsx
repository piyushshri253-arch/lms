'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';
import {
  BookOpen,
  CheckCircle2,
  FileEdit,
  Users,
  DollarSign,
  Clock,
  Wallet,
  Landmark,
  AlertTriangle,
  ArrowUpRight,
  Receipt,
  User,
  Loader2,
  ShieldCheck,
  XCircle
} from 'lucide-react';

export default function InstructorDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/instructor/overview')
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error);
        else setData(res);
      })
      .catch((e) => setError(e.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <InstructorPortalShell title="Instructor Dashboard" subtitle="Loading your overview...">
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          <p className="text-xs text-slate-400">Loading real-time courses, earnings &amp; payout data...</p>
        </div>
      </InstructorPortalShell>
    );
  }

  if (error || !data) {
    return (
      <InstructorPortalShell title="Instructor Dashboard">
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error || 'Unable to load dashboard.'}
        </div>
      </InstructorPortalShell>
    );
  }

  const { profile, bankAccount, metrics, recentCourses, recentTransactions, recentPayouts } = data;

  const bankStatusBadge = () => {
    const st = bankAccount?.status || 'NOT_ADDED';
    if (st === 'VERIFIED')
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5" /> Verified for Payouts
        </span>
      );
    if (st === 'PENDING_VERIFICATION')
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <Clock className="w-3.5 h-3.5" /> Pending Admin Verification
        </span>
      );
    if (st === 'REJECTED')
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
          <XCircle className="w-3.5 h-3.5" /> Rejected — Action Required
        </span>
      );
    if (st === 'DISABLED')
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
          <AlertTriangle className="w-3.5 h-3.5" /> Disabled
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
        <Landmark className="w-3.5 h-3.5" /> Bank Account Not Added
      </span>
    );
  };

  return (
    <InstructorPortalShell
      title={`Welcome back, ${profile.name}`}
      subtitle="Overview of your courses, students, earnings, bank verification & payouts"
      profile={profile}
    >
      <div className="space-y-6">
        {/* Bank Verification Alert Banner if not yet verified */}
        {bankAccount?.status !== 'VERIFIED' && (
          <div
            className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              bankAccount?.status === 'REJECTED'
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-amber-500/10 border-amber-500/30'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <Landmark
                className={`w-6 h-6 shrink-0 mt-0.5 ${
                  bankAccount?.status === 'REJECTED' ? 'text-red-400' : 'text-amber-400'
                }`}
              />
              <div>
                <div className="font-bold text-sm text-white">
                  {bankAccount?.status === 'NOT_ADDED' &&
                    'Add Your Payout Bank Account to Enable Withdrawals'}
                  {bankAccount?.status === 'PENDING_VERIFICATION' &&
                    `Bank Account (${bankAccount.bankName} ${bankAccount.accountNumberMasked}) is Pending Admin Verification`}
                  {bankAccount?.status === 'REJECTED' &&
                    `Bank Account Verification Rejected: ${bankAccount.rejectionReason || 'Please resubmit accurate details'}`}
                  {bankAccount?.status === 'DISABLED' &&
                    'Your Payout Bank Account is Currently Disabled by Administration'}
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {bankAccount?.status === 'PENDING_VERIFICATION'
                    ? 'Our administration team is reviewing your bank details. Payout requests unlock automatically once verified.'
                    : 'A verified bank account is required before requesting payouts.'}
                </p>
              </div>
            </div>
            <Link
              href="/instructor/bank-details"
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shrink-0 inline-flex items-center gap-1.5"
            >
              <span>
                {bankAccount?.status === 'NOT_ADDED'
                  ? 'Add Bank Account'
                  : bankAccount?.status === 'REJECTED'
                  ? 'Correct & Resubmit'
                  : 'View Bank Details'}
              </span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Primary Overview Widgets (9 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#0f131d] border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Total Courses</span>
              <BookOpen className="w-4 h-4 text-violet-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">{metrics.totalCourses}</div>
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
              <span className="text-emerald-400 font-semibold">{metrics.publishedCourses} Published</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{metrics.draftCourses} Drafts</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0f131d] border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Total Students Enrolled</span>
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">{metrics.totalStudents}</div>
            <div className="mt-2 text-xs text-slate-400">Active enrollments across your courses</div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0f131d] border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Total Net Earnings</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-400">
              ₹{Number(metrics.totalEarnings || 0).toLocaleString('en-IN')}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Pending Clearance: ₹{Number(metrics.pendingEarnings || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0f131d] border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Available Balance</span>
              <Wallet className="w-4 h-4 text-violet-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              ₹{Number(metrics.availableBalance || 0).toLocaleString('en-IN')}
            </div>
            <div className="mt-2">
              <Link
                href="/instructor/payouts"
                className="text-xs font-bold text-violet-400 hover:text-violet-300 inline-flex items-center gap-1"
              >
                Request Payout <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0f131d] border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Paid Amount</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              ₹{Number(metrics.paidAmount || 0).toLocaleString('en-IN')}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Pending Payout: ₹{Number(metrics.pendingPayout || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0f131d] border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Bank Account Status</span>
              <Landmark className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2.5">{bankStatusBadge()}</div>
            <div className="mt-2.5 text-xs text-slate-400">
              {bankAccount?.accountNumberMasked
                ? `${bankAccount.bankName} (${bankAccount.accountNumberMasked})`
                : 'No bank account linked yet'}
            </div>
          </div>
        </div>

        {/* Account Summary & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0f131d] border border-slate-800/80">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
                Recent Earnings &amp; Ledger Transactions
              </h2>
              <Link
                href="/instructor/transactions"
                className="text-xs font-bold text-violet-400 hover:text-violet-300"
              >
                View Full Ledger →
              </Link>
            </div>

            {recentTransactions?.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                No transactions recorded yet. Sales from your published courses will appear here in real time.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2.5 font-semibold">Ref ID</th>
                      <th className="pb-2.5 font-semibold">Course</th>
                      <th className="pb-2.5 font-semibold">Student</th>
                      <th className="pb-2.5 font-semibold">Gross</th>
                      <th className="pb-2.5 font-semibold">Net Share</th>
                      <th className="pb-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {recentTransactions.slice(0, 6).map((t: any) => (
                      <tr key={t.id}>
                        <td className="py-3 font-mono text-slate-300">{t.transactionRef}</td>
                        <td className="py-3 font-semibold text-white truncate max-w-[160px]">
                          {t.courseTitle || 'Course'}
                        </td>
                        <td className="py-3 text-slate-400">{t.studentName || 'Student'}</td>
                        <td className="py-3 text-slate-300">₹{Number(t.grossAmount).toLocaleString('en-IN')}</td>
                        <td className="py-3 font-bold text-emerald-400">
                          ₹{Number(t.netAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400">
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Account & Profile Verification Card */}
          <div className="p-6 rounded-2xl bg-[#0f131d] border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
                Instructor Account Info
              </h2>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">User ID</span>
                <span className="font-mono text-slate-200">{profile.id.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Role</span>
                <span className="font-bold text-violet-400">INSTRUCTOR</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Account Status</span>
                <span className="font-bold text-emerald-400">{profile.status}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Email Verification</span>
                <span className="font-bold text-emerald-400">
                  {profile.emailVerified ? 'Verified (OTP)' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Mobile Number</span>
                <span className="text-slate-200">{profile.phone || 'Not set'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Location</span>
                <span className="text-slate-200">
                  {[profile.city, profile.state].filter(Boolean).join(', ') || 'Update in Profile'}
                </span>
              </div>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2.5">
              <Link
                href="/instructor/profile"
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-center text-xs font-bold text-white"
              >
                Edit Profile
              </Link>
              <Link
                href="/instructor"
                className="py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-center text-xs font-bold text-white"
              >
                Course Studio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </InstructorPortalShell>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';
import {
  BookOpen,
  CheckCircle2,
  Users,
  DollarSign,
  Clock,
  Wallet,
  Landmark,
  AlertTriangle,
  ArrowUpRight,
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
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          <p className="text-xs text-slate-500">Loading real-time courses, earnings &amp; payout data...</p>
        </div>
      </InstructorPortalShell>
    );
  }

  if (error || !data) {
    return (
      <InstructorPortalShell title="Instructor Dashboard">
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error || 'Unable to load dashboard.'}
        </div>
      </InstructorPortalShell>
    );
  }

  const { profile, bankAccount, metrics, recentTransactions } = data;

  const bankStatusBadge = () => {
    const st = bankAccount?.status || 'NOT_ADDED';
    if (st === 'VERIFIED')
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified for Payouts
        </span>
      );
    if (st === 'PENDING_VERIFICATION')
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Admin Verification
        </span>
      );
    if (st === 'REJECTED')
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
          <XCircle className="w-3.5 h-3.5 text-red-600" /> Rejected — Action Required
        </span>
      );
    if (st === 'DISABLED')
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Disabled
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
        <Landmark className="w-3.5 h-3.5 text-slate-600" /> Bank Account Not Added
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
            className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs ${
              bankAccount?.status === 'REJECTED'
                ? 'bg-red-50 border-red-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <Landmark
                className={`w-6 h-6 shrink-0 mt-0.5 ${
                  bankAccount?.status === 'REJECTED' ? 'text-red-600' : 'text-amber-600'
                }`}
              />
              <div>
                <div className="font-bold text-sm text-slate-900">
                  {bankAccount?.status === 'NOT_ADDED' &&
                    'Add Your Payout Bank Account to Enable Withdrawals'}
                  {bankAccount?.status === 'PENDING_VERIFICATION' &&
                    `Bank Account (${bankAccount.bankName} ${bankAccount.accountNumberMasked}) is Pending Admin Verification`}
                  {bankAccount?.status === 'REJECTED' &&
                    `Bank Account Verification Rejected: ${bankAccount.rejectionReason || 'Please resubmit accurate details'}`}
                  {bankAccount?.status === 'DISABLED' &&
                    'Your Payout Bank Account is Currently Disabled by Administration'}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {bankAccount?.status === 'PENDING_VERIFICATION'
                    ? 'Our administration team is reviewing your bank details. Payout requests unlock automatically once verified.'
                    : 'A verified bank account is required before requesting payouts.'}
                </p>
              </div>
            </div>
            <Link
              href="/instructor/bank-details"
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shrink-0 inline-flex items-center gap-1.5 shadow-xs"
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

        {/* Primary Overview Widgets (6 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Courses</span>
              <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900">{metrics.totalCourses}</div>
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
              <span className="text-emerald-600 font-semibold">{metrics.publishedCourses} Published</span>
              <span>•</span>
              <span className="text-amber-600 font-semibold">{metrics.draftCourses} Drafts</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Students Enrolled</span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900">{metrics.totalStudents}</div>
            <div className="mt-2 text-xs text-slate-500">Active enrollments across your courses</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Net Earnings</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-600">
              ₹{Number(metrics.totalEarnings || 0).toLocaleString('en-IN')}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Pending Clearance: ₹{Number(metrics.pendingEarnings || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Available Balance</span>
              <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900">
              ₹{Number(metrics.availableBalance || 0).toLocaleString('en-IN')}
            </div>
            <div className="mt-2">
              <Link
                href="/instructor/payouts"
                className="text-xs font-bold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
              >
                Request Payout <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Paid Amount</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900">
              ₹{Number(metrics.paidAmount || 0).toLocaleString('en-IN')}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Pending Payout: ₹{Number(metrics.pendingPayout || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Bank Account Status</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">{bankStatusBadge()}</div>
            <div className="mt-2.5 text-xs text-slate-500">
              {bankAccount?.accountNumberMasked
                ? `${bankAccount.bankName} (${bankAccount.accountNumberMasked})`
                : 'No bank account linked yet'}
            </div>
          </div>
        </div>

        {/* Account Summary & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                Recent Earnings &amp; Ledger Transactions
              </h2>
              <Link
                href="/instructor/transactions"
                className="text-xs font-bold text-violet-600 hover:text-violet-700"
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
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="pb-2.5 font-semibold">Ref ID</th>
                      <th className="pb-2.5 font-semibold">Course</th>
                      <th className="pb-2.5 font-semibold">Student</th>
                      <th className="pb-2.5 font-semibold">Gross</th>
                      <th className="pb-2.5 font-semibold">Net Share</th>
                      <th className="pb-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentTransactions.slice(0, 6).map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-3 font-mono text-slate-600">{t.transactionRef}</td>
                        <td className="py-3 font-semibold text-slate-900 truncate max-w-[160px]">
                          {t.courseTitle || 'Course'}
                        </td>
                        <td className="py-3 text-slate-600">{t.studentName || 'Student'}</td>
                        <td className="py-3 text-slate-700">₹{Number(t.grossAmount).toLocaleString('en-IN')}</td>
                        <td className="py-3 font-bold text-emerald-600">
                          ₹{Number(t.netAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                Instructor Account Info
              </h2>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">User ID</span>
                <span className="font-mono text-slate-800">{profile.id.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Role</span>
                <span className="font-bold text-violet-600">INSTRUCTOR</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Account Status</span>
                <span className="font-bold text-emerald-600">{profile.status}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Email Verification</span>
                <span className="font-bold text-emerald-600">
                  {profile.emailVerified ? 'Verified (OTP)' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Mobile Number</span>
                <span className="text-slate-800">{profile.phone || 'Not set'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Location</span>
                <span className="text-slate-800">
                  {[profile.city, profile.state].filter(Boolean).join(', ') || 'Update in Profile'}
                </span>
              </div>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2.5">
              <Link
                href="/instructor/profile"
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-center text-xs font-bold text-slate-800"
              >
                Edit Profile
              </Link>
              <Link
                href="/instructor"
                className="py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-center text-xs font-bold text-white shadow-xs"
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

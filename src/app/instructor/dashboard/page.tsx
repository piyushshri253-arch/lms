'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  XCircle,
  Users,
  TrendingUp,
  CheckCircle,
  Wallet,
  Landmark,
  AlertTriangle,
  ArrowUpRight,
  Loader2,
  ShieldCheck,
  Plus,
  ExternalLink,
  ChevronRight,
  Building2,
  CreditCard,
  Sparkles
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
      <InstructorPortalShell title="Instructor Dashboard" subtitle="Loading real-time instructor metrics...">
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          <p className="text-xs text-slate-500 font-medium">
            Fetching courses, student enrollments, earnings &amp; bank status from database...
          </p>
        </div>
      </InstructorPortalShell>
    );
  }

  if (error || !data) {
    return (
      <InstructorPortalShell title="Instructor Dashboard">
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
          <span>{error || 'Unable to load instructor overview.'}</span>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs"
          >
            Retry
          </button>
        </div>
      </InstructorPortalShell>
    );
  }

  const { profile, bankAccount, metrics, recentCourses, recentTransactions } = data;

  // Bank status badge renderer
  const renderBankBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Verified for Payouts
          </span>
        );
      case 'PENDING_VERIFICATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending Verification
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Verification Rejected
          </span>
        );
      case 'DISABLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Account Disabled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <Landmark className="w-3.5 h-3.5 text-slate-500" />
            Bank Account Not Added
          </span>
        );
    }
  };

  // Header quick actions
  const headerActions = (
    <div className="flex items-center gap-2.5">
      <Link
        href="/instructor/courses/builder"
        className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-all"
      >
        <Plus className="w-4 h-4" />
        <span>Create Course</span>
      </Link>
      <Link
        href="/instructor"
        className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-1.5 transition-all"
      >
        <span>Course Studio</span>
        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
      </Link>
    </div>
  );

  return (
    <InstructorPortalShell
      title={`Welcome back, ${profile.name || 'Instructor'}`}
      subtitle="Real-time metrics for your course lifecycle, enrolled students, earnings & bank payouts"
      profile={profile}
      actions={headerActions}
    >
      <div className="space-y-8">
        {/* Bank Account Status Banner (When Not Verified) */}
        {bankAccount?.status !== 'VERIFIED' && (
          <div
            className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs ${
              bankAccount?.status === 'REJECTED'
                ? 'bg-rose-50 border-rose-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <Landmark
                className={`w-6 h-6 shrink-0 mt-0.5 ${
                  bankAccount?.status === 'REJECTED' ? 'text-rose-600' : 'text-amber-600'
                }`}
              />
              <div>
                <div className="font-bold text-sm text-slate-900">
                  {bankAccount?.status === 'NOT_ADDED' &&
                    'Link Your Payout Bank Account to Enable Withdrawals'}
                  {bankAccount?.status === 'PENDING_VERIFICATION' &&
                    `Bank Account (${bankAccount.bankName} ${bankAccount.accountNumberMasked}) is Pending Admin Verification`}
                  {bankAccount?.status === 'REJECTED' &&
                    `Bank Verification Rejected: ${bankAccount.rejectionReason || 'Please resubmit accurate details'}`}
                  {bankAccount?.status === 'DISABLED' &&
                    'Your Payout Bank Account is Currently Disabled by Administration'}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {bankAccount?.status === 'PENDING_VERIFICATION'
                    ? 'Our administration team is reviewing your bank details. Payout requests unlock automatically once verified.'
                    : 'A verified bank account is required before requesting payouts of your course earnings.'}
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

        {/* ======================================================== */}
        {/* SECTION 1: COURSE LIFECYCLE & PORTFOLIO METRICS (5 CARDS) */}
        {/* ======================================================== */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-violet-600" />
                Course Portfolio Metrics
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time breakdown of all your authored courses across each lifecycle status
              </p>
            </div>
            <Link
              href="/instructor"
              className="text-xs font-bold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
            >
              Manage All Courses <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Total Courses */}
            <Link
              href="/instructor"
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-violet-300 hover:shadow-md transition-all group block shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Courses</span>
                <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
                {metrics.totalCourses}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>All authored masterclasses</span>
                <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            {/* 2. Active Courses */}
            <Link
              href="/instructor?tab=PUBLISHED"
              className="p-5 rounded-2xl bg-white border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all group block shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700">Active Courses</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-emerald-600 tracking-tight">
                {metrics.activeCourses}
              </div>
              <div className="mt-2 text-[11px] text-emerald-600/80 flex items-center justify-between">
                <span>Live &amp; accepting enrollments</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                  Live
                </span>
              </div>
            </Link>

            {/* 3. Pending Approval */}
            <Link
              href="/instructor?tab=IN_REVIEW"
              className="p-5 rounded-2xl bg-white border border-amber-100 hover:border-amber-300 hover:shadow-md transition-all group block shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700">Pending Approval</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-amber-600 tracking-tight">
                {metrics.pendingApprovalCourses}
              </div>
              <div className="mt-2 text-[11px] text-amber-600/80 flex items-center justify-between">
                <span>Under Review by QA team</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                  In Review
                </span>
              </div>
            </Link>

            {/* 4. Draft Courses */}
            <Link
              href="/instructor?tab=DRAFT"
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all group block shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Draft Courses</span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-slate-800 tracking-tight">
                {metrics.draftCourses}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Curriculum in progress</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                  Draft
                </span>
              </div>
            </Link>

            {/* 5. Inactive Courses */}
            <Link
              href="/instructor?tab=REJECTED"
              className="p-5 rounded-2xl bg-white border border-rose-100 hover:border-rose-300 hover:shadow-md transition-all group block shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-700">Inactive Courses</span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-rose-600 tracking-tight">
                {metrics.inactiveCourses}
              </div>
              <div className="mt-2 text-[11px] text-rose-600/80 flex items-center justify-between">
                <span>Archived or needs revision</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                  Inactive
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION 2: REVENUE, PAYOUTS & ENROLLED STUDENTS (4 CARDS) */}
        {/* ======================================================== */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Revenue &amp; Student Analytics
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real database verified earnings, paid out settlements, and unique active learners
              </p>
            </div>
            <Link
              href="/instructor/transactions"
              className="text-xs font-bold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
            >
              Full Financial Ledger <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 6. Total Students Enrolled */}
            <Link
              href="/instructor?tab=students"
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all group block shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Students Enrolled</span>
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
                {metrics.totalStudents}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>{metrics.totalEnrollments || metrics.totalStudents} total enrollments</span>
                <span className="text-sky-600 font-semibold">View Students →</span>
              </div>
            </Link>

            {/* 7. Total Earnings */}
            <Link
              href="/instructor/transactions"
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all group block shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Earnings</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-emerald-600 tracking-tight font-mono">
                ₹{Number(metrics.totalEarnings || 0).toLocaleString('en-IN')}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Gross: ₹{Number(metrics.grossEarnings || 0).toLocaleString('en-IN')}</span>
                <span className="text-emerald-600 font-semibold">Net Share</span>
              </div>
            </Link>

            {/* 8. Paid Amount */}
            <Link
              href="/instructor/payouts"
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group block shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Paid Amount</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-3xl font-black text-slate-900 tracking-tight font-mono">
                ₹{Number(metrics.paidAmount || 0).toLocaleString('en-IN')}
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Transferred to your bank</span>
                <span className="text-indigo-600 font-semibold">Settled</span>
              </div>
            </Link>

            {/* 9. Outstanding Amount */}
            <div className="p-5 rounded-2xl bg-white border border-violet-100 hover:border-violet-300 hover:shadow-md transition-all shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-violet-700">Outstanding Amount</span>
                  <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-black text-violet-700 tracking-tight font-mono">
                  ₹{Number(metrics.outstandingAmount || 0).toLocaleString('en-IN')}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {metrics.pendingPayout > 0 ? (
                    <span className="text-amber-600 font-medium">
                      ₹{Number(metrics.pendingPayout).toLocaleString('en-IN')} pending clearance
                    </span>
                  ) : (
                    'Available balance ready for payout'
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href="/instructor/payouts"
                  className="text-xs font-bold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
                >
                  Request Payout <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
                <span className="text-[10px] text-slate-400">NEFT / IMPS</span>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION 3: BANK ACCOUNT STATUS & SETTLEMENT HUB (CARD 10) */}
        {/* ======================================================== */}
        <section className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-extrabold text-slate-900">
                    Bank Account Status
                  </h2>
                  {renderBankBadge(bankAccount?.status || 'NOT_ADDED')}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your designated bank account for direct course sale earnings disbursements
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/instructor/bank-details"
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-1.5 transition-all"
              >
                <span>
                  {bankAccount?.status === 'NOT_ADDED'
                    ? 'Add Bank Account'
                    : 'Manage Bank Details'}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              {bankAccount?.status === 'VERIFIED' && Number(metrics.outstandingAmount || 0) > 0 && (
                <Link
                  href="/instructor/payouts"
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <span>Withdraw Outstanding</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] font-semibold text-slate-500">Bank Name</div>
              <div className="mt-1 text-sm font-bold text-slate-900 truncate">
                {bankAccount?.bankName || 'Not Linked Yet'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] font-semibold text-slate-500">Account Number</div>
              <div className="mt-1 text-sm font-mono font-bold text-slate-900">
                {bankAccount?.accountNumberMasked || '—'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] font-semibold text-slate-500">IFSC Code</div>
              <div className="mt-1 text-sm font-mono font-bold text-slate-900">
                {bankAccount?.ifscCode || '—'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] font-semibold text-slate-500">Account Holder</div>
              <div className="mt-1 text-sm font-bold text-slate-900 truncate">
                {bankAccount?.accountHolderName || profile.name || '—'}
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION 4: REAL COURSES OVERVIEW & RECENT TRANSACTIONS   */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Courses Table (2 Columns) */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                  Your Authored Courses ({metrics.totalCourses})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recent courses created and managed under your instructor account
                </p>
              </div>
              <Link
                href="/instructor"
                className="text-xs font-bold text-violet-600 hover:text-violet-700"
              >
                View Studio →
              </Link>
            </div>

            {!recentCourses || recentCourses.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No courses created yet.{' '}
                <Link
                  href="/instructor/courses/builder"
                  className="font-bold text-violet-600 hover:underline"
                >
                  Create your first masterclass now
                </Link>
                .
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="pb-3 font-semibold">Course Title</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Price</th>
                      <th className="pb-3 font-semibold text-center">Students</th>
                      <th className="pb-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentCourses.slice(0, 6).map((c: any) => {
                      const st = (c.status || 'DRAFT').toUpperCase();
                      const statusColor =
                        st === 'PUBLISHED' || st === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : st === 'IN_REVIEW' || st === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : st === 'REJECTED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200';

                      return (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="py-3 pr-2">
                            <div className="font-bold text-slate-900 truncate max-w-[220px]">
                              {c.title}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {c.category?.name || c.category || 'Tech & Engineering'}
                            </div>
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColor}`}
                            >
                              {st}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-slate-700">
                            ₹{Number(c.discountPrice ?? c.price ?? 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 text-center font-bold text-slate-900">
                            {c._count?.enrollments ?? 0}
                          </td>
                          <td className="py-3 text-right">
                            <Link
                              href={`/instructor/courses/builder?courseId=${c.id}`}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-violet-50 hover:text-violet-600 font-bold text-[11px] text-slate-700 transition-colors"
                            >
                              Builder
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Account Profile Summary (1 Column) */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                Instructor Account
              </h3>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Instructor ID</span>
                <span className="font-mono text-slate-800">{profile.id.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Account Role</span>
                <span className="font-bold text-violet-600">{profile.role || 'INSTRUCTOR'}</span>
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
                <span className="text-slate-500">Mobile Phone</span>
                <span className="text-slate-800">{profile.phone || 'Not set'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Registered Email</span>
                <span className="font-semibold text-slate-800 truncate max-w-[160px]">
                  {profile.email}
                </span>
              </div>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2">
              <Link
                href="/instructor/profile"
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-center text-xs font-bold text-slate-800 transition-colors"
              >
                Edit Profile
              </Link>
              <Link
                href="/instructor/payouts"
                className="py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-center text-xs font-bold text-white shadow-xs transition-colors"
              >
                Payout Center
              </Link>
            </div>
          </div>
        </div>

        {/* Transactions Ledger Preview */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                Recent Earnings &amp; Ledger Transactions
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Course sales credited to your balance with automatic 85% instructor revenue share
              </p>
            </div>
            <Link
              href="/instructor/transactions"
              className="text-xs font-bold text-violet-600 hover:text-violet-700"
            >
              View Full Ledger →
            </Link>
          </div>

          {!recentTransactions || recentTransactions.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No transactions recorded yet. Real-time earnings will appear here as students purchase your courses.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-2.5 font-semibold">Ref ID</th>
                    <th className="pb-2.5 font-semibold">Course</th>
                    <th className="pb-2.5 font-semibold">Student</th>
                    <th className="pb-2.5 font-semibold">Gross Fee</th>
                    <th className="pb-2.5 font-semibold">Your Net Share</th>
                    <th className="pb-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTransactions.slice(0, 6).map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-3 font-mono text-slate-600">{t.transactionRef}</td>
                      <td className="py-3 font-semibold text-slate-900 truncate max-w-[200px]">
                        {t.courseTitle || 'Course'}
                      </td>
                      <td className="py-3 text-slate-600">{t.studentName || 'Student'}</td>
                      <td className="py-3 text-slate-700">
                        ₹{Number(t.grossAmount).toLocaleString('en-IN')}
                      </td>
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
      </div>
    </InstructorPortalShell>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';
import {
  DollarSign,
  Receipt,
  Wallet,
  Search,
  Filter,
  ArrowUpRight,
  Loader2,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function InstructorEarningsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [courseId, setCourseId] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const fetchEarnings = () => {
    setLoading(true);
    const params = new URLSearchParams({
      search,
      status,
      courseId,
      from: fromDate,
      to: toDate,
      page: String(page),
      limit: '15'
    });
    fetch(`/api/instructor/earnings?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => setData(res))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEarnings();
  }, [status, courseId, fromDate, toDate, page]);

  const summary = data?.summary || {};
  const transactions = data?.transactions || [];
  const courses = data?.courses || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, totalCount: 0 };

  return (
    <InstructorPortalShell
      title="Earnings & Transaction History"
      subtitle="Transparent breakdown of course sales, platform fees, tax deductions, and net instructor share"
    >
      <div className="space-y-6">
        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#0f131d] border border-slate-800/80">
            <div className="text-xs font-semibold text-slate-400">Gross Course Sales</div>
            <div className="mt-2 text-2xl font-black text-white">
              ₹{Number(summary.totalGrossSales || 0).toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Platform Fee (15%): ₹{Number(summary.totalPlatformFees || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0f131d] border border-slate-800/80">
            <div className="text-xs font-semibold text-slate-400">Net Instructor Earnings</div>
            <div className="mt-2 text-2xl font-black text-emerald-400">
              ₹{Number(summary.totalNetEarnings || 0).toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Pending Clearance: ₹{Number(summary.pendingClearance || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0f131d] border border-slate-800/80">
            <div className="text-xs font-semibold text-slate-400">Available for Payout</div>
            <div className="mt-2 text-2xl font-black text-violet-400">
              ₹{Number(summary.availableBalance || 0).toLocaleString('en-IN')}
            </div>
            <div className="mt-1">
              <Link
                href="/instructor/payouts"
                className="text-xs font-bold text-violet-400 hover:text-violet-300 inline-flex items-center gap-1"
              >
                Request Withdrawal <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0f131d] border border-slate-800/80">
            <div className="text-xs font-semibold text-slate-400">Total Paid Out</div>
            <div className="mt-2 text-2xl font-black text-white">
              ₹{Number(summary.totalPaidOut || 0).toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              In-Flight Payouts: ₹{Number(summary.pendingPayoutAmount || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="p-5 rounded-2xl bg-[#0f131d] border border-slate-800/80 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchEarnings()}
                placeholder="Search by Transaction ID, Course, or Student..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>

            <select
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
            >
              <option value="ALL">All Courses</option>
              {courses.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
            </select>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-[11px] text-white"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-[11px] text-white"
              />
            </div>
          </div>

          {/* Ledger Table */}
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-violet-500" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No transactions match your current filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-3 px-2 font-semibold">Transaction ID</th>
                    <th className="py-3 px-2 font-semibold">Course Name</th>
                    <th className="py-3 px-2 font-semibold">Student</th>
                    <th className="py-3 px-2 font-semibold">Date</th>
                    <th className="py-3 px-2 font-semibold">Gross</th>
                    <th className="py-3 px-2 font-semibold">Platform Fee</th>
                    <th className="py-3 px-2 font-semibold">Instructor Share</th>
                    <th className="py-3 px-2 font-semibold">Tax/TDS</th>
                    <th className="py-3 px-2 font-semibold">Net Amount</th>
                    <th className="py-3 px-2 font-semibold">Method</th>
                    <th className="py-3 px-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transactions.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-2 font-mono text-slate-300">{t.transactionRef}</td>
                      <td className="py-3 px-2 font-semibold text-white max-w-[180px] truncate">
                        {t.courseTitle || 'Course Enrollment'}
                      </td>
                      <td className="py-3 px-2 text-slate-300">
                        <div>{t.studentName || 'Student'}</div>
                        <div className="text-[10px] text-slate-500">{t.studentEmail}</div>
                      </td>
                      <td className="py-3 px-2 text-slate-400">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 text-slate-200">
                        ₹{Number(t.grossAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-2 text-amber-400">
                        -₹{Number(t.platformFee).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-2 text-slate-200">
                        ₹{Number(t.instructorShare).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-2 text-slate-400">
                        -₹{Number(t.taxDeduction).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-2 font-extrabold text-emerald-400">
                        ₹{Number(t.netAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-2 text-slate-400">{t.paymentMethod}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'PAID'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : t.status === 'PENDING' || t.status === 'PROCESSING'
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-red-500/15 text-red-400'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} records)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 disabled:opacity-40 text-white font-semibold"
                >
                  Previous
                </button>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 disabled:opacity-40 text-white font-semibold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </InstructorPortalShell>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';
import {
  Search,
  ArrowUpRight,
  Loader2
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
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">Gross Course Sales</div>
            <div className="mt-2 text-2xl font-black text-slate-900">
              ₹{Number(summary.totalGrossSales || 0).toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Platform Fee (15%): ₹{Number(summary.totalPlatformFees || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">Net Instructor Earnings</div>
            <div className="mt-2 text-2xl font-black text-emerald-600">
              ₹{Number(summary.totalNetEarnings || 0).toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Pending Clearance: ₹{Number(summary.pendingClearance || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">Available for Payout</div>
            <div className="mt-2 text-2xl font-black text-violet-600">
              ₹{Number(summary.availableBalance || 0).toLocaleString('en-IN')}
            </div>
            <div className="mt-1">
              <Link
                href="/instructor/payouts"
                className="text-xs font-bold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
              >
                Request Withdrawal <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">Total Paid Out</div>
            <div className="mt-2 text-2xl font-black text-slate-900">
              ₹{Number(summary.totalPaidOut || 0).toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              In-Flight Payouts: ₹{Number(summary.pendingPayoutAmount || 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-3 items-center">
            <div className="relative sm:col-span-2 md:col-span-3 lg:col-span-4 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchEarnings()}
                placeholder="Search by Transaction ID, Course, or Student..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-violet-600"
              />
            </div>

            <div className="sm:col-span-1 md:col-span-1 lg:col-span-2 min-w-0">
              <select
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600 truncate"
              >
                <option value="ALL">All Courses</option>
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-1 md:col-span-1 lg:col-span-2 min-w-0">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
              >
                <option value="ALL">All Statuses</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>

            <div className="sm:col-span-1 md:col-span-1 lg:col-span-2 min-w-0">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                title="From Date"
                className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
              />
            </div>

            <div className="sm:col-span-1 md:col-span-1 lg:col-span-2 min-w-0">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                title="To Date"
                className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
              />
            </div>
          </div>

          {/* Ledger Table */}
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-violet-600" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No transactions match your current filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
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
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-3 px-2 font-mono text-slate-600">{t.transactionRef}</td>
                      <td className="py-3 px-2 font-semibold text-slate-900 max-w-[180px] truncate">
                        {t.courseTitle || 'Course Enrollment'}
                      </td>
                      <td className="py-3 px-2 text-slate-700">
                        <div>{t.studentName || 'Student'}</div>
                        <div className="text-[10px] text-slate-500">{t.studentEmail}</div>
                      </td>
                      <td className="py-3 px-2 text-slate-500">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 text-slate-800">
                        ₹{Number(t.grossAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-2 text-amber-600 font-medium">
                        -₹{Number(t.platformFee).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-2 text-slate-800">
                        ₹{Number(t.instructorShare).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-2 text-slate-500">
                        -₹{Number(t.taxDeduction).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-2 font-extrabold text-emerald-600">
                        ₹{Number(t.netAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-2 text-slate-600">{t.paymentMethod}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            t.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : t.status === 'PENDING' || t.status === 'PROCESSING'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
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
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} records)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-300 disabled:opacity-40 text-slate-800 font-semibold hover:bg-slate-200"
                >
                  Previous
                </button>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-300 disabled:opacity-40 text-slate-800 font-semibold hover:bg-slate-200"
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

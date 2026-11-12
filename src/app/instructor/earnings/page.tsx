'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';
import {
  Search,
  ArrowUpRight,
  Loader2
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function InstructorEarningsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [courseId, setCourseId] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [hoverTooltip, setHoverTooltip] = useState<{ text: string; left: number; top: number } | null>(null);

  const fetchEarnings = () => {
    setLoading(true);
    const params = new URLSearchParams({
      search,
      status,
      courseId,
      from: fromDate,
      to: toDate,
      page: String(page),
      limit: '15',
      _t: String(Date.now())
    });
    fetch(`/api/instructor/earnings?${params.toString()}`, { cache: 'no-store' })
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

  const formatInr = (value: unknown) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

  const summaryCards: {
    key: string;
    label: string;
    value: string;
    valueClass: string;
    footer: React.ReactNode;
  }[] = [
    {
      key: 'net-course-value',
      label: 'Net Course Value',
      value: formatInr(summary.totalNetCourseValue),
      valueClass: 'text-indigo-600',
      footer: 'Actual Price (Excl. 18% GST)'
    },
    {
      key: 'gross-course-sales',
      label: 'Gross Course Sales',
      value: formatInr(summary.totalGrossSales),
      valueClass: 'text-slate-900',
      footer: (
        <div className="space-y-0.5">
          <div className="text-[10px] font-medium text-slate-400">Incl. 18% GST</div>
          <div>Platform Fee (40%): {formatInr(summary.totalPlatformFees)}</div>
        </div>
      )
    },
    {
      key: 'tds-deducted',
      label: 'TDS Deducted (2%)',
      value: formatInr(summary.totalTaxDeductions),
      valueClass: 'text-amber-600',
      footer: '2% Govt. TDS on Instructor Share'
    },
    {
      key: 'net-instructor-earnings',
      label: 'Net Instructor Earnings',
      value: formatInr(summary.totalNetEarnings),
      valueClass: 'text-emerald-600',
      footer: 'Instructor Share: 60% (less 2% TDS)'
    },
    {
      key: 'available-payout',
      label: 'Available for Payout',
      value: formatInr(summary.availableBalance),
      valueClass: 'text-violet-600',
      footer: (
        <Link
          href="/instructor/payouts"
          className="text-[11px] font-bold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
        >
          Request Withdrawal <ArrowUpRight className="w-3 h-3 shrink-0" />
        </Link>
      )
    },
    {
      key: 'total-paid-out',
      label: 'Total Paid Out',
      value: formatInr(summary.totalPaidOut),
      valueClass: 'text-slate-900',
      footer: `In-Flight Payouts: ${formatInr(summary.pendingPayoutAmount)}`
    }
  ];

  return (
    <InstructorPortalShell
      title="Earnings & Transaction History"
      subtitle="Transparent breakdown of course sales, platform fees, tax deductions, and net instructor share"
    >
      <div className="space-y-6">
        {/* Transparent Fee & Payout Formula Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-50 via-indigo-50 to-purple-50 border border-violet-200 text-xs">
          <div className="space-y-1.5">
            <div className="font-bold text-violet-950 flex items-center gap-1.5">
              <span>Transparent Instructor Payout Formula</span>
            </div>
            <p className="text-slate-700 leading-relaxed text-[11px] sm:text-xs flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="whitespace-nowrap">
                <strong>Student Price:</strong> Course Price + 18% GST
              </span>
              <span className="text-slate-400">•</span>
              <span className="whitespace-nowrap">
                <strong>Gateway Fee (2%)</strong>
              </span>
              <span className="text-slate-400">•</span>
              <span className="whitespace-nowrap">
                <strong>Net Split:</strong> Instructor 60% / Platform Fee 40%
              </span>
              <span className="text-slate-400">•</span>
              <span className="whitespace-nowrap">
                <strong>Govt TDS (2%)</strong>
              </span>
            </p>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {summaryCards.map((card) => (
            <div
              key={card.key}
              className="p-3.5 xl:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between gap-2 min-w-0"
            >
              <div>
                <div className="text-xs font-semibold text-slate-500 leading-4 lg:min-h-[2rem]">
                  {card.label}
                </div>
                <div
                  className={`mt-1.5 text-xl sm:text-2xl lg:text-base xl:text-xl 2xl:text-[22px] font-black tabular-nums tracking-tight ${card.valueClass}`}
                >
                  {card.value}
                </div>
              </div>
              <div className="text-[11px] text-slate-500 leading-snug">{card.footer}</div>
            </div>
          ))}
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
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70">
                    <th className="py-3 px-2.5 font-semibold whitespace-nowrap">Transaction ID</th>
                    <th className="py-3 px-2.5 font-semibold whitespace-nowrap">Course Name</th>
                    <th className="py-3 px-2.5 font-semibold whitespace-nowrap">Student Name</th>
                    <th className="py-3 px-2.5 font-semibold whitespace-nowrap">Date</th>
                    <th className="py-3 px-2.5 font-semibold text-right whitespace-nowrap">Gross</th>
                    <th className="py-3 px-2.5 font-semibold text-right whitespace-nowrap">Platform Fee</th>
                    <th className="py-3 px-2.5 font-semibold text-right whitespace-nowrap">Instructor Share</th>
                    <th className="py-3 px-2.5 font-semibold text-right whitespace-nowrap">TDS</th>
                    <th className="py-3 px-2.5 font-semibold text-right whitespace-nowrap">Net Amount</th>
                    <th className="py-3 px-2.5 font-semibold text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-2.5 font-mono text-slate-600 whitespace-nowrap">
                        {t.transactionRef}
                      </td>
                      <td className="py-3.5 px-2.5 font-semibold text-slate-900 whitespace-nowrap">
                        <span
                          className="inline-block max-w-[145px] truncate align-middle cursor-help"
                          title={t.courseTitle || 'Course Enrollment'}
                          onMouseEnter={(e) => {
                            const text = t.courseTitle || 'Course Enrollment';
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoverTooltip({
                              text,
                              left: rect.left,
                              top: rect.top - 8
                            });
                          }}
                          onMouseLeave={() => setHoverTooltip(null)}
                        >
                          {t.courseTitle || 'Course Enrollment'}
                        </span>
                      </td>
                      <td className="py-3.5 px-2.5 text-slate-800 font-semibold whitespace-nowrap">
                        <span
                          className="inline-block max-w-[120px] truncate align-middle"
                          title={t.studentName || 'Student'}
                          onMouseEnter={(e) => {
                            const text = t.studentName || 'Student';
                            if (e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoverTooltip({
                                text,
                                left: rect.left,
                                top: rect.top - 8
                              });
                            }
                          }}
                          onMouseLeave={() => setHoverTooltip(null)}
                        >
                          {t.studentName || 'Student'}
                        </span>
                      </td>
                      <td className="py-3.5 px-2.5 text-slate-500 whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3.5 px-2.5 text-right tabular-nums text-slate-800 whitespace-nowrap">
                        ₹{Number(t.grossAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-2.5 text-right tabular-nums text-amber-600 font-medium whitespace-nowrap">
                        -₹{Number(t.platformFee).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-2.5 text-right tabular-nums text-slate-800 whitespace-nowrap">
                        ₹{Number(t.instructorShare).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-2.5 text-right tabular-nums text-slate-500 whitespace-nowrap">
                        -₹{Number(t.taxDeduction).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-2.5 text-right tabular-nums font-extrabold text-emerald-600 whitespace-nowrap">
                        ₹{Number(t.netAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-2.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
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

          {/* Hover Tooltip for Full Course Name / Student Name */}
          {hoverTooltip && (
            <div
              style={{
                left: hoverTooltip.left,
                top: hoverTooltip.top,
                transform: 'translateY(-100%)'
              }}
              className="fixed z-[9999] pointer-events-none px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-semibold shadow-xl max-w-xs whitespace-normal break-words border border-slate-700"
            >
              {hoverTooltip.text}
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

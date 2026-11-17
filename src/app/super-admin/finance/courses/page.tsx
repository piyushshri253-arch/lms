'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { FinancePageHeader } from '@/components/finance/FinancePageHeader';
import { formatINR } from '@/lib/finance-service';

export default function AllCoursesFinancePage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/super-admin/finance/courses?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const json = await res.json();
        setCourses(json.courses || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [search]);

  const categories = Array.from(new Set(courses.map((c) => c.category))).filter(Boolean);

  const filteredCourses = courses.filter((c) => {
    if (categoryFilter !== 'ALL' && c.category !== categoryFilter) return false;
    return true;
  });

  const handleExportCSV = () => {
    if (!filteredCourses.length) return;
    const headers = [
      'Course ID',
      'Course Title',
      'Instructor',
      'Price',
      'Enrollments',
      'Sales Count',
      'Refunds',
      'Gross Sales',
      'Taxable Value',
      'GST',
      'Gateway Fees',
      'Instructor Share (60%)',
      'TDS (2%)',
      'Net Instructor',
      'Platform Revenue (40%)'
    ];
    const rows = filteredCourses.map((c) => [
      c.id,
      `"${c.courseName}"`,
      `"${c.instructorName}"`,
      c.price,
      c.totalEnrollments,
      c.successfulSales,
      c.refundedOrders,
      c.grossSales,
      c.taxableValue,
      c.gst,
      c.gatewayFees,
      c.instructorShare,
      c.tds,
      c.netInstructorEarnings,
      c.platformRevenue
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MorenaTeach_Course_Financials_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <FinancePageHeader
        title="All Courses Financial Breakdown"
        subtitle="Granular course-level revenue economics: base taxable value, 18% GST collected, 2% gateway processing cost, 60/40 revenue split, and TDS deductions."
        badge={`${courses.length} COURSES`}
        onRefresh={fetchCourses}
        onExport={handleExportCSV}
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
              placeholder="Search course title or instructor..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-bold focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Categories ({courses.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-mono font-bold text-outline shrink-0">
          Showing {filteredCourses.length} courses
        </span>
      </div>

      {/* Courses Financial Table */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-on-surface-variant font-medium">
            Fetching course financial data...
          </div>
        ) : !filteredCourses.length ? (
          <div className="p-12 text-center text-xs text-on-surface-variant">
            No courses found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/50 border-b border-outline-variant/60 text-[10px] font-mono uppercase tracking-wider text-outline">
                <tr>
                  <th className="py-3.5 px-4 font-extrabold">Course</th>
                  <th className="py-3.5 px-3 font-extrabold">Instructor</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Price</th>
                  <th className="py-3.5 px-3 font-extrabold text-center">Sales / Refunds</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Gross Sales</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">GST (18%)</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Gateway (2%)</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Faculty (60%)</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Platform (40%)</th>
                  <th className="py-3.5 px-4 font-extrabold text-center">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-medium">
                {filteredCourses.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-extrabold text-on-surface truncate">{c.courseName}</p>
                      <p className="text-[11px] text-outline font-mono truncate">{c.category}</p>
                    </td>

                    <td className="py-3.5 px-3 text-on-surface-variant truncate max-w-[140px]">
                      {c.instructorName}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-on-surface">
                      {formatINR(c.price)}
                    </td>

                    <td className="py-3.5 px-3 text-center font-mono">
                      <span className="font-bold text-primary">{c.successfulSales}</span>
                      <span className="text-outline"> / </span>
                      <span className="font-bold text-rose-600">{c.refundedOrders}</span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-black text-on-surface">
                      {formatINR(c.grossSales)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-outline">
                      {formatINR(c.gst)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-outline">
                      {formatINR(c.gatewayFees)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600">
                      {formatINR(c.netInstructorEarnings)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-primary">
                      {formatINR(c.platformRevenue)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCourse(c);
                          setIsDetailOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                        title="View Course Economics Breakdown"
                      >
                        <Icon name="visibility" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Course Economic Breakdown Modal */}
      {selectedCourse && (
        <Modal
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`Financial Economics — ${selectedCourse.courseName}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/60 space-y-2">
              <div className="flex justify-between">
                <span className="text-outline">Assigned Faculty:</span>
                <span className="font-bold text-on-surface">{selectedCourse.instructorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Listed Base Price:</span>
                <span className="font-mono font-bold text-on-surface">{formatINR(selectedCourse.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Total Enrollments:</span>
                <span className="font-mono font-bold text-primary">{selectedCourse.totalEnrollments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Confirmed Paid Sales:</span>
                <span className="font-mono font-bold text-emerald-600">{selectedCourse.successfulSales}</span>
              </div>
            </div>

            <div className="space-y-2 border-t border-outline-variant/60 pt-3">
              <h4 className="font-bold text-sm text-on-surface">Mathematical Revenue Dissection</h4>
              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between p-2 rounded-lg bg-surface-container-lowest">
                  <span className="text-on-surface-variant">Total Gross Sales Volume (GMV):</span>
                  <span className="font-black text-on-surface">{formatINR(selectedCourse.grossSales)}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-surface-container-lowest text-outline">
                  <span>Taxable Base Value:</span>
                  <span>{formatINR(selectedCourse.taxableValue)}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-surface-container-lowest text-indigo-600">
                  <span>Output GST Collected (18%):</span>
                  <span>+{formatINR(selectedCourse.gst)}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-surface-container-lowest text-rose-600">
                  <span>Payment Gateway Processing (2%):</span>
                  <span>-{formatINR(selectedCourse.gatewayFees)}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-surface-container-lowest text-cyan-600 font-bold">
                  <span>Instructor Gross Share (60% of Net Pool):</span>
                  <span>{formatINR(selectedCourse.instructorShare)}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-surface-container-lowest text-amber-600">
                  <span>Govt TDS Deducted (2% on Instructor Share):</span>
                  <span>-{formatINR(selectedCourse.tds)}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-emerald-500/10 text-emerald-600 font-black">
                  <span>Net Instructor Commission Accrued:</span>
                  <span>{formatINR(selectedCourse.netInstructorEarnings)}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-primary/10 text-primary font-black">
                  <span>Net Platform Revenue (40%):</span>
                  <span>{formatINR(selectedCourse.platformRevenue)}</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { FinancePageHeader } from '@/components/finance/FinancePageHeader';
import { formatINR } from '@/lib/finance-service';

export default function CoursesSoldFinancePage() {
  const [sales, setSales] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [range, setRange] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Selected sale receipt modal
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const fetchSales = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/super-admin/finance/sales?search=${encodeURIComponent(search)}&range=${range}&page=${page}&limit=25`
      );
      if (res.ok) {
        const json = await res.json();
        setSales(json.sales || []);
        setTotalPages(json.totalPages || 1);
        setTotalCount(json.totalCount || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [search, range, page]);

  const handleExportCSV = () => {
    if (!sales.length) return;
    const headers = [
      'Order ID',
      'Transaction ID',
      'Student Name',
      'Student Email',
      'Course',
      'Instructor',
      'Base Price',
      'Discount',
      'Taxable Value',
      'GST (18%)',
      'Gateway Fee',
      'Total Paid',
      'Payment Method',
      'Date',
      'Status'
    ];
    const rows = sales.map((s) => [
      s.orderNumber,
      s.transactionId,
      `"${s.studentName}"`,
      s.studentEmail,
      `"${s.courseTitle}"`,
      `"${s.instructorName}"`,
      s.coursePrice,
      s.discount,
      s.taxableValue,
      s.gst,
      s.gatewayFee,
      s.totalPaid,
      s.paymentMethod,
      s.purchaseDate,
      s.paymentStatus
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MorenaTeach_Completed_Sales_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <FinancePageHeader
        title="Courses Sold &amp; Verified Sales"
        subtitle="Immutable registry of verified student course purchases, payment gateway references, itemized GST additions, and payment methods."
        badge={`${totalCount} VERIFIED SALES`}
        dateFilter={{
          range,
          onChange: (newRange) => {
            setRange(newRange);
            setPage(1);
          }
        }}
        onRefresh={fetchSales}
        onExport={handleExportCSV}
      />

      {/* Filter / Search Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by order ID, student, email, or course..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary font-medium"
          />
        </div>
        <span className="text-xs font-mono font-bold text-outline">
          Page {page} of {totalPages} ({totalCount} total orders)
        </span>
      </div>

      {/* Sales Table */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-on-surface-variant font-medium">
            Fetching verified sales orders...
          </div>
        ) : !sales.length ? (
          <div className="p-12 text-center text-xs text-on-surface-variant">
            No sales orders found for this criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/50 border-b border-outline-variant/60 text-[10px] font-mono uppercase tracking-wider text-outline">
                <tr>
                  <th className="py-3.5 px-4 font-extrabold">Order / Txn ID</th>
                  <th className="py-3.5 px-3 font-extrabold">Student</th>
                  <th className="py-3.5 px-3 font-extrabold">Course / Instructor</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Taxable</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">GST (18%)</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Gateway (2%)</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Total Paid</th>
                  <th className="py-3.5 px-3 font-extrabold text-center">Method</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Date</th>
                  <th className="py-3.5 px-4 font-extrabold text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-medium">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono">
                      <p className="font-extrabold text-on-surface">{s.orderNumber}</p>
                      <p className="text-[10px] text-outline truncate max-w-[120px]">{s.transactionId}</p>
                    </td>

                    <td className="py-3.5 px-3">
                      <p className="font-extrabold text-on-surface">{s.studentName}</p>
                      <p className="text-[11px] text-outline truncate">{s.studentEmail}</p>
                    </td>

                    <td className="py-3.5 px-3 max-w-xs">
                      <p className="font-bold text-on-surface truncate">{s.courseTitle}</p>
                      <p className="text-[11px] text-primary truncate font-medium">{s.instructorName}</p>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-medium text-on-surface-variant">
                      {formatINR(s.taxableValue)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-outline">
                      {formatINR(s.gst)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-outline">
                      {formatINR(s.gatewayFee)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-600">
                      {formatINR(s.totalPaid)}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-surface-container text-on-surface border border-outline-variant">
                        {s.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-[11px] text-outline">
                      {new Date(s.purchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSale(s);
                          setIsReceiptOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                        title="View Official Fiscal Invoice"
                      >
                        <Icon name="receipt" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-outline-variant/60 flex items-center justify-between text-xs font-bold">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-xl border border-outline-variant disabled:opacity-40 hover:bg-surface-container"
            >
              Previous
            </button>
            <span className="text-outline font-mono">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-xl border border-outline-variant disabled:opacity-40 hover:bg-surface-container"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Fiscal Receipt / Tax Invoice Modal */}
      {selectedSale && (
        <Modal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          title={`Fiscal Tax Invoice — ${selectedSale.orderNumber}`}
          size="md"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="border border-outline-variant/80 rounded-2xl p-4 bg-surface-container-low space-y-3">
              <div className="flex justify-between items-start border-b border-outline-variant/60 pb-3">
                <div>
                  <h3 className="font-black text-sm text-on-surface">MORENA TEACH LMS</h3>
                  <p className="text-[10px] text-outline">Tax Invoice &amp; Payment Certificate</p>
                </div>
                <div className="text-right font-mono">
                  <p className="font-bold text-on-surface">{selectedSale.orderNumber}</p>
                  <p className="text-[10px] text-outline">
                    {new Date(selectedSale.purchaseDate).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-outline uppercase block">Billed To:</span>
                  <span className="font-bold text-on-surface">{selectedSale.studentName}</span>
                  <span className="text-outline block text-[11px]">{selectedSale.studentEmail}</span>
                  <span className="text-outline block text-[11px]">{selectedSale.studentPhone}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-outline uppercase block">Faculty Partner:</span>
                  <span className="font-bold text-on-surface">{selectedSale.instructorName}</span>
                  <span className="text-outline block text-[11px]">Gateway: {selectedSale.paymentMethod}</span>
                  <span className="font-mono text-outline block text-[10px]">Ref: {selectedSale.transactionId}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-outline-variant/60 overflow-hidden font-mono text-xs">
              <div className="bg-surface-container-low p-2.5 flex justify-between font-bold text-on-surface">
                <span>Description</span>
                <span>Amount (INR)</span>
              </div>
              <div className="p-3 space-y-1.5 divide-y divide-outline-variant/40">
                <div className="flex justify-between pt-1">
                  <span className="text-on-surface font-sans">{selectedSale.courseTitle} (Taxable Base)</span>
                  <span>{formatINR(selectedSale.taxableValue)}</span>
                </div>
                <div className="flex justify-between pt-1 text-on-surface-variant">
                  <span className="font-sans">IGST / CGST + SGST (18%)</span>
                  <span>+{formatINR(selectedSale.gst)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between pt-1 text-emerald-600">
                    <span className="font-sans">Promotional Discount</span>
                    <span>-{formatINR(selectedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 text-sm font-black text-on-surface">
                  <span className="font-sans">Total Paid by Student</span>
                  <span className="text-emerald-600">{formatINR(selectedSale.totalPaid)}</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/60 flex items-center justify-between text-[11px]">
              <span className="text-outline">Payment Status:</span>
              <span className="px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                VERIFIED &amp; COMPLETED
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

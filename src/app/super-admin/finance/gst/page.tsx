'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { FinancePageHeader } from '@/components/finance/FinancePageHeader';
import { FinanceMetricCard } from '@/components/finance/FinanceMetricCard';
import { formatINR } from '@/lib/finance-service';

export default function GstManagementFinancePage() {
  const [range, setRange] = useState('all');
  const [gstData, setGstData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGst = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/super-admin/finance/gst?range=${range}`);
      if (res.ok) {
        const json = await res.json();
        setGstData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGst();
  }, [range]);

  const summary = gstData?.summary || {
    totalTaxableValue: 0,
    totalGstCollected: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    gstRefundAdjustment: 0,
    netGstLiability: 0,
    gatewayFeeGst: 0
  };

  const handleExportCSV = () => {
    if (!gstData?.transactions?.length) return;
    const headers = [
      'Invoice / Order ID',
      'Date',
      'Student Name',
      'Course Title',
      'Taxable Value',
      'CGST (9%)',
      'SGST (9%)',
      'Total GST (18%)',
      'Gross Total',
      'Gateway Fee GST'
    ];
    const rows = gstData.transactions.map((t: any) => [
      t.invoiceNumber,
      t.date,
      `"${t.studentName}"`,
      `"${t.courseTitle}"`,
      t.taxableValue,
      t.cgst,
      t.sgst,
      t.totalGst,
      t.grossTotal,
      t.gatewayFeeGst
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MorenaTeach_GST_Filing_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <FinancePageHeader
        title="GST Management &amp; Tax Filings (GSTR-1 &amp; GSTR-3B)"
        subtitle="Track 18% Goods &amp; Services Tax compliance across course sales, CGST/SGST/IGST bifurcations, refund credit notes, and separate gateway input tax."
        badge="GST COMPLIANCE"
        dateFilter={{
          range,
          onChange: (newRange) => setRange(newRange)
        }}
        onRefresh={fetchGst}
        onExport={handleExportCSV}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinanceMetricCard
          label="Total Output GST Collected"
          value={summary.totalGstCollected}
          subtext="18% output tax collected on course GMV"
          icon="percent"
          color="indigo"
          badge="Gross Tax"
          badgeType="neutral"
        />

        <FinanceMetricCard
          label="GST Reversal / Credit Notes"
          value={summary.gstRefundAdjustment}
          subtext="Tax reversed on customer refunds"
          icon="replay"
          color="rose"
          badge="Reversed"
          badgeType="negative"
        />

        <FinanceMetricCard
          label="Net GST Payable (Govt Liability)"
          value={summary.netGstLiability}
          subtext="Net liability due for monthly GSTR-3B"
          icon="account_balance"
          color="primary"
          badge="Net Payable"
          badgeType="primary"
        />

        <FinanceMetricCard
          label="Gateway Fee GST (ITC Eligible)"
          value={summary.gatewayFeeGst}
          subtext="18% GST charged on gateway fee (Input Credit)"
          icon="credit_card"
          color="cyan"
          badge="Input Tax"
          badgeType="positive"
        />
      </div>

      {/* Bifurcation & Monthly Reports Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bifurcation */}
        <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs space-y-4">
          <h3 className="text-base font-black text-on-surface tracking-tight">
            Tax Component Bifurcation
          </h3>
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/60 flex justify-between items-center">
              <div>
                <span className="font-bold text-on-surface">CGST (Central Tax 9%)</span>
                <span className="text-[10px] text-outline block font-sans">Intra-State LMS Supply</span>
              </div>
              <span className="text-base font-black text-indigo-600">{formatINR(summary.cgst)}</span>
            </div>

            <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/60 flex justify-between items-center">
              <div>
                <span className="font-bold text-on-surface">SGST (State Tax 9%)</span>
                <span className="text-[10px] text-outline block font-sans">State Jurisdictional Levy</span>
              </div>
              <span className="text-base font-black text-indigo-600">{formatINR(summary.sgst)}</span>
            </div>

            <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/60 flex justify-between items-center">
              <div>
                <span className="font-bold text-on-surface">IGST (Integrated Tax 18%)</span>
                <span className="text-[10px] text-outline block font-sans">Inter-State Student Orders</span>
              </div>
              <span className="text-base font-black text-primary">{formatINR(summary.igst)}</span>
            </div>
          </div>
        </div>

        {/* Monthly Reports Table */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs space-y-3">
          <h3 className="text-base font-black text-on-surface tracking-tight">
            Monthly Filing Summaries (GSTR-3B History)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/50 border-b border-outline-variant/60 text-[10px] font-mono uppercase tracking-wider text-outline">
                <tr>
                  <th className="py-2.5 px-3 font-extrabold">Tax Period</th>
                  <th className="py-2.5 px-3 font-extrabold text-right">Taxable Turnover</th>
                  <th className="py-2.5 px-3 font-extrabold text-right">Output GST (18%)</th>
                  <th className="py-2.5 px-3 font-extrabold text-center">Filing Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-medium">
                {gstData?.monthlyReports?.length ? (
                  gstData.monthlyReports.map((m: any) => (
                    <tr key={m.month} className="hover:bg-surface-container-low/40">
                      <td className="py-2.5 px-3 font-bold text-on-surface">{m.month}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-on-surface-variant">{formatINR(m.taxable)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-600">{formatINR(m.gst)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          COMPLIANT
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-outline">
                      No monthly filings recorded for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Transaction-Wise GST Register */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-outline-variant/60 flex items-center justify-between">
          <h3 className="text-base font-black text-on-surface tracking-tight">
            Transaction-Level GST Audit Register
          </h3>
          <span className="text-xs font-mono font-bold text-outline">
            {gstData?.transactions?.length || 0} Transactions
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-on-surface-variant font-medium">
            Fetching GST tax ledger...
          </div>
        ) : !gstData?.transactions?.length ? (
          <div className="p-12 text-center text-xs text-on-surface-variant">
            No transactions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/50 border-b border-outline-variant/60 text-[10px] font-mono uppercase tracking-wider text-outline">
                <tr>
                  <th className="py-3.5 px-4 font-extrabold">Invoice Number</th>
                  <th className="py-3.5 px-3 font-extrabold">Student Name</th>
                  <th className="py-3.5 px-3 font-extrabold">Course Title</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Taxable Value</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">CGST (9%)</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">SGST (9%)</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Total GST</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Gross Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-medium">
                {gstData.transactions.map((t: any) => (
                  <tr key={t.orderId} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-on-surface">{t.invoiceNumber}</td>
                    <td className="py-3.5 px-3 text-on-surface">{t.studentName}</td>
                    <td className="py-3.5 px-3 text-on-surface-variant truncate max-w-xs">{t.courseTitle}</td>
                    <td className="py-3.5 px-3 text-right font-mono text-on-surface-variant">{formatINR(t.taxableValue)}</td>
                    <td className="py-3.5 px-3 text-right font-mono text-outline">{formatINR(t.cgst)}</td>
                    <td className="py-3.5 px-3 text-right font-mono text-outline">{formatINR(t.sgst)}</td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-indigo-600">{formatINR(t.totalGst)}</td>
                    <td className="py-3.5 px-3 text-right font-mono font-black text-on-surface">{formatINR(t.grossTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

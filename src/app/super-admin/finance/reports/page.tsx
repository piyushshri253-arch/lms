'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { FinancePageHeader } from '@/components/finance/FinancePageHeader';
import { FinanceMetricCard } from '@/components/finance/FinanceMetricCard';
import { formatINR } from '@/lib/finance-service';

export default function FinancialReportsPage() {
  const [range, setRange] = useState('all');
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/super-admin/finance/reports?range=${range}`);
      if (res.ok) {
        const json = await res.json();
        setReport(json.report);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [range]);

  const pnl = report || {
    grossCourseRevenue: 0,
    lessRefunds: 0,
    netCourseSales: 0,
    lessGstLiability: 0,
    netTaxableRevenue: 0,
    operatingExpenses: {
      paymentGatewayFees: 0,
      instructorShareAccrued: 0,
      instructorPayoutsDisbursed: 0
    },
    taxCompliance: {
      tdsDeducted: 0,
      gstLiability: 0
    },
    netPlatformOperatingSurplus: 0,
    netMarginPercent: 0
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const rows = [
      ['Metric', 'Amount (INR)'],
      ['Gross Course Sales (GMV)', pnl.grossCourseRevenue],
      ['Less: Customer Refunds Settled', -pnl.lessRefunds],
      ['Net Course Sales', pnl.netCourseSales],
      ['Less: Output GST Collected (18%)', -pnl.lessGstLiability],
      ['Net Taxable Revenue Pool', pnl.netTaxableRevenue],
      ['Less: Payment Gateway Charges (2%)', -pnl.operatingExpenses.paymentGatewayFees],
      ['Less: Instructor Commission Share (60%)', -pnl.operatingExpenses.instructorShareAccrued],
      ['TDS Withheld u/s 194J (2%)', pnl.taxCompliance.tdsDeducted],
      ['Net Platform Operating Surplus', pnl.netPlatformOperatingSurplus],
      ['Operating Profit Margin (%)', `${pnl.netMarginPercent}%`]
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((r) => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MorenaTeach_PnL_Financial_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <FinancePageHeader
        title="Comprehensive Financial Statements &amp; P&amp;L Reports"
        subtitle="Audited Profit &amp; Loss statements, operational margins, tax provisioning, and statutory compliance summaries."
        badge="EXECUTIVE P&amp;L"
        dateFilter={{
          range,
          onChange: (newRange) => setRange(newRange)
        }}
        onRefresh={fetchReports}
        onExport={handleExportCSV}
        actions={
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant hover:bg-surface-container text-xs font-bold text-on-surface transition-colors cursor-pointer"
          >
            <Icon name="print" size={16} />
            <span>Print Report</span>
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinanceMetricCard
          label="Gross Revenue (GMV)"
          value={pnl.grossCourseRevenue}
          subtext="Total student payments captured"
          icon="trending_up"
          color="emerald"
          badge="Top-line"
          badgeType="positive"
        />

        <FinanceMetricCard
          label="Net Platform Operating Surplus"
          value={pnl.netPlatformOperatingSurplus}
          subtext="Net operating surplus retained"
          icon="monetization_on"
          color="primary"
          badge="Platform EBITDA"
          badgeType="primary"
        />

        <FinanceMetricCard
          label="Net Operating Margin"
          value={`${pnl.netMarginPercent}%`}
          isCurrency={false}
          subtext="Operating profit as % of GMV"
          icon="pie_chart"
          color="indigo"
          badge="Margin"
          badgeType="positive"
        />

        <FinanceMetricCard
          label="Faculty Share Accrued"
          value={pnl.operatingExpenses.instructorShareAccrued}
          subtext="60% revenue share accrued to teachers"
          icon="groups"
          color="cyan"
          badge="Faculty Expense"
          badgeType="neutral"
        />
      </div>

      {/* Formal P&L Statement */}
      <div className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/80 shadow-xs space-y-6">
        <div className="border-b border-outline-variant/60 pb-4 flex flex-col sm:flex-row justify-between items-start gap-2">
          <div>
            <h3 className="text-xl font-black text-on-surface tracking-tight">
              STATEMENT OF PROFIT &amp; LOSS
            </h3>
            <p className="text-xs text-on-surface-variant font-mono">
              Entity: Morena Teach LMS (Registered Education Platform) &bull; Period: {range.toUpperCase()}
            </p>
          </div>
          <div className="text-right text-[11px] font-mono text-outline">
            Currency: INR (₹) &bull; Accrual Accounting
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-on-surface-variant font-medium">
            Generating financial statements...
          </div>
        ) : (
          <div className="space-y-6 text-xs font-mono">
            {/* 1. Operating Revenue */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-sm text-on-surface uppercase font-sans tracking-wide">
                1. Gross Operating Revenue
              </h4>
              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/60 space-y-2">
                <div className="flex justify-between">
                  <span className="font-sans text-on-surface">Gross Course Sales (Student Paid GMV):</span>
                  <span className="font-black text-on-surface">{formatINR(pnl.grossCourseRevenue)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span className="font-sans">Less: Returns &amp; Customer Refunds:</span>
                  <span>-{formatINR(pnl.lessRefunds)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-outline-variant/40 font-black text-emerald-600">
                  <span className="font-sans">NET COURSE SALES (A):</span>
                  <span>{formatINR(pnl.netCourseSales)}</span>
                </div>
              </div>
            </div>

            {/* 2. Direct Statutory Liabilities */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-sm text-on-surface uppercase font-sans tracking-wide">
                2. Statutory Tax Provisions
              </h4>
              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/60 space-y-2">
                <div className="flex justify-between text-indigo-600">
                  <span className="font-sans">Output GST Collected (18% on course sales):</span>
                  <span>-{formatINR(pnl.lessGstLiability)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-outline-variant/40 font-bold text-on-surface">
                  <span className="font-sans">NET TAXABLE CORE POOL (B = A - GST):</span>
                  <span>{formatINR(pnl.netTaxableRevenue)}</span>
                </div>
              </div>
            </div>

            {/* 3. Direct Platform Costs & Faculty Splits */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-sm text-on-surface uppercase font-sans tracking-wide">
                3. Cost of Digital Delivery &amp; Faculty Commissions
              </h4>
              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/60 space-y-2">
                <div className="flex justify-between text-rose-600">
                  <span className="font-sans">Payment Gateway Charges (2% MDR + 18% GST):</span>
                  <span>-{formatINR(pnl.operatingExpenses.paymentGatewayFees)}</span>
                </div>
                <div className="flex justify-between text-cyan-700">
                  <span className="font-sans">Instructor Commission Accrual (60% of Net Pool):</span>
                  <span>-{formatINR(pnl.operatingExpenses.instructorShareAccrued)}</span>
                </div>
                <div className="flex justify-between text-outline text-[11px] pl-4">
                  <span className="font-sans">Of which TDS Withheld (2% u/s 194J):</span>
                  <span>{formatINR(pnl.taxCompliance.tdsDeducted)}</span>
                </div>
                <div className="flex justify-between text-outline text-[11px] pl-4">
                  <span className="font-sans">Of which Cumulative Payouts Disbursed:</span>
                  <span>{formatINR(pnl.operatingExpenses.instructorPayoutsDisbursed)}</span>
                </div>
              </div>
            </div>

            {/* 4. Net Operating Result */}
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div>
                <h4 className="text-base font-black text-primary font-sans">
                  NET PLATFORM OPERATING SURPLUS
                </h4>
                <p className="text-[11px] text-on-surface-variant font-sans">
                  Retained net platform margin before administrative corporate overhead
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-primary block">
                  {formatINR(pnl.netPlatformOperatingSurplus)}
                </span>
                <span className="text-xs font-bold text-emerald-700">
                  Operating Margin: {pnl.netMarginPercent}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

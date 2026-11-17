'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { FinancePageHeader } from '@/components/finance/FinancePageHeader';
import { FinanceMetricCard } from '@/components/finance/FinanceMetricCard';
import { formatINR } from '@/lib/finance-service';

export default function FinancialOverviewPage() {
  const [range, setRange] = useState('all');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOverview = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/super-admin/finance/overview?range=${range}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [range]);

  const kpi = data?.kpi || {
    totalGrossSales: 0,
    successfulPaymentsCount: 0,
    totalRefunds: 0,
    refundsCount: 0,
    netSales: 0,
    instructorGrossEarnings: 0,
    instructorPaymentsMade: 0,
    pendingInstructorPayments: 0,
    totalTdsDeducted: 0,
    totalGstCollected: 0,
    totalGatewayFees: 0,
    netPlatformRevenue: 0,
    failedTransactionsCount: 0
  };

  const quickLinks = [
    { label: 'Instructor Payouts', href: '/super-admin/finance/payouts', count: 'Action Needed', icon: 'payments', color: 'emerald' },
    { label: 'Courses Sold', href: '/super-admin/finance/sales', count: `${kpi.successfulPaymentsCount} Sales`, icon: 'shopping_bag', color: 'primary' },
    { label: 'TDS Ledger', href: '/super-admin/finance/tds', count: formatINR(kpi.totalTdsDeducted), icon: 'receipt', color: 'amber' },
    { label: 'GST Management', href: '/super-admin/finance/gst', count: formatINR(kpi.totalGstCollected), icon: 'percent', color: 'indigo' },
    { label: 'Refunds Center', href: '/super-admin/finance/refunds', count: `${kpi.refundsCount} Cases`, icon: 'replay', color: 'rose' },
    { label: 'Gateway Fees', href: '/super-admin/finance/gateway-fees', count: formatINR(kpi.totalGatewayFees), icon: 'credit_card', color: 'cyan' },
    { label: 'Bank Approvals', href: '/super-admin/finance/bank-details', count: 'Verification', icon: 'account_balance', color: 'violet' },
    { label: 'Full Ledger', href: '/super-admin/finance/transactions', count: 'Audit Log', icon: 'receipt_long', color: 'primary' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <FinancePageHeader
        title="Financial Overview"
        subtitle="Real-time fiscal KPIs, course sales gross volume, tax compliance, instructor disbursements, and net platform earnings."
        badge="SUPER ADMIN AUDIT"
        dateFilter={{
          range,
          onChange: (newRange) => setRange(newRange)
        }}
        onRefresh={fetchOverview}
      />

      {/* Main KPI Grid - 12 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinanceMetricCard
          label="Total Gross Course Sales"
          value={kpi.totalGrossSales}
          subtext={`${kpi.successfulPaymentsCount} verified orders`}
          icon="trending_up"
          color="emerald"
          badge="Gross GMV"
          badgeType="positive"
        />

        <FinanceMetricCard
          label="Net Sales (Post-Refunds)"
          value={kpi.netSales}
          subtext={`After ₹${kpi.totalRefunds} refunds deducted`}
          icon="account_balance_wallet"
          color="primary"
          badge="Net Revenue"
          badgeType="primary"
        />

        <FinanceMetricCard
          label="Net Platform Revenue (40%)"
          value={kpi.netPlatformRevenue}
          subtext="Net platform operational pool share"
          icon="monetization_on"
          color="indigo"
          badge="Platform Share"
          badgeType="positive"
        />

        <FinanceMetricCard
          label="Instructor Gross Earnings"
          value={kpi.instructorGrossEarnings}
          subtext="60% faculty pool allocation"
          icon="groups"
          color="cyan"
          badge="Faculty Gross"
          badgeType="neutral"
        />

        <FinanceMetricCard
          label="Total Refunds Settled"
          value={kpi.totalRefunds}
          subtext={`${kpi.refundsCount} refund cases processed`}
          icon="currency_exchange"
          color="rose"
          badge="Reversed"
          badgeType="negative"
        />

        <FinanceMetricCard
          label="Instructor Payments Disbursed"
          value={kpi.instructorPaymentsMade}
          subtext="Disbursed to bank / UPI"
          icon="paid"
          color="emerald"
          badge="Paid Out"
          badgeType="positive"
        />

        <FinanceMetricCard
          label="Pending Instructor Payable"
          value={kpi.pendingInstructorPayments}
          subtext="Accrued pending payout release"
          icon="pending_actions"
          color="amber"
          badge="Payable"
          badgeType="neutral"
        />

        <FinanceMetricCard
          label="Total TDS Deducted (2%)"
          value={kpi.totalTdsDeducted}
          subtext="Section 194J income tax"
          icon="receipt"
          color="amber"
          badge="Govt TDS"
          badgeType="neutral"
        />

        <FinanceMetricCard
          label="Total GST Collected (18%)"
          value={kpi.totalGstCollected}
          subtext="Output tax on student purchases"
          icon="percent"
          color="indigo"
          badge="Output GST"
          badgeType="neutral"
        />

        <FinanceMetricCard
          label="Payment Gateway Fees"
          value={kpi.totalGatewayFees}
          subtext="2% Gateway processing fees"
          icon="credit_card"
          color="violet"
          badge="Gateway Cost"
          badgeType="neutral"
        />

        <FinanceMetricCard
          label="Successful Orders"
          value={kpi.successfulPaymentsCount}
          isCurrency={false}
          subtext="100% verified completed transactions"
          icon="check_circle"
          color="emerald"
          badge="Completed"
          badgeType="positive"
        />

        <FinanceMetricCard
          label="Failed Payment Attempts"
          value={kpi.failedTransactionsCount}
          isCurrency={false}
          subtext="Drop-offs and bank authorization declines"
          icon="warning"
          color="rose"
          badge="Attention"
          badgeType="negative"
        />
      </div>

      {/* Quick Navigation Hub */}
      <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-on-surface tracking-tight">
              Accounts &amp; Finance Core Submodules
            </h3>
            <p className="text-xs text-on-surface-variant">
              Jump directly to granular ledgers, tax filings, payouts, and reports
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold text-outline uppercase tracking-wider">
            14 Dedicated Modules
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="p-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/60 flex flex-col justify-between group transition-all"
            >
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Icon name={item.icon} size={18} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-on-surface tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                  {item.label}
                </p>
                <p className="text-[10px] font-mono text-outline font-semibold truncate mt-0.5">
                  {item.count}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Ledger Audit Stream */}
      <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-on-surface tracking-tight">
              Live Immutable Financial Ledger
            </h3>
            <p className="text-xs text-on-surface-variant">
              Recent real-time double-entry credits, debits, GST additions, and payout releases
            </p>
          </div>
          <Link
            href="/super-admin/finance/transactions"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>View Full Ledger</span>
            <Icon name="arrow_forward" size={14} />
          </Link>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-on-surface-variant text-xs">
            Loading real-time financial ledger...
          </div>
        ) : !data?.recentActivity?.length ? (
          <div className="p-8 text-center text-on-surface-variant text-xs">
            No recent ledger transactions in this timeframe.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-outline-variant/60 text-[10px] font-mono uppercase tracking-wider text-outline">
                  <th className="pb-3 font-extrabold">Entry No</th>
                  <th className="pb-3 font-extrabold">Type</th>
                  <th className="pb-3 font-extrabold">Description</th>
                  <th className="pb-3 font-extrabold">Method</th>
                  <th className="pb-3 font-extrabold text-right">Debit</th>
                  <th className="pb-3 font-extrabold text-right">Credit</th>
                  <th className="pb-3 font-extrabold text-right">Balance</th>
                  <th className="pb-3 font-extrabold text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-medium">
                {data.recentActivity.map((e: any) => (
                  <tr key={e.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-3 font-mono font-bold text-on-surface">{e.entryNumber}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                        {e.type}
                      </span>
                    </td>
                    <td className="py-3 text-on-surface-variant max-w-md truncate">{e.description}</td>
                    <td className="py-3 font-mono text-[11px] text-outline">{e.paymentMethod}</td>
                    <td className="py-3 text-right font-mono font-bold text-rose-600">
                      {e.debit > 0 ? `-${formatINR(e.debit)}` : '—'}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-emerald-600">
                      {e.credit > 0 ? `+${formatINR(e.credit)}` : '—'}
                    </td>
                    <td className="py-3 text-right font-mono font-black text-on-surface">
                      {formatINR(e.balance)}
                    </td>
                    <td className="py-3 text-right text-[11px] text-outline font-mono">
                      {new Date(e.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
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

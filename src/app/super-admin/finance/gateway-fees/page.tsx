'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { FinancePageHeader } from '@/components/finance/FinancePageHeader';
import { FinanceMetricCard } from '@/components/finance/FinanceMetricCard';
import { formatINR } from '@/lib/finance-service';

export default function GatewayFeesFinancePage() {
  const [gatewayData, setGatewayData] = useState<any>(null);
  const [gatewayFilter, setGatewayFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchGatewayFees = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/super-admin/finance/gateway-fees');
      if (res.ok) {
        const json = await res.json();
        setGatewayData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGatewayFees();
  }, []);

  const summary = gatewayData?.summary || {
    totalGrossSettled: 0,
    totalGatewayFee: 0,
    totalGstOnFee: 0,
    totalNetSettlement: 0,
    averageFeeRate: '2.00%'
  };

  const filteredTransactions = (gatewayData?.transactions || []).filter((t: any) => {
    if (gatewayFilter !== 'ALL' && t.gatewayName !== gatewayFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.transactionId?.toLowerCase().includes(q) ||
        t.studentName?.toLowerCase().includes(q) ||
        t.courseTitle?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <FinancePageHeader
        title="Payment Gateway Fees &amp; Settlement Reconciliation"
        subtitle="Audit transaction fee deductions (standard 2% + 18% GST), monitor daily settlement tranches (T+2), and reconcile bank deposits."
        badge="SETTLEMENT AUDIT"
        onRefresh={fetchGatewayFees}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinanceMetricCard
          label="Total Gross Payment Volume"
          value={summary.totalGrossSettled}
          subtext="Processed across Razorpay &amp; Card gateways"
          icon="account_balance_wallet"
          color="emerald"
          badge="Processed"
          badgeType="positive"
        />

        <FinanceMetricCard
          label="Total Gateway Fee (2%)"
          value={summary.totalGatewayFee}
          subtext="Standard 2% merchant discount rate"
          icon="credit_card"
          color="violet"
          badge="Gateway Cost"
          badgeType="neutral"
        />

        <FinanceMetricCard
          label="GST on Gateway Fee (18%)"
          value={summary.totalGstOnFee}
          subtext="18% tax on gateway charges (ITC input)"
          icon="receipt"
          color="indigo"
          badge="Input GST"
          badgeType="neutral"
        />

        <FinanceMetricCard
          label="Net Settled to LMS Bank"
          value={summary.totalNetSettlement}
          subtext="Final settlement credit into bank account"
          icon="check_circle"
          color="primary"
          badge="Net Settled"
          badgeType="primary"
        />
      </div>

      {/* Gateway Volume Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {gatewayData?.gatewayBreakdown?.map((gw: any) => (
          <div
            key={gw.gateway}
            className="p-5 rounded-3xl bg-surface-container-lowest border border-outline-variant/80 shadow-xs flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-outline">
                {gw.gateway} GATEWAY
              </span>
              <h4 className="text-xl font-black text-on-surface tracking-tight">
                {formatINR(gw.volume)}
              </h4>
              <p className="text-[11px] text-on-surface-variant">
                {gw.count} orders &bull; Fees: {formatINR(gw.fees)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Icon name="credit_card" size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          <div className="relative flex-1">
            <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by transaction ID, student, or course..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <select
            value={gatewayFilter}
            onChange={(e) => setGatewayFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-bold focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Gateways</option>
            <option value="RAZORPAY">Razorpay</option>
            <option value="CARD">Trial Sandbox / Card</option>
            <option value="STRIPE">Stripe</option>
          </select>
        </div>

        <span className="text-xs font-mono font-bold text-outline shrink-0">
          Showing {filteredTransactions.length} settlements
        </span>
      </div>

      {/* Settlement Transactions Table */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-on-surface-variant font-medium">
            Fetching settlement records...
          </div>
        ) : !filteredTransactions.length ? (
          <div className="p-12 text-center text-xs text-on-surface-variant">
            No settlement records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/50 border-b border-outline-variant/60 text-[10px] font-mono uppercase tracking-wider text-outline">
                <tr>
                  <th className="py-3.5 px-4 font-extrabold">Transaction ID</th>
                  <th className="py-3.5 px-3 font-extrabold">Gateway</th>
                  <th className="py-3.5 px-3 font-extrabold">Student / Course</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Gross Paid</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Fee (2%)</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">GST on Fee (18%)</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Net Settlement</th>
                  <th className="py-3.5 px-3 font-extrabold text-center">Settlement Status</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Settlement Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-medium">
                {filteredTransactions.map((t: any) => (
                  <tr key={t.transactionId} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-on-surface">
                      {t.transactionId}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold bg-surface-container text-on-surface border border-outline-variant">
                        {t.gatewayName}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 max-w-xs">
                      <p className="font-bold text-on-surface truncate">{t.studentName}</p>
                      <p className="text-[11px] text-outline truncate">{t.courseTitle}</p>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-on-surface">
                      {formatINR(t.grossAmount)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-rose-600">
                      -{formatINR(t.gatewayFee)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-outline">
                      -{formatINR(t.gstOnFee)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-600">
                      {formatINR(t.netSettlement)}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        {t.settlementStatus}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-[11px] text-outline">
                      {new Date(t.settlementDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
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

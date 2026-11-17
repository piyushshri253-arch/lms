'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { FinancePageHeader } from '@/components/finance/FinancePageHeader';
import { formatINR } from '@/lib/finance-service';

export default function TransactionHistoryFinancePage() {
  const { showToast } = useApp();
  const [entries, setEntries] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Manual Adjustment Modal
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [adjType, setAdjType] = useState('ADJUSTMENT');
  const [adjAmount, setAdjAmount] = useState('');
  const [isCredit, setIsCredit] = useState(true);
  const [adjDescription, setAdjDescription] = useState('');
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/super-admin/finance/transactions?type=${typeFilter}&search=${encodeURIComponent(search)}&page=${page}&limit=25`
      );
      if (res.ok) {
        const json = await res.json();
        setEntries(json.entries || []);
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
    fetchTransactions();
  }, [typeFilter, search, page]);

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjAmount || !adjDescription) return;
    setIsSubmittingAdj(true);
    try {
      const res = await fetch('/api/super-admin/finance/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: adjType,
          amount: parseFloat(adjAmount),
          isCredit,
          description: adjDescription
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post adjustment');
      showToast({ title: 'Adjustment Recorded', description: 'Financial ledger updated with audit entry.', type: 'success' });
      setIsAdjModalOpen(false);
      setAdjAmount('');
      setAdjDescription('');
      fetchTransactions();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  const handleExportCSV = () => {
    if (!entries.length) return;
    const headers = [
      'Entry No',
      'Type',
      'Reference ID',
      'Description',
      'Debit',
      'Credit',
      'Running Balance',
      'Method',
      'Date',
      'Status'
    ];
    const rows = entries.map((e) => [
      e.entryNumber,
      e.type,
      e.referenceId || '',
      `"${e.description.replace(/"/g, '""')}"`,
      e.debit,
      e.credit,
      e.balance,
      e.paymentMethod,
      e.createdAt,
      e.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MorenaTeach_Financial_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <FinancePageHeader
        title="Central Immutable Financial Ledger"
        subtitle="Complete double-entry accounting journal of all student payments, faculty payouts, refund reversals, TDS withholding, and platform fees."
        badge={`${totalCount} LEDGER ENTRIES`}
        onRefresh={fetchTransactions}
        onExport={handleExportCSV}
        actions={
          <button
            type="button"
            onClick={() => setIsAdjModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
          >
            <Icon name="add" size={16} />
            <span>Post Adjustment</span>
          </button>
        }
      />

      {/* Filter / Search Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          <div className="relative flex-1">
            <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search ledger by entry number, description, or reference ID..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-bold focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Entry Types</option>
            <option value="COURSE_SALE">Course Sales</option>
            <option value="INSTRUCTOR_PAYOUT">Instructor Payouts</option>
            <option value="REFUND">Refunds</option>
            <option value="TDS_DEDUCTION">TDS Deductions</option>
            <option value="GST_ENTRY">GST Output Tax</option>
            <option value="GATEWAY_CHARGE">Gateway Fees</option>
            <option value="ADJUSTMENT">Manual Adjustments</option>
          </select>
        </div>

        <span className="text-xs font-mono font-bold text-outline shrink-0">
          Page {page} of {totalPages} ({totalCount} entries)
        </span>
      </div>

      {/* Ledger Table */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-on-surface-variant font-medium">
            Loading immutable ledger...
          </div>
        ) : !entries.length ? (
          <div className="p-12 text-center text-xs text-on-surface-variant">
            No ledger entries found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/50 border-b border-outline-variant/60 text-[10px] font-mono uppercase tracking-wider text-outline">
                <tr>
                  <th className="py-3.5 px-4 font-extrabold">Entry Number</th>
                  <th className="py-3.5 px-3 font-extrabold">Type</th>
                  <th className="py-3.5 px-3 font-extrabold">Transaction Description</th>
                  <th className="py-3.5 px-3 font-extrabold">Payment Method</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Debit (Dr)</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Credit (Cr)</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Running Balance</th>
                  <th className="py-3.5 px-4 font-extrabold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-medium">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-on-surface">
                      {e.entryNumber}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                        {e.type}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-on-surface max-w-md">
                      <p className="line-clamp-2">{e.description}</p>
                      {e.referenceId && (
                        <p className="text-[10px] font-mono text-outline mt-0.5 truncate">Ref: {e.referenceId}</p>
                      )}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-outline">
                      {e.paymentMethod}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-600">
                      {e.debit > 0 ? `-${formatINR(e.debit)}` : '—'}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600">
                      {e.credit > 0 ? `+${formatINR(e.credit)}` : '—'}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-black text-on-surface">
                      {formatINR(e.balance)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-[11px] text-outline">
                      {new Date(e.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
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

      {/* Manual Adjustment Modal */}
      <Modal
        isOpen={isAdjModalOpen}
        onClose={() => setIsAdjModalOpen(false)}
        title="Post Documented Ledger Adjustment"
        size="md"
      >
        <form onSubmit={handleCreateAdjustment} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Entry Type
              </label>
              <select
                value={adjType}
                onChange={(e) => setAdjType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-bold focus:outline-none focus:border-primary"
              >
                <option value="ADJUSTMENT">General Adjustment</option>
                <option value="GATEWAY_CHARGE">Gateway Charge</option>
                <option value="GST_ENTRY">GST Adjustment</option>
                <option value="TDS_DEDUCTION">TDS Adjustment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Direction
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsCredit(true)}
                  className={`py-2 rounded-xl font-bold transition-all ${
                    isCredit
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-surface-container text-on-surface border border-outline-variant'
                  }`}
                >
                  Credit (+Cr)
                </button>
                <button
                  type="button"
                  onClick={() => setIsCredit(false)}
                  className={`py-2 rounded-xl font-bold transition-all ${
                    !isCredit
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-surface-container text-on-surface border border-outline-variant'
                  }`}
                >
                  Debit (-Dr)
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Adjustment Amount (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              value={adjAmount}
              onChange={(e) => setAdjAmount(e.target.value)}
              required
              placeholder="e.g. 1500"
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-mono font-bold focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Audit Justification &amp; Notes *
            </label>
            <textarea
              rows={3}
              value={adjDescription}
              onChange={(e) => setAdjDescription(e.target.value)}
              required
              placeholder="e.g. Correction of bank reconciliation charge or manual settlement credit"
              className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/60">
            <button
              type="button"
              onClick={() => setIsAdjModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-outline-variant font-bold text-on-surface hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingAdj}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 shadow-xs"
            >
              {isSubmittingAdj ? 'Posting...' : 'Post to Ledger'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

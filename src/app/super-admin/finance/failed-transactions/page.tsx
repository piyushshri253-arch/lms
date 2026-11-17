'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';
import { FinancePageHeader } from '@/components/finance/FinancePageHeader';
import { formatINR } from '@/lib/finance-service';

export default function FailedTransactionsFinancePage() {
  const { showToast } = useApp();
  const [failedList, setFailedList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const fetchFailed = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/super-admin/finance/failed-transactions');
      if (res.ok) {
        const json = await res.json();
        setFailedList(json.failedTransactions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFailed();
  }, []);

  const handleSendRecovery = async (item: any) => {
    setSendingId(item.id);
    try {
      const res = await fetch('/api/super-admin/finance/failed-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_RECOVERY',
          id: item.id,
          email: item.studentEmail,
          studentName: item.studentName,
          courseTitle: item.courseTitle,
          amount: item.amount
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch recovery email');
      showToast({ title: 'Recovery Link Sent', description: `Checkout recovery emailed to ${item.studentEmail}`, type: 'success' });
    } catch (err: any) {
      showToast({ title: 'Dispatch Error', description: err.message, type: 'error' });
    } finally {
      setSendingId(null);
    }
  };

  const filtered = failedList.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.attemptId?.toLowerCase().includes(q) ||
      item.studentName?.toLowerCase().includes(q) ||
      item.studentEmail?.toLowerCase().includes(q) ||
      item.courseTitle?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <FinancePageHeader
        title="Failed Transactions &amp; Payment Drop-offs"
        subtitle="Monitor failed payment gateway authorizations, expired student checkout sessions, and trigger 1-click cart recovery reminders."
        badge={`${failedList.length} ATTEMPTS`}
        onRefresh={fetchFailed}
      />

      {/* Filter / Search Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, email, attempt ID, or course..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary font-medium"
          />
        </div>
        <span className="text-xs font-mono font-bold text-outline">
          {filtered.length} payment drop-offs identified
        </span>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-on-surface-variant font-medium">
            Scanning failed transactions...
          </div>
        ) : !filtered.length ? (
          <div className="p-12 text-center text-xs text-on-surface-variant">
            No failed payment attempts detected. All transactions are healthy.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/50 border-b border-outline-variant/60 text-[10px] font-mono uppercase tracking-wider text-outline">
                <tr>
                  <th className="py-3.5 px-4 font-extrabold">Attempt ID</th>
                  <th className="py-3.5 px-3 font-extrabold">Student</th>
                  <th className="py-3.5 px-3 font-extrabold">Target Course</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Attempted Amount</th>
                  <th className="py-3.5 px-3 font-extrabold">Gateway / Reason</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Timestamp</th>
                  <th className="py-3.5 px-4 font-extrabold text-center">Recovery Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-medium">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-on-surface">
                      {item.attemptId}
                    </td>

                    <td className="py-3.5 px-3">
                      <p className="font-bold text-on-surface">{item.studentName}</p>
                      <p className="text-[11px] text-outline truncate">{item.studentEmail}</p>
                    </td>

                    <td className="py-3.5 px-3 max-w-xs text-on-surface truncate">
                      {item.courseTitle}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-600">
                      {formatINR(item.amount)}
                    </td>

                    <td className="py-3.5 px-3 max-w-xs">
                      <span className="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold bg-surface-container text-on-surface border border-outline-variant inline-block mr-1">
                        {item.gateway}
                      </span>
                      <span className="text-outline text-[11px]">{item.reason}</span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-[11px] text-outline">
                      {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        disabled={sendingId === item.id || !item.studentEmail || item.studentEmail === 'N/A'}
                        onClick={() => handleSendRecovery(item)}
                        className="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-bold text-[11px] hover:bg-primary/90 transition-colors shadow-xs flex items-center gap-1 mx-auto cursor-pointer disabled:opacity-40"
                      >
                        <Icon name="mail" size={13} />
                        <span>{sendingId === item.id ? 'Sending...' : 'Send Recovery'}</span>
                      </button>
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

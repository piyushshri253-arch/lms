'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useAdmin } from '@/context/AdminContext';
import { useApp } from '@/context/AppContext';

function PaymentsPageContent() {
  const searchParams = useSearchParams();
  const { hasPermission, activeFacility } = useAdmin();
  const { showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'transactions' | 'revenue' | 'invoices' | 'refunds'>('transactions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRefund, setSelectedRefund] = useState<any | null>(null);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  // Transactions State
  const [transactions, setTransactions] = useState<any[]>([
    {
      id: 'TXN-9021',
      orderId: 'ORD-8821',
      studentName: 'Priya Patel',
      studentEmail: 'priya@example.com',
      courseTitle: 'Production AI Agents with LangChain & LangGraph',
      amount: 4999,
      gateway: 'Razorpay (UPI)',
      date: '14 Sept 2026, 11:20 AM',
      status: 'SUCCESS'
    },
    {
      id: 'TXN-9020',
      orderId: 'ORD-8820',
      studentName: 'Aarav Sharma',
      studentEmail: 'aarav@example.com',
      courseTitle: 'Full-Stack Next.js 15 & Turbopack Masterclass',
      amount: 4999,
      gateway: 'Razorpay (Cards)',
      date: '14 Sept 2026, 09:45 AM',
      status: 'SUCCESS'
    },
    {
      id: 'TXN-9019',
      orderId: 'ORD-8819',
      studentName: 'Vikram Singh',
      studentEmail: 'vikram@example.com',
      courseTitle: 'Modern Distributed Systems with Go & gRPC',
      amount: 5499,
      gateway: 'Net Banking (HDFC)',
      date: '13 Sept 2026, 04:15 PM',
      status: 'SUCCESS'
    },
    {
      id: 'TXN-9018',
      orderId: 'ORD-8818',
      studentName: 'Rohan Mehta',
      studentEmail: 'rohan@example.com',
      courseTitle: 'Enterprise PostgreSQL Optimization',
      amount: 3499,
      gateway: 'Offline / UPI Pending',
      date: '13 Sept 2026, 02:10 PM',
      status: 'PENDING'
    },
    {
      id: 'TXN-9017',
      orderId: 'ORD-8817',
      studentName: 'Ananya Roy',
      studentEmail: 'ananya@example.com',
      courseTitle: 'Advanced Cloud Architecture on AWS',
      amount: 4999,
      gateway: 'Razorpay (UPI)',
      date: '12 Sept 2026, 01:30 PM',
      status: 'REFUNDED'
    }
  ]);

  // Refund Requests Queue
  const [refundRequests, setRefundRequests] = useState<any[]>([
    {
      id: 'REF-401',
      txnId: 'TXN-9015',
      studentName: 'Kunal Joshi',
      studentEmail: 'kunal@example.com',
      courseTitle: 'Full-Stack Next.js 15 & Turbopack',
      amount: 4999,
      reason: 'Course content overlaps with my prior knowledge. Requesting full refund.',
      date: '14 Sept 2026',
      status: 'PENDING_APPROVAL'
    },
    {
      id: 'REF-402',
      txnId: 'TXN-9012',
      studentName: 'Simran Kaur',
      studentEmail: 'simran@example.com',
      courseTitle: 'Production AI Agents with LangGraph',
      amount: 6499,
      reason: 'Accidental double payment via UPI gateway.',
      date: '13 Sept 2026',
      status: 'PENDING_APPROVAL'
    }
  ]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'revenue') setActiveTab('revenue');
    else if (tab === 'invoices') setActiveTab('invoices');
    else if (tab === 'refunds') setActiveTab('refunds');
  }, [searchParams]);

  // RBAC Access Guard: payment.view
  if (!hasPermission('payment.view')) {
    return (
      <div className="p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-3xl space-y-3 max-w-lg mx-auto mt-12">
        <div className="w-12 h-12 rounded-full bg-error-container/30 text-error flex items-center justify-center mx-auto">
          <Icon name="lock" size={24} />
        </div>
        <h2 className="text-base font-extrabold text-on-surface">Access Denied</h2>
        <p className="text-xs text-outline">
          Your administrator account does not possess the <strong>payment.view</strong> permission for{' '}
          {activeFacility?.name || 'this facility'}. Financial records are strictly confidential.
        </p>
      </div>
    );
  }

  // Handle Export CSV (payment.export)
  const handleExportCSV = () => {
    if (!hasPermission('payment.export')) {
      showToast('Permission denied: payment.export required', 'error');
      return;
    }
    const headers = 'TransactionID,OrderID,Student,Email,Course,Amount,Gateway,Date,Status\n';
    const rows = transactions
      .map(
        (t) =>
          `"${t.id}","${t.orderId}","${t.studentName}","${t.studentEmail}","${t.courseTitle}","₹${t.amount}","${t.gateway}","${t.date}","${t.status}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${activeFacility?.slug || 'facility'}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('Financial transactions exported to CSV', 'success');
  };

  // Process Refund (strictly guarded by payment.refund!)
  const handleProcessRefund = (refundItem: any) => {
    if (!hasPermission('payment.refund')) {
      showToast('Security Violation: Missing high-security payment.refund permission.', 'error');
      return;
    }
    setSelectedRefund(refundItem);
  };

  const confirmRefund = () => {
    if (!hasPermission('payment.refund')) {
      showToast('Missing payment.refund permission', 'error');
      return;
    }
    setIsProcessingRefund(true);
    setTimeout(() => {
      setRefundRequests((prev) => prev.filter((r) => r.id !== selectedRefund.id));
      setTransactions((prev) => [
        {
          id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
          orderId: selectedRefund.txnId,
          studentName: selectedRefund.studentName,
          studentEmail: selectedRefund.studentEmail,
          courseTitle: selectedRefund.courseTitle,
          amount: selectedRefund.amount,
          gateway: 'Razorpay Refund Gateway',
          date: 'Just now',
          status: 'REFUNDED'
        },
        ...prev
      ]);
      showToast(`Refund ₹${selectedRefund.amount} dispatched to ${selectedRefund.studentName}`, 'success');
      setIsProcessingRefund(false);
      setSelectedRefund(null);
    }, 700);
  };

  const filteredTransactions = transactions.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.studentName.toLowerCase().includes(q) ||
      t.studentEmail.toLowerCase().includes(q) ||
      t.courseTitle.toLowerCase().includes(q) ||
      t.orderId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
              Payments, Transactions &amp; Invoices
            </h1>
            <span className="text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">
              {activeFacility?.name}
            </span>
          </div>
          <p className="text-xs text-outline font-medium mt-1">
            Financial reconciliation, Razorpay/UPI settlements, student invoices, and refund queue.
          </p>
        </div>

        {/* Action Button: Export CSV (guarded by payment.export) */}
        {hasPermission('payment.export') && (
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-outline-variant/80 hover:bg-surface-container text-xs font-bold text-on-surface transition-all self-start sm:self-auto cursor-pointer"
          >
            <Icon name="download" size={16} />
            <span>Export Transactions (CSV)</span>
          </button>
        )}
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 space-y-1">
          <p className="text-[11px] text-outline font-mono uppercase">Gross Facility Revenue</p>
          <h3 className="text-xl font-black text-on-surface">₹4,20,000</h3>
          <p className="text-[10px] text-emerald-600 font-bold font-mono">+18.4% MoM growth</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 space-y-1">
          <p className="text-[11px] text-outline font-mono uppercase">Net Settled This Month</p>
          <h3 className="text-xl font-black text-emerald-600">₹84,500</h3>
          <p className="text-[10px] text-outline font-mono">Cleared via Razorpay Gateway</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 space-y-1">
          <p className="text-[11px] text-outline font-mono uppercase">Pending Payments</p>
          <h3 className="text-xl font-black text-amber-600">₹18,500</h3>
          <p className="text-[10px] text-outline font-mono">5 orders awaiting bank verification</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 space-y-1">
          <p className="text-[11px] text-outline font-mono uppercase">Refund Requests Queue</p>
          <h3 className="text-xl font-black text-rose-600">{refundRequests.length} Pending</h3>
          <p className="text-[10px] text-rose-600 font-mono">
            {hasPermission('payment.refund') ? 'Authorized to process refunds' : 'Requires payment.refund permission'}
          </p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl">
            {(
              [
                { key: 'transactions', label: 'All Transactions' },
                { key: 'revenue', label: 'Revenue Breakdown' },
                { key: 'invoices', label: 'Student Invoices' },
                { key: 'refunds', label: `Refund Requests (${refundRequests.length})` }
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-surface-container-lowest text-on-surface shadow-2xs'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Icon
              name="search"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student or order..."
              className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Tab 4: Refund Requests Queue */}
        {activeTab === 'refunds' ? (
          <div className="space-y-4 pt-1">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="shield" size={18} className="text-amber-600" />
                <p className="text-xs text-amber-900 dark:text-amber-200 font-semibold">
                  Refund actions are governed by the distinct high-security <strong>payment.refund</strong> key.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-200/50 text-amber-800">
                AUDITED
              </span>
            </div>

            {refundRequests.length === 0 ? (
              <p className="p-8 text-center text-xs text-outline">No pending refund requests.</p>
            ) : (
              <div className="divide-y divide-outline-variant/20 border border-outline-variant/60 rounded-2xl overflow-hidden">
                {refundRequests.map((ref) => (
                  <div key={ref.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-container-low/30 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-rose-600">{ref.id}</span>
                        <span className="font-bold text-xs text-on-surface">{ref.studentName}</span>
                        <span className="text-[10px] text-outline font-mono">({ref.studentEmail})</span>
                      </div>
                      <p className="text-xs font-semibold text-on-surface-variant">Course: {ref.courseTitle}</p>
                      <p className="text-xs text-outline italic">"{ref.reason}"</p>
                      <p className="text-[10px] font-mono text-outline">Requested on: {ref.date}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-black text-on-surface">₹{ref.amount.toLocaleString('en-IN')}</p>
                        <span className="text-[10px] font-mono font-bold text-amber-600">Pending Review</span>
                      </div>

                      {/* High-Security Action: Only visible if payment.refund is granted! */}
                      {hasPermission('payment.refund') && (
                        <button
                          type="button"
                          onClick={() => handleProcessRefund(ref)}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 shadow-sm transition-colors cursor-pointer"
                        >
                          Approve Refund
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'invoices' ? (
          /* Tab 3: Invoices */
          <div className="divide-y divide-outline-variant/30 pt-1">
            {filteredTransactions.map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-xs text-on-surface">Invoice #{t.orderId}.pdf</p>
                  <p className="text-[11px] text-outline font-mono">
                    Issued to {t.studentName} • ₹{t.amount} • {t.date}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => showToast(`Downloading tax invoice #${t.orderId}`, 'info')}
                  className="px-3 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Icon name="download" size={14} />
                  <span>Download PDF</span>
                </button>
              </div>
            ))}
          </div>
        ) : activeTab === 'revenue' ? (
          /* Tab 2: Revenue Breakdown */
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low/40">
                <p className="text-[11px] font-mono text-outline">Engineering &amp; Next.js</p>
                <h4 className="text-base font-black text-on-surface mt-1">₹1,80,000</h4>
                <p className="text-[10px] text-emerald-600 font-bold">42.8% of total revenue</p>
              </div>
              <div className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low/40">
                <p className="text-[11px] font-mono text-outline">Artificial Intelligence &amp; Agents</p>
                <h4 className="text-base font-black text-on-surface mt-1">₹1,40,000</h4>
                <p className="text-[10px] text-emerald-600 font-bold">33.3% of total revenue</p>
              </div>
              <div className="p-4 rounded-xl border border-outline-variant/60 bg-surface-container-low/40">
                <p className="text-[11px] font-mono text-outline">Backend &amp; Cloud Systems</p>
                <h4 className="text-base font-black text-on-surface mt-1">₹1,00,000</h4>
                <p className="text-[10px] text-emerald-600 font-bold">23.8% of total revenue</p>
              </div>
            </div>
          </div>
        ) : (
          /* Tab 1: All Transactions Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-outline uppercase font-mono text-[10px] border-b border-outline-variant/40">
                <tr>
                  <th className="p-3">Txn ID / Order</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">Course</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Gateway</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 font-medium text-on-surface">
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-outline">
                      <span className="text-on-surface">{t.id}</span>
                      <p className="text-[10px] text-outline font-normal">{t.orderId}</p>
                    </td>
                    <td className="p-3">
                      <p className="font-bold">{t.studentName}</p>
                      <p className="text-[10px] text-outline font-mono">{t.studentEmail}</p>
                    </td>
                    <td className="p-3 max-w-[200px] truncate">{t.courseTitle}</td>
                    <td className="p-3 font-mono font-black text-on-surface">
                      ₹{t.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 font-mono text-outline text-[11px]">{t.gateway}</td>
                    <td className="p-3 font-mono text-outline text-[11px]">{t.date}</td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          t.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-700'
                            : t.status === 'REFUNDED'
                            ? 'bg-rose-500/10 text-rose-700'
                            : 'bg-amber-500/10 text-amber-700'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => showToast(`Invoice ${t.orderId} downloaded`, 'info')}
                        className="p-1 rounded text-outline hover:text-primary hover:bg-surface-container cursor-pointer"
                        title="Download Invoice"
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
      </div>

      {/* Modal: Process Refund Authorization */}
      {selectedRefund && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
              <div className="flex items-center gap-2">
                <Icon name="warning" size={20} className="text-rose-600" />
                <h3 className="font-black text-sm text-on-surface">Authorize Student Refund</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRefund(null)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-on-surface-variant">
              <p>
                You are about to issue a formal gateway refund for transaction{' '}
                <strong className="font-mono text-on-surface">{selectedRefund.txnId}</strong>.
              </p>
              <div className="p-3 bg-surface-container-low rounded-xl space-y-1">
                <p>Student: <strong className="text-on-surface">{selectedRefund.studentName}</strong></p>
                <p>Course: <strong className="text-on-surface">{selectedRefund.courseTitle}</strong></p>
                <p>Amount to Refund: <strong className="text-rose-600 text-sm font-mono">₹{selectedRefund.amount.toLocaleString('en-IN')}</strong></p>
                <p>Stated Reason: <span className="italic text-outline">"{selectedRefund.reason}"</span></p>
              </div>
              <p className="text-[11px] text-outline">
                Funds will be reversed back to the student's original payment method within 3-5 banking days.
              </p>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => setSelectedRefund(null)}
                className="px-4 py-2 rounded-xl border border-outline-variant/80 text-xs font-bold text-outline hover:bg-surface-container cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingRefund}
                onClick={confirmRefund}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-sm hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {isProcessingRefund ? 'Processing...' : 'Confirm & Reverse Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentsAdminPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-outline">Loading Payments & Transactions...</div>}>
      <PaymentsPageContent />
    </Suspense>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Landmark,
  Wallet,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Eye,
  X,
  Loader2
} from 'lucide-react';

export default function SuperAdminUsersManagementPage() {
  const [activeTab, setActiveTab] = useState<
    'ALL' | 'INSTRUCTORS' | 'REVIEWERS' | 'ADMINS' | 'STUDENTS'
  >('ALL');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [bankReason, setBankReason] = useState('');
  const [payoutRef, setPayoutRef] = useState('');
  const [payoutReason, setPayoutReason] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    const params = new URLSearchParams({
      role: activeTab,
      search
    });
    fetch(`/api/super-admin/users?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.users) {
          setUsers(res.users);
          if (selectedUser) {
            const refreshed = res.users.find((u: any) => u.id === selectedUser.id);
            if (refreshed) setSelectedUser(refreshed);
          }
        }
        if (res.auditLogs) setAuditLogs(res.auditLogs);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, [activeTab]);

  const performAdminAction = async (payload: Record<string, any>) => {
    setActionLoading(true);
    setToast(null);
    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ type: 'error', message: data.error || 'Action failed.' });
      } else {
        setToast({ type: 'success', message: data.message || 'Action completed!' });
        fetchUsers();
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Network error.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickRejectBank = (userId: string, userName: string) => {
    const input = window.prompt(
      `Enter reason for rejecting ${userName}'s bank account:`
    );
    if (!input || !input.trim()) return;
    performAdminAction({
      action: 'REJECT_BANK',
      userId,
      reason: input.trim()
    });
  };

  const pendingBankUsers = users.filter(
    (u) => u.bankAccount?.status === 'PENDING_VERIFICATION'
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Landmark className="w-6 h-6 text-violet-600" />
            <span>Platform Users, Bank Account Verification &amp; Payout Governance</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Approve or reject Instructor bank accounts (`PENDING_VERIFICATION`), process payout requests, manage roles, and resend verification emails.
          </p>
        </div>
      </div>

      {toast && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold shadow-xs ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP PENDING BANK ACCOUNT VERIFICATIONS QUEUE */}
      {pendingBankUsers.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">
                  Pending Instructor Bank Account Approvals ({pendingBankUsers.length})
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-200 text-amber-900">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Instructors below have submitted their verified bank details and are awaiting Super Admin / Admin approval.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingBankUsers.map((u) => (
              <div
                key={u.id}
                className="bg-white rounded-2xl border border-amber-200 p-5 shadow-2xs flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-slate-900">{u.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                      PENDING VERIFICATION
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Bank Name
                      </span>
                      <span className="font-extrabold text-slate-900">
                        {u.bankAccount.bankName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Account Number
                      </span>
                      <span className="font-mono font-extrabold text-slate-900">
                        {u.bankAccount.accountNumber || u.bankAccount.accountNumberMasked}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        IFSC &amp; Branch
                      </span>
                      <span className="font-mono font-bold text-indigo-700">
                        {u.bankAccount.ifscCode}{' '}
                        {u.bankAccount.branchName ? `• ${u.bankAccount.branchName}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Account Holder &amp; PAN
                      </span>
                      <span className="font-bold text-slate-900">
                        {u.bankAccount.accountHolderName}{' '}
                        {u.bankAccount.panNumber ? `(${u.bankAccount.panNumber})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleQuickRejectBank(u.id, u.name)}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold transition-all cursor-pointer disabled:opacity-50"
                  >
                    ✕ Reject Bank
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() =>
                      performAdminAction({
                        action: 'VERIFY_BANK',
                        userId: u.id
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>✓ Approve &amp; Verify Bank Account</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'All Users' },
            { id: 'INSTRUCTORS', label: 'Instructors & Bank Accounts' },
            { id: 'REVIEWERS', label: 'Reviewers / Auditors' },
            { id: 'ADMINS', label: 'Admins' },
            { id: 'STUDENTS', label: 'Students' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchUsers();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone..."
              className="w-64 pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-violet-500"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-violet-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role &amp; Status</th>
                  <th className="py-3.5 px-4">Email Verification</th>
                  <th className="py-3.5 px-4">Bank Account &amp; Verification</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                      {u.phone && <div className="text-[11px] text-slate-400">{u.phone}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-violet-50 text-violet-700 border border-violet-200 mr-1.5">
                        {u.role === 'REVIEWER' ? 'AUDITOR / REVIEWER' : u.role}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 space-y-1">
                      <div className="flex items-center gap-1.5">
                        {u.emailVerified ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-amber-500" /> Unverified
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Welcome Email:{' '}
                        <span
                          className={
                            u.welcomeEmailStatus === 'SENT'
                              ? 'text-emerald-700 font-semibold'
                              : 'text-amber-700 font-semibold'
                          }
                        >
                          {u.welcomeEmailStatus}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.role === 'INSTRUCTOR' || u.bankAccount?.status !== 'NOT_ADDED' ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-700 font-bold">
                              {u.bankAccount?.bankName || 'Bank:'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                u.bankAccount?.status === 'VERIFIED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : u.bankAccount?.status === 'PENDING_VERIFICATION'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : u.bankAccount?.status === 'REJECTED'
                                  ? 'bg-red-100 text-red-800 border border-red-300'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {u.bankAccount?.status === 'PENDING_VERIFICATION'
                                ? 'PENDING ADMIN APPROVAL'
                                : u.bankAccount?.status || 'NOT_ADDED'}
                            </span>
                          </div>

                          {u.bankAccount?.status !== 'NOT_ADDED' && (
                            <div className="text-[11px] font-mono text-slate-600">
                              Acct:{' '}
                              <strong className="text-slate-900">
                                {u.bankAccount?.accountNumber || u.bankAccount?.accountNumberMasked}
                              </strong>{' '}
                              • IFSC:{' '}
                              <strong className="text-indigo-700">{u.bankAccount?.ifscCode}</strong>
                            </div>
                          )}

                          {u.bankAccount?.status === 'PENDING_VERIFICATION' && (
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() =>
                                  performAdminAction({
                                    action: 'VERIFY_BANK',
                                    userId: u.id
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] cursor-pointer"
                              >
                                ✓ Approve Bank
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => handleQuickRejectBank(u.id, u.name)}
                                className="px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-[10px] cursor-pointer"
                              >
                                ✕ Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() =>
                            performAdminAction({
                              action: 'RESEND_WELCOME_EMAIL',
                              userId: u.id
                            })
                          }
                          disabled={actionLoading}
                          title="Resend Welcome Email"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5 text-violet-600" />
                          <span>Resend Welcome</span>
                        </button>
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Manage &amp; Verify</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User & Financial Management Drawer Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-white border-l border-slate-200 h-full overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">{selectedUser.name}</h2>
                <p className="text-xs text-slate-500">
                  {selectedUser.email} • {selectedUser.role}
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Account Status & Welcome Email Controls */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Account Status &amp; Welcome Email
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() =>
                    performAdminAction({
                      action: 'UPDATE_USER_STATUS',
                      userId: selectedUser.id,
                      status: 'ACTIVE'
                    })
                  }
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Activate Account
                </button>
                <button
                  onClick={() =>
                    performAdminAction({
                      action: 'UPDATE_USER_STATUS',
                      userId: selectedUser.id,
                      status: 'SUSPENDED',
                      reason: 'Suspended by administrator'
                    })
                  }
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5" /> Suspend Account
                </button>
                <button
                  onClick={() =>
                    performAdminAction({
                      action: 'RESEND_WELCOME_EMAIL',
                      userId: selectedUser.id
                    })
                  }
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Resend Welcome Email
                </button>
              </div>
            </div>

            {/* Instructor Bank Verification Section */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-violet-600" />
                  Instructor Bank Account Verification
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedUser.bankAccount?.status === 'VERIFIED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : selectedUser.bankAccount?.status === 'PENDING_VERIFICATION'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {selectedUser.bankAccount?.status || 'NOT_ADDED'}
                </span>
              </div>

              {selectedUser.bankAccount?.status === 'NOT_ADDED' ? (
                <p className="text-xs text-slate-500">
                  This user has not submitted bank details yet.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 text-xs bg-white p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Account Holder
                      </span>
                      <span className="font-bold text-slate-900">
                        {selectedUser.bankAccount.accountHolderName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Bank Name
                      </span>
                      <span className="font-bold text-slate-900">
                        {selectedUser.bankAccount.bankName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Full Account Number
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {selectedUser.bankAccount.accountNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        IFSC &amp; Branch
                      </span>
                      <span className="font-mono font-bold text-indigo-700">
                        {selectedUser.bankAccount.ifscCode} •{' '}
                        {selectedUser.bankAccount.branchName || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        UPI ID
                      </span>
                      <span className="font-mono text-slate-700">
                        {selectedUser.bankAccount.upiId || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        PAN Number
                      </span>
                      <span className="font-mono text-slate-700">
                        {selectedUser.bankAccount.panNumber || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Aadhaar Number
                      </span>
                      <span className="font-mono text-slate-700">
                        {selectedUser.bankAccount.aadhaarNumber ? `XXXX XXXX ${selectedUser.bankAccount.aadhaarNumber.slice(-4)}` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* KYC Verification Proof Documents */}
                  {(selectedUser.bankAccount.panDocUrl || selectedUser.bankAccount.aadhaarDocUrl || selectedUser.bankAccount.bankProofUrl) && (
                    <div className="p-3 rounded-xl bg-slate-100/70 border border-slate-200 space-y-2">
                      <span className="text-slate-600 block text-[10px] uppercase font-extrabold tracking-wider">
                        KYC Proof Documents Submitted by Instructor:
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedUser.bankAccount.panDocUrl && (
                          <a
                            href={selectedUser.bankAccount.panDocUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-white border border-slate-200 hover:border-violet-400 text-center space-y-1 block group transition"
                          >
                            <img
                              src={selectedUser.bankAccount.panDocUrl}
                              alt="PAN Card"
                              className="w-full h-16 object-cover rounded-md group-hover:opacity-90"
                            />
                            <span className="text-[10px] font-bold text-slate-800 block truncate">PAN Photo ↗</span>
                          </a>
                        )}
                        {selectedUser.bankAccount.aadhaarDocUrl && (
                          <a
                            href={selectedUser.bankAccount.aadhaarDocUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-white border border-slate-200 hover:border-violet-400 text-center space-y-1 block group transition"
                          >
                            <img
                              src={selectedUser.bankAccount.aadhaarDocUrl}
                              alt="Aadhaar Card"
                              className="w-full h-16 object-cover rounded-md group-hover:opacity-90"
                            />
                            <span className="text-[10px] font-bold text-slate-800 block truncate">Aadhaar Photo ↗</span>
                          </a>
                        )}
                        {selectedUser.bankAccount.bankProofUrl && (
                          <a
                            href={selectedUser.bankAccount.bankProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-white border border-slate-200 hover:border-violet-400 text-center space-y-1 block group transition"
                          >
                            <img
                              src={selectedUser.bankAccount.bankProofUrl}
                              alt="Bank Proof"
                              className="w-full h-16 object-cover rounded-md group-hover:opacity-90"
                            />
                            <span className="text-[10px] font-bold text-slate-800 block truncate">Bank Proof ↗</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2.5 pt-2">
                    <input
                      type="text"
                      value={bankReason}
                      onChange={(e) => setBankReason(e.target.value)}
                      placeholder="Reason for Rejection / Disablement (required if rejecting)"
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          performAdminAction({
                            action: 'VERIFY_BANK',
                            userId: selectedUser.id
                          })
                        }
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve &amp; Verify Bank Account
                      </button>
                      <button
                        onClick={() =>
                          performAdminAction({
                            action: 'REJECT_BANK',
                            userId: selectedUser.id,
                            reason: bankReason
                          })
                        }
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject Bank
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Payout Requests Management */}
            {selectedUser.financials?.payouts?.length > 0 && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  Payout Requests ({selectedUser.financials.payouts.length})
                </h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={payoutRef}
                    onChange={(e) => setPayoutRef(e.target.value)}
                    placeholder="UTR / Bank Reference Number (when marking PAID)"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900"
                  />
                  <input
                    type="text"
                    value={payoutReason}
                    onChange={(e) => setPayoutReason(e.target.value)}
                    placeholder="Rejection Reason (if rejecting payout)"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900"
                  />
                </div>
                <div className="space-y-2.5">
                  {selectedUser.financials.payouts.map((p: any) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          ₹{Number(p.amount).toLocaleString('en-IN')}{' '}
                          <span className="text-slate-500 font-normal">({p.status})</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Requested: {new Date(p.requestedAt).toLocaleDateString()} • Ref:{' '}
                          {p.referenceNumber || '—'}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() =>
                            performAdminAction({
                              action: 'PROCESS_PAYOUT',
                              userId: selectedUser.id,
                              payoutId: p.id,
                              status: 'APPROVED'
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            performAdminAction({
                              action: 'PROCESS_PAYOUT',
                              userId: selectedUser.id,
                              payoutId: p.id,
                              status: 'PAID',
                              referenceNumber: payoutRef || `UTR${Date.now()}`
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                        >
                          Mark PAID
                        </button>
                        <button
                          onClick={() =>
                            performAdminAction({
                              action: 'PROCESS_PAYOUT',
                              userId: selectedUser.id,
                              payoutId: p.id,
                              status: 'REJECTED',
                              reason: payoutReason || 'Payout rejected by administrator'
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

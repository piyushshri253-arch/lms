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
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function SuperAdminUsersManagementPage() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'INSTRUCTORS' | 'REVIEWERS' | 'ADMINS' | 'STUDENTS'>('ALL');
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

  return (
    <div className="min-h-screen bg-[#07090e] text-white p-4 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-violet-400" />
            <span>Platform Users, Bank Verification &amp; Payout Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Inspect Instructors, Reviewers/Auditors, Admins &amp; Students, verify bank accounts, process payouts, and resend Welcome Emails.
          </p>
        </div>
      </div>

      {toast && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Role Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f131d] p-4 rounded-2xl border border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'All Users' },
            { id: 'INSTRUCTORS', label: 'Instructors' },
            { id: 'REVIEWERS', label: 'Reviewers / Auditors' },
            { id: 'ADMINS', label: 'Admins' },
            { id: 'STUDENTS', label: 'Students' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
              placeholder="Search name, email, mobile..."
              className="pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>
          <button
            onClick={fetchUsers}
            className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold"
          >
            Search
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#0f131d] border border-slate-800/80 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No users found in this category.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400">
                  <th className="py-3.5 px-4 font-semibold">User / Role</th>
                  <th className="py-3.5 px-4 font-semibold">Mobile &amp; Location</th>
                  <th className="py-3.5 px-4 font-semibold">Status &amp; OTP</th>
                  <th className="py-3.5 px-4 font-semibold">Welcome Email</th>
                  <th className="py-3.5 px-4 font-semibold">Bank Status</th>
                  <th className="py-3.5 px-4 font-semibold">Earnings / Pending Payout</th>
                  <th className="py-3.5 px-4 font-semibold">Registered / Last Login</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/40">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{u.name}</div>
                      <div className="text-slate-400 text-[11px]">{u.email}</div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-violet-500/15 text-violet-300">
                        {u.role === 'REVIEWER' ? 'REVIEWER / AUDITOR' : u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div>{u.phone || '—'}</div>
                      <div className="text-[11px] text-slate-500">
                        {[u.city, u.state].filter(Boolean).join(', ') || '—'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        {u.status}
                      </span>
                      <div className="text-[11px] mt-1 text-slate-400">
                        OTP: {u.emailVerified ? 'Verified ✓' : 'Unverified'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.welcomeEmailStatus === 'SENT'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : u.welcomeEmailStatus === 'FAILED'
                              ? 'bg-red-500/15 text-red-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {u.welcomeEmailStatus}
                        </span>
                        <button
                          onClick={() =>
                            performAdminAction({
                              action: 'RESEND_WELCOME_EMAIL',
                              userId: u.id
                            })
                          }
                          title="Resend Welcome Email"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-violet-600 text-slate-300 hover:text-white transition-all"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.role === 'INSTRUCTOR' ? (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            u.bankAccount?.status === 'VERIFIED'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : u.bankAccount?.status === 'PENDING_VERIFICATION'
                              ? 'bg-amber-500/15 text-amber-400'
                              : u.bankAccount?.status === 'REJECTED'
                              ? 'bg-red-500/15 text-red-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {u.bankAccount?.status || 'NOT_ADDED'}
                        </span>
                      ) : (
                        <span className="text-slate-600">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {u.role === 'INSTRUCTOR' ? (
                        <div>
                          <div className="font-bold text-emerald-400">
                            ₹{Number(u.financials?.totalEarnings || 0).toLocaleString('en-IN')}
                          </div>
                          <div className="text-[11px] text-amber-400">
                            Pending Payout: ₹{Number(u.financials?.pendingPayout || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      <div>Reg: {new Date(u.createdAt).toLocaleDateString()}</div>
                      <div>
                        Login: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed User / Bank / Payout / Welcome Email Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0f131d] border border-slate-700 rounded-2xl max-w-3xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-white">{selectedUser.name}</h2>
                <p className="text-xs text-slate-400">
                  {selectedUser.email} • Role: <strong className="text-violet-400">{selectedUser.role}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile, Address & Welcome Email Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-300 uppercase">Contact &amp; Address</div>
                <div><strong>Mobile:</strong> {selectedUser.phone || 'Not provided'}</div>
                <div><strong>Address:</strong> {selectedUser.address || '—'}</div>
                <div>
                  <strong>City/State/Pin:</strong>{' '}
                  {[selectedUser.city, selectedUser.state, selectedUser.pincode, selectedUser.country]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="font-bold text-slate-300 uppercase">Account &amp; Welcome Email</div>
                <div className="flex items-center justify-between">
                  <span>Account Status: <strong>{selectedUser.status}</strong></span>
                  <div className="flex gap-1.5">
                    <button
                      disabled={actionLoading}
                      onClick={() =>
                        performAdminAction({
                          action: 'UPDATE_USER_STATUS',
                          userId: selectedUser.id,
                          status: selectedUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold"
                    >
                      {selectedUser.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                </div>
                <div>
                  Welcome Email Status:{' '}
                  <strong className="text-emerald-400">{selectedUser.welcomeEmailStatus}</strong>
                </div>
                <button
                  disabled={actionLoading}
                  onClick={() =>
                    performAdminAction({
                      action: 'RESEND_WELCOME_EMAIL',
                      userId: selectedUser.id
                    })
                  }
                  className="mt-2 w-full py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Resend Welcome Email</span>
                </button>
              </div>
            </div>

            {/* Bank Account Verification Section (For Instructors) */}
            {selectedUser.role === 'INSTRUCTOR' && (
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-violet-400" />
                    Instructor Bank Account Verification
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-slate-800 text-violet-300">
                    {selectedUser.bankAccount?.status || 'NOT_ADDED'}
                  </span>
                </div>

                {selectedUser.bankAccount?.status === 'NOT_ADDED' ? (
                  <p className="text-slate-400">Instructor has not submitted bank details yet.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div>
                        <div className="text-slate-500">Account Holder</div>
                        <div className="font-bold text-white">
                          {selectedUser.bankAccount.accountHolderName}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Bank Name</div>
                        <div className="font-bold text-white">{selectedUser.bankAccount.bankName}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Account Number</div>
                        <div className="font-mono font-bold text-emerald-400">
                          {selectedUser.bankAccount.accountNumber}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">IFSC Code</div>
                        <div className="font-mono text-white">{selectedUser.bankAccount.ifscCode}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">UPI ID</div>
                        <div className="font-mono text-white">{selectedUser.bankAccount.upiId || '—'}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">PAN</div>
                        <div className="font-mono text-white">
                          {selectedUser.bankAccount.panNumber || '—'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="text"
                        value={bankReason}
                        onChange={(e) => setBankReason(e.target.value)}
                        placeholder="Rejection / Disable reason (required if rejecting)"
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                      <button
                        disabled={actionLoading}
                        onClick={() =>
                          performAdminAction({
                            action: 'VERIFY_BANK',
                            userId: selectedUser.id
                          })
                        }
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                      >
                        ✓ Verify Bank
                      </button>
                      <button
                        disabled={actionLoading}
                        onClick={() =>
                          performAdminAction({
                            action: 'REJECT_BANK',
                            userId: selectedUser.id,
                            reason: bankReason
                          })
                        }
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold"
                      >
                        ✕ Reject Bank
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Instructor Payout Requests Section */}
            {selectedUser.role === 'INSTRUCTOR' &&
              selectedUser.financials?.payouts?.length > 0 && (
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    Payout Requests
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={payoutRef}
                      onChange={(e) => setPayoutRef(e.target.value)}
                      placeholder="UTR / Bank Reference No. (for Paid)"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                    <input
                      type="text"
                      value={payoutReason}
                      onChange={(e) => setPayoutReason(e.target.value)}
                      placeholder="Rejection reason (if rejecting)"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    {selectedUser.financials.payouts.map((p: any) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-extrabold text-white">
                            ₹{Number(p.amount).toLocaleString('en-IN')}
                          </span>{' '}
                          <span className="text-slate-400">({p.status})</span>
                          <div className="text-[10px] text-slate-500">
                            Requested: {new Date(p.requestedAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() =>
                              performAdminAction({
                                action: 'PROCESS_PAYOUT',
                                userId: selectedUser.id,
                                payoutId: p.id,
                                status: 'APPROVED'
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-sky-600 text-white font-bold text-[11px]"
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
                                referenceNumber: payoutRef || `UTR${Date.now().toString().slice(-6)}`
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px]"
                          >
                            Mark Paid
                          </button>
                          <button
                            onClick={() =>
                              performAdminAction({
                                action: 'PROCESS_PAYOUT',
                                userId: selectedUser.id,
                                payoutId: p.id,
                                status: 'REJECTED',
                                reason: payoutReason || 'Verification mismatch'
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-bold text-[11px]"
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

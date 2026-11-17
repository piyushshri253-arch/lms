'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';

interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    avatar?: string | null;
    role: string;
    createdAt?: string;
  };
  messages: TicketMessage[];
  messagesCount: number;
  latestMessage: string;
}

interface SupportStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  urgent: number;
  paymentIssues: number;
  courseApprovalIssues: number;
  bankVerificationIssues: number;
  technicalIssues: number;
  instructorCount: number;
  studentCount: number;
}

const CATEGORY_CONFIGS: Record<
  string,
  {
    label: string;
    icon: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    primaryTeam: string;
    description: string;
  }
> = {
  PAYMENT_ISSUE: {
    label: 'Payment & Payout Issues',
    icon: 'payments',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    badgeBorder: 'border-emerald-500/30',
    primaryTeam: 'Accounts',
    description: 'Missing settlement, payout hold, commission calculation, or transaction reconciliation.'
  },
  COURSE_APPROVAL_ISSUE: {
    label: 'Course Approval Issues',
    icon: 'verified',
    badgeBg: 'bg-indigo-500/10',
    badgeText: 'text-indigo-700 dark:text-indigo-400',
    badgeBorder: 'border-indigo-500/30',
    primaryTeam: 'Auditor',
    description: 'Pending course review, auditor feedback clarification, or staged version approval.'
  },
  BANK_VERIFICATION_ISSUE: {
    label: 'Bank Verification Issue',
    icon: 'account_balance',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-800 dark:text-amber-400',
    badgeBorder: 'border-amber-500/30',
    primaryTeam: 'Accounts',
    description: 'NEFT/IMPS account verification, IFSC mismatch, penny-drop status, or KYC update.'
  },
  TECHNICAL_ISSUE: {
    label: 'Technical & Platform Bug',
    icon: 'build',
    badgeBg: 'bg-rose-500/10',
    badgeText: 'text-rose-700 dark:text-rose-400',
    badgeBorder: 'border-rose-500/30',
    primaryTeam: 'Tech. Team',
    description: 'Video DRM player, lesson uploads, quiz editor, or platform functionality bug.'
  },
  COURSE_ACCESS: {
    label: 'Course Access & Enrollment',
    icon: 'lock_open',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-700 dark:text-blue-400',
    badgeBorder: 'border-blue-500/30',
    primaryTeam: 'Support Desk',
    description: 'Enrollment unlocking, video streaming access, or curriculum lock issue.'
  },
  BILLING: {
    label: 'Student Billing & Invoices',
    icon: 'receipt',
    badgeBg: 'bg-purple-500/10',
    badgeText: 'text-purple-700 dark:text-purple-400',
    badgeBorder: 'border-purple-500/30',
    primaryTeam: 'Accounts',
    description: 'Student invoices, failed UPI/card transactions, or payment refunds.'
  },
  GENERAL: {
    label: 'General Inquiry',
    icon: 'help_outline',
    badgeBg: 'bg-slate-500/10',
    badgeText: 'text-slate-700 dark:text-slate-300',
    badgeBorder: 'border-slate-500/30',
    primaryTeam: 'Support Desk',
    description: 'General support inquiry or profile assistance.'
  }
};

const CANNED_REPLIES = [
  {
    label: '💳 Payout Processed',
    text: 'Your payout request has been verified and released via NEFT/IMPS. The transaction reference ID has been recorded and should reflect in your registered bank account within 2-4 business hours.'
  },
  {
    label: '🏦 Bank Details Verified',
    text: 'Your bank account credentials and IFSC code have been successfully verified and activated. The hold on your payout withdrawals has been lifted.'
  },
  {
    label: '🎓 Course Approved',
    text: 'Your submitted course version and revised curriculum have been evaluated by our Quality Auditor and approved for live catalog publication.'
  },
  {
    label: '🛠️ Bug Resolved',
    text: 'Our technical engineering team has deployed a fix for the reported streaming/upload issue. Please clear your browser cache and attempt again. Let us know if you experience any further difficulty.'
  },
  {
    label: '❓ Need Proof / Ref ID',
    text: 'Could you please provide your transaction reference ID, registered bank statement snippet, or an error screenshot? This will help our team expedite the investigation.'
  }
];

export function SupportDeskHub({ portal = 'super-admin' }: { portal?: 'super-admin' | 'admin' }) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'ALL';
  const initialRole = searchParams.get('role') || 'ALL';

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<SupportStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    urgent: 0,
    paymentIssues: 0,
    courseApprovalIssues: 0,
    bankVerificationIssues: 0,
    technicalIssues: 0,
    instructorCount: 0,
    studentCount: 0
  });

  const [instructorsList, setInstructorsList] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [studentsList, setStudentsList] = useState<Array<{ id: string; name: string; email: string }>>([]);

  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [roleFilter, setRoleFilter] = useState(initialRole);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');

  // Reply Composer State
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // New Ticket Proactive Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTargetUserType, setNewTargetUserType] = useState<'INSTRUCTOR' | 'STUDENT'>('INSTRUCTOR');
  const [newSelectedUserId, setNewSelectedUserId] = useState('');
  const [newCategory, setNewCategory] = useState('PAYMENT_ISSUE');
  const [newPriority, setNewPriority] = useState('HIGH');
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('Accounts (Primary)');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchTickets = async (keepSelectedId?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
      if (roleFilter !== 'ALL') params.set('role', roleFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (priorityFilter !== 'ALL') params.set('priority', priorityFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/super-admin/support?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load tickets');
      const data = await res.json();

      const list: SupportTicket[] = data.tickets || [];
      setTickets(list);
      if (data.stats) setStats(data.stats);
      if (data.instructors) setInstructorsList(data.instructors);
      if (data.students) setStudentsList(data.students);

      const nextTargetId = keepSelectedId || selectedTicketId || list[0]?.id || '';
      setSelectedTicketId(nextTargetId);
    } catch {
      showToast('Failed to load support tickets.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [categoryFilter, roleFilter, statusFilter, priorityFilter, searchQuery]);

  const selectedTicket = useMemo(() => {
    return tickets.find((t) => t.id === selectedTicketId) || tickets[0] || null;
  }, [tickets, selectedTicketId]);

  const handleStatusChange = async (ticketId: string, status: string) => {
    try {
      const res = await fetch('/api/super-admin/support', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ticketId, status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      showToast(`Ticket status updated to ${status}`, 'success');
      await fetchTickets(ticketId);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handlePriorityChange = async (ticketId: string, priority: string) => {
    try {
      const res = await fetch('/api/super-admin/support', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ticketId, priority })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update priority');

      showToast(`Priority escalated to ${priority}`, 'success');
      await fetchTickets(ticketId);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAssigneeChange = async (ticketId: string, assignedTo: string) => {
    try {
      const res = await fetch('/api/super-admin/support', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ticketId, assignedTo })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reassign');

      showToast(`Assigned to ${assignedTo}`, 'success');
      await fetchTickets(ticketId);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSendReply = async (nextStatus?: string) => {
    if (!selectedTicket || !replyMessage.trim()) return;

    try {
      setIsSendingReply(true);
      const targetStatus = nextStatus || 'WAITING';

      const res = await fetch(`/api/super-admin/support/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyMessage.trim(),
          status: targetStatus
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch reply');

      showToast('Official response dispatched via Email and Portal Notification.', 'success');
      setReplyMessage('');
      await fetchTickets(selectedTicket.id);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleCreateProactiveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSelectedUserId || !newSubject.trim() || !newMessage.trim()) {
      showToast('Please fill all mandatory fields.', 'error');
      return;
    }

    try {
      setIsCreatingTicket(true);
      const res = await fetch('/api/super-admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: newSelectedUserId,
          subject: newSubject.trim(),
          category: newCategory,
          priority: newPriority,
          message: newMessage.trim(),
          assignedTo: newAssignedTo
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create ticket');

      showToast(`Support ticket ${data.ticket.ticketNumber} created successfully!`, 'success');
      setIsCreateModalOpen(false);
      setNewSubject('');
      setNewMessage('');
      await fetchTickets(data.ticket.id);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const categoryConfig = selectedTicket
    ? CATEGORY_CONFIGS[selectedTicket.category] || CATEGORY_CONFIGS.GENERAL
    : CATEGORY_CONFIGS.GENERAL;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-lg border text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom-2 ${
            toast.type === 'success'
              ? 'bg-emerald-500 text-white border-emerald-600'
              : toast.type === 'error'
              ? 'bg-rose-500 text-white border-rose-600'
              : 'bg-surface-container-high text-on-surface border-outline-variant'
          }`}
        >
          <Icon name={toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'} size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href={`/${portal}`} className="hover:text-primary transition-colors">
              {portal === 'super-admin' ? 'Super Admin' : 'Admin'}
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Support &amp; Technical Desk</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="support_agent" size={22} />
            </span>
            Faculty &amp; Technical Support Center
          </h1>
          <p className="text-xs text-on-surface-variant mt-1 max-w-2xl">
            Unified incident triage, resolution studio, and multi-team routing for payment issues, course approval QA,
            bank KYC verification, and platform technical bugs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchTickets(selectedTicketId)}
            className="p-2.5 rounded-xl border border-outline-variant bg-surface hover:bg-surface-container text-on-surface transition-colors cursor-pointer"
            title="Refresh Tickets"
          >
            <Icon name="refresh" size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => {
              if (instructorsList.length > 0 && !newSelectedUserId) {
                setNewSelectedUserId(instructorsList[0].id);
              }
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 bg-primary text-on-primary text-xs font-extrabold rounded-xl hover:bg-primary/90 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Icon name="add" size={16} />
            <span>Create Ticket / Contact Faculty</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/80 shadow-xs">
          <div className="flex items-center justify-between text-outline mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">All Inquiries</span>
            <Icon name="inbox" size={16} />
          </div>
          <div className="text-2xl font-black text-on-surface tracking-tight">{stats.total}</div>
          <div className="text-[10px] text-outline font-medium mt-0.5">Faculty: {stats.instructorCount} | Students: {stats.studentCount}</div>
        </div>

        <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/20 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Action Needed</span>
            <Icon name="error_outline" size={16} />
          </div>
          <div className="text-2xl font-black text-rose-700 dark:text-rose-400 tracking-tight">{stats.open}</div>
          <div className="text-[10px] text-rose-600/80 font-medium mt-0.5">{stats.urgent} Urgent Escalations</div>
        </div>

        <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20 shadow-xs">
          <div className="flex items-center justify-between text-amber-800 dark:text-amber-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">In Progress</span>
            <Icon name="pending" size={16} />
          </div>
          <div className="text-2xl font-black text-amber-800 dark:text-amber-400 tracking-tight">{stats.inProgress}</div>
          <div className="text-[10px] text-amber-700/80 font-medium mt-0.5">Awaiting team or user reply</div>
        </div>

        <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Resolved</span>
            <Icon name="check_circle" size={16} />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">{stats.resolved}</div>
          <div className="text-[10px] text-emerald-600/80 font-medium mt-0.5">Closed incidents</div>
        </div>

        <div className="bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/20 shadow-xs">
          <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Course QA</span>
            <Icon name="verified" size={16} />
          </div>
          <div className="text-2xl font-black text-indigo-700 dark:text-indigo-400 tracking-tight">{stats.courseApprovalIssues}</div>
          <div className="text-[10px] text-indigo-600/80 font-medium mt-0.5">Auditor Queue</div>
        </div>

        <div className="bg-purple-500/5 p-4 rounded-2xl border border-purple-500/20 shadow-xs">
          <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Payouts &amp; Bank</span>
            <Icon name="account_balance_wallet" size={16} />
          </div>
          <div className="text-2xl font-black text-purple-700 dark:text-purple-400 tracking-tight">
            {stats.paymentIssues + stats.bankVerificationIssues}
          </div>
          <div className="text-[10px] text-purple-600/80 font-medium mt-0.5">Accounts Desk</div>
        </div>
      </div>

      {/* Category Module Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'ALL', label: 'All Inquiries', icon: 'all_inclusive', count: stats.total },
          { id: 'PAYMENT_ISSUE', label: 'Payment & Payouts', icon: 'payments', count: stats.paymentIssues },
          { id: 'COURSE_APPROVAL_ISSUE', label: 'Course Approval QA', icon: 'verified', count: stats.courseApprovalIssues },
          { id: 'BANK_VERIFICATION_ISSUE', label: 'Bank & KYC Verification', icon: 'account_balance', count: stats.bankVerificationIssues },
          { id: 'TECHNICAL_ISSUE', label: 'Technical & DRM Bugs', icon: 'build', count: stats.technicalIssues },
          { id: 'ROLE_INSTRUCTOR', label: 'Faculty Only', icon: 'groups', count: stats.instructorCount },
          { id: 'ROLE_STUDENT', label: 'Students Only', icon: 'school', count: stats.studentCount }
        ].map((tab) => {
          const isActive =
            tab.id.startsWith('ROLE_')
              ? roleFilter === tab.id.replace('ROLE_', '')
              : categoryFilter === tab.id && roleFilter === 'ALL';

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id.startsWith('ROLE_')) {
                  setRoleFilter(tab.id.replace('ROLE_', ''));
                  setCategoryFilter('ALL');
                } else {
                  setCategoryFilter(tab.id);
                  setRoleFilter('ALL');
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-lowest border border-outline-variant/80 text-outline hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <Icon name={tab.icon} size={15} />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-surface-container text-outline'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Split-Workspace Two-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANE: Filterable Ticket List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Quick Filter & Search Bar */}
          <div className="bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/80 shadow-xs space-y-2.5">
            <div className="relative">
              <Icon
                name="search"
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket #, subject, faculty name, email..."
                className="w-full bg-surface border border-outline-variant/70 rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 bg-surface border border-outline-variant/70 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="ALL">Status: All</option>
                <option value="OPEN">OPEN (Unresolved)</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="WAITING">WAITING ON USER</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="flex-1 bg-surface border border-outline-variant/70 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="ALL">Priority: All</option>
                <option value="URGENT">🔴 Urgent</option>
                <option value="HIGH">🟠 High</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="LOW">⚪ Low</option>
              </select>
            </div>
          </div>

          {/* Tickets List Scrollable Container */}
          <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
            {tickets.length > 0 ? (
              tickets.map((t) => {
                const isSelected = t.id === selectedTicket?.id;
                const catCfg = CATEGORY_CONFIGS[t.category] || CATEGORY_CONFIGS.GENERAL;
                const isInstructor = t.user?.role === 'INSTRUCTOR';

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-surface-container-low border-primary ring-2 ring-primary/20 shadow-sm'
                        : 'bg-surface-container-lowest border-outline-variant/80 hover:bg-surface-container-low/50 hover:border-outline'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-primary">#{t.ticketNumber}</span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md ${
                            isInstructor
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {isInstructor ? 'Faculty' : 'Student'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-md ${
                            t.priority === 'URGENT'
                              ? 'bg-rose-500 text-white'
                              : t.priority === 'HIGH'
                              ? 'bg-amber-500 text-white'
                              : 'bg-surface-container text-outline'
                          }`}
                        >
                          {t.priority}
                        </span>

                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            t.status === 'OPEN'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                              : t.status === 'RESOLVED' || t.status === 'CLOSED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                    </div>

                    {/* Subject Line */}
                    <h3 className="text-xs font-extrabold text-on-surface line-clamp-1 mb-1">{t.subject}</h3>

                    {/* Latest Message Snippet */}
                    <p className="text-[11px] text-outline line-clamp-2 leading-relaxed mb-2.5">
                      {t.latestMessage || 'No messages yet'}
                    </p>

                    {/* Footer Row */}
                    <div className="flex items-center justify-between text-[10px] text-outline font-medium pt-2 border-t border-outline-variant/40">
                      <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                        <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                          {t.user?.name ? t.user.name[0].toUpperCase() : 'U'}
                        </span>
                        <span className="font-bold text-on-surface truncate">{t.user?.name || 'User'}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold flex items-center gap-1 ${catCfg.badgeBg} ${catCfg.badgeText}`}
                        >
                          <Icon name={catCfg.icon} size={11} />
                          <span>{catCfg.primaryTeam}</span>
                        </span>
                        <span>•</span>
                        <span>{new Date(t.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/80 text-outline text-xs">
                <Icon name="search_off" size={32} className="mx-auto mb-2 opacity-60" />
                <p className="font-bold">No support tickets found</p>
                <p className="text-[11px] mt-0.5">Try clearing filters or search query.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Resolution Studio & Action Hub (7 cols) */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden flex flex-col min-h-[640px]">
          {selectedTicket ? (
            <div className="flex flex-col h-full">
              {/* Ticket Top Action Bar */}
              <div className="p-5 border-b border-outline-variant/60 bg-surface-container-low/40 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono font-bold">
                      <span className="text-primary text-sm font-black">#{selectedTicket.ticketNumber}</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${categoryConfig.badgeBg} ${categoryConfig.badgeText} ${categoryConfig.badgeBorder}`}
                      >
                        <Icon name={categoryConfig.icon} size={13} />
                        {categoryConfig.label}
                      </span>
                    </div>
                    <h2 className="text-base font-extrabold text-on-surface mt-1 tracking-tight">
                      {selectedTicket.subject}
                    </h2>
                  </div>

                  {/* Status, Priority & Assignee Quick Adjusters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-outline uppercase font-mono">Status:</span>
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                        className="bg-surface border border-outline-variant rounded-xl px-2.5 py-1 text-xs font-extrabold text-on-surface cursor-pointer focus:outline-none focus:border-primary shadow-2xs"
                      >
                        <option value="OPEN">🔴 OPEN</option>
                        <option value="IN_PROGRESS">🟡 IN_PROGRESS</option>
                        <option value="WAITING">🟠 WAITING ON USER</option>
                        <option value="RESOLVED">🟢 RESOLVED</option>
                        <option value="CLOSED">⚫ CLOSED</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-outline uppercase font-mono">Team:</span>
                      <select
                        value={selectedTicket.assignedTo}
                        onChange={(e) => handleAssigneeChange(selectedTicket.id, e.target.value)}
                        className="bg-surface border border-outline-variant rounded-xl px-2 py-1 text-xs font-extrabold text-on-surface cursor-pointer focus:outline-none focus:border-primary shadow-2xs"
                      >
                        <option value="Accounts (Primary)">Accounts Team</option>
                        <option value="Auditor (Primary)">Quality Auditor</option>
                        <option value="Tech. Team (Primary)">Tech Team</option>
                        <option value="Super Admin">Super Admin</option>
                        <option value="Support Desk">Support Desk</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-outline uppercase font-mono">Priority:</span>
                      <select
                        value={selectedTicket.priority}
                        onChange={(e) => handlePriorityChange(selectedTicket.id, e.target.value)}
                        className="bg-surface border border-outline-variant rounded-xl px-2 py-1 text-xs font-extrabold text-on-surface cursor-pointer focus:outline-none focus:border-primary shadow-2xs"
                      >
                        <option value="URGENT">URGENT</option>
                        <option value="HIGH">HIGH</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="LOW">LOW</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Requester Profile & Context Bridges Card */}
                <div className="bg-surface p-3.5 rounded-2xl border border-outline-variant/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center text-sm shrink-0">
                      {selectedTicket.user?.name ? selectedTicket.user.name[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-on-surface">{selectedTicket.user?.name}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-container font-extrabold uppercase text-outline">
                          {selectedTicket.user?.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-outline flex items-center gap-2 mt-0.5">
                        <span>{selectedTicket.user?.email}</span>
                        {selectedTicket.user?.phone && (
                          <>
                            <span>•</span>
                            <span>{selectedTicket.user?.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SMART CONTEXT BRIDGES */}
                  <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-outline-variant/40">
                    {selectedTicket.category === 'PAYMENT_ISSUE' && (
                      <>
                        <Link
                          href="/super-admin/finance/payouts"
                          className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-extrabold text-[11px] rounded-lg hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                        >
                          <Icon name="payments" size={13} />
                          <span>View Payouts</span>
                        </Link>
                        <Link
                          href="/super-admin/finance/transactions"
                          className="px-2.5 py-1.5 bg-surface-container text-on-surface font-extrabold text-[11px] rounded-lg hover:bg-surface-container-high transition-colors flex items-center gap-1"
                        >
                          <Icon name="receipt_long" size={13} />
                          <span>Ledger</span>
                        </Link>
                      </>
                    )}

                    {selectedTicket.category === 'BANK_VERIFICATION_ISSUE' && (
                      <>
                        <Link
                          href="/super-admin/finance/bank-details"
                          className="px-2.5 py-1.5 bg-amber-500/10 text-amber-800 dark:text-amber-400 font-extrabold text-[11px] rounded-lg hover:bg-amber-500/20 transition-colors flex items-center gap-1"
                        >
                          <Icon name="account_balance" size={13} />
                          <span>Review Bank Account</span>
                        </Link>
                      </>
                    )}

                    {selectedTicket.category === 'COURSE_APPROVAL_ISSUE' && (
                      <>
                        <Link
                          href="/reviewer"
                          className="px-2.5 py-1.5 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-extrabold text-[11px] rounded-lg hover:bg-indigo-500/20 transition-colors flex items-center gap-1"
                        >
                          <Icon name="verified" size={13} />
                          <span>Audit Studio (QA)</span>
                        </Link>
                        <Link
                          href="/admin/courses?tab=review"
                          className="px-2.5 py-1.5 bg-surface-container text-on-surface font-extrabold text-[11px] rounded-lg hover:bg-surface-container-high transition-colors flex items-center gap-1"
                        >
                          <Icon name="rate_review" size={13} />
                          <span>Review Queue</span>
                        </Link>
                      </>
                    )}

                    {selectedTicket.category === 'TECHNICAL_ISSUE' && (
                      <>
                        <Link
                          href="/super-admin/health"
                          className="px-2.5 py-1.5 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-extrabold text-[11px] rounded-lg hover:bg-rose-500/20 transition-colors flex items-center gap-1"
                        >
                          <Icon name="health_and_safety" size={13} />
                          <span>System Health</span>
                        </Link>
                        <Link
                          href="/super-admin/audit"
                          className="px-2.5 py-1.5 bg-surface-container text-on-surface font-extrabold text-[11px] rounded-lg hover:bg-surface-container-high transition-colors flex items-center gap-1"
                        >
                          <Icon name="history" size={13} />
                          <span>Audit Trail</span>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Message History Thread */}
              <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[420px] bg-surface/30">
                {selectedTicket.messages?.map((msg) => {
                  const isStaff =
                    msg.senderRole === 'SUPER_ADMIN' ||
                    msg.senderRole === 'ADMIN' ||
                    msg.senderId === 'system-support-bot';

                  const isBot = msg.senderId === 'system-support-bot';

                  if (isBot) {
                    return (
                      <div
                        key={msg.id}
                        className="p-3 bg-surface-container-low/70 border border-outline-variant/60 rounded-2xl text-[11px] text-outline flex items-start gap-2.5 font-mono"
                      >
                        <Icon name="smart_toy" size={16} className="text-primary mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <div className="font-bold text-on-surface text-[10px] uppercase">{msg.senderName}</div>
                          <div className="whitespace-pre-wrap leading-relaxed mt-0.5">{msg.message}</div>
                        </div>
                        <span className="text-[10px] shrink-0">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 space-y-1.5 shadow-2xs ${
                          isStaff
                            ? 'bg-primary/10 border border-primary/25 text-on-surface'
                            : 'bg-surface border border-outline-variant/80 text-on-surface'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 text-[11px] font-mono pb-1 border-b border-outline-variant/30">
                          <span className="font-extrabold flex items-center gap-1.5">
                            {isStaff ? (
                              <Icon name="shield" size={13} className="text-primary" />
                            ) : (
                              <Icon name="person" size={13} className="text-outline" />
                            )}
                            <span>{msg.senderName}</span>
                            <span
                              className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                                isStaff
                                  ? 'bg-primary text-on-primary'
                                  : 'bg-surface-container text-outline'
                              }`}
                            >
                              {msg.senderRole}
                            </span>
                          </span>
                          <span className="text-[10px] text-outline">
                            {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <p className="text-xs leading-relaxed whitespace-pre-wrap font-sans">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Canned Quick Replies */}
              <div className="p-3 bg-surface-container-low/50 border-t border-outline-variant/40 flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="text-[10px] font-extrabold text-outline uppercase font-mono shrink-0">
                  Quick Canned:
                </span>
                {CANNED_REPLIES.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReplyMessage((prev) => (prev ? `${prev}\n\n${c.text}` : c.text))}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-outline-variant/70 text-[11px] font-bold text-on-surface hover:border-primary hover:text-primary transition-all whitespace-nowrap cursor-pointer shrink-0"
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Reply Composer Bar */}
              <div className="p-4 border-t border-outline-variant/60 bg-surface-container-lowest space-y-3">
                <textarea
                  rows={3}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder={`Write official administrative response to ${selectedTicket.user?.name}...`}
                  className="w-full bg-surface border border-outline-variant rounded-2xl p-3 text-xs focus:outline-none focus:border-primary leading-relaxed"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-[10px] text-outline font-medium flex items-center gap-1.5">
                    <Icon name="mail" size={13} className="text-primary" />
                    <span>Dispatches email notification to user &amp; logs audit trail.</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSendingReply || !replyMessage.trim()}
                      onClick={() => handleSendReply('WAITING')}
                      className="px-3 py-2 bg-surface border border-outline-variant text-on-surface font-extrabold text-xs rounded-xl hover:bg-surface-container transition-all cursor-pointer disabled:opacity-50"
                    >
                      Reply &amp; Mark Waiting
                    </button>

                    <button
                      type="button"
                      disabled={isSendingReply || !replyMessage.trim()}
                      onClick={() => handleSendReply('RESOLVED')}
                      className="px-3 py-2 bg-emerald-600 text-white font-extrabold text-xs rounded-xl hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      <Icon name="check" size={14} />
                      <span>Reply &amp; Resolve</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSendingReply || !replyMessage.trim()}
                      onClick={() => handleSendReply('IN_PROGRESS')}
                      className="px-4 py-2 bg-primary text-on-primary font-black text-xs rounded-xl hover:bg-primary/90 transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Icon name="send" size={15} />
                      <span>{isSendingReply ? 'Sending...' : 'Send Reply'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-outline">
              <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-3 text-outline">
                <Icon name="support_agent" size={32} />
              </div>
              <h3 className="text-sm font-bold text-on-surface">No Ticket Selected</h3>
              <p className="text-xs text-outline max-w-sm mt-1">
                Select any support ticket from the queue on the left to view the complete conversation thread,
                reassign teams, or dispatch official responses.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Create Proactive Ticket / Contact Faculty */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        size="lg"
        title="Create Support Ticket / Contact Faculty"
        subtitle="Initiate a formal administrative support inquiry or resolution ticket for an instructor or student."
      >
        <form onSubmit={handleCreateProactiveTicket} className="space-y-4 pt-2">
          {/* Target User Switcher */}
          <div className="flex items-center gap-2 p-1 bg-surface-container-low rounded-xl">
            <button
              type="button"
              onClick={() => {
                setNewTargetUserType('INSTRUCTOR');
                if (instructorsList.length > 0) setNewSelectedUserId(instructorsList[0].id);
              }}
              className={`flex-1 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                newTargetUserType === 'INSTRUCTOR'
                  ? 'bg-surface shadow-xs text-primary'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              Faculty / Instructor ({instructorsList.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setNewTargetUserType('STUDENT');
                if (studentsList.length > 0) setNewSelectedUserId(studentsList[0].id);
              }}
              className={`flex-1 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                newTargetUserType === 'STUDENT'
                  ? 'bg-surface shadow-xs text-primary'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              Student ({studentsList.length})
            </button>
          </div>

          {/* Select User */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Select {newTargetUserType === 'INSTRUCTOR' ? 'Faculty Member' : 'Student'} *
            </label>
            <select
              value={newSelectedUserId}
              onChange={(e) => setNewSelectedUserId(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-primary cursor-pointer"
              required
            >
              {(newTargetUserType === 'INSTRUCTOR' ? instructorsList : studentsList).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          {/* Category & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">Category *</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="PAYMENT_ISSUE">💳 Payment and Payout Issues</option>
                <option value="COURSE_APPROVAL_ISSUE">🎓 Course Approval Issues</option>
                <option value="BANK_VERIFICATION_ISSUE">🏦 Bank Verification Issue</option>
                <option value="TECHNICAL_ISSUE">🛠️ Technical Issue / Bug</option>
                <option value="COURSE_ACCESS">🔓 Course Access &amp; Enrollment</option>
                <option value="GENERAL">❓ General Inquiry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">Priority *</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="LOW">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Assigned Team */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">Assigned Handler Team</label>
            <select
              value={newAssignedTo}
              onChange={(e) => setNewAssignedTo(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="Accounts (Primary)">Accounts Team</option>
              <option value="Auditor (Primary)">Course Auditor</option>
              <option value="Tech. Team (Primary)">Tech Team</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Support Desk">Support Desk</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">Ticket Subject *</label>
            <input
              type="text"
              required
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="e.g. Bank Account Re-verification or Course Revision Guidance"
              className="w-full bg-surface border border-outline-variant rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-primary"
            />
          </div>

          {/* Initial Message */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">Initial Message / Instructions *</label>
            <textarea
              rows={4}
              required
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Provide complete context, requested action items, or resolution notes..."
              className="w-full bg-surface border border-outline-variant rounded-2xl p-3 text-xs leading-relaxed focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-outline-variant/60">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-outline-variant text-on-surface font-extrabold text-xs rounded-xl hover:bg-surface-container transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingTicket}
              className="px-5 py-2 bg-primary text-on-primary font-black text-xs rounded-xl hover:bg-primary/90 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Icon name="check_circle" size={16} />
              <span>{isCreatingTicket ? 'Logging Ticket...' : 'Create Support Ticket'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

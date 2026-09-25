'use client';

import React, { useEffect, useState } from 'react';
import { InstructorPortalShell } from '@/components/instructor/InstructorPortalShell';
import { Icon } from '@/components/ui/Icon';

interface TicketMessageItem {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

interface SupportTicketItem {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessageItem[];
}

const ISSUE_CATEGORIES = [
  {
    id: 'PAYMENT_ISSUE',
    label: 'Payment & Payout Issue',
    icon: 'payments',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: 'Missing settlement, payout hold, commission calculation, or transaction reconciliation.'
  },
  {
    id: 'COURSE_APPROVAL_ISSUE',
    label: 'Course Approval Issue',
    icon: 'verified',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    desc: 'Pending course review, auditor feedback clarification, or staged version approval.'
  },
  {
    id: 'BANK_VERIFICATION_ISSUE',
    label: 'Bank Verification Issue',
    icon: 'account_balance',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    desc: 'NEFT/IMPS account verification, IFSC mismatch, penny-drop status, or KYC update.'
  },
  {
    id: 'TECHNICAL_ISSUE',
    label: 'Technical / Platform Issue',
    icon: 'build',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    desc: 'Signed video stream DRM, PDF upload, quiz builder, or course curriculum bug.'
  }
];

export default function InstructorSupportPage() {
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [courses, setCourses] = useState<Array<{ id: string; title: string; status: string }>>([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');

  // New Ticket Form State
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newCategory, setNewCategory] = useState('PAYMENT_ISSUE');
  const [newPriority, setNewPriority] = useState('HIGH');
  const [newCourseId, setNewCourseId] = useState('');
  const [newReferenceId, setNewReferenceId] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Reply State
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ title: string; description?: string; type?: string } | null>(null);

  const showToast = (msg: { title: string; description?: string; type?: string }) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadTickets = async (keepTicketId?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);

      const res = await fetch(`/api/instructor/support?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        const list: SupportTicketItem[] = data.tickets || [];
        setTickets(list);
        setCourses(data.courses || []);
        if (data.stats) setStats(data.stats);
        const targetId = keepTicketId || selectedTicketId || list[0]?.id || '';
        setSelectedTicketId(targetId);
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to load support tickets.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [statusFilter, categoryFilter]);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0] || null;

  const openQuickRaise = (catId: string) => {
    setNewCategory(catId);
    setShowNewTicketModal(true);
  };

  const handleRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) {
      showToast({
        title: 'Missing Fields',
        description: 'Please enter a subject and detailed description.',
        type: 'error'
      });
      return;
    }

    try {
      setSubmittingTicket(true);
      const res = await fetch('/api/instructor/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newCategory,
          priority: newPriority,
          courseId: newCourseId || undefined,
          referenceId: newReferenceId || undefined,
          subject: newSubject,
          description: newDescription
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit ticket');

      showToast({
        title: `Ticket ${data.ticket?.ticketNumber} Raised`,
        description: 'Our Instructor Priority Support team has received your request.',
        type: 'success'
      });

      setShowNewTicketModal(false);
      setNewSubject('');
      setNewDescription('');
      setNewReferenceId('');
      await loadTickets(data.ticket?.id);
    } catch (err: any) {
      showToast({ title: 'Submission Failed', description: err.message, type: 'error' });
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleSendReply = async (nextStatus?: string) => {
    if (!selectedTicket) return;
    if (!replyText.trim() && !nextStatus) return;

    try {
      setSendingReply(true);
      const res = await fetch('/api/instructor/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          replyMessage: replyText.trim() || undefined,
          status: nextStatus
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update ticket');

      setReplyText('');
      showToast({
        title: nextStatus ? `Ticket Marked ${nextStatus}` : 'Reply Sent ✓',
        type: 'success'
      });
      await loadTickets(selectedTicket.id);
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setSendingReply(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'IN_PROGRESS':
      case 'WAITING':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <InstructorPortalShell
      title="Instructor Support & Priority Help Desk"
      subtitle="Raise and track priority tickets for Payment & Settlement, Course Approval, Bank Verification, and Technical issues."
      actions={
        <button
          onClick={() => setShowNewTicketModal(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
        >
          <Icon name="add_circle" size={16} />
          <span>Raise Support Ticket</span>
        </button>
      }
    >
      {toastMsg && (
        <div
          className={`mb-4 p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            toastMsg.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div>
            <span className="font-bold">{toastMsg.title}</span>
            {toastMsg.description && <span className="ml-2 font-normal">{toastMsg.description}</span>}
          </div>
          <button onClick={() => setToastMsg(null)} className="text-slate-500 hover:text-slate-800">
            ✕
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* 4 Quick-Issue Category Launcher Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ISSUE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => openQuickRaise(cat.id)}
              className="bg-white hover:bg-slate-50/90 border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 text-left transition-all shadow-xs flex flex-col justify-between gap-3 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border inline-flex items-center gap-1.5 ${cat.badgeClass}`}
                >
                  <Icon name={cat.icon} size={15} />
                  <span>{cat.label}</span>
                </span>
                <Icon
                  name="arrow_outward"
                  size={15}
                  className="text-slate-400 group-hover:text-indigo-600 transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{cat.desc}</p>
            </button>
          ))}
        </div>

        {/* Ticket Status KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-[11px] font-semibold text-slate-500">Total Tickets Raised</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-[11px] font-semibold text-amber-700">Open / Awaiting Action</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{stats.open}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-[11px] font-semibold text-indigo-700">In Progress / Reviewing</div>
            <div className="text-2xl font-black text-indigo-600 mt-1">{stats.inProgress}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-[11px] font-semibold text-emerald-700">Resolved & Closed</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{stats.resolved}</div>
          </div>
        </div>

        {/* Filters & Main 2-Column Ticket Desk */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All Statuses' : st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50"
          >
            <option value="ALL">All Issue Categories</option>
            <option value="PAYMENT_ISSUE">Payment Issues</option>
            <option value="COURSE_APPROVAL_ISSUE">Course Approval Issues</option>
            <option value="BANK_VERIFICATION_ISSUE">Bank Verification Issues</option>
            <option value="TECHNICAL_ISSUE">Technical Issues</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 Columns: Ticket List */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Your Support Tickets ({tickets.length})
              </h3>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading support tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <Icon name="support_agent" size={34} className="text-slate-400 mx-auto" />
                <div className="text-sm font-bold text-slate-800">No Support Tickets Found</div>
                <p className="text-xs text-slate-500">
                  Need help with payments, course review, bank verification, or technical setup? Click &quot;Raise Support Ticket&quot; above.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
                {tickets.map((t) => {
                  const isSelected = selectedTicket?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTicketId(t.id)}
                      className={`w-full p-4 text-left transition-all cursor-pointer block ${
                        isSelected
                          ? 'bg-indigo-50/70 border-l-4 border-indigo-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-mono font-bold text-indigo-600">
                          #{t.ticketNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                            t.status
                          )}`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 line-clamp-1">
                        {t.subject}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-2 text-[10px] text-slate-500">
                        <span className="font-semibold text-slate-600">
                          {t.category.replace(/_/g, ' ')}
                        </span>
                        <span>{new Date(t.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right 7 Columns: Selected Ticket Conversation Thread */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl flex flex-col min-h-[480px]">
            {!selectedTicket ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-slate-400 text-xs">
                Select a ticket on the left to view its status and conversation thread.
              </div>
            ) : (
              <>
                <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-600">
                        #{selectedTicket.ticketNumber}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                          selectedTicket.status
                        )}`}
                      >
                        {selectedTicket.status}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                        Priority: {selectedTicket.priority}
                      </span>
                    </div>
                    <h2 className="text-base font-extrabold text-slate-900 mt-1">
                      {selectedTicket.subject}
                    </h2>
                  </div>

                  {selectedTicket.status !== 'RESOLVED' ? (
                    <button
                      onClick={() => handleSendReply('RESOLVED')}
                      disabled={sendingReply}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold cursor-pointer"
                    >
                      Mark as Resolved ✓
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSendReply('OPEN')}
                      disabled={sendingReply}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold cursor-pointer"
                    >
                      Reopen Ticket
                    </button>
                  )}
                </div>

                {/* Messages List */}
                <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[380px] bg-slate-50/50">
                  {(selectedTicket.messages || []).map((msg) => {
                    const isInstructor = msg.senderRole === 'INSTRUCTOR';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isInstructor ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                            isInstructor
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-800 shadow-xs'
                          }`}
                        >
                          <div
                            className={`text-[10px] font-bold mb-1 flex items-center justify-between gap-4 ${
                              isInstructor ? 'text-indigo-200' : 'text-indigo-600'
                            }`}
                          >
                            <span>{msg.senderName}</span>
                            <span>{new Date(msg.createdAt).toLocaleString()}</span>
                          </div>
                          <div>{msg.message}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Box */}
                <div className="p-4 border-t border-slate-100 bg-white flex items-center gap-3">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder="Write a follow-up message or attach additional reference details..."
                    className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900"
                  />
                  <button
                    onClick={() => handleSendReply()}
                    disabled={sendingReply || !replyText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                  >
                    Send Reply
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Raise Support Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Raise Instructor Support Ticket
                </h3>
                <p className="text-xs text-slate-500">
                  Select your issue type so we route it directly to Finance, Course Audit, or Engineering.
                </p>
              </div>
              <button
                onClick={() => setShowNewTicketModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRaiseTicket} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Issue Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option value="PAYMENT_ISSUE">Payment / Payout Issue</option>
                    <option value="COURSE_APPROVAL_ISSUE">Course Approval / Review Issue</option>
                    <option value="BANK_VERIFICATION_ISSUE">Bank Verification Issue</option>
                    <option value="TECHNICAL_ISSUE">Technical / Platform Issue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent (Payout / Live Course Blocked)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Related Course (Optional)
                  </label>
                  <select
                    value={newCourseId}
                    onChange={(e) => setNewCourseId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800"
                  >
                    <option value="">-- None / General Account --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payout / Bank / Transaction Ref (Optional)
                  </label>
                  <input
                    type="text"
                    value={newReferenceId}
                    onChange={(e) => setNewReferenceId(e.target.value)}
                    placeholder="e.g. PAY-98231 or IFSC code"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ticket Subject
                </label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Bank NEFT verification pending for 48 hours / Course v2 review query"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detailed Issue Description
                </label>
                <textarea
                  rows={4}
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe the exact issue, error message, or payout/approval detail so our team can resolve it quickly..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  {submittingTicket ? 'Submitting Ticket...' : 'Submit Priority Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </InstructorPortalShell>
  );
}

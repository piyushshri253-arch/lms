'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

export default function SuperAdminSupportPage() {
  const { showToast } = useApp();
  const [tickets, setTickets] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Selected Ticket Drawer / Conversation
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/super-admin/support?status=${statusFilter}&q=${encodeURIComponent(search)}`
      );
      if (res.ok) {
        const d = await res.json();
        setTickets(d.tickets || []);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, search]);

  const openTicketDetail = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/super-admin/support?id=${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
        setIsTicketModalOpen(true);
      }
    } catch {}
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;
    setIsSendingReply(true);

    try {
      const res = await fetch(`/api/super-admin/support/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage, status: 'WAITING' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reply');

      showToast({ title: 'Reply Dispatched', description: 'Student was notified.', type: 'success' });
      setReplyMessage('');
      await openTicketDetail(selectedTicket.id);
      await fetchTickets();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleStatusChange = async (ticketId: string, status: string) => {
    try {
      const res = await fetch('/api/super-admin/support', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ticketId, status })
      });
      if (res.ok) {
        showToast({ title: 'Status Updated', description: `Ticket marked ${status}`, type: 'info' });
        await openTicketDetail(ticketId);
        await fetchTickets();
      }
    } catch {}
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/super-admin" className="hover:text-primary">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Support</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Support Ticketing Center
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Resolve student technical inquiries, course access issues, and billing support
          </p>
        </div>

        <span className="text-xs font-mono font-bold px-3 py-1 bg-primary/10 text-primary rounded-full">
          {tickets.length} Active Inquiries
        </span>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Icon
            name="search"
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets, student email, subject..."
            className="w-full bg-surface-container-lowest border border-outline-variant/80 rounded-2xl pl-10 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-lowest border border-outline-variant/80 text-outline hover:text-on-surface'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden">
        {tickets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/70 border-b border-outline-variant/60 text-outline uppercase font-extrabold tracking-wider text-[10px]">
                <tr>
                  <th className="p-4 pl-6">Ticket #</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Subject &amp; Latest Message</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="p-4 pl-6 font-mono font-bold text-primary">#{t.ticketNumber}</td>
                    <td className="p-4 font-bold text-on-surface">{t.user?.name}</td>
                    <td className="p-4 max-w-sm">
                      <p className="font-extrabold text-on-surface truncate">{t.subject}</p>
                      <p className="text-[11px] text-outline truncate mt-0.5">{t.latestMessage}</p>
                    </td>
                    <td className="p-4 font-mono text-[10px] uppercase font-bold">{t.category}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-extrabold uppercase ${
                          t.priority === 'URGENT'
                            ? 'bg-rose-100 text-rose-800'
                            : t.priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-surface-container text-outline'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          t.status === 'OPEN'
                            ? 'bg-rose-100 text-rose-800'
                            : t.status === 'RESOLVED' || t.status === 'CLOSED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => openTicketDetail(t.id)}
                        className="px-3 py-1.5 bg-primary text-on-primary font-bold text-[11px] rounded-xl hover:bg-primary-container shadow-xs cursor-pointer"
                      >
                        Open &amp; Reply
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-outline text-xs">No support tickets found matching filters.</div>
        )}
      </div>

      {/* Ticket Conversation Drawer / Modal */}
      <Modal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        maxWidth="lg"
        title={`Support Ticket #${selectedTicket?.ticketNumber}`}
        subtitle={`Inquiry from ${selectedTicket?.user?.name} (${selectedTicket?.user?.email})`}
      >
        {selectedTicket && (
          <div className="space-y-6">
            {/* Ticket Metadata Bar */}
            <div className="p-4 bg-surface-container-low rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="text-outline">Subject:</span>
                <span className="font-extrabold text-on-surface">{selectedTicket.subject}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-outline">Status:</span>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                  className="bg-surface border border-outline-variant rounded-lg px-2.5 py-1 text-xs font-bold text-on-surface cursor-pointer"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="WAITING">WAITING</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
            </div>

            {/* Messages Thread */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {selectedTicket.messages?.map((msg: any) => {
                const isStaff = msg.senderRole === 'SUPER_ADMIN' || msg.senderRole === 'ADMIN';

                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-2xl space-y-1.5 ${
                      isStaff
                        ? 'bg-primary/10 border border-primary/20 ml-8'
                        : 'bg-surface-container-lowest border border-outline-variant/80 mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-on-surface flex items-center gap-1.5">
                        {isStaff && <Icon name="shield" size={14} className="text-primary" />}
                        <span>{msg.senderName}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-surface-container text-outline">
                          {msg.senderRole}
                        </span>
                      </span>
                      <span className="text-outline">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                    </div>

                    <p className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap">
                      {msg.message}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Reply Input Box */}
            <form onSubmit={handleSendReply} className="space-y-3 pt-2 border-t border-outline-variant/40">
              <textarea
                rows={3}
                required
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your official administrative response to this student..."
                className="w-full bg-surface border border-outline-variant rounded-2xl p-3 text-xs focus:outline-none focus:border-primary"
              />

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-outline font-mono">
                  Replies are automatically delivered to the student dashboard.
                </span>

                <button
                  type="submit"
                  disabled={isSendingReply}
                  className="px-5 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Icon name="send" size={16} />
                  <span>{isSendingReply ? 'Sending...' : 'Send Super Admin Reply'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}

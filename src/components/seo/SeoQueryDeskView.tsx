'use client';

import React, { useState } from 'react';
import {
  HelpCircle,
  Plus,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Send,
  User,
  ShieldCheck,
  Check,
  DollarSign,
  Layers,
  Sparkles
} from 'lucide-react';
import { SeoTeamQuery } from '@/app/api/seo/queries/route';

interface SeoQueryDeskViewProps {
  queries: SeoTeamQuery[];
  courses: any[];
  team: any[];
  loading: boolean;
  onRefresh: () => void;
  currentActorName?: string;
  currentActorRole?: string;
  currentActorId?: string;
}

export function SeoQueryDeskView({
  queries,
  courses,
  team,
  loading,
  onRefresh,
  currentActorName = 'SEO Manager',
  currentActorRole = 'SEO_MANAGER',
  currentActorId = 'seo_manager'
}: SeoQueryDeskViewProps) {
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [activeReplyQueryId, setActiveReplyQueryId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // New Query Form States
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCourseId, setFormCourseId] = useState('');
  const [formCategory, setFormCategory] = useState<SeoTeamQuery['category']>('ADS_BUDGET');
  const [formPriority, setFormPriority] = useState<SeoTeamQuery['priority']>('URGENT');
  const [submittingQuery, setSubmittingQuery] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openNewQueryModal = () => {
    setFormTitle('');
    setFormDescription('');
    setFormCourseId(courses[0]?.id || '');
    setFormCategory('ADS_BUDGET');
    setFormPriority('URGENT');
    setFormError(null);
    setNewModalOpen(true);
  };

  const handleCreateQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmittingQuery(true);

    try {
      const selectedCourse = courses.find((c) => c.id === formCourseId);
      const res = await fetch('/api/seo/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_QUERY',
          title: formTitle.trim(),
          description: formDescription.trim(),
          courseId: formCourseId || undefined,
          courseTitle: selectedCourse?.title || undefined,
          specialistId: currentActorId,
          specialistName: currentActorName,
          specialistRole: currentActorRole,
          category: formCategory,
          priority: formPriority
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit query');

      setNewModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmittingQuery(false);
    }
  };

  const handleSendReply = async (queryId: string) => {
    if (!replyMessage.trim()) return;
    setSendingReply(true);

    try {
      const res = await fetch('/api/seo/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REPLY_QUERY',
          queryId,
          message: replyMessage.trim(),
          senderId: currentActorId,
          senderName: currentActorName,
          senderRole: currentActorRole
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reply');

      setReplyMessage('');
      setActiveReplyQueryId(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSendingReply(false);
    }
  };

  const handleResolveQuery = async (queryId: string) => {
    const note = prompt('Optional resolution note for this query (e.g. "Approved ₹1,000 daily budget"):');
    try {
      const res = await fetch('/api/seo/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESOLVE_QUERY',
          queryId,
          resolutionNote: note || 'Resolved by SEO Manager.'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resolve query');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filter queries
  const filteredQueries = queries.filter((q) => {
    if (filterStatus === 'OPEN') return q.status !== 'RESOLVED';
    if (filterStatus === 'RESOLVED') return q.status === 'RESOLVED';
    return true;
  });

  const getCategoryBadge = (cat: SeoTeamQuery['category']) => {
    switch (cat) {
      case 'ADS_BUDGET':
        return { label: '💰 Ads Budget Approval', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'CONTENT_ISSUE':
        return { label: '🎨 Thumbnail / Video Blocker', color: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'KEYWORD_APPROVAL':
        return { label: '🔍 Keywords Approval', color: 'bg-purple-50 text-purple-800 border-purple-200' };
      default:
        return { label: '❓ General Question', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-16">
      {/* ======================================================== */}
      {/* 1. TOP HEADER & QUICK STATS                              */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold uppercase tracking-wider mb-2">
              <HelpCircle size={13} className="text-amber-600" />
              <span>TEAM QUERIES &amp; ISSUE RESOLUTION DESK</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Team Queries &amp; Support</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 font-mono">
                {queries.length} Queries
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Team members ask questions about daily ad budgets, thumbnail dimensions, and indexing blockers. SEO Manager replies directly.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openNewQueryModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>+ Ask Question / Raise Blocker</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
            {[
              { id: 'ALL', label: `All Queries (${queries.length})` },
              { id: 'OPEN', label: `Open / Unresolved (${queries.filter((q) => q.status !== 'RESOLVED').length})` },
              { id: 'RESOLVED', label: `Resolved (${queries.filter((q) => q.status === 'RESOLVED').length})` }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilterStatus(opt.id)}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterStatus === opt.id ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            Posting as: <strong className="text-slate-800">{currentActorName}</strong>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. QUERIES THREAD LIST                                   */}
      {/* ======================================================== */}
      {filteredQueries.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={22} />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Queries in this View</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            There are no pending questions or blockers. When a team member raises a question, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQueries.map((q) => {
            const catBadge = getCategoryBadge(q.category);
            const isResolved = q.status === 'RESOLVED';

            return (
              <div
                key={q.id}
                className={`bg-white border rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 transition-all ${
                  isResolved ? 'border-slate-200/80 opacity-90' : 'border-amber-200/90 ring-1 ring-amber-100'
                }`}
              >
                {/* Query Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${catBadge.color}`}>
                      {catBadge.label}
                    </span>

                    {q.priority === 'URGENT' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                        🔥 Urgent
                      </span>
                    )}

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 font-mono">
                    {new Date(q.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {/* Question Subject & Description */}
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900 leading-snug">{q.title}</h3>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                    {q.description}
                  </p>

                  {q.courseTitle && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                      <span className="text-[10px] uppercase font-mono text-slate-400">Related Course:</span>
                      <span className="text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100 truncate">
                        🎓 {q.courseTitle}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                    <span>Asked by:</span>
                    <strong className="text-slate-800">{q.specialistName}</strong>
                    <span className="text-slate-400">({q.specialistRole})</span>
                  </div>
                </div>

                {/* Conversation Replies */}
                {q.replies && q.replies.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 block">
                      Discussion &amp; Manager Replies ({q.replies.length})
                    </span>

                    <div className="space-y-2.5 pl-2 sm:pl-4 border-l-2 border-blue-200">
                      {q.replies.map((rep) => {
                        const isManager = rep.senderRole === 'SEO_MANAGER' || rep.senderName.includes('Manager');
                        return (
                          <div
                            key={rep.id}
                            className={`p-3.5 rounded-2xl text-xs space-y-1 ${
                              isManager ? 'bg-blue-50/70 border border-blue-100 text-slate-900' : 'bg-slate-50 border border-slate-100 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-[11px] flex items-center gap-1.5">
                                {isManager ? '👑' : '👤'}
                                <span>{rep.senderName}</span>
                                <span className="text-[10px] text-slate-400 font-normal font-mono">
                                  ({rep.senderRole})
                                </span>
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-800 font-medium leading-relaxed pl-4">
                              {rep.message}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Actions & Reply Form */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveReplyQueryId(activeReplyQueryId === q.id ? null : q.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <MessageSquare size={13} />
                      <span>{activeReplyQueryId === q.id ? 'Cancel Reply' : 'Reply to Query'}</span>
                    </button>

                    {!isResolved && (
                      <button
                        type="button"
                        onClick={() => handleResolveQuery(q.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={13} />
                        <span>Mark Resolved</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Reply Input Box */}
                {activeReplyQueryId === q.id && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <span>Quick Instructions / Templates:</span>
                      <button
                        type="button"
                        onClick={() => setReplyMessage('Approved. You can increase the daily budget to ₹1,000.')}
                        className="text-[11px] text-blue-600 hover:underline bg-white px-2 py-0.5 rounded border border-slate-200"
                      >
                        Approve ₹1,000 Budget
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyMessage('High-res thumbnail asset updated under Media & Thumbnail tab. Please check.')}
                        className="text-[11px] text-blue-600 hover:underline bg-white px-2 py-0.5 rounded border border-slate-200"
                      >
                        Thumbnail Updated
                      </button>
                    </div>

                    <div className="relative">
                      <textarea
                        rows={2}
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder={`Type reply as ${currentActorName}...`}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-hidden resize-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveReplyQueryId(null)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={sendingReply || !replyMessage.trim()}
                        onClick={() => handleSendReply(q.id)}
                        className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        <Send size={12} />
                        <span>{sendingReply ? 'Sending...' : 'Send Reply'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MODAL: ASK NEW QUESTION / RAISE BLOCKER               */}
      {/* ======================================================== */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Ask Question / Report Blocker</h3>
                  <p className="text-xs text-slate-500">Submit an inquiry to the SEO Manager for guidance or approval.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateQuery} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Query Subject / Question</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Google Ads Budget Approval for Digital Campus"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Related Course</label>
                <select
                  value={formCourseId}
                  onChange={(e) => setFormCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">-- No specific course / General inquiry --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      🎓 {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="ADS_BUDGET">💰 Ads Budget Approval</option>
                    <option value="CONTENT_ISSUE">🎨 Thumbnail / Video Asset Issue</option>
                    <option value="KEYWORD_APPROVAL">🔍 SEO Keyword List Approval</option>
                    <option value="TECHNICAL_BLOCKER">⚙️ Indexing / Technical Blocker</option>
                    <option value="GENERAL">❓ General Question</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="URGENT">🔥 Urgent (Blocker)</option>
                    <option value="NORMAL">⚡ Normal Question</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detailed Explanation / Issue Notes
                </label>
                <textarea
                  rows={3}
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Explain what help or approval is needed from the SEO Manager..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingQuery}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {submittingQuery ? 'Submitting...' : 'Submit Query to Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';
import { useApp } from '@/context/AppContext';

interface ReplyItem {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string | null;
  userRole: string;
  isInstructor: boolean;
  isBestAnswer: boolean;
  content: string;
  createdAt: string;
}

interface QuestionThread {
  id: string;
  courseId: string;
  courseTitle: string;
  courseThumbnail: string;
  lessonId: string | null;
  lessonTitle: string;
  lessonType: string;
  moduleId: string | null;
  moduleTitle: string;
  student: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    role: string;
  };
  title: string;
  content: string;
  category: 'QUESTION' | 'FORUM_DISCUSSION' | 'FAQ';
  status: 'UNANSWERED' | 'ANSWERED' | 'RESOLVED';
  isResolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  isPinned: boolean;
  bestReplyId: string | null;
  hasInstructorReply: boolean;
  isInstructorAuthoredThread: boolean;
  replyCount: number;
  createdAt: string;
  lastActivityAt: string;
  replies: ReplyItem[];
}

interface CourseFilterOption {
  id: string;
  title: string;
  status: string;
  lessons: {
    id: string;
    title: string;
    moduleTitle: string;
    type: string;
  }[];
}

function InstructorQuestionsInner() {
  const { currentUser } = useApp();
  const searchParams = useSearchParams();
  const initialCourseId = searchParams?.get('courseId') || '';
  const initialQuestionId = searchParams?.get('questionId') || '';

  const [questions, setQuestions] = useState<QuestionThread[]>([]);
  const [courses, setCourses] = useState<CourseFilterOption[]>([]);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    unansweredCount: 0,
    answeredPendingCount: 0,
    resolvedCount: 0,
    pinnedCount: 0,
    responseRate: 100
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNANSWERED' | 'ANSWERED' | 'RESOLVED' | 'PINNED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'QUESTION' | 'FORUM_DISCUSSION' | 'FAQ'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest_unanswered' | 'most_replies'>('newest');

  // Selected thread in the detail pane
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialQuestionId || null);

  // Reply Composer state
  const [replyText, setReplyText] = useState('');
  const [markAsOfficialAnswer, setMarkAsOfficialAnswer] = useState(true);
  const [submittingReply, setSubmittingReply] = useState(false);

  // Edit Reply state
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyContent, setEditingReplyContent] = useState('');

  // Create New Forum Discussion / FAQ Modal state
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);
  const [newThreadForm, setNewThreadForm] = useState({
    courseId: initialCourseId || '',
    lessonId: '',
    title: '',
    content: '',
    category: 'FORUM_DISCUSSION' as 'FORUM_DISCUSSION' | 'FAQ' | 'QUESTION',
    isPinned: true,
    notifyStudents: true
  });
  const [creatingThread, setCreatingThread] = useState(false);

  const showToastMessage = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (selectedCourseId) params.set('courseId', selectedCourseId);
      if (selectedLessonId) params.set('lessonId', selectedLessonId);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
      if (sortBy) params.set('sortBy', sortBy);

      const res = await fetch(`/api/instructor/questions?${params.toString()}`, {
        cache: 'no-store'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch student questions');
      }

      const list: QuestionThread[] = data.questions || [];
      setQuestions(list);
      setCourses(data.courses || []);
      if (data.stats) setStats(data.stats);

      // Select initial thread if none selected or current no longer in list
      if (list.length > 0) {
        if (initialQuestionId && list.some((q) => q.id === initialQuestionId)) {
          setActiveThreadId((prev) => prev || initialQuestionId);
        } else {
          setActiveThreadId((prev) => (prev && list.some((q) => q.id === prev) ? prev : list[0].id));
        }
      } else {
        setActiveThreadId(null);
      }

      if (!newThreadForm.courseId && data.courses?.length > 0) {
        setNewThreadForm((prev) => ({ ...prev, courseId: data.courses[0].id }));
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load student Q&A.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCourseId, selectedLessonId, statusFilter, categoryFilter, sortBy, initialQuestionId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const activeThread = questions.find((q) => q.id === activeThreadId) || null;

  const selectedCourseObj = courses.find((c) => c.id === selectedCourseId) || null;
  const newThreadCourseObj = courses.find((c) => c.id === newThreadForm.courseId) || null;

  const handlePostReply = async (andMarkResolved: boolean) => {
    if (!activeThread || !replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await fetch('/api/instructor/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REPLY',
          discussionId: activeThread.id,
          content: replyText.trim(),
          markResolved: andMarkResolved,
          markAsBestAnswer: markAsOfficialAnswer
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post reply');

      setReplyText('');
      showToastMessage('success', data.message || 'Reply posted successfully!');
      await fetchQuestions();
    } catch (err: any) {
      showToastMessage('error', err.message || 'Failed to post reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleToggleResolve = async (thread: QuestionThread) => {
    try {
      const nextResolved = !thread.isResolved;
      const res = await fetch('/api/instructor/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_RESOLVE',
          discussionId: thread.id,
          isResolved: nextResolved
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      showToastMessage('success', data.message || (nextResolved ? 'Marked as resolved!' : 'Question reopened.'));
      await fetchQuestions();
    } catch (err: any) {
      showToastMessage('error', err.message || 'Failed to toggle resolution status');
    }
  };

  const handleTogglePin = async (thread: QuestionThread) => {
    try {
      const nextPinned = !thread.isPinned;
      const res = await fetch('/api/instructor/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_PIN',
          discussionId: thread.id,
          isPinned: nextPinned
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to pin/unpin');
      showToastMessage('success', data.message || 'Pin status updated');
      await fetchQuestions();
    } catch (err: any) {
      showToastMessage('error', err.message || 'Failed to update pin');
    }
  };

  const handleMarkBestReply = async (discussionId: string, replyId: string | null) => {
    try {
      const res = await fetch('/api/instructor/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MARK_BEST_REPLY',
          discussionId,
          replyId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark official solution');
      showToastMessage('success', data.message || 'Updated official solution');
      await fetchQuestions();
    } catch (err: any) {
      showToastMessage('error', err.message || 'Failed to update solution badge');
    }
  };

  const handleSaveEditedReply = async (discussionId: string, replyId: string) => {
    if (!editingReplyContent.trim()) return;
    try {
      const res = await fetch('/api/instructor/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EDIT_REPLY',
          discussionId,
          replyId,
          content: editingReplyContent.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to edit reply');
      setEditingReplyId(null);
      setEditingReplyContent('');
      showToastMessage('success', 'Reply updated!');
      await fetchQuestions();
    } catch (err: any) {
      showToastMessage('error', err.message || 'Failed to edit reply');
    }
  };

  const handleDeleteReply = async (discussionId: string, replyId: string) => {
    if (!window.confirm('Delete this reply permanently?')) return;
    try {
      const res = await fetch('/api/instructor/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_REPLY',
          discussionId,
          replyId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete reply');
      showToastMessage('success', 'Reply deleted.');
      await fetchQuestions();
    } catch (err: any) {
      showToastMessage('error', err.message || 'Failed to delete reply');
    }
  };

  const handleDeleteThread = async (discussionId: string) => {
    if (!window.confirm('Are you sure you want to delete this entire question/discussion thread?')) return;
    try {
      const res = await fetch('/api/instructor/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_THREAD',
          discussionId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete thread');
      showToastMessage('success', 'Discussion thread deleted.');
      await fetchQuestions();
    } catch (err: any) {
      showToastMessage('error', err.message || 'Failed to delete thread');
    }
  };

  const handleCreateNewThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThreadForm.courseId || !newThreadForm.title.trim() || !newThreadForm.content.trim()) {
      showToastMessage('error', 'Please select a course and enter both a title and content.');
      return;
    }
    setCreatingThread(true);
    try {
      const res = await fetch('/api/instructor/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_THREAD',
          courseId: newThreadForm.courseId,
          lessonId: newThreadForm.lessonId || null,
          title: newThreadForm.title.trim(),
          content: newThreadForm.content.trim(),
          category: newThreadForm.category,
          isPinned: newThreadForm.isPinned,
          notifyStudents: newThreadForm.notifyStudents
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create discussion thread');

      setShowNewThreadModal(false);
      setNewThreadForm((prev) => ({
        ...prev,
        title: '',
        content: ''
      }));
      showToastMessage('success', data.message || 'Course discussion thread published!');
      await fetchQuestions();
      if (data.discussionId) {
        setActiveThreadId(data.discussionId);
      }
    } catch (err: any) {
      showToastMessage('error', err.message || 'Failed to create thread');
    } finally {
      setCreatingThread(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  return (
    <InstructorPortalShell
      title="Student Interaction, Q&A & Course Forum"
      subtitle="Answer student lesson doubts, mark questions as resolved, and manage course-wide discussion forums"
      profile={{
        name: currentUser?.name || 'Instructor',
        email: currentUser?.email || '',
        role: 'INSTRUCTOR',
        emailVerified: true
      }}
    >
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl border flex items-center gap-2.5 text-sm font-bold transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top Header & Primary CTA */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-[15px]">forum</span>
            Student Q&A & Course Discussions
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Student Questions & Course Discussion Hub
          </h2>
          <p className="text-sm text-slate-500">
            View every question asked across your courses and lessons, reply with official solutions, and mark threads as resolved.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchQuestions()}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[17px]">refresh</span>
            Refresh
          </button>
          <button
            onClick={() => setShowNewThreadModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-2 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add_comment</span>
            + New Forum Topic / Course FAQ
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`text-left p-4 rounded-2xl border transition-all ${
            statusFilter === 'ALL'
              ? 'bg-indigo-50/80 border-indigo-300 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Total Threads</span>
            <span className="material-symbols-outlined text-[18px] text-indigo-600">question_answer</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.totalQuestions}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">All student Q&A & forum posts</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('UNANSWERED')}
          className={`text-left p-4 rounded-2xl border transition-all ${
            statusFilter === 'UNANSWERED'
              ? 'bg-amber-50 border-amber-400 shadow-sm'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-700">Unanswered</span>
            <span className="material-symbols-outlined text-[18px] text-amber-600">notification_important</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-amber-700">{stats.unansweredCount}</p>
            {stats.unansweredCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                Needs Reply
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Awaiting your instructor response</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('ANSWERED')}
          className={`text-left p-4 rounded-2xl border transition-all ${
            statusFilter === 'ANSWERED'
              ? 'bg-sky-50 border-sky-300 shadow-sm'
              : 'bg-white border-slate-200 hover:border-sky-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-sky-700">Replied / Active</span>
            <span className="material-symbols-outlined text-[18px] text-sky-600">mark_chat_read</span>
          </div>
          <p className="text-2xl font-black text-sky-700">{stats.answeredPendingCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Replied, open for follow-up</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('RESOLVED')}
          className={`text-left p-4 rounded-2xl border transition-all ${
            statusFilter === 'RESOLVED'
              ? 'bg-emerald-50 border-emerald-300 shadow-sm'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Resolved</span>
            <span className="material-symbols-outlined text-[18px] text-emerald-600">task_alt</span>
          </div>
          <p className="text-2xl font-black text-emerald-700">{stats.resolvedCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Completed & verified solutions</p>
        </button>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Response Rate</span>
            <span className="material-symbols-outlined text-[18px] text-purple-600">bolt</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.responseRate}%</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{stats.pinnedCount} pinned forum threads</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: `All (${stats.totalQuestions})`, icon: 'list' },
              { id: 'UNANSWERED', label: `Unanswered (${stats.unansweredCount})`, icon: 'pending_actions' },
              { id: 'ANSWERED', label: `Replied (${stats.answeredPendingCount})`, icon: 'chat' },
              { id: 'RESOLVED', label: `Resolved (${stats.resolvedCount})`, icon: 'check_circle' },
              { id: 'PINNED', label: `Pinned Forum (${stats.pinnedCount})`, icon: 'keep' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Thread Type Filter */}
          <div className="flex items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All Types' },
              { id: 'QUESTION', label: 'Student Q&A' },
              { id: 'FORUM_DISCUSSION', label: 'Course Forum' },
              { id: 'FAQ', label: 'Course FAQs' }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  categoryFilter === cat.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Search Input */}
          <div className="relative">
            <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search question, student, lesson..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Course Filter */}
          <div>
            <select
              value={selectedCourseId}
              onChange={(e) => {
                setSelectedCourseId(e.target.value);
                setSelectedLessonId('');
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All My Courses ({courses.length})</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Lesson Filter */}
          <div>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Lessons & Course Forum</option>
              <option value="GENERAL">General Course Forum (No specific lesson)</option>
              {(selectedCourseObj ? selectedCourseObj.lessons : courses.flatMap((c) => c.lessons)).map((les) => (
                <option key={les.id} value={les.id}>
                  {les.moduleTitle} — {les.title}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="newest">Sort: Newest Questions First</option>
              <option value="oldest_unanswered">Sort: Oldest Unanswered First (Priority)</option>
              <option value="most_replies">Sort: Most Active / Replies</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Split View: Left Question Feed + Right Interactive Thread & Reply Studio */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Loading Student Questions & Course Forum...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
          <p className="text-sm font-bold text-rose-700 mb-2">{error}</p>
          <button
            onClick={() => fetchQuestions()}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
          >
            Retry
          </button>
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-[28px]">forum</span>
          </div>
          <h3 className="text-base font-black text-slate-900 mb-1">No Student Questions Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
            {statusFilter === 'UNANSWERED'
              ? 'Awesome! You have 0 unanswered student questions right now.'
              : 'No student questions or discussion threads match your current filters. You can also start a course discussion or FAQ thread below.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            {statusFilter !== 'ALL' && (
              <button
                onClick={() => {
                  setStatusFilter('ALL');
                  setCategoryFilter('ALL');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Reset Filters
              </button>
            )}
            <button
              onClick={() => setShowNewThreadModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              + Post Course Discussion / FAQ
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Questions List (5 cols on desktop) */}
          <div className="lg:col-span-5 space-y-3 max-h-[780px] overflow-y-auto pr-1">
            {questions.map((q) => {
              const isSelected = q.id === activeThread?.id;
              return (
                <div
                  key={q.id}
                  onClick={() => setActiveThreadId(q.id)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? 'bg-indigo-50/60 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                  }`}
                >
                  {/* Top Row: Status Badges + Pinned + Time */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {q.isPinned && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-black uppercase flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">keep</span>
                          Pinned
                        </span>
                      )}
                      {q.status === 'UNANSWERED' && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                          Unanswered
                        </span>
                      )}
                      {q.status === 'ANSWERED' && (
                        <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-black uppercase">
                          Replied
                        </span>
                      )}
                      {q.status === 'RESOLVED' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">check_circle</span>
                          Resolved
                        </span>
                      )}
                      {q.category === 'FORUM_DISCUSSION' && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                          Forum Topic
                        </span>
                      )}
                      {q.category === 'FAQ' && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                          Course FAQ
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 font-medium">
                      {formatDate(q.createdAt)}
                    </span>
                  </div>

                  {/* Question Title & Snippet */}
                  <h4 className="text-sm font-black text-slate-900 line-clamp-1 mb-1">{q.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2 mb-3">{q.content}</p>

                  {/* Course & Lesson Context Pill */}
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 mb-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 truncate">
                      <span className="material-symbols-outlined text-[14px]">menu_book</span>
                      <span className="truncate">{q.courseTitle}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 truncate">
                      <span className="material-symbols-outlined text-[14px] text-slate-400">play_lesson</span>
                      <span className="truncate">
                        {q.lessonId ? `${q.moduleTitle} • ${q.lessonTitle}` : 'General Course Forum'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Row: Student Name & Reply Counter + Quick Resolve */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                        {(q.student.name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-800 truncate">{q.student.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">chat_bubble</span>
                        {q.replyCount} {q.replyCount === 1 ? 'reply' : 'replies'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleResolve(q);
                        }}
                        title={q.isResolved ? 'Reopen Question' : 'Mark as Resolved'}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all ${
                          q.isResolved
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                        }`}
                      >
                        {q.isResolved ? '✓ Resolved' : 'Resolve'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Active Question Thread Details, Replies & Instructor Reply Studio (7 cols on desktop) */}
          <div className="lg:col-span-7">
            {activeThread ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Thread Header */}
                <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {activeThread.status === 'UNANSWERED' && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-black uppercase flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">schedule</span>
                          Unanswered Question
                        </span>
                      )}
                      {activeThread.status === 'ANSWERED' && (
                        <span className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 text-xs font-black uppercase flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">mark_chat_read</span>
                          Instructor Replied
                        </span>
                      )}
                      {activeThread.status === 'RESOLVED' && (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black uppercase flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">verified</span>
                          Resolved
                          {activeThread.resolvedBy ? ` by ${activeThread.resolvedBy}` : ''}
                        </span>
                      )}
                      {activeThread.isPinned && (
                        <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 text-xs font-black uppercase flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">keep</span>
                          Pinned in Course Forum
                        </span>
                      )}
                    </div>

                    {/* Action Toolbar */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleResolve(activeThread)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                          activeThread.isResolved
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {activeThread.isResolved ? 'restart_alt' : 'task_alt'}
                        </span>
                        {activeThread.isResolved ? 'Reopen Question' : 'Mark as Resolved'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePin(activeThread)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition-all ${
                          activeThread.isPinned
                            ? 'bg-purple-50 border-purple-300 text-purple-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">keep</span>
                        {activeThread.isPinned ? 'Unpin' : 'Pin to Forum'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteThread(activeThread.id)}
                        className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all"
                        title="Delete Thread"
                      >
                        <span className="material-symbols-outlined text-[17px]">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Question Title */}
                  <h3 className="text-lg font-black text-slate-900 mb-2">{activeThread.title}</h3>

                  {/* Course & Lesson Breadcrumb Box */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200 mb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-black text-indigo-700">
                        <span className="material-symbols-outlined text-[16px]">school</span>
                        <span>Course: {activeThread.courseTitle}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">play_lesson</span>
                        <span>
                          {activeThread.lessonId
                            ? `Module: ${activeThread.moduleTitle} → Lesson: ${activeThread.lessonTitle}`
                            : 'Location: General Course Discussion / Forum'}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/learn/${activeThread.courseId}`}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                      Open Course Player
                    </Link>
                  </div>

                  {/* Student Question Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90">
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                          {(activeThread.student.name || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">{activeThread.student.name}</span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-bold uppercase">
                              {activeThread.student.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">{activeThread.student.email}</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        Asked on {formatDate(activeThread.createdAt)}
                      </span>
                    </div>
                    <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed pl-11">
                      {activeThread.content}
                    </div>
                  </div>
                </div>

                {/* Replies List */}
                <div className="p-5 space-y-4 max-h-[380px] overflow-y-auto bg-slate-50/40">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Discussion Replies ({activeThread.replies.length})
                    </h4>
                  </div>

                  {activeThread.replies.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 text-center">
                      <p className="text-xs font-bold text-amber-800">
                        No replies yet. Be the first to answer {activeThread.student.name}&apos;s question below!
                      </p>
                    </div>
                  ) : (
                    activeThread.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          reply.isBestAnswer
                            ? 'bg-emerald-50/70 border-emerald-400 shadow-sm'
                            : reply.isInstructor
                            ? 'bg-indigo-50/50 border-indigo-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        {reply.isBestAnswer && (
                          <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-black uppercase tracking-wider mb-2 pb-1.5 border-b border-emerald-200">
                            <span className="material-symbols-outlined text-[16px]">verified</span>
                            Official Instructor Solution / Best Answer
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-full text-white text-xs font-black flex items-center justify-center ${
                                reply.isInstructor ? 'bg-indigo-600' : 'bg-slate-600'
                              }`}
                            >
                              {(reply.userName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-slate-900">{reply.userName}</span>
                                {reply.isInstructor && (
                                  <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black uppercase">
                                    Instructor
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400">{formatDate(reply.createdAt)}</span>
                            </div>
                          </div>

                          {/* Reply Moderation Controls */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleMarkBestReply(
                                  activeThread.id,
                                  reply.isBestAnswer ? null : reply.id
                                )
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                                reply.isBestAnswer
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700'
                              }`}
                            >
                              {reply.isBestAnswer ? '★ Official Answer' : 'Mark as Best Answer'}
                            </button>

                            {reply.isInstructor && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingReplyId(reply.id);
                                  setEditingReplyContent(reply.content);
                                }}
                                className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                                title="Edit Reply"
                              >
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteReply(activeThread.id, reply.id)}
                              className="p-1 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50"
                              title="Delete Reply"
                            >
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                            </button>
                          </div>
                        </div>

                        {editingReplyId === reply.id ? (
                          <div className="mt-2 space-y-2">
                            <textarea
                              rows={3}
                              value={editingReplyContent}
                              onChange={(e) => setEditingReplyContent(e.target.value)}
                              className="w-full p-2.5 rounded-xl border border-indigo-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingReplyId(null);
                                  setEditingReplyContent('');
                                }}
                                className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-600"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditedReply(activeThread.id, reply.id)}
                                className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed pl-9">
                            {reply.content}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Instructor Reply Composer */}
                <div className="p-5 border-t border-slate-200 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[17px] text-indigo-600">reply</span>
                      Post Official Instructor Reply
                    </label>

                    {/* Quick Response Snippet Chips */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        'Great question! Here is the step-by-step explanation:',
                        'Please refer to the downloadable notes in this lesson for the code example.',
                        'I have updated the lesson material to clarify this concept. Let me know if it helps!'
                      ].map((snippet, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setReplyText((prev) => (prev ? `${prev}\n${snippet}` : snippet))
                          }
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 text-[10px] font-bold transition-all"
                        >
                          + Template {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Write your reply to ${activeThread.student.name}...`}
                    className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={markAsOfficialAnswer}
                        onChange={(e) => setMarkAsOfficialAnswer(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Highlight my reply as Official Instructor Solution
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={submittingReply || !replyText.trim()}
                        onClick={() => handlePostReply(false)}
                        className="px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 text-xs font-black flex items-center gap-1.5 transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">send</span>
                        Post Reply
                      </button>

                      <button
                        type="button"
                        disabled={submittingReply || !replyText.trim()}
                        onClick={() => handlePostReply(true)}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">done_all</span>
                        Reply & Mark Resolved
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <p className="text-sm font-bold text-slate-500">
                  Select a question from the left panel to view details and post a reply.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create New Course Discussion / FAQ Thread */}
      {showNewThreadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">forum</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Start Course Discussion or FAQ Thread
                  </h3>
                  <p className="text-xs text-slate-500">
                    Post a discussion prompt, study tip, or pinned FAQ for students in your course
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewThreadModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateNewThread} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">Course *</label>
                  <select
                    required
                    value={newThreadForm.courseId}
                    onChange={(e) =>
                      setNewThreadForm((prev) => ({
                        ...prev,
                        courseId: e.target.value,
                        lessonId: ''
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <option value="">Select Course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Lesson (Optional)
                  </label>
                  <select
                    value={newThreadForm.lessonId}
                    onChange={(e) =>
                      setNewThreadForm((prev) => ({ ...prev, lessonId: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <option value="">General Course Forum (Course-Wide)</option>
                    {(newThreadCourseObj?.lessons || []).map((les) => (
                      <option key={les.id} value={les.id}>
                        {les.moduleTitle} — {les.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Thread Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'FORUM_DISCUSSION', label: 'Course Discussion Topic', icon: 'forum' },
                    { id: 'FAQ', label: 'Pinned Course FAQ / Guide', icon: 'help' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setNewThreadForm((prev) => ({ ...prev, category: t.id as any }))
                      }
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        newThreadForm.category === t.id
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Topic / Question Title *
                </label>
                <input
                  type="text"
                  required
                  value={newThreadForm.title}
                  onChange={(e) =>
                    setNewThreadForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g., Welcome to the Course Forum! Ask your Module 1 questions here"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Discussion Content / Answer *
                </label>
                <textarea
                  rows={4}
                  required
                  value={newThreadForm.content}
                  onChange={(e) =>
                    setNewThreadForm((prev) => ({ ...prev, content: e.target.value }))
                  }
                  placeholder="Write your discussion prompt, key takeaways, or FAQ answer..."
                  className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                />
              </div>

              <div className="flex flex-wrap items-center gap-5 pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newThreadForm.isPinned}
                    onChange={(e) =>
                      setNewThreadForm((prev) => ({ ...prev, isPinned: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  Pin to top of Course Forum
                </label>

                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newThreadForm.notifyStudents}
                    onChange={(e) =>
                      setNewThreadForm((prev) => ({
                        ...prev,
                        notifyStudents: e.target.checked
                      }))
                    }
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  Notify enrolled students
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewThreadModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingThread}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black shadow-sm"
                >
                  {creatingThread ? 'Publishing...' : 'Publish to Course Forum'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </InstructorPortalShell>
  );
}

export default function InstructorQuestionsPage() {
  return (
    <Suspense fallback={null}>
      <InstructorQuestionsInner />
    </Suspense>
  );
}

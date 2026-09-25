'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';

interface ReplyItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  userRole: string;
  isInstructor: boolean;
  isBestAnswer: boolean;
  content: string;
  createdAt: string;
}

interface StudentQuestionItem {
  id: string;
  isMine: boolean;
  courseId: string;
  courseTitle: string;
  courseThumbnail: string;
  instructorName: string;
  lessonId: string | null;
  lessonTitle: string;
  moduleTitle: string;
  author: {
    id: string;
    name: string;
    avatar?: string | null;
    role: string;
  };
  title: string;
  content: string;
  category: 'QUESTION' | 'FORUM_DISCUSSION' | 'FAQ';
  status: 'PENDING' | 'ANSWERED' | 'RESOLVED';
  isResolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  isPinned: boolean;
  bestReplyId: string | null;
  hasInstructorReply: boolean;
  replyCount: number;
  createdAt: string;
  replies: ReplyItem[];
}

interface CourseOption {
  id: string;
  title: string;
  instructorName: string;
  lessons: {
    id: string;
    title: string;
    moduleTitle: string;
    type: string;
  }[];
}

export function StudentQuestionsView() {
  const { currentUser } = useApp();
  const searchParams = useSearchParams();
  const initialQuestionId = searchParams?.get('questionId') || '';
  const initialCourseId = searchParams?.get('courseId') || '';

  const [questions, setQuestions] = useState<StudentQuestionItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [stats, setStats] = useState({
    myTotalQuestions: 0,
    myPendingCount: 0,
    myAnsweredCount: 0,
    myResolvedCount: 0,
    courseForumCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [viewMode, setViewMode] = useState<'MY_QUESTIONS' | 'COURSE_FORUM'>('MY_QUESTIONS');
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ANSWERED' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected question thread
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialQuestionId || null);

  // Follow-up reply box
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Ask New Question Modal
  const [showAskModal, setShowAskModal] = useState(false);
  const [askForm, setAskForm] = useState({
    courseId: initialCourseId || '',
    lessonId: '',
    title: '',
    content: ''
  });
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  const showToastMessage = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchStudentQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('view', viewMode);
      if (selectedCourseId) params.set('courseId', selectedCourseId);
      if (selectedLessonId) params.set('lessonId', selectedLessonId);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/student/questions?${params.toString()}`, {
        cache: 'no-store'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load questions');

      const list: StudentQuestionItem[] = data.questions || [];
      setQuestions(list);
      setCourses(data.courses || []);
      if (data.stats) setStats(data.stats);

      if (list.length > 0) {
        if (initialQuestionId && list.some((q) => q.id === initialQuestionId)) {
          setActiveThreadId((prev) => prev || initialQuestionId);
        } else {
          setActiveThreadId((prev) => (prev && list.some((q) => q.id === prev) ? prev : list[0].id));
        }
      } else {
        setActiveThreadId(null);
      }

      if (!askForm.courseId && data.courses?.length > 0) {
        setAskForm((prev) => ({ ...prev, courseId: data.courses[0].id }));
      }
    } catch (err: any) {
      showToastMessage('error', err.message || 'Unable to load Q&A.');
    } finally {
      setLoading(false);
    }
  }, [viewMode, selectedCourseId, selectedLessonId, statusFilter, searchQuery, initialQuestionId]);

  useEffect(() => {
    fetchStudentQuestions();
  }, [fetchStudentQuestions]);

  const activeThread = questions.find((q) => q.id === activeThreadId) || null;
  const selectedCourseObj = courses.find((c) => c.id === selectedCourseId) || null;
  const askCourseObj = courses.find((c) => c.id === askForm.courseId) || null;

  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askForm.courseId || !askForm.title.trim() || !askForm.content.trim()) {
      showToastMessage('error', 'Please select your course and enter your question title & details.');
      return;
    }
    setSubmittingQuestion(true);
    try {
      const res = await fetch('/api/student/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ASK_QUESTION',
          courseId: askForm.courseId,
          lessonId: askForm.lessonId || null,
          title: askForm.title.trim(),
          content: askForm.content.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit question');

      setShowAskModal(false);
      setAskForm((prev) => ({ ...prev, title: '', content: '' }));
      setViewMode('MY_QUESTIONS');
      showToastMessage('success', data.message || 'Your question was sent to the Instructor!');
      await fetchStudentQuestions();
      if (data.questionId) {
        setActiveThreadId(data.questionId);
      }
    } catch (err: any) {
      showToastMessage('error', err.message || 'Failed to submit question');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetch('/api/student/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REPLY',
          discussionId: activeThread.id,
          content: replyText.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post reply');
      setReplyText('');
      showToastMessage('success', 'Follow-up reply posted!');
      await fetchStudentQuestions();
    } catch (err: any) {
      showToastMessage('error', err.message || 'Failed to post reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleToggleMyResolution = async (thread: StudentQuestionItem) => {
    try {
      const nextResolved = !thread.isResolved;
      const res = await fetch('/api/student/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discussionId: thread.id,
          isResolved: nextResolved
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      showToastMessage('success', data.message || 'Status updated');
      await fetchStudentQuestions();
    } catch (err: any) {
      showToastMessage('error', err.message || 'Failed to update status');
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
    <div className="space-y-6">
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

      {/* Header & Ask Question CTA */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-6 sm:p-7 text-white shadow-lg flex flex-wrap items-center justify-between gap-5">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs font-black uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-[16px]">support_agent</span>
            Direct Instructor Q&A & Course Forum
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Ask Your Instructor & Track Your Doubts
          </h1>
          <p className="text-xs sm:text-sm text-indigo-100 mt-1">
            Stuck on any lesson or concept? Post your question directly to your Course Instructor, get official solutions, or browse the Course Forum & Pinned FAQs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAskModal(true)}
          className="px-5 py-3 rounded-2xl bg-white hover:bg-indigo-50 text-indigo-700 text-xs sm:text-sm font-black flex items-center gap-2 shadow-md transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">add_comment</span>
          + Ask Instructor a Question
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <button
          type="button"
          onClick={() => {
            setViewMode('MY_QUESTIONS');
            setStatusFilter('ALL');
          }}
          className={`text-left p-4 rounded-2xl border transition-all ${
            viewMode === 'MY_QUESTIONS' && statusFilter === 'ALL'
              ? 'bg-indigo-50 border-indigo-300 shadow-sm'
              : 'bg-white border-slate-200 hover:border-indigo-200'
          }`}
        >
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">My Asked Questions</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.myTotalQuestions}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Total doubts asked by you</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode('MY_QUESTIONS');
            setStatusFilter('PENDING');
          }}
          className={`text-left p-4 rounded-2xl border transition-all ${
            viewMode === 'MY_QUESTIONS' && statusFilter === 'PENDING'
              ? 'bg-amber-50 border-amber-300 shadow-sm'
              : 'bg-white border-slate-200 hover:border-amber-200'
          }`}
        >
          <p className="text-[11px] font-black uppercase tracking-wider text-amber-700">Awaiting Reply</p>
          <p className="text-2xl font-black text-amber-700 mt-1">{stats.myPendingCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Pending instructor answer</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode('MY_QUESTIONS');
            setStatusFilter('ANSWERED');
          }}
          className={`text-left p-4 rounded-2xl border transition-all ${
            viewMode === 'MY_QUESTIONS' && statusFilter === 'ANSWERED'
              ? 'bg-sky-50 border-sky-300 shadow-sm'
              : 'bg-white border-slate-200 hover:border-sky-200'
          }`}
        >
          <p className="text-[11px] font-black uppercase tracking-wider text-sky-700">Instructor Replied ★</p>
          <p className="text-2xl font-black text-sky-700 mt-1">{stats.myAnsweredCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Answered by your instructor</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode('MY_QUESTIONS');
            setStatusFilter('RESOLVED');
          }}
          className={`text-left p-4 rounded-2xl border transition-all ${
            viewMode === 'MY_QUESTIONS' && statusFilter === 'RESOLVED'
              ? 'bg-emerald-50 border-emerald-300 shadow-sm'
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}
        >
          <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Resolved Doubts ✓</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{stats.myResolvedCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Completed & solved doubts</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode('COURSE_FORUM');
            setStatusFilter('ALL');
          }}
          className={`text-left p-4 rounded-2xl border transition-all ${
            viewMode === 'COURSE_FORUM'
              ? 'bg-purple-50 border-purple-300 shadow-sm'
              : 'bg-white border-slate-200 hover:border-purple-200'
          }`}
        >
          <p className="text-[11px] font-black uppercase tracking-wider text-purple-700">Course Forum & FAQs</p>
          <p className="text-2xl font-black text-purple-700 mt-1">{stats.courseForumCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">All course discussions & FAQs</p>
        </button>
      </div>

      {/* Mode Switcher & Search / Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Primary View Tabs */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('MY_QUESTIONS')}
              className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                viewMode === 'MY_QUESTIONS'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">person_raised_hand</span>
              My Asked Questions ({stats.myTotalQuestions})
            </button>

            <button
              type="button"
              onClick={() => setViewMode('COURSE_FORUM')}
              className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                viewMode === 'COURSE_FORUM'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">forum</span>
              Course Forum & Pinned FAQs ({stats.courseForumCount})
            </button>
          </div>

          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'PENDING', label: 'Pending Reply' },
              { id: 'ANSWERED', label: 'Instructor Answered' },
              { id: 'RESOLVED', label: 'Resolved' }
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === st.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          {/* Search Input */}
          <div className="relative">
            <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your questions, course, lesson or instructor reply..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Course Dropdown */}
          <div>
            <select
              value={selectedCourseId}
              onChange={(e) => {
                setSelectedCourseId(e.target.value);
                setSelectedLessonId('');
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
            >
              <option value="">All Enrolled Courses ({courses.length})</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} (Instructor: {c.instructorName})
                </option>
              ))}
            </select>
          </div>

          {/* Lesson Dropdown */}
          <div>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
            >
              <option value="">All Lessons & Course Forum</option>
              <option value="GENERAL">General Course Questions</option>
              {(selectedCourseObj ? selectedCourseObj.lessons : courses.flatMap((c) => c.lessons)).map(
                (les) => (
                  <option key={les.id} value={les.id}>
                    {les.moduleTitle} — {les.title}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Main Split Workspace */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Loading your Q&A threads...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-[28px]">live_help</span>
          </div>
          <h3 className="text-base font-black text-slate-900 mb-1">
            {viewMode === 'MY_QUESTIONS'
              ? "You Haven't Asked Any Questions Yet"
              : 'No Course Discussions Found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
            Have a doubt about any course video, quiz, or assignment? Click below to send your question directly to your Course Instructor!
          </p>
          <button
            type="button"
            onClick={() => setShowAskModal(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black inline-flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add_comment</span>
            + Ask Instructor a Question
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Question List (5 cols) */}
          <div className="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
            {questions.map((q) => {
              const isSelected = q.id === activeThread?.id;
              return (
                <div
                  key={q.id}
                  onClick={() => setActiveThreadId(q.id)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {q.isPinned && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-black uppercase">
                          Pinned
                        </span>
                      )}
                      {q.status === 'PENDING' && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                          Pending Reply
                        </span>
                      )}
                      {q.status === 'ANSWERED' && (
                        <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-black uppercase">
                          Instructor Answered ★
                        </span>
                      )}
                      {q.status === 'RESOLVED' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                          ✓ Resolved
                        </span>
                      )}
                      {q.category === 'FAQ' && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                          Course FAQ
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">{formatDate(q.createdAt)}</span>
                  </div>

                  <h4 className="text-sm font-black text-slate-900 line-clamp-1 mb-1">{q.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2 mb-3">{q.content}</p>

                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 mb-2.5 space-y-0.5">
                    <p className="text-[11px] font-bold text-indigo-700 truncate">
                      Course: {q.courseTitle}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {q.lessonId ? `${q.moduleTitle} • ${q.lessonTitle}` : 'General Course Forum'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>Instructor: {q.instructorName}</span>
                    <span className="font-bold text-slate-700">
                      {q.replyCount} {q.replyCount === 1 ? 'reply' : 'replies'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Question Details & Instructor Replies (7 cols) */}
          <div className="lg:col-span-7">
            {activeThread ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Thread Top Header */}
                <div className="p-5 border-b border-slate-200 bg-slate-50/60">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      {activeThread.status === 'PENDING' && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-black uppercase">
                          Awaiting Instructor Reply
                        </span>
                      )}
                      {activeThread.status === 'ANSWERED' && (
                        <span className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 text-xs font-black uppercase">
                          Instructor Replied
                        </span>
                      )}
                      {activeThread.status === 'RESOLVED' && (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black uppercase">
                          ✓ Resolved
                        </span>
                      )}
                    </div>

                    {activeThread.isMine && (
                      <button
                        type="button"
                        onClick={() => handleToggleMyResolution(activeThread)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                          activeThread.isResolved
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {activeThread.isResolved ? 'restart_alt' : 'task_alt'}
                        </span>
                        {activeThread.isResolved ? 'Reopen My Doubt' : 'Mark My Doubt as Resolved'}
                      </button>
                    )}
                  </div>

                  <h3 className="text-lg font-black text-slate-900 mb-2">{activeThread.title}</h3>

                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200 mb-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-indigo-700">
                        Course: {activeThread.courseTitle} (Instructor: {activeThread.instructorName})
                      </p>
                      <p className="text-xs text-slate-500">
                        {activeThread.lessonId
                          ? `Module: ${activeThread.moduleTitle} → Lesson: ${activeThread.lessonTitle}`
                          : 'General Course Forum'}
                      </p>
                    </div>
                    <Link
                      href={`/learn/${activeThread.courseId}`}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold"
                    >
                      Go to Course Player →
                    </Link>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-800">
                        Asked by {activeThread.author.name}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDate(activeThread.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {activeThread.content}
                    </p>
                  </div>
                </div>

                {/* Replies Timeline */}
                <div className="p-5 space-y-3.5 max-h-[380px] overflow-y-auto">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Instructor & Discussion Replies ({activeThread.replies.length})
                  </h4>

                  {activeThread.replies.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center">
                      <p className="text-xs font-bold text-slate-600">
                        Your instructor ({activeThread.instructorName}) has been notified and will reply soon.
                      </p>
                    </div>
                  ) : (
                    activeThread.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`p-4 rounded-2xl border ${
                          reply.isBestAnswer
                            ? 'bg-emerald-50/70 border-emerald-400 shadow-sm'
                            : reply.isInstructor
                            ? 'bg-indigo-50/60 border-indigo-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        {reply.isBestAnswer && (
                          <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-black uppercase tracking-wider mb-2 pb-1.5 border-b border-emerald-200">
                            <span className="material-symbols-outlined text-[16px]">verified</span>
                            ★ Official Instructor Solution
                          </div>
                        )}
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">{reply.userName}</span>
                            {reply.isInstructor && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black uppercase">
                                Course Instructor
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">{formatDate(reply.createdAt)}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {reply.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Student Follow-up Reply Form */}
                <form onSubmit={handleReplySubmit} className="p-5 border-t border-slate-200 bg-slate-50/50">
                  <label className="block text-xs font-black text-slate-700 mb-2">
                    Add Follow-up Reply or Thank Your Instructor
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a follow-up question or reply..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black shrink-0"
                    >
                      {sendingReply ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Modal: Ask Instructor a New Question */}
      {showAskModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">live_help</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Ask Your Course Instructor a Question
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select your course and lesson so your instructor can give you an exact solution
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAskModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAskSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Select Course *
                </label>
                <select
                  required
                  value={askForm.courseId}
                  onChange={(e) =>
                    setAskForm((prev) => ({ ...prev, courseId: e.target.value, lessonId: '' }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                >
                  <option value="">-- Choose Enrolled Course --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} (Instructor: {c.instructorName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Select Module / Lesson (Optional)
                </label>
                <select
                  value={askForm.lessonId}
                  onChange={(e) =>
                    setAskForm((prev) => ({ ...prev, lessonId: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                >
                  <option value="">General Course Question (Not tied to a specific lesson)</option>
                  {(askCourseObj?.lessons || []).map((les) => (
                    <option key={les.id} value={les.id}>
                      {les.moduleTitle} — {les.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Question Summary / Title *
                </label>
                <input
                  type="text"
                  required
                  value={askForm.title}
                  onChange={(e) => setAskForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., How does server-side scoring work in Module 2?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Detailed Question / Doubt *
                </label>
                <textarea
                  rows={4}
                  required
                  value={askForm.content}
                  onChange={(e) => setAskForm((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Describe what you tried, which timestamp or concept you are stuck on, and what help you need..."
                  className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAskModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingQuestion}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black shadow-sm"
                >
                  {submittingQuestion ? 'Sending to Instructor...' : 'Submit Question to Instructor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentDashboardQuestionsPage() {
  return (
    <Suspense fallback={null}>
      <StudentQuestionsView />
    </Suspense>
  );
}

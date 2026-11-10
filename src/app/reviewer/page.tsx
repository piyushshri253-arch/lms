'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuditorPortalShell } from '@/components/reviewer/AuditorPortalShell';
import { Icon } from '@/components/ui/Icon';
import { notifyCoursesChanged } from '@/lib/courses-sync';

interface QueueCourseItem {
  id: string;
  title: string;
  slug: string;
  thumbnail: string;
  price: number;
  status: string;
  effectiveReviewStatus: string;
  submissionType: 'NEW' | 'MAJOR_UPDATE' | 'RESUBMISSION';
  versionLabel: string;
  totalLessons: number;
  totalSections: number;
  contentCounts?: {
    videos: number;
    pdfs: number;
    quizzes: number;
    articles: number;
  };
  updatedAt: string;
  instructor: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
  category: {
    id: string;
    name: string;
  };
  auditMeta?: {
    submittedAt: string;
    sectionIssuesCount: number;
    historyCount: number;
  };
}

function ReviewerDashboardContent() {
  const searchParams = useSearchParams();
  const sidebarFilter = searchParams?.get('filter') || 'ALL';

  const [courses, setCourses] = useState<QueueCourseItem[]>([]);
  const [stats, setStats] = useState({
    pendingReview: 0,
    inReview: 0,
    approvedToday: 0,
    approved: 0,
    changesRequested: 0,
    rejected: 0,
    recentlyUpdated: 0,
    avgReviewTime: '1.8 hrs',
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingInstructorsCount, setPendingInstructorsCount] = useState(0);

  // Quick Decision Modal State (Approve / Request Changes / Reject)
  const [decisionModal, setDecisionModal] = useState<{
    course: QueueCourseItem;
    action: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT';
  } | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [toastMsg, setToastMsg] = useState<{
    title: string;
    desc?: string;
    type?: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (msg: { title: string; desc?: string; type?: 'success' | 'error' | 'info' }) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  };

  useEffect(() => {
    if (sidebarFilter) {
      setActiveFilter(sidebarFilter);
    }
  }, [sidebarFilter]);

  useEffect(() => {
    fetch('/api/reviewer/instructors')
      .then((r) => r.json())
      .then((d) => {
        if (d?.summary?.pendingOnboarding !== undefined) {
          setPendingInstructorsCount(d.summary.pendingOnboarding);
        }
      })
      .catch(() => {});
  }, []);

  const handleTriggerDecision = async () => {
    if (!decisionModal) return;
    const { course, action } = decisionModal;
    try {
      setSubmittingDecision(true);
      const fallbackNote =
        action === 'APPROVE'
          ? 'Course curriculum, video lessons, and resources approved by Auditor.'
          : action === 'REQUEST_CHANGES'
          ? 'Changes requested: Please review curriculum, lecture content, and resubmit for evaluation.'
          : 'Course rejected: Does not meet platform review and quality standards.';

      const finalNote = decisionNote.trim() || fallbackNote;

      const res = await fetch(`/api/reviewer/courses/${encodeURIComponent(course.id)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          note: finalNote,
          confirmNonCompliance: true
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Review decision failed');

      showToast({
        title:
          action === 'APPROVE'
            ? 'Course Approved ✅'
            : action === 'REQUEST_CHANGES'
            ? 'Changes Requested Sent ⚠️'
            : 'Course Rejected ❌',
        desc: json.message,
        type: 'success'
      });

      notifyCoursesChanged();
      setDecisionModal(null);
      setDecisionNote('');
      await fetchAuditQueue();
    } catch (err: any) {
      showToast({
        title: 'Action Error',
        desc: err.message || 'Failed to submit decision',
        type: 'error'
      });
    } finally {
      setSubmittingDecision(false);
    }
  };

  const fetchAuditQueue = async () => {
    try {
      setLoading(true);
      let statusParam = 'ALL';
      let typeParam = 'ALL';

      if (['NEW', 'MAJOR_UPDATE', 'RESUBMISSION'].includes(activeFilter)) {
        typeParam = activeFilter;
      } else if (
        ['IN_REVIEW', 'PENDING', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'].includes(
          activeFilter
        )
      ) {
        statusParam = activeFilter;
      }

      const res = await fetch(
        `/api/reviewer/courses?status=${encodeURIComponent(
          statusParam
        )}&type=${encodeURIComponent(typeParam)}&search=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setCourses(data.courses || []);
        if (data.stats) {
          setStats((prev) => ({ ...prev, ...data.stats }));
        }
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditQueue();
  }, [activeFilter, searchQuery]);

  const getTypeBadge = (type: string) => {
    if (type === 'MAJOR_UPDATE') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          Major Update (v2.0)
        </span>
      );
    }
    if (type === 'RESUBMISSION') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          Resubmission
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
        New Course (v1.0)
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'IN_REVIEW' || status === 'PENDING' || status === 'PENDING_APPROVAL') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Awaiting Audit
        </span>
      );
    }
    if (status === 'CHANGES_REQUESTED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-orange-50 text-orange-800 border border-orange-200">
          ⚠️ Changes Requested
        </span>
      );
    }
    if (status === 'APPROVED' || status === 'PUBLISHED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          ✅ Approved
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
          ❌ Rejected
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-md transition-all animate-in fade-in slide-in-from-top-2 ${
            toastMsg.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : toastMsg.type === 'info'
              ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <Icon
              name={toastMsg.type === 'error' ? 'error' : toastMsg.type === 'info' ? 'info' : 'check_circle'}
              size={18}
            />
            <div>
              <span className="font-bold">{toastMsg.title}</span>
              {toastMsg.desc && <span className="ml-2 font-normal">{toastMsg.desc}</span>}
            </div>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* 1. Welcoming Hero Bar with Live Priorities */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Auditor Quality &amp; Verification Studio</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Welcome to Course Auditor Workspace 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            Inspect courses submitted by instructors, verify video playback and quiz accuracy, and approve new instructor onboardings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveFilter('IN_REVIEW');
              const el = document.getElementById('inspect-courses-studio');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Icon name="fact_check" size={16} />
            <span>{stats.pendingReview} Courses Pending Audit</span>
          </button>

          {pendingInstructorsCount > 0 && (
            <Link
              href="/reviewer/instructors"
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-2 transition-all"
            >
              <Icon name="person" size={16} />
              <span>{pendingInstructorsCount} New Instructors</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. Auditor Metric Cards Grid (Card Format for Total, Pending, Review Done, Changes Requested, Rejected) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[
          {
            key: 'ALL',
            label: 'Total Courses',
            count: stats.total,
            sub: 'All submissions',
            icon: 'library_books',
            activeClass: 'border-slate-900 bg-slate-900 text-white shadow-md scale-[1.02]',
            inactiveClass: 'bg-white border-slate-200 hover:border-slate-400 text-slate-900',
            badgeBg: 'bg-slate-100 text-slate-700'
          },
          {
            key: 'IN_REVIEW',
            label: 'Pending Audit',
            count: stats.pendingReview,
            sub: 'Awaiting inspection',
            icon: 'hourglass_top',
            activeClass: 'border-amber-500 bg-amber-500 text-slate-950 shadow-md scale-[1.02]',
            inactiveClass: 'bg-amber-50/40 border-amber-200/80 hover:border-amber-400 text-slate-900',
            badgeBg: 'bg-amber-100 text-amber-900',
            dot: 'bg-amber-500 animate-pulse'
          },
          {
            key: 'APPROVED',
            label: 'Review Done / Approved',
            count: stats.approved,
            sub: 'Verified & live',
            icon: 'check_circle',
            activeClass: 'border-emerald-600 bg-emerald-600 text-white shadow-md scale-[1.02]',
            inactiveClass: 'bg-emerald-50/40 border-emerald-200/80 hover:border-emerald-400 text-slate-900',
            badgeBg: 'bg-emerald-100 text-emerald-900'
          },
          {
            key: 'CHANGES_REQUESTED',
            label: 'Changes Requested',
            count: stats.changesRequested,
            sub: 'Awaiting fixes',
            icon: 'edit_note',
            activeClass: 'border-orange-500 bg-orange-500 text-white shadow-md scale-[1.02]',
            inactiveClass: 'bg-orange-50/40 border-orange-200/80 hover:border-orange-400 text-slate-900',
            badgeBg: 'bg-orange-100 text-orange-900'
          },
          {
            key: 'REJECTED',
            label: 'Rejected Courses',
            count: stats.rejected,
            sub: 'Non-compliant',
            icon: 'cancel',
            activeClass: 'border-rose-600 bg-rose-600 text-white shadow-md scale-[1.02]',
            inactiveClass: 'bg-rose-50/40 border-rose-200/80 hover:border-rose-400 text-slate-900',
            badgeBg: 'bg-rose-100 text-rose-900'
          }
        ].map((kpi) => {
          const isSelected = activeFilter === kpi.key;
          return (
            <button
              key={kpi.key}
              type="button"
              onClick={() => {
                setActiveFilter(kpi.key);
                const el = document.getElementById('inspect-courses-studio');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`p-4 rounded-3xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 shadow-xs group ${
                isSelected ? kpi.activeClass : kpi.inactiveClass
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-white/20 text-white' : kpi.badgeBg
                  }`}
                >
                  <Icon name={kpi.icon} size={20} />
                </div>
                {kpi.dot && !isSelected && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                    <span className={`w-1.5 h-1.5 rounded-full ${kpi.dot}`} />
                    Action
                  </span>
                )}
              </div>
              <div>
                <div
                  className={`text-2xl sm:text-3xl font-black tracking-tight ${
                    isSelected ? 'text-inherit' : 'text-slate-900'
                  }`}
                >
                  {kpi.count}
                </div>
                <div
                  className={`text-xs font-black mt-0.5 ${
                    isSelected ? 'text-inherit' : 'text-slate-800'
                  }`}
                >
                  {kpi.label}
                </div>
                <div
                  className={`text-[11px] truncate mt-0.5 ${
                    isSelected ? 'opacity-85' : 'text-slate-500'
                  }`}
                >
                  {kpi.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Two Primary Workspace Cards (Inspect Courses vs Instructor Applications) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Inspect Courses Studio */}
        <div className="bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-3xl p-6 shadow-xs transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <Icon name="fact_check" size={24} />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                {stats.pendingReview} Awaiting Inspection
              </span>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Inspect Courses &amp; Curriculum Studio
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Inspect video streaming, lecture structure, quiz questions, PDF notes, and pricing compliance. Give approval or request changes using the 1-click checklist.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="text-[11px] text-slate-500 font-mono">
              Total: <strong className="text-slate-800">{stats.total}</strong> • Approved: <strong className="text-emerald-600">{stats.approved}</strong> • Changes: <strong className="text-amber-600">{stats.changesRequested}</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveFilter('IN_REVIEW');
                const el = document.getElementById('inspect-courses-studio');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>Inspect Courses →</span>
            </button>
          </div>
        </div>

        {/* Card 2: Instructor Applications & Resumes */}
        <div className="bg-white border-2 border-slate-200 hover:border-violet-500 rounded-3xl p-6 shadow-xs transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-700 flex items-center justify-center border border-violet-100">
                <Icon name="badge" size={24} />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-violet-50 text-violet-800 border border-violet-200">
                {pendingInstructorsCount} Pending Signups
              </span>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Instructor Onboarding &amp; Resume Review
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Review verified qualifications, degrees, experience summaries, and download resumes. Decide on interview invitations or click Onboard in 1 click.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="text-[11px] text-slate-500 font-mono">
              Review qualifications &amp; schedule interviews
            </div>
            <Link
              href="/reviewer/instructors"
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <span>Open Instructor Studio →</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. "How Course Audit Works" (3 Simple Visual Steps - Easy to Understand) */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Icon name="lightbulb" size={18} className="text-amber-500" />
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            How Course Audit Works (3 Simple Steps):
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-black">
              1
            </div>
            <div className="text-xs font-extrabold text-slate-900">Pick Course from Queue</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Click the dark <strong>&quot;Inspect Course →&quot;</strong> button on any pending submission below to open its curriculum tree.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black">
              2
            </div>
            <div className="text-xs font-extrabold text-slate-900">Inspect &amp; Tick Issues</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Play videos, check PDF notes &amp; quiz keys. If anything has an issue, simply tick the issue tag. System automatically writes the critique log.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
              3
            </div>
            <div className="text-xs font-extrabold text-slate-900">Submit Verdict in 1 Click</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Click <strong>Approve ✅</strong> to publish, or <strong>Submit Changes Request ⚠️</strong> to auto-send your checklist log without typing.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Inspect Courses Studio Section */}
      <div id="inspect-courses-studio" className="space-y-4 pt-2">
        {/* Filter Tabs & Search Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Primary Segmented Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'ALL', label: 'All Courses', count: stats.total || courses.length },
                { id: 'IN_REVIEW', label: '🟡 Awaiting Audit', count: stats.pendingReview },
                { id: 'CHANGES_REQUESTED', label: '⚠️ Changes Requested', count: stats.changesRequested },
                { id: 'APPROVED', label: '✅ Approved', count: stats.approved },
                { id: 'REJECTED', label: '❌ Rejected', count: stats.rejected }
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setActiveFilter(pill.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeFilter === pill.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{pill.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      activeFilter === pill.id ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                    }`}
                  >
                    {pill.count}
                  </span>
                </button>
              ))}

              {/* Secondary Sub-filters */}
              <div className="border-l border-slate-200 pl-2 ml-1 flex items-center gap-1">
                {[
                  { id: 'NEW', label: 'New (v1.0)' },
                  { id: 'MAJOR_UPDATE', label: 'Updates (v2.0)' },
                  { id: 'RESUBMISSION', label: 'Resubmitted' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveFilter(f.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      activeFilter === f.id
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Search Bar */}
            <div className="relative min-w-[280px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search course title, instructor or category..."
                className="w-full rounded-xl border border-slate-200 pl-9 pr-8 py-2 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon name="search" size={16} />
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 5. Main Inspect Courses Container (Cards or Table) */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 to-white">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 mb-1">
                <Icon name="fact_check" size={13} />
                <span>Inspect Courses Studio</span>
              </div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>Inspect Courses</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {courses.length} courses
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Click <strong className="text-slate-800">&quot;Inspect Course →&quot;</strong> on any card to evaluate curriculum videos, PDF notes, quizzes, and resources.
              </p>
            </div>

            {/* View Mode Toggle (Cards vs Table) */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('CARDS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'CARDS'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon name="grid_view" size={15} />
                <span>Cards View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'TABLE'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon name="view_list" size={15} />
                <span>Table View</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs font-bold text-slate-700">Loading Courses for Inspection...</div>
            </div>
          ) : courses.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Icon name="fact_check" size={32} />
              </div>
              <div className="text-sm font-bold text-slate-800">No Courses Match This Filter</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                There are no course submissions under &quot;{activeFilter}&quot;. Try switching to &quot;All Courses&quot; or clearing your search query.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveFilter('ALL');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Show All Courses
              </button>
            </div>
          ) : viewMode === 'CARDS' ? (
            /* Cards View */
            <div className="p-5 sm:p-6 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-white rounded-3xl border-2 border-slate-200 hover:border-emerald-500 hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Media Header */}
                    <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
                          <Icon name="school" size={40} className="text-slate-500 mb-1" />
                          <span className="text-xs font-semibold">Morena Teach Course</span>
                        </div>
                      )}

                      {/* Dark Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/50 pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 backdrop-blur-md text-slate-800 shadow-xs border border-white/40">
                          {course.category?.name || 'General'}
                        </span>
                        {getStatusBadge(course.effectiveReviewStatus || course.status)}
                      </div>

                      {/* Bottom Image Badges */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-[11px] font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-900/85 backdrop-blur-md border border-white/20 text-[10px] font-mono">
                            {course.versionLabel || 'v1.0'}
                          </span>
                          {getTypeBadge(course.submissionType)}
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-mono text-xs shadow-xs">
                          {course.price > 0 ? `₹${course.price}` : 'Free'}
                        </span>
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        {/* Course Title */}
                        <Link
                          href={`/reviewer/courses/${course.id}`}
                          className="block font-black text-slate-900 text-sm leading-snug line-clamp-2 hover:text-emerald-600 transition-colors"
                          title={course.title}
                        >
                          {course.title}
                        </Link>

                        {/* Instructor Info */}
                        <div className="flex items-center gap-2.5 pt-1">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 overflow-hidden">
                            {course.instructor?.avatar ? (
                              <img
                                src={course.instructor.avatar}
                                alt={course.instructor.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{course.instructor?.name?.charAt(0) || 'I'}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate">
                              {course.instructor?.name || 'Instructor'}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {course.instructor?.email}
                            </div>
                          </div>
                        </div>

                        {/* Curriculum Content Counters (Video, PDF, Quiz, Resources) */}
                        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-100">
                            <Icon name="play_circle" size={15} className="text-indigo-600 shrink-0" />
                            <span className="font-semibold truncate">
                              {course.contentCounts?.videos ?? course.totalLessons} Videos
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-100">
                            <Icon name="picture_as_pdf" size={15} className="text-rose-600 shrink-0" />
                            <span className="font-semibold truncate">
                              {course.contentCounts?.pdfs ?? 0} PDFs
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-100">
                            <Icon name="quiz" size={15} className="text-amber-600 shrink-0" />
                            <span className="font-semibold truncate">
                              {course.contentCounts?.quizzes ?? 0} Quizzes
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-100">
                            <Icon name="article" size={15} className="text-emerald-600 shrink-0" />
                            <span className="font-semibold truncate">
                              {course.contentCounts?.articles ?? 0} Resources
                            </span>
                          </div>
                        </div>

                        {/* Modules count and Submitted Date */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
                          <span>{course.totalSections} Modules Total</span>
                          <span>
                            {new Date(course.auditMeta?.submittedAt || course.updatedAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Card Bottom Actions: Prominent Inspect Course Button */}
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <Link
                          href={`/reviewer/courses/${course.id}`}
                          className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-emerald-600 text-white text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer group-hover:scale-[1.01]"
                        >
                          <Icon name="fact_check" size={16} />
                          <span>Inspect Course →</span>
                        </Link>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/reviewer/courses/${course.id}/preview`}
                            className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-bold text-center inline-flex items-center justify-center gap-1 transition-colors"
                          >
                            <Icon name="visibility" size={13} />
                            <span>Preview</span>
                          </Link>
                          {course.effectiveReviewStatus !== 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => {
                                setDecisionModal({ course, action: 'REQUEST_CHANGES' });
                                setDecisionNote('');
                              }}
                              className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              ⚠️ Changes
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Table View */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-mono font-bold uppercase text-slate-500">
                    <th className="py-3.5 px-6">Course &amp; Curriculum</th>
                    <th className="py-3.5 px-4">Instructor</th>
                    <th className="py-3.5 px-4">Type &amp; Version</th>
                    <th className="py-3.5 px-4">Submitted</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-6 text-right">Audit Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {courses.map((course) => (
                    <tr key={course.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* 1. Course Details */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="w-16 h-10 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-200 shadow-2xs">
                            {course.thumbnail ? (
                              <img
                                src={course.thumbnail}
                                alt={course.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-bold">
                                📚
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 max-w-[280px]">
                            <Link
                              href={`/reviewer/courses/${course.id}`}
                              className="font-extrabold text-slate-900 hover:text-emerald-600 block truncate transition-colors"
                              title={course.title}
                            >
                              {course.title}
                            </Link>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {course.category?.name || 'General'} • {course.totalSections} Modules •{' '}
                              {course.totalLessons} Lectures
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Instructor Details */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-800">{course.instructor?.name || 'Instructor'}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                          {course.instructor?.email}
                        </div>
                      </td>

                      {/* 3. Version & Submission Type */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono font-bold text-slate-800 text-[10px]">
                            {course.versionLabel || 'v1.0'}
                          </span>
                          <div>{getTypeBadge(course.submissionType)}</div>
                        </div>
                      </td>

                      {/* 4. Submission Date */}
                      <td className="py-4 px-4 text-slate-600 font-mono text-[11px]">
                        {new Date(
                          course.auditMeta?.submittedAt || course.updatedAt
                        ).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>

                      {/* 5. Status Badge */}
                      <td className="py-4 px-4">
                        {getStatusBadge(course.effectiveReviewStatus || course.status)}
                      </td>

                      {/* 6. Primary Action Buttons */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-2 justify-end flex-wrap">
                          {/* Primary Inspect Course Button */}
                          <Link
                            href={`/reviewer/courses/${course.id}`}
                            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white text-xs font-extrabold shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Icon name="fact_check" size={14} />
                            <span>Inspect Course →</span>
                          </Link>

                          {/* Secondary Student Preview Button */}
                          <Link
                            href={`/reviewer/courses/${course.id}/preview`}
                            className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition-colors"
                            title="Preview as Student"
                          >
                            <Icon name="visibility" size={14} />
                            <span>Preview</span>
                          </Link>

                          {/* Fast Approve / Request Changes buttons */}
                          {course.effectiveReviewStatus !== 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => {
                                setDecisionModal({ course, action: 'REQUEST_CHANGES' });
                                setDecisionNote('');
                              }}
                              className="px-2.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-2xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                              title="Request Changes"
                            >
                              <span>⚠️ Changes</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Decision Modal (Approve / Request Changes / Reject) */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white ${
                    decisionModal.action === 'APPROVE'
                      ? 'bg-emerald-600'
                      : decisionModal.action === 'REQUEST_CHANGES'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-rose-600'
                  }`}
                >
                  <Icon
                    name={
                      decisionModal.action === 'APPROVE'
                        ? 'check_circle'
                        : decisionModal.action === 'REQUEST_CHANGES'
                        ? 'warning'
                        : 'cancel'
                    }
                    size={20}
                  />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {decisionModal.action === 'APPROVE'
                      ? 'Approve Course Submission'
                      : decisionModal.action === 'REQUEST_CHANGES'
                      ? 'Request Course Changes'
                      : 'Reject Course Submission'}
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-xs">
                    Course: <strong>{decisionModal.course.title}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDecisionModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div
              className={`p-4 rounded-2xl border text-xs space-y-1 ${
                decisionModal.action === 'APPROVE'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : decisionModal.action === 'REQUEST_CHANGES'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="font-extrabold">
                {decisionModal.action === 'APPROVE'
                  ? 'Ready for Approval & Publishing'
                  : decisionModal.action === 'REQUEST_CHANGES'
                  ? 'Course Revisions Required'
                  : 'Platform Quality Non-Compliance'}
              </div>
              <p className="leading-relaxed">
                {decisionModal.action === 'APPROVE'
                  ? 'This course will be marked as APPROVED. The instructor will receive an instant notification and can publish it live on the site in 1 click.'
                  : decisionModal.action === 'REQUEST_CHANGES'
                  ? 'The instructor will be notified with your feedback to update the syllabus/videos and resubmit.'
                  : 'The course submission will be rejected. The instructor will be notified of the reason.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {decisionModal.action === 'APPROVE'
                  ? 'Optional Approval Note for Instructor'
                  : decisionModal.action === 'REQUEST_CHANGES'
                  ? 'Feedback / Notes for Instructor'
                  : 'Rejection Reason'}
              </label>
              <textarea
                rows={4}
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder={
                  decisionModal.action === 'APPROVE'
                    ? 'Curriculum verified and approved for publishing live!'
                    : decisionModal.action === 'REQUEST_CHANGES'
                    ? 'Please detail what needs adjustment before approval...'
                    : 'Explain reason for rejection...'
                }
                className="w-full rounded-2xl border border-slate-200 p-3.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />

              {decisionModal.action !== 'APPROVE' && (
                <div className="space-y-1.5 mt-2.5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Quick Critique Templates:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Video lecture audio clarity & resolution need enhancement',
                      'Add missing study material / PDF notes for major modules',
                      'Curriculum sequence and lecture titles require correction',
                      'Pricing & course overview details need adjustment'
                    ].map((tpl) => (
                      <button
                        key={tpl}
                        type="button"
                        onClick={() =>
                          setDecisionNote((prev) => (prev ? prev + '\n• ' + tpl : '• ' + tpl))
                        }
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors cursor-pointer"
                      >
                        + {tpl}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDecisionModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerDecision}
                disabled={submittingDecision}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  decisionModal.action === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : decisionModal.action === 'REQUEST_CHANGES'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submittingDecision
                  ? 'Submitting Verdict...'
                  : decisionModal.action === 'APPROVE'
                  ? 'Confirm Approve Course ✅'
                  : decisionModal.action === 'REQUEST_CHANGES'
                  ? 'Send Changes Request ⚠️'
                  : 'Confirm Reject Course ❌'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewerDashboardPage() {
  return (
    <AuditorPortalShell
      title="Course Auditor Dashboard & Inspect Courses Studio"
      subtitle="Inspect and verify course curriculum, protected video/PDF streams, quizzes, and instructor onboardings."
    >
      <Suspense fallback={<div className="p-8 text-xs text-slate-500">Loading Inspect Courses Studio...</div>}>
        <ReviewerDashboardContent />
      </Suspense>
    </AuditorPortalShell>
  );
}

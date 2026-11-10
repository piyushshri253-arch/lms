'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
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

function InspectCoursesContent() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams?.get('filter') || 'ALL';

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
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter);
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9); // 9 courses per page for clean 3-col grid

  // Reset page to 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  const totalCourses = courses.length;
  const totalPages = Math.max(1, Math.ceil(totalCourses / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedCourses = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return courses.slice(startIndex, startIndex + pageSize);
  }, [courses, validCurrentPage, pageSize]);

  // Horizontal Scroll Ref & State for Table View
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (!tableContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  const scrollTable = (direction: 'left' | 'right') => {
    if (!tableContainerRef.current) return;
    const scrollAmount = 380;
    tableContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    if (viewMode === 'TABLE') {
      const timer = setTimeout(checkScroll, 120);
      return () => clearTimeout(timer);
    }
  }, [viewMode, courses]);

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
    if (initialFilter) {
      setActiveFilter(initialFilter);
    }
  }, [initialFilter]);

  const fetchCourses = async () => {
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
    fetchCourses();
  }, [activeFilter, searchQuery]);

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
      await fetchCourses();
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

  const getTypeBadge = (type: string) => {
    if (type === 'MAJOR_UPDATE') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-slate-950 border border-purple-300 shadow-2xs inline-block">
          Major Update (v2.0)
        </span>
      );
    }
    if (type === 'RESUBMISSION') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-slate-950 border border-amber-300 shadow-2xs inline-block">
          Resubmission
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-sky-100 text-slate-950 border border-sky-300 shadow-2xs inline-block">
        New Course (v1.0)
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'IN_REVIEW' || status === 'PENDING' || status === 'PENDING_APPROVAL') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Awaiting Audit
        </span>
      );
    }
    if (status === 'CHANGES_REQUESTED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-orange-50 text-orange-800 border border-orange-200 shadow-2xs">
          ⚠️ Changes Requested
        </span>
      );
    }
    if (status === 'APPROVED' || status === 'PUBLISHED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
          ✅ Approved
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
          ❌ Rejected
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
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

      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Course Inspection &amp; Quality Verification</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Inspect Courses Studio 🔍
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            Select any course below and click <strong>&quot;Inspect Course →&quot;</strong> to examine all modules, playable video lessons, study PDFs, quiz answer keys, and submit audit verdicts.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/reviewer"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 transition-all"
          >
            <Icon name="arrow_back" size={16} />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>

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

      {/* Main Inspect Courses Container (Cards or Table) */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 to-white">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 mb-1">
              <Icon name="fact_check" size={13} />
              <span>Inspection Studio</span>
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

          {/* View Mode Toggle (Cards vs Table) & Table Scroll Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {viewMode === 'TABLE' && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => scrollTable('left')}
                  disabled={!canScrollLeft}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    canScrollLeft
                      ? 'bg-white text-slate-800 shadow-2xs hover:bg-slate-50'
                      : 'text-slate-400 bg-transparent cursor-not-allowed opacity-60'
                  }`}
                  title="Scroll Left"
                >
                  <Icon name="arrow_back" size={13} />
                  <span className="hidden sm:inline">Scroll Left</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollTable('right')}
                  disabled={!canScrollRight}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    canScrollRight
                      ? 'bg-white text-slate-800 shadow-2xs hover:bg-slate-50'
                      : 'text-slate-400 bg-transparent cursor-not-allowed opacity-60'
                  }`}
                  title="Scroll Right"
                >
                  <span className="hidden sm:inline">Scroll Right</span>
                  <Icon name="arrow_forward" size={13} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
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
              {paginatedCourses.map((course) => (
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
          <div className="space-y-2">
            <div
              ref={tableContainerRef}
              onScroll={checkScroll}
              className="overflow-x-auto relative scroll-smooth rounded-b-3xl border-t border-slate-100"
            >
              <table className="min-w-[1240px] w-full text-left border-collapse table-fixed">
                <colgroup>
                  <col className="w-[360px]" />
                  <col className="w-[200px]" />
                  <col className="w-[150px]" />
                  <col className="w-[130px]" />
                  <col className="w-[140px]" />
                  <col className="w-[260px]" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50/90 sticky top-0 z-10 border-b border-slate-200 text-[11px] font-mono font-bold uppercase text-slate-500 tracking-wider">
                    <th className="py-3.5 px-6">Course &amp; Curriculum</th>
                    <th className="py-3.5 px-4">Instructor</th>
                    <th className="py-3.5 px-4">Type &amp; Version</th>
                    <th className="py-3.5 px-4">Submitted</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-6 text-right">Audit Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs bg-white">
                  {paginatedCourses.map((course) => (
                    <tr key={course.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Course Details */}
                      <td className="py-4 px-6 align-middle">
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
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/reviewer/courses/${course.id}`}
                              className="font-extrabold text-slate-900 hover:text-emerald-600 block truncate transition-colors text-xs sm:text-sm"
                              title={course.title}
                            >
                              {course.title}
                            </Link>
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {course.category?.name || 'General'} • {course.totalSections} Modules •{' '}
                              {course.totalLessons} Lectures
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Instructor Details */}
                      <td className="py-4 px-4 align-middle">
                        <div className="font-bold text-slate-800 truncate">{course.instructor?.name || 'Instructor'}</div>
                        <div className="text-[11px] text-slate-500 truncate" title={course.instructor?.email}>
                          {course.instructor?.email}
                        </div>
                      </td>

                      {/* 3. Version & Submission Type */}
                      <td className="py-4 px-4 align-middle">
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 font-mono font-black text-slate-950 text-[10px] inline-block">
                            {course.versionLabel || 'v1.0'}
                          </span>
                          <div>{getTypeBadge(course.submissionType)}</div>
                        </div>
                      </td>

                      {/* 4. Submission Date */}
                      <td className="py-4 px-4 text-slate-600 font-mono text-[11px] align-middle whitespace-nowrap">
                        {new Date(
                          course.auditMeta?.submittedAt || course.updatedAt
                        ).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>

                      {/* 5. Status Badge */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        {getStatusBadge(course.effectiveReviewStatus || course.status)}
                      </td>

                      {/* 6. Primary Action Buttons */}
                      <td className="py-4 px-6 text-right align-middle whitespace-nowrap">
                        <div className="flex items-center gap-2 justify-end whitespace-nowrap">
                          {/* Primary Inspect Course Button */}
                          <Link
                            href={`/reviewer/courses/${course.id}`}
                            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white text-xs font-extrabold shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                          >
                            <Icon name="fact_check" size={14} />
                            <span>Inspect Course →</span>
                          </Link>

                          {/* Secondary Student Preview Button */}
                          <Link
                            href={`/reviewer/courses/${course.id}/preview`}
                            className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition-colors shrink-0"
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
                              className="px-2.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-2xs inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0"
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

            {/* Subtle Horizontal Scroll Hint bar */}
            <div className="px-6 py-2 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Showing {courses.length} courses in table layout</span>
              <div className="flex items-center gap-2">
                <span>Use the Scroll buttons above or shift + mousewheel to scroll horizontally</span>
                <button
                  type="button"
                  onClick={() => scrollTable('right')}
                  className="text-slate-600 font-bold hover:text-slate-900 inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Scroll side</span>
                  <Icon name="arrow_forward" size={12} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Course Reviews Pagination Bar */}
        {totalCourses > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Range info and items per page selector */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <div>
                Showing{' '}
                <strong className="text-slate-900 font-bold">
                  {Math.min(totalCourses, (validCurrentPage - 1) * pageSize + 1)}
                </strong>
                –
                <strong className="text-slate-900 font-bold">
                  {Math.min(totalCourses, validCurrentPage * pageSize)}
                </strong>{' '}
                of <strong className="text-slate-900 font-bold">{totalCourses}</strong> courses
              </div>

              <div className="flex items-center gap-1.5 pl-2 sm:border-l sm:border-slate-200">
                <span className="text-[11px] font-medium text-slate-400">Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value={6}>6 per page</option>
                  <option value={9}>9 per page</option>
                  <option value={12}>12 per page</option>
                  <option value={18}>18 per page</option>
                  <option value={24}>24 per page</option>
                  <option value={100}>All courses</option>
                </select>
              </div>
            </div>

            {/* Pagination Navigation Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {/* Previous Page Button */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validCurrentPage === 1}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                    validCurrentPage === 1
                      ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer'
                  }`}
                  title="Previous Page"
                >
                  <Icon name="arrow_back" size={13} />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                {/* Page Number Buttons */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                    .filter((pageNum) => {
                      if (totalPages <= 7) return true;
                      if (pageNum === 1 || pageNum === totalPages) return true;
                      return Math.abs(pageNum - validCurrentPage) <= 1;
                    })
                    .reduce<(number | string)[]>((acc, pageNum, idx, arr) => {
                      if (
                        idx > 0 &&
                        typeof arr[idx - 1] === 'number' &&
                        (pageNum as number) - (arr[idx - 1] as number) > 1
                      ) {
                        acc.push('...');
                      }
                      acc.push(pageNum);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === '...' ? (
                        <span key={`dots-${idx}`} className="px-2 py-1 text-slate-400 text-xs font-bold">
                          ...
                        </span>
                      ) : (
                        <button
                          key={`page-${item}`}
                          type="button"
                          onClick={() => setCurrentPage(item as number)}
                          className={`w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            item === validCurrentPage
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}
                </div>

                {/* Next Page Button */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validCurrentPage === totalPages}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                    validCurrentPage === totalPages
                      ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer'
                  }`}
                  title="Next Page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <Icon name="arrow_forward" size={13} />
                </button>
              </div>
            )}
          </div>
        )}
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

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                {decisionModal.action === 'REQUEST_CHANGES'
                  ? '⚠️ Required Changes & Auditor Instructions for Instructor:'
                  : decisionModal.action === 'APPROVE'
                  ? 'Auditor Note (Optional):'
                  : 'Rejection Reason / Auditor Feedback:'}
              </label>
              <textarea
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                rows={3}
                placeholder={
                  decisionModal.action === 'APPROVE'
                    ? 'Optional: Great quality curriculum. Approved for publishing.'
                    : decisionModal.action === 'REQUEST_CHANGES'
                    ? 'Detail the specific changes or improvements required from the instructor (e.g. re-record lecture audio, refine syllabus, correct quiz answer key)...'
                    : 'Reason for course rejection...'
                }
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDecisionModal(null)}
                disabled={submittingDecision}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              {decisionModal.action === 'APPROVE' &&
                (decisionModal.course.effectiveReviewStatus === 'CHANGES_REQUESTED' ||
                  decisionModal.course.status === 'CHANGES_REQUESTED') && (
                  <p className="text-[11px] text-amber-700 font-bold bg-amber-50 p-2 rounded-xl border border-amber-200">
                    ⚠️ Approval is locked because this course currently has changes requested from the instructor.
                  </p>
                )}
              <button
                type="button"
                onClick={handleTriggerDecision}
                disabled={
                  submittingDecision ||
                  (decisionModal.action === 'APPROVE' &&
                    (decisionModal.course.effectiveReviewStatus === 'CHANGES_REQUESTED' ||
                      decisionModal.course.status === 'CHANGES_REQUESTED'))
                }
                className={`px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all cursor-pointer ${
                  submittingDecision ||
                  (decisionModal.action === 'APPROVE' &&
                    (decisionModal.course.effectiveReviewStatus === 'CHANGES_REQUESTED' ||
                      decisionModal.course.status === 'CHANGES_REQUESTED'))
                    ? 'opacity-50 cursor-not-allowed bg-slate-400 text-slate-100'
                    : decisionModal.action === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : decisionModal.action === 'REQUEST_CHANGES'
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
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

export default function InspectCoursesPage() {
  return (
    <AuditorPortalShell
      title="Inspect Courses Studio"
      subtitle="Inspect course curriculum, video lessons, PDF notes, quiz questions, and resources submitted by instructors."
    >
      <Suspense fallback={<div className="p-8 text-xs text-slate-500">Loading Inspect Courses Studio...</div>}>
        <InspectCoursesContent />
      </Suspense>
    </AuditorPortalShell>
  );
}

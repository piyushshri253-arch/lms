'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { AuditorPortalShell } from '@/components/reviewer/AuditorPortalShell';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

interface CourseItem {
  id: string;
  title: string;
  slug: string;
  thumbnail: string;
  price: number;
  status: string;
  effectiveReviewStatus: string;
  versionLabel: string;
  totalLessons: number;
  totalSections: number;
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
  };
}

function ReviewerDashboardContent() {
  const { currentUser } = useApp();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [stats, setStats] = useState({
    pendingReview: 12,
    inReview: 3,
    approvedToday: 5,
    approved: 48,
    changesRequested: 6,
    rejected: 4,
    avgReviewTime: '1.8 hrs',
    total: 66
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const reviewerName = currentUser?.name || 'Amit Sharma';

  useEffect(() => {
    fetch('/api/reviewer/courses?status=ALL')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) {
          if (data.courses) setCourses(data.courses);
          if (data.stats) setStats((prev) => ({ ...prev, ...data.stats }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter courses for the middle table based on active pill and search query
  const filteredCourses = courses.filter((c) => {
    const status = c.effectiveReviewStatus || c.status;
    let matchesStatus = true;
    if (activeTab === 'PENDING') {
      matchesStatus = status === 'IN_REVIEW' || status === 'PENDING' || status === 'PENDING_APPROVAL';
    } else if (activeTab === 'IN_REVIEW') {
      matchesStatus = status === 'IN_REVIEW';
    } else if (activeTab === 'APPROVED') {
      matchesStatus = status === 'APPROVED' || status === 'PUBLISHED';
    } else if (activeTab === 'CHANGES_REQUESTED') {
      matchesStatus = status === 'CHANGES_REQUESTED';
    } else if (activeTab === 'REJECTED') {
      matchesStatus = status === 'REJECTED';
    }

    const matchesSearch =
      !searchQuery.trim() ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.instructor?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    if (status === 'IN_REVIEW' || status === 'PENDING' || status === 'PENDING_APPROVAL') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
          Pending
        </span>
      );
    }
    if (status === 'CHANGES_REQUESTED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          Changes Requested
        </span>
      );
    }
    if (status === 'APPROVED' || status === 'PUBLISHED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Approved
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          Rejected
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Welcome Banner Header matching reference image */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Welcome Back, {reviewerName}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review and approve courses to maintain quality on Morena Teach LMS.
          </p>
        </div>

        {/* Right Banner Pill Card matching image */}
        <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-emerald-50/90 border border-blue-200/60 rounded-2xl p-3.5 sm:px-5 flex items-center gap-3.5 shadow-2xs shrink-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <Icon name="verified_user" size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-slate-900 leading-tight">
              Together for Better Learning
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Ensure high-quality content for our learners.
            </div>
          </div>
          <div className="text-2xl ml-1 hidden sm:block">📚</div>
        </div>
      </div>

      {/* 2. Top 4 Metric KPI Cards (Row of 4 matching reference image) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending Reviews */}
        <Link
          href="/reviewer/inspect?filter=IN_REVIEW"
          className="bg-[#eff6ff] hover:bg-blue-50/90 border border-blue-100 rounded-2xl p-5 flex items-center justify-between transition-all duration-150 hover:shadow-md group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Icon name="assignment" size={24} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-700">Pending Reviews</div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-none mt-1">
                {stats.pendingReview}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
                <Icon name="schedule" size={13} className="text-slate-400" />
                <span>Need your attention</span>
              </div>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-blue-200/50 text-blue-700 flex items-center justify-center text-xs group-hover:translate-x-0.5 transition-transform">
            →
          </div>
        </Link>

        {/* Card 2: Approved */}
        <Link
          href="/reviewer/inspect?filter=APPROVED"
          className="bg-[#f0fdf4] hover:bg-emerald-50/90 border border-emerald-100 rounded-2xl p-5 flex items-center justify-between transition-all duration-150 hover:shadow-md group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Icon name="check_circle" size={24} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-700">Approved</div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-none mt-1">
                {stats.approved}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">
                Total approved courses
              </div>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-emerald-200/50 text-emerald-700 flex items-center justify-center text-xs group-hover:translate-x-0.5 transition-transform">
            →
          </div>
        </Link>

        {/* Card 3: Changes Requested */}
        <Link
          href="/reviewer/inspect?filter=CHANGES_REQUESTED"
          className="bg-[#fff7ed] hover:bg-amber-50/90 border border-orange-100 rounded-2xl p-5 flex items-center justify-between transition-all duration-150 hover:shadow-md group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <Icon name="sync" size={24} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-700">Changes Requested</div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-none mt-1">
                {stats.changesRequested}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
                <Icon name="schedule" size={13} className="text-slate-400" />
                <span>Awaiting updates</span>
              </div>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-orange-200/50 text-orange-700 flex items-center justify-center text-xs group-hover:translate-x-0.5 transition-transform">
            →
          </div>
        </Link>

        {/* Card 4: Reviewed Today */}
        <Link
          href="/reviewer/inspect?filter=APPROVED"
          className="bg-[#faf5ff] hover:bg-purple-50/90 border border-purple-100 rounded-2xl p-5 flex items-center justify-between transition-all duration-150 hover:shadow-md group cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <Icon name="history" size={24} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-700">Reviewed Today</div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-none mt-1">
                {stats.approvedToday || 5}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-medium">
                Completed reviews
              </div>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-purple-200/50 text-purple-700 flex items-center justify-center text-xs group-hover:translate-x-0.5 transition-transform">
            →
          </div>
        </Link>
      </div>

      {/* 3. Middle 2-Column Section (Left 8 cols: Queue Table | Right 4 cols: Side widgets) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Course Review Queue */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Icon name="assignment" size={17} />
              </div>
              <h2 className="text-base font-extrabold text-slate-900">
                Course Review Queue
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                {stats.pendingReview} Pending
              </span>
            </div>
            <Link
              href="/reviewer/inspect"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <span>→</span>
            </Link>
          </div>

          {/* Search bar & Filter dropdown */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon name="search" size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by course title or instructor..."
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
            <button
              type="button"
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="filter_list" size={15} />
              <span>Filter</span>
              <span className="text-slate-400 text-[10px]">⌄</span>
            </button>
          </div>

          {/* Filter Pills matching image */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {[
              { id: 'ALL', label: `All (${stats.total})`, bg: 'bg-blue-600 text-white' },
              { id: 'PENDING', label: `Pending (${stats.pendingReview})`, bg: 'bg-orange-500 text-white' },
              { id: 'IN_REVIEW', label: `In Review (${stats.inReview})`, bg: 'bg-sky-600 text-white' },
              { id: 'APPROVED', label: `Approved (${stats.approved})`, bg: 'bg-emerald-600 text-white' },
              { id: 'REJECTED', label: `Rejected (${stats.rejected})`, bg: 'bg-rose-600 text-white' },
              { id: 'CHANGES_REQUESTED', label: `Changes Requested (${stats.changesRequested})`, bg: 'bg-purple-600 text-white' }
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setActiveTab(pill.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === pill.id
                    ? `${pill.bg} shadow-xs`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Clean Table matching reference image */}
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Course</th>
                  <th className="py-2.5 px-3">Instructor</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Submitted</th>
                  <th className="py-2.5 px-2">Version</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-2">Assigned To</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      Loading courses...
                    </td>
                  </tr>
                ) : filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      No courses match this filter.
                    </td>
                  </tr>
                ) : (
                  filteredCourses.slice(0, 6).map((course, idx) => (
                    <tr key={course.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5 min-w-[180px] max-w-[220px]">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 overflow-hidden shrink-0 border border-slate-200">
                            {course.thumbnail ? (
                              <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs">📚</div>
                            )}
                          </div>
                          <Link
                            href={`/reviewer/courses/${course.id}`}
                            className="font-bold text-slate-900 hover:text-blue-600 truncate transition-colors"
                            title={course.title}
                          >
                            {course.title}
                          </Link>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium truncate max-w-[120px]">
                        {course.instructor?.name || 'Instructor'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {course.category?.name || 'General'}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(course.auditMeta?.submittedAt || course.updatedAt).toLocaleDateString(
                          'en-GB',
                          { day: '2-digit', month: 'short', year: 'numeric' }
                        )}
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap">
                        <span
                          style={{ color: '#000000' }}
                          className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 font-mono font-black !text-black text-[10px] inline-block"
                        >
                          {course.versionLabel || 'v1.0'}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getStatusBadge(course.effectiveReviewStatus || course.status)}
                      </td>
                      <td className="py-3 px-2 text-slate-500 text-[11px]">
                        {idx === 2 ? 'You' : '—'}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <Link
                          href={`/reviewer/courses/${course.id}`}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all ${
                            idx === 2
                              ? 'border border-blue-200 text-blue-600 hover:bg-blue-50'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                          }`}
                        >
                          <span>{idx === 2 ? 'View' : 'Review'}</span>
                          <span>→</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (4 cols): Side Widgets matching reference design */}
        <div className="lg:col-span-4 space-y-6">
          {/* Widget 1: Review Priority */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                <span className="text-rose-500">🔔</span>
                <span>Review Priority</span>
              </div>
              <Link
                href="/reviewer/inspect?filter=IN_REVIEW"
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                View All →
              </Link>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-xs font-bold text-slate-800">3 Courses overdue</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                  &gt; 3 days
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-slate-800">5 Pending for 5+ days</span>
                </div>
                <span className="text-[11px] text-slate-400 font-semibold">Priority</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-bold text-slate-800">High priority courses</span>
                </div>
                <span className="text-[11px] text-slate-400 font-semibold">Action needed</span>
              </div>
            </div>
          </div>

          {/* Widget 2: Recent Activity */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                <span className="text-amber-500">⚡</span>
                <span>Recent Activity</span>
              </div>
              <Link
                href="/reviewer/inspect?filter=HISTORY"
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                View All →
              </Link>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs shrink-0 mt-0.5">
                  ✓
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800">
                    Approved &quot;Machine Learning Basics&quot;
                  </div>
                  <div className="text-[11px] text-slate-400">2 hours ago</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs shrink-0 mt-0.5">
                  ↺
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800">
                    Requested changes for &quot;Graphic Design Course&quot;
                  </div>
                  <div className="text-[11px] text-slate-400">3 hours ago</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs shrink-0 mt-0.5">
                  ✕
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800">
                    Rejected &quot;Advanced Excel&quot;
                  </div>
                  <div className="text-[11px] text-slate-400">5 hours ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom 3-Card Row (Review Statistics | Your Performance | Quick Actions) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Review Statistics (Donut Chart) */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
              <span className="text-blue-500">📊</span>
              <span>Review Statistics</span>
            </div>
            <button
              type="button"
              className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg"
            >
              Last 30 Days ⌄
            </button>
          </div>

          <div className="flex items-center justify-around py-2">
            {/* SVG Donut Chart */}
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                {/* Background Ring */}
                <path
                  className="text-slate-100"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Approved segment 86% */}
                <path
                  className="text-emerald-500"
                  strokeDasharray="86, 100"
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Changes Requested segment 8% */}
                <path
                  className="text-amber-500"
                  strokeDasharray="8, 100"
                  strokeDashoffset="-86"
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Rejected segment 6% */}
                <path
                  className="text-rose-500"
                  strokeDasharray="6, 100"
                  strokeDashoffset="-94"
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-sm font-black text-slate-900 leading-none">86%</span>
                <span className="text-[9px] text-slate-400 font-medium">Approved</span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600 font-medium">Approved</span>
                <strong className="text-slate-900 font-bold ml-auto pl-2">86%</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-600 font-medium">Changes Requested</span>
                <strong className="text-slate-900 font-bold ml-auto pl-2">8%</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-600 font-medium">Rejected</span>
                <strong className="text-slate-900 font-bold ml-auto pl-2">6%</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Your Performance */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
            <span className="text-amber-500">🏆</span>
            <span>Your Performance</span>
          </div>

          <div className="space-y-1">
            <div className="text-3xl font-black text-slate-900 leading-none">92%</div>
            <div className="text-xs text-slate-500 flex items-center gap-1 font-semibold">
              <span>Review Accuracy</span>
              <span className="text-emerald-600 font-bold">↑ 2%</span>
            </div>
          </div>

          {/* SVG Sparkline Graph Wave */}
          <div className="h-10 w-full">
            <svg className="w-full h-full" viewBox="0 0 200 40" fill="none">
              <path
                d="M0 30 Q 30 25, 60 22 T 120 15 T 160 10 T 200 5"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="200" cy="5" r="3.5" fill="#10b981" />
            </svg>
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
            <div className="p-1.5 rounded-xl bg-slate-50">
              <div className="text-[10px] text-slate-400 font-semibold">Time</div>
              <div className="text-xs font-black text-slate-800">36h</div>
            </div>
            <div className="p-1.5 rounded-xl bg-slate-50">
              <div className="text-[10px] text-slate-400 font-semibold">Reviewed</div>
              <div className="text-xs font-black text-slate-800">48</div>
            </div>
            <div className="p-1.5 rounded-xl bg-slate-50">
              <div className="text-[10px] text-slate-400 font-semibold">Rating</div>
              <div className="text-xs font-black text-slate-800">★ 4.8</div>
            </div>
          </div>
        </div>

        {/* Card 3: Quick Actions */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3.5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
            <span className="text-blue-500">⚡</span>
            <span>Quick Actions</span>
          </div>

          <div className="space-y-2.5 flex-1 flex flex-col justify-center">
            <Link
              href="/reviewer/inspect?filter=IN_REVIEW"
              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-between shadow-xs transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>✓</span>
                <span>Review Pending Courses ({stats.pendingReview})</span>
              </div>
              <span>→</span>
            </Link>

            <Link
              href="/reviewer/inspect?filter=CHANGES_REQUESTED"
              className="w-full py-3 px-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center justify-between shadow-xs transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>🔄</span>
                <span>View Revision Requests ({stats.changesRequested})</span>
              </div>
              <span>→</span>
            </Link>

            <Link
              href="/reviewer/inspect?filter=APPROVED"
              className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-between shadow-xs transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>⏱</span>
                <span>Check Review History</span>
              </div>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReviewerDashboardPage() {
  return (
    <AuditorPortalShell>
      <Suspense fallback={<div className="p-8 text-xs text-slate-500">Loading Auditor Dashboard...</div>}>
        <ReviewerDashboardContent />
      </Suspense>
    </AuditorPortalShell>
  );
}

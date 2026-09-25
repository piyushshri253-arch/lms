'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuditorPortalShell } from '@/components/reviewer/AuditorPortalShell';
import { Icon } from '@/components/ui/Icon';

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
    recentlyUpdated: 0,
    avgReviewTime: '1.8 hrs',
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (sidebarFilter) {
      setActiveFilter(sidebarFilter);
    }
  }, [sidebarFilter]);

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

  const filterPills = [
    { id: 'ALL', label: 'All' },
    { id: 'NEW', label: 'New Courses' },
    { id: 'MAJOR_UPDATE', label: 'Major Updates (v2.0)' },
    { id: 'RESUBMISSION', label: 'Resubmissions' },
    { id: 'IN_REVIEW', label: 'In Review / Pending' },
    { id: 'CHANGES_REQUESTED', label: 'Changes Requested' },
    { id: 'APPROVED', label: 'Approved' },
    { id: 'REJECTED', label: 'Rejected' }
  ];

  const getTypeBadge = (type: string) => {
    if (type === 'MAJOR_UPDATE') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          Major Update
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
        New
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'IN_REVIEW' || status === 'PENDING_APPROVAL') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          IN_REVIEW
        </span>
      );
    }
    if (status === 'CHANGES_REQUESTED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-orange-50 text-orange-800 border border-orange-200">
          CHANGES_REQUESTED
        </span>
      );
    }
    if (status === 'APPROVED' || status === 'PUBLISHED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {status}
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
          REJECTED
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
    <div className="space-y-6">
      {/* 6 Auditor Dashboard KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500">Pending Reviews</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{stats.pendingReview}</div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">Awaiting Audit</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500">In Review</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">{stats.inReview}</div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">Active Queue</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500">Approved Today</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{stats.approvedToday}</div>
          <div className="text-[10px] font-mono text-emerald-600 mt-1">Total: {stats.approved}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500">Changes Requested</div>
          <div className="text-2xl font-black text-rose-600 mt-1">{stats.changesRequested}</div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">Needs Revision</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500">Recently Updated</div>
          <div className="text-2xl font-black text-purple-600 mt-1">{stats.recentlyUpdated}</div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">Last 7 Days</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500">Avg Review Time</div>
          <div className="text-2xl font-black text-teal-600 mt-1">{stats.avgReviewTime}</div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">SLA Target &lt; 4h</div>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {filterPills.map((pill) => (
              <button
                key={pill.id}
                onClick={() => setActiveFilter(pill.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === pill.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[260px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by course or instructor..."
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon name="search" size={16} />
            </span>
          </div>
        </div>
      </div>

      {/* Main Queue Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              Main Course Audit & Version Review Queue ({courses.length})
            </h2>
            <p className="text-xs text-slate-500">
              Click &quot;Review&quot; to inspect Curriculum, Protected Videos, PDFs, Quizzes, Version Diff (v1.0 vs v2.0), and Section-Wise Issues.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs font-semibold">
            Loading Auditor Review Queue...
          </div>
        ) : courses.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Icon name="fact_check" size={36} className="text-emerald-600 mx-auto" />
            <div className="text-sm font-bold text-slate-800">No Courses Match This Filter</div>
            <p className="text-xs text-slate-500">
              Switch the filter to &quot;All&quot; to inspect all courses in your organization.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono font-bold uppercase text-slate-500">
                  <th className="py-3.5 px-5">Course</th>
                  <th className="py-3.5 px-4">Instructor</th>
                  <th className="py-3.5 px-4">Version</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Submitted</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-9 rounded-lg bg-slate-900 overflow-hidden shrink-0 border border-slate-200">
                          {course.thumbnail ? (
                            <img
                              src={course.thumbnail}
                              alt={course.title}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/reviewer/courses/${course.id}`}
                            className="font-bold text-slate-900 hover:text-emerald-600 block truncate max-w-[260px]"
                          >
                            {course.title}
                          </Link>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {course.category?.name || 'Masterclass'} • {course.totalSections} modules •{' '}
                            {course.totalLessons} lectures
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-800">{course.instructor?.name}</div>
                      <div className="text-[11px] text-slate-500">{course.instructor?.email}</div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono font-bold text-slate-800 text-[11px]">
                        {course.versionLabel || 'v1.0'}
                      </span>
                    </td>

                    <td className="py-4 px-4">{getTypeBadge(course.submissionType)}</td>

                    <td className="py-4 px-4 text-slate-600 font-mono text-[11px]">
                      {new Date(
                        course.auditMeta?.submittedAt || course.updatedAt
                      ).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short'
                      })}
                    </td>

                    <td className="py-4 px-4">
                      {getStatusBadge(course.effectiveReviewStatus || course.status)}
                    </td>

                    <td className="py-4 px-5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/reviewer/courses/${course.id}/preview`}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1"
                          title="Preview Course as Student"
                        >
                          <Icon name="visibility" size={14} />
                          <span>Preview</span>
                        </Link>
                        <Link
                          href={`/reviewer/courses/${course.id}`}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5"
                        >
                          <Icon name="fact_check" size={15} />
                          <span>Review</span>
                        </Link>
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
  );
}

export default function ReviewerDashboardPage() {
  return (
    <AuditorPortalShell
      title="Course Auditor Dashboard & Review Queue"
      subtitle="Verify new courses (v1.0), major published course updates (v2.0), protected video/PDF streams, quizzes, and pricing compliance."
    >
      <Suspense fallback={<div className="p-8 text-xs text-slate-500">Loading Audit Queue...</div>}>
        <ReviewerDashboardContent />
      </Suspense>
    </AuditorPortalShell>
  );
}

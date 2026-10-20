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

  const [pendingInstructorsCount, setPendingInstructorsCount] = useState(0);

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

  return (
    <div className="space-y-6">
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

      {/* Instructor Onboarding & Resume Review Banner */}
      <div className="bg-gradient-to-r from-violet-900 via-indigo-900 to-emerald-900 text-white rounded-2xl p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-bold uppercase tracking-wider">
            <span>🎓 Instructor Onboarding &amp; Interview Studio</span>
            {pendingInstructorsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black">
                {pendingInstructorsCount} Pending Approval
              </span>
            )}
          </div>
          <h2 className="text-base sm:text-lg font-black">
            Review New Instructor Signups, Download Resumes &amp; Decide on Interviews
          </h2>
          <p className="text-xs text-slate-200">
            Inspect First/Last Name, Qualification, Additional Qualifications, Experience, and Resume — schedule an interview or click Onboard to send the Instructor their Login Email.
          </p>
        </div>

        <Link
          href="/reviewer/instructors"
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs whitespace-nowrap shadow-sm transition-all inline-flex items-center gap-2 self-start sm:self-center"
        >
          <span>Open Instructor Onboarding Studio →</span>
        </Link>
      </div>

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
                      <div className="inline-flex items-center gap-1.5 justify-end flex-wrap">
                        {/* 1. Preview Course */}
                        <Link
                          href={`/reviewer/courses/${course.id}/preview`}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs transition-colors"
                          title="Preview Course as Student"
                        >
                          <Icon name="visibility" size={13} />
                          <span>Preview</span>
                        </Link>

                        {/* 2. Deep Inspector Studio */}
                        <Link
                          href={`/reviewer/courses/${course.id}`}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold shadow-2xs inline-flex items-center gap-1 transition-colors"
                          title="Inspect Curriculum & Media Streams"
                        >
                          <Icon name="fact_check" size={13} />
                          <span>Inspect</span>
                        </Link>

                        {/* 3. Direct Quick Approve Button */}
                        {course.effectiveReviewStatus !== 'APPROVED' &&
                        course.status !== 'APPROVED' &&
                        course.status !== 'PUBLISHED' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDecisionModal({ course, action: 'APPROVE' });
                              setDecisionNote('');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs inline-flex items-center gap-1 cursor-pointer transition-all"
                            title="Approve this course in 1 click"
                          >
                            <Icon name="check_circle" size={13} />
                            <span>Approve</span>
                          </button>
                        ) : null}

                        {/* 4. Request Changes Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setDecisionModal({ course, action: 'REQUEST_CHANGES' });
                            setDecisionNote('');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-bold shadow-2xs inline-flex items-center gap-1 cursor-pointer transition-all"
                          title="Request changes from instructor"
                        >
                          <Icon name="warning" size={13} />
                          <span>Changes</span>
                        </button>

                        {/* 5. Reject Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setDecisionModal({ course, action: 'REJECT' });
                            setDecisionNote('');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-2xs inline-flex items-center gap-1 cursor-pointer transition-all"
                          title="Reject this course submission"
                        >
                          <Icon name="cancel" size={13} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Decision Modal (Approve / Request Changes / Reject) */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
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
                    size={18}
                  />
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    {decisionModal.action === 'APPROVE'
                      ? 'Approve Course Submission'
                      : decisionModal.action === 'REQUEST_CHANGES'
                      ? 'Request Course Changes'
                      : 'Reject Course Submission'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
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
              className={`p-3.5 rounded-xl border text-xs space-y-1 ${
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
                  ? 'Critique / Feedback for Instructor'
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
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />

              {decisionModal.action !== 'APPROVE' && (
                <div className="space-y-1.5 mt-2">
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
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors cursor-pointer"
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
      title="Course Auditor Dashboard & Review Queue"
      subtitle="Verify new courses (v1.0), major published course updates (v2.0), protected video/PDF streams, quizzes, and pricing compliance."
    >
      <Suspense fallback={<div className="p-8 text-xs text-slate-500">Loading Audit Queue...</div>}>
        <ReviewerDashboardContent />
      </Suspense>
    </AuditorPortalShell>
  );
}

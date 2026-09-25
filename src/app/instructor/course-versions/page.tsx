'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';
import { useApp } from '@/context/AppContext';

interface DetectedChange {
  category: 'PRICE' | 'VIDEO' | 'CURRICULUM' | 'QUIZ' | 'MINOR';
  field: string;
  summary: string;
  before?: any;
  after?: any;
}

interface VersionHistoryItem {
  versionNumber: number;
  versionLabel: string;
  publishedAt: string;
  approvedBy: string;
  changeSummary: string[];
  price: number;
  modulesCount: number;
  lessonsCount: number;
}

interface CourseVersionItem {
  courseId: string;
  title: string;
  slug: string;
  courseStatus: string;
  thumbnail: string;
  instructor: { id: string; name: string; email: string };
  enrolledCount: number;
  liveStats: {
    price: number;
    discountPrice?: number | null;
    modulesCount: number;
    lessonsCount: number;
  };
  stagedStats: {
    price: number;
    discountPrice?: number | null;
    modulesCount: number;
    lessonsCount: number;
  } | null;
  versionState: {
    courseId: string;
    liveVersionNumber: number;
    liveVersionLabel: string;
    pendingVersionNumber: number | null;
    pendingVersionLabel: string | null;
    status: 'LIVE_SYNCED' | 'DRAFT_VERSION' | 'PENDING_REVIEW' | 'VERSION_REJECTED';
    detectedChanges: DetectedChange[];
    submittedAt: string | null;
    submittedBy: string | null;
    reviewedAt: string | null;
    reviewedBy: string | null;
    reviewerFeedback: string | null;
    history: VersionHistoryItem[];
    updatedAt: string;
  };
}

function CourseVersionsInner() {
  const { currentUser } = useApp();
  const searchParams = useSearchParams();
  const initialCourseId = searchParams?.get('courseId') || '';

  const [items, setItems] = useState<CourseVersionItem[]>([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    publishedCourses: 0,
    draftVersions: 0,
    pendingAuditorReview: 0,
    rejectedVersions: 0
  });
  const [viewerRole, setViewerRole] = useState<string>('INSTRUCTOR');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Stage Major Change Modal State
  const [stageModalCourse, setStageModalCourse] = useState<CourseVersionItem | null>(null);
  const [stageForm, setStageForm] = useState({
    newPrice: '',
    newVideoUrl: '',
    newModuleTitle: '',
    newLessonTitle: '',
    quizUpdateSummary: '',
    submitNow: true
  });
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Auditor Review Modal State
  const [auditorModalCourse, setAuditorModalCourse] = useState<CourseVersionItem | null>(null);
  const [auditorNote, setAuditorNote] = useState('');

  const showToastMessage = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (initialCourseId) params.set('courseId', initialCourseId);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await fetch(`/api/instructor/course-versions?${params.toString()}`, {
        cache: 'no-store'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load course versions');

      setItems(data.items || []);
      if (data.stats) setStats(data.stats);
      if (data.viewerRole) setViewerRole(data.viewerRole);
    } catch (err: any) {
      showToastMessage('error', err.message || 'Unable to load course versions');
    } finally {
      setLoading(false);
    }
  }, [initialCourseId, statusFilter]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleVersionAction = async (
    courseId: string,
    action: 'SUBMIT_FOR_REVIEW' | 'DISCARD_DRAFT' | 'APPROVE_VERSION' | 'REJECT_VERSION',
    note?: string
  ) => {
    setProcessingId(courseId);
    try {
      const res = await fetch('/api/instructor/course-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          action,
          note
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to execute version action');

      showToastMessage('success', data.message || 'Course version updated!');
      setAuditorModalCourse(null);
      setAuditorNote('');
      await fetchVersions();
    } catch (err: any) {
      showToastMessage('error', err.message || 'Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleStageMajorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageModalCourse) return;
    setProcessingId(stageModalCourse.courseId);
    try {
      const res = await fetch('/api/instructor/course-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'STAGE_MAJOR_EDIT',
          courseId: stageModalCourse.courseId,
          newPrice: stageForm.newPrice !== '' ? Number(stageForm.newPrice) : undefined,
          newVideoUrl: stageForm.newVideoUrl.trim() || undefined,
          newModuleTitle: stageForm.newModuleTitle.trim() || undefined,
          newLessonTitle: stageForm.newLessonTitle.trim() || undefined,
          quizUpdateSummary: stageForm.quizUpdateSummary.trim() || undefined,
          submitNow: stageForm.submitNow
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to stage version');

      showToastMessage('success', data.message || 'Major changes staged as new version!');
      setStageModalCourse(null);
      await fetchVersions();
    } catch (err: any) {
      showToastMessage('error', err.message || 'Failed to stage major change');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
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

  const canAuditorApprove = ['REVIEWER', 'ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN'].includes(
    viewerRole || currentUser?.role || ''
  );

  return (
    <InstructorPortalShell
      title="Published Course Protection & Version Control"
      subtitle="Safeguard live published courses: stage major edits (Price, Video, Curriculum, Quiz) as draft versions and submit for Auditor approval"
      profile={{
        name: currentUser?.name || 'Instructor',
        email: currentUser?.email || '',
        role: currentUser?.role || 'INSTRUCTOR',
        emailVerified: true
      }}
    >
      {/* Toast */}
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

      {/* Top Architecture & Rules Explainer Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 mb-6 shadow-lg border border-indigo-500/30">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-black uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              Production LMS Published Course Protection
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Zero-Downtime Course Versioning & Re-Review Pipeline
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              When a course is <strong className="text-emerald-400">PUBLISHED</strong>, enrolled students continue learning on the stable Live Version while your major updates are staged safely for Auditor review.
            </p>
          </div>
        </div>

        {/* Visual Pipeline Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-3 border-t border-white/10 text-xs">
          {[
            { step: '1', title: 'Published Live', desc: 'v1.0 Active for Students', icon: 'public', color: 'text-emerald-400' },
            { step: '2', title: 'Instructor Edits', desc: 'Video, Price, Quiz, Syllabus', icon: 'edit_note', color: 'text-indigo-300' },
            { step: '3', title: 'Saved as Version', desc: 'Staged as v2.0 Draft', icon: 'Difference', color: 'text-amber-300' },
            { step: '4', title: 'Submit Review', desc: 'Sent to Quality Auditor', icon: 'send', color: 'text-sky-300' },
            { step: '5', title: 'Auditor Approval', desc: 'Diff Checked & Verified', icon: 'fact_check', color: 'text-purple-300' },
            { step: '6', title: 'v2.0 Goes Live', desc: 'Seamless Atomic Upgrade', icon: 'rocket_launch', color: 'text-emerald-400' }
          ].map((s) => (
            <div key={s.step} className="p-3 rounded-2xl bg-white/[0.06] border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`material-symbols-outlined text-[16px] ${s.color}`}>{s.icon}</span>
                <span className="font-black text-white">{s.title}</span>
              </div>
              <p className="text-[11px] text-slate-300">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Minor vs Major Separation Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/10">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-emerald-400 text-[18px] mt-0.5">bolt</span>
            <div>
              <p className="text-xs font-black text-emerald-300">
                Minor Changes (Applied Live Immediately — No Re-Review Needed)
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Fixing typos in Course Description, Subtitle, SEO Metadata, Thumbnail/Banner image, or Lesson text notes.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-amber-400 text-[18px] mt-0.5">shield_lock</span>
            <div>
              <p className="text-xs font-black text-amber-300">
                Major Changes (Protected — Staged as Draft Version & Requires Auditor Approval)
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                <strong>Price Change</strong>, <strong>Video URL Change</strong>, <strong>Curriculum Change</strong> (Adding/Removing Modules or Lessons), and <strong>Quiz / Assessment Changes</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: `All Courses (${stats.totalCourses})` },
            { id: 'LIVE_SYNCED', label: 'Live & Synced' },
            { id: 'DRAFT_VERSION', label: `Staged Draft Versions (${stats.draftVersions})` },
            { id: 'PENDING_REVIEW', label: `Pending Auditor Review (${stats.pendingAuditorReview})` },
            { id: 'VERSION_REJECTED', label: `Changes Requested (${stats.rejectedVersions})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Version List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Loading Course Version Protection Status...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-sm font-bold text-slate-600">No courses match the selected filter.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {items.map((item) => {
            const ver = item.versionState;
            const hasStaged = ver.status !== 'LIVE_SYNCED';
            return (
              <div
                key={item.courseId}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Top Bar */}
                <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black">
                        Live: {ver.liveVersionLabel} ({item.courseStatus})
                      </span>

                      {ver.status === 'DRAFT_VERSION' && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-black flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                          Staged Draft: {ver.pendingVersionLabel} (Unsubmittted)
                        </span>
                      )}

                      {ver.status === 'PENDING_REVIEW' && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-sky-100 text-sky-800 text-xs font-black flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">hourglass_top</span>
                          {ver.pendingVersionLabel} — Awaiting Auditor Approval
                        </span>
                      )}

                      {ver.status === 'VERSION_REJECTED' && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-xs font-black">
                          {ver.pendingVersionLabel} — Changes Requested by Auditor
                        </span>
                      )}

                      <span className="text-xs text-slate-500 font-semibold">
                        • {item.enrolledCount} Enrolled Student(s) Protected
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-slate-900">{item.title}</h3>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStageModalCourse(item);
                        setStageForm({
                          newPrice: String(item.stagedStats?.price ?? item.liveStats.price),
                          newVideoUrl: '',
                          newModuleTitle: '',
                          newLessonTitle: '',
                          quizUpdateSummary: '',
                          submitNow: true
                        });
                      }}
                      className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black flex items-center gap-1.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit_document</span>
                      + Stage Major Update ({`v${(ver.liveVersionNumber || 1) + 1}.0`})
                    </button>

                    <Link
                      href={`/instructor/courses/builder?id=${item.courseId}`}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">build</span>
                      Open Course Builder
                    </Link>

                    {(ver.status === 'DRAFT_VERSION' || ver.status === 'VERSION_REJECTED') && (
                      <button
                        type="button"
                        disabled={processingId === item.courseId}
                        onClick={() => handleVersionAction(item.courseId, 'SUBMIT_FOR_REVIEW')}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">send</span>
                        Submit {ver.pendingVersionLabel} for Auditor Review
                      </button>
                    )}

                    {hasStaged && (
                      <button
                        type="button"
                        disabled={processingId === item.courseId}
                        onClick={() => handleVersionAction(item.courseId, 'DISCARD_DRAFT')}
                        className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold"
                      >
                        Discard Staged Version
                      </button>
                    )}

                    {hasStaged && canAuditorApprove && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuditorModalCourse(item);
                          setAuditorNote('');
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">gavel</span>
                        Auditor Decision (Approve / Reject)
                      </button>
                    )}
                  </div>
                </div>

                {/* Body: Side-by-Side Diff (Live vs Staged Version) + Version History */}
                <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left 7 cols: Live vs Staged Diff & Detected Major Changes */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Live Version Card */}
                      <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                            Active Live Version ({ver.liveVersionLabel})
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black">
                            Visible to Students
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-slate-500 text-[10px]">Live Price</p>
                            <p className="font-black text-slate-900">₹{item.liveStats.price}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-[10px]">Modules</p>
                            <p className="font-black text-slate-900">{item.liveStats.modulesCount}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-[10px]">Lessons</p>
                            <p className="font-black text-slate-900">{item.liveStats.lessonsCount}</p>
                          </div>
                        </div>
                      </div>

                      {/* Staged / Pending Version Card */}
                      <div
                        className={`p-4 rounded-2xl border ${
                          hasStaged
                            ? 'bg-amber-50/70 border-amber-300'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                            {hasStaged
                              ? `Staged Version (${ver.pendingVersionLabel})`
                              : 'No Pending Major Changes'}
                          </span>
                          {hasStaged && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white text-[10px] font-black">
                              {ver.status}
                            </span>
                          )}
                        </div>

                        {item.stagedStats ? (
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-slate-500 text-[10px]">Proposed Price</p>
                              <p className="font-black text-indigo-700">₹{item.stagedStats.price}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 text-[10px]">Modules</p>
                              <p className="font-black text-indigo-700">
                                {item.stagedStats.modulesCount}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500 text-[10px]">Lessons</p>
                              <p className="font-black text-indigo-700">
                                {item.stagedStats.lessonsCount}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">
                            All curriculum, video, quiz, and pricing settings match {ver.liveVersionLabel}.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Reviewer Feedback Box if rejected */}
                    {ver.reviewerFeedback && (
                      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-rose-600 text-[18px]">
                          feedback
                        </span>
                        <div>
                          <p className="text-xs font-black text-rose-800">
                            Auditor Feedback ({ver.reviewedBy || 'Quality Reviewer'}):
                          </p>
                          <p className="text-xs text-rose-700 mt-0.5">{ver.reviewerFeedback}</p>
                        </div>
                      </div>
                    )}

                    {/* Detected Major Changes List */}
                    {ver.detectedChanges && ver.detectedChanges.length > 0 && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                        <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          Detected Changes in {ver.pendingVersionLabel} ({ver.detectedChanges.length})
                        </p>
                        <div className="space-y-1.5">
                          {ver.detectedChanges.map((chg, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-xs bg-white p-2 rounded-xl border border-slate-200/80"
                            >
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase shrink-0 ${
                                  chg.category === 'PRICE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : chg.category === 'VIDEO'
                                    ? 'bg-purple-100 text-purple-800'
                                    : chg.category === 'QUIZ'
                                    ? 'bg-amber-100 text-amber-800'
                                    : chg.category === 'CURRICULUM'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {chg.category}
                              </span>
                              <span className="text-slate-800 font-medium">{chg.summary}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right 5 cols: Version Release History */}
                  <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                      Approved Release History ({ver.history?.length || 1})
                    </h4>
                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {(ver.history || []).map((h, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black">
                              {h.versionLabel}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {formatDate(h.publishedAt)}
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-slate-700">
                            Approved by: {h.approvedBy}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            {(h.changeSummary || []).join(' • ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Stage Major Update on Published Course */}
      {stageModalCourse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-indigo-50/50">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Stage Major Update for &ldquo;{stageModalCourse.title}&rdquo;
                </h3>
                <p className="text-xs text-slate-500">
                  Live Version ({stageModalCourse.versionState.liveVersionLabel}) will stay untouched for students until Auditor approval
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStageModalCourse(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleStageMajorSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Proposed Price Change (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={stageForm.newPrice}
                    onChange={(e) => setStageForm((prev) => ({ ...prev, newPrice: e.target.value }))}
                    placeholder={`Current Live: ₹${stageModalCourse.liveStats.price}`}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    New Video URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={stageForm.newVideoUrl}
                    onChange={(e) =>
                      setStageForm((prev) => ({ ...prev, newVideoUrl: e.target.value }))
                    }
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Add New Curriculum Module (Optional)
                  </label>
                  <input
                    type="text"
                    value={stageForm.newModuleTitle}
                    onChange={(e) =>
                      setStageForm((prev) => ({ ...prev, newModuleTitle: e.target.value }))
                    }
                    placeholder="e.g., Module 5: Advanced Production Deployment"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    New Lesson Title in Module
                  </label>
                  <input
                    type="text"
                    value={stageForm.newLessonTitle}
                    onChange={(e) =>
                      setStageForm((prev) => ({ ...prev, newLessonTitle: e.target.value }))
                    }
                    placeholder="e.g., Zero-Downtime CI/CD"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Quiz / Assessment Update Summary (Optional)
                </label>
                <input
                  type="text"
                  value={stageForm.quizUpdateSummary}
                  onChange={(e) =>
                    setStageForm((prev) => ({ ...prev, quizUpdateSummary: e.target.value }))
                  }
                  placeholder="e.g., Updated Final Assessment passing score & added 5 new MCQ questions"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={stageForm.submitNow}
                  onChange={(e) =>
                    setStageForm((prev) => ({ ...prev, submitNow: e.target.checked }))
                  }
                  className="rounded border-slate-300 text-indigo-600"
                />
                Immediately submit this new version for Auditor Review
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStageModalCourse(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === stageModalCourse.courseId}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm"
                >
                  {stageForm.submitNow
                    ? 'Stage Version & Submit for Review'
                    : 'Save as Draft Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Auditor Approval / Rejection */}
      {auditorModalCourse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-emerald-50/50">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Auditor Decision: {auditorModalCourse.versionState.pendingVersionLabel}
                </h3>
                <p className="text-xs text-slate-500">{auditorModalCourse.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setAuditorModalCourse(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Auditor Review Note / Critique Feedback
                </label>
                <textarea
                  rows={3}
                  value={auditorNote}
                  onChange={(e) => setAuditorNote(e.target.value)}
                  placeholder="Enter approval note or reason for requesting revisions..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() =>
                    handleVersionAction(auditorModalCourse.courseId, 'REJECT_VERSION', auditorNote)
                  }
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black"
                >
                  Request Changes (Keep {auditorModalCourse.versionState.liveVersionLabel} Live)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleVersionAction(auditorModalCourse.courseId, 'APPROVE_VERSION', auditorNote)
                  }
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm"
                >
                  Approve & Publish {auditorModalCourse.versionState.pendingVersionLabel} Live
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </InstructorPortalShell>
  );
}

export default function InstructorCourseVersionsPage() {
  return (
    <Suspense fallback={null}>
      <CourseVersionsInner />
    </Suspense>
  );
}

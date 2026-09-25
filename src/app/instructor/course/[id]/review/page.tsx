'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { InstructorPortalShell } from '@/components/instructor/InstructorPortalShell';
import { Icon } from '@/components/ui/Icon';

export default function InstructorCourseReviewFeedbackPage() {
  const params = useParams();
  const courseId = (params?.id as string) || '';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resubmitNote, setResubmitNote] = useState('');
  const [resubmitting, setResubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ title: string; desc?: string; type?: string } | null>(
    null
  );

  const showToast = (msg: { title: string; desc?: string; type?: string }) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  };

  const loadReviewFeedback = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/reviewer/courses/${encodeURIComponent(courseId)}/review`);
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
      }
    } catch {
      showToast({ title: 'Error', desc: 'Failed to load auditor review feedback.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviewFeedback();
  }, [courseId]);

  const handleResubmitForReview = async () => {
    try {
      setResubmitting(true);
      const res = await fetch(`/api/reviewer/courses/${encodeURIComponent(courseId)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESUBMIT',
          note:
            resubmitNote.trim() ||
            'All requested section issues have been resolved and updated for re-evaluation.'
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to resubmit');

      setResubmitNote('');
      showToast({
        title: 'Resubmitted for Auditor Review 🚀',
        desc: json.message
      });
      await loadReviewFeedback();
    } catch (err: any) {
      showToast({ title: 'Error', desc: err.message, type: 'error' });
    } finally {
      setResubmitting(false);
    }
  };

  if (loading || !data?.course) {
    return (
      <InstructorPortalShell title="Course Review & Auditor Feedback">
        <div className="p-12 text-center text-xs text-slate-500">
          Loading Auditor feedback and section-wise review status...
        </div>
      </InstructorPortalShell>
    );
  }

  const { course, versionLabel, submissionType, versionState, auditMeta } = data;
  const sectionStatuses = auditMeta?.sectionStatuses || {};
  const sectionIssues = Array.isArray(auditMeta?.sectionIssues) ? auditMeta.sectionIssues : [];
  const reviewHistory = Array.isArray(auditMeta?.reviewHistory) ? auditMeta.reviewHistory : [];

  const displayStatus =
    versionState?.status === 'VERSION_REJECTED' ||
    (course.status === 'REJECTED' && sectionIssues.length > 0)
      ? 'CHANGES_REQUESTED'
      : course.status;

  return (
    <InstructorPortalShell
      title={`Course Review: ${course.title}`}
      subtitle={`Version: ${versionLabel} • Submission Type: ${submissionType} • Auditor Feedback & Resubmission Center`}
      actions={
        <div className="flex items-center gap-2.5">
          <Link
            href={`/instructor/courses/builder?id=${encodeURIComponent(course.id)}`}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-xs"
          >
            <Icon name="edit" size={16} />
            <span>Edit Course</span>
          </Link>

          <button
            onClick={handleResubmitForReview}
            disabled={resubmitting || displayStatus === 'IN_REVIEW'}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Icon name="send" size={16} />
            <span>
              {resubmitting
                ? 'Resubmitting...'
                : displayStatus === 'IN_REVIEW'
                ? 'In Auditor Queue ✓'
                : 'Resubmit for Review'}
            </span>
          </button>
        </div>
      }
    >
      {toastMsg && (
        <div
          className={`mb-4 p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            toastMsg.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div>
            <span className="font-bold">{toastMsg.title}</span>
            {toastMsg.desc && <span className="ml-2 font-normal">{toastMsg.desc}</span>}
          </div>
          <button onClick={() => setToastMsg(null)}>✕</button>
        </div>
      )}

      <div className="space-y-6">
        {/* Status Banner */}
        <div
          className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            displayStatus === 'APPROVED' || displayStatus === 'PUBLISHED'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : displayStatus === 'CHANGES_REQUESTED' || displayStatus === 'REJECTED'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="space-y-1">
            <div className="text-[11px] font-mono font-bold uppercase">
              Current Audit Status: {displayStatus}
            </div>
            <h2 className="text-base font-extrabold">
              {displayStatus === 'APPROVED' || displayStatus === 'PUBLISHED'
                ? '✅ Your course has been approved by the Course Auditor!'
                : displayStatus === 'CHANGES_REQUESTED' || displayStatus === 'REJECTED'
                ? '⚠️ Your course requires changes before it can be approved.'
                : '⏳ Your course is currently in the Auditor Review Queue.'}
            </h2>
            {(course.reviewFeedback || versionState?.reviewerFeedback) && (
              <p className="text-xs leading-relaxed pt-1">
                <strong>Auditor Summary Feedback:</strong> &quot;
                {versionState?.reviewerFeedback || course.reviewFeedback}&quot;
              </p>
            )}
          </div>

          <Link
            href={`/instructor/courses/preview/${encodeURIComponent(course.id)}`}
            target="_blank"
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shrink-0 text-center"
          >
            Preview as Student
          </Link>
        </div>

        {/* Section-Wise Checklist & Actionable Issues (Requirement #19) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">
              Auditor Section-Wise Feedback & Action Items
            </h3>

            {/* 6 Section Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {[
                { key: 'curriculum', label: 'Curriculum' },
                { key: 'video', label: 'Video Quality & DRM' },
                { key: 'pdf', label: 'PDF Documents' },
                { key: 'quiz', label: 'Quizzes & Keys' },
                { key: 'pricing', label: 'Pricing' },
                { key: 'learningOutcomes', label: 'Learning Outcomes' }
              ].map((s) => {
                const passed = sectionStatuses[s.key] !== 'ISSUE';
                return (
                  <div
                    key={s.key}
                    className={`p-3 rounded-xl border flex items-center justify-between font-bold ${
                      passed
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <span>{s.label}</span>
                    <span>{passed ? '✅ Approved' : '❌ Fix Needed'}</span>
                  </div>
                );
              })}
            </div>

            {/* Specific Lesson / Section Issues */}
            {sectionIssues.length > 0 ? (
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-rose-700">
                  Specific Items to Fix Before Resubmitting ({sectionIssues.length}):
                </div>
                {sectionIssues.map((iss: any) => (
                  <div
                    key={iss.id}
                    className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 space-y-1 text-xs"
                  >
                    <div className="font-extrabold text-rose-900">
                      ❌ {iss.section}
                      {iss.lessonRef ? ` → ${iss.lessonRef}` : ''}
                    </div>
                    <div className="font-bold text-slate-900">{iss.issue}</div>
                    <div className="text-slate-700">{iss.comment}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs text-emerald-800 font-semibold">
                ✅ No open section-level blocks flagged.
              </div>
            )}

            {/* Resubmission Note Box */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Resubmission Note for Auditor (Explain what you fixed)
              </label>
              <textarea
                rows={3}
                value={resubmitNote}
                onChange={(e) => setResubmitNote(e.target.value)}
                placeholder="e.g. Replaced Module 3 Lesson 4 video with 1080p HD version and added deployment learning outcomes..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800"
              />
              <div className="flex items-center gap-3">
                <Link
                  href={`/instructor/courses/builder?id=${encodeURIComponent(course.id)}`}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800"
                >
                  Edit Course Curriculum
                </Link>
                <button
                  onClick={handleResubmitForReview}
                  disabled={resubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer"
                >
                  {resubmitting ? 'Submitting...' : 'Resubmit for Review'}
                </button>
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Preserved Review History Timeline (Requirement #21) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">
              Review & Resubmission History
            </h3>

            {reviewHistory.length === 0 ? (
              <p className="text-xs text-slate-400">No review history recorded yet.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {reviewHistory.map((h: any) => (
                  <div
                    key={h.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-500">
                      <span>
                        {new Date(h.timestamp).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
                        {h.action}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900">
                      {h.actorRole}: {h.actorName} ({h.versionLabel})
                    </div>
                    {h.feedback && (
                      <p className="text-slate-600 italic">&quot;{h.feedback}&quot;</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </InstructorPortalShell>
  );
}

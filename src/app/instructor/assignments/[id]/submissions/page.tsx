'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  RotateCcw,
  FileText,
  Download,
  Clock,
  AlertTriangle,
  History,
  Award,
  Edit3
} from 'lucide-react';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';

export default function InstructorAssignmentSubmissionsPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [assignment, setAssignment] = useState<any | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    totalSubmissions: 0,
    pendingReviews: 0,
    gradedSubmissions: 0,
    returnedSubmissions: 0,
    lateSubmissions: 0,
    avgMarks: 0,
    avgGradePercent: 0
  });
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Active Student Submission Being Reviewed in Grading Studio
  const [activeSubmission, setActiveSubmission] = useState<any | null>(null);
  const [rawScoreInput, setRawScoreInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [gradingBusy, setGradingBusy] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/instructor/assignments/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to load assignment submissions.');
        return;
      }
      setAssignment(data.assignment);
      setSubmissions(data.submissions || []);
      if (data.analytics) setAnalytics(data.analytics);

      if (activeSubmission) {
        const refreshed = (data.submissions || []).find(
          (s: any) => s.studentId === activeSubmission.studentId
        );
        if (refreshed) {
          setActiveSubmission(refreshed);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const selectSubmissionForReview = (sub: any) => {
    setActiveSubmission(sub);
    setRawScoreInput(
      sub.rawScore !== null && sub.rawScore !== undefined ? String(sub.rawScore) : ''
    );
    setFeedbackInput(sub.feedback || '');
    setActionMsg('');
    setErrorMsg('');
  };

  const handleGradeOrReturn = async (targetStatus: 'GRADED' | 'RETURNED') => {
    if (!activeSubmission || !assignment) return;
    setErrorMsg('');
    setActionMsg('');

    const numericScore = Number(rawScoreInput || 0);
    if (
      targetStatus === 'GRADED' &&
      (rawScoreInput === '' || isNaN(numericScore) || numericScore < 0 || numericScore > assignment.maxMarks)
    ) {
      setErrorMsg(`Please enter a valid score between 0 and ${assignment.maxMarks}.`);
      return;
    }

    if (targetStatus === 'RETURNED' && !feedbackInput.trim()) {
      setErrorMsg(
        'Please provide clear feedback explaining what the student needs to improve before returning for resubmission.'
      );
      return;
    }

    try {
      setGradingBusy(true);
      const res = await fetch(`/api/instructor/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GRADE_SUBMISSION',
          studentId: activeSubmission.studentId,
          rawScore: numericScore,
          feedback: feedbackInput.trim(),
          status: targetStatus
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to save grade.');
        return;
      }
      setActionMsg(data.message);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save review.');
    } finally {
      setGradingBusy(false);
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    if (statusFilter !== 'ALL' && sub.status !== statusFilter) return false;
    if (
      search &&
      !sub.studentName.toLowerCase().includes(search.toLowerCase()) &&
      !sub.studentEmail.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Preview server-side late penalty in real-time
  const previewRawNum = Number(rawScoreInput || 0);
  const previewLatePenalty =
    activeSubmission?.isLate &&
    assignment?.lateSubmissionPolicy === 'ALLOWED_WITH_PENALTY'
      ? Number(((previewRawNum * (assignment?.latePenaltyPercentage || 10)) / 100).toFixed(2))
      : 0;
  const previewFinalScore = Math.max(0, Number((previewRawNum - previewLatePenalty).toFixed(2)));

  return (
    <InstructorPortalShell
      title={assignment ? `Submissions & Grading: ${assignment.title}` : 'Assignment Submissions'}
      subtitle="Inspect student files & text responses, view multi-version submission history, award marks, and return for resubmission"
    >
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/instructor/assignments"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Assignments
            </Link>
            {assignment && (
              <div>
                <h2 className="text-base font-extrabold text-slate-900">{assignment.title}</h2>
                <p className="text-xs text-slate-500">
                  {assignment.courseTitle} • Max Marks: <strong>{assignment.maxMarks}</strong> • Due:{' '}
                  {assignment.dueDate
                    ? new Date(assignment.dueDate).toLocaleString()
                    : 'No Deadline'}{' '}
                  • Late Policy: {assignment.lateSubmissionPolicy?.replace(/_/g, ' ')}
                </p>
              </div>
            )}
          </div>

          {assignment && (
            <Link
              href={`/instructor/assignments/${assignment.id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              <Edit3 className="w-4 h-4" />
              Edit Assignment
            </Link>
          )}
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-500">Total Submissions</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {analytics.totalSubmissions}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-500">Pending Reviews</div>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">
              {analytics.pendingReviews}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-500">Graded</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              {analytics.gradedSubmissions}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-500">Average Marks</div>
            <div className="text-2xl font-extrabold text-indigo-600 mt-1">
              {analytics.avgMarks} / {assignment?.maxMarks || 100} ({analytics.avgGradePercent}%)
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-500">Late Submissions</div>
            <div className="text-2xl font-extrabold text-rose-600 mt-1">
              {analytics.lateSubmissions}
            </div>
          </div>
        </div>

        {actionMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold">
            ✓ {actionMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold">
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 Cols): Submissions Table */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search student name or email..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold"
              >
                <option value="ALL">All Review Statuses</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="LATE">LATE</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="GRADED">GRADED</option>
                <option value="RETURNED">RETURNED (Resubmission Requested)</option>
              </select>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              {loading ? (
                <div className="p-10 text-center text-slate-500 text-sm">
                  Loading student submissions...
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-sm">
                  No student submissions found for this filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                        <th className="p-3.5">Student</th>
                        <th className="p-3.5">Submitted & Punctuality</th>
                        <th className="p-3.5">Status & Versions</th>
                        <th className="p-3.5">Marks</th>
                        <th className="p-3.5 text-right">Review</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredSubmissions.map((sub) => {
                        const isSelected = activeSubmission?.studentId === sub.studentId;
                        return (
                          <tr
                            key={sub.id}
                            onClick={() => selectSubmissionForReview(sub)}
                            className={`cursor-pointer transition ${
                              isSelected ? 'bg-indigo-50/80' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900">{sub.studentName}</div>
                              <div className="text-[11px] text-slate-500">{sub.studentEmail}</div>
                            </td>

                            <td className="p-3.5">
                              <div className="text-slate-700">
                                {new Date(sub.submittedAt).toLocaleString()}
                              </div>
                              {sub.isLate ? (
                                <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                                  LATE ({sub.daysLate}d after due date)
                                </span>
                              ) : (
                                <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  On Time
                                </span>
                              )}
                            </td>

                            <td className="p-3.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  sub.status === 'GRADED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : sub.status === 'RETURNED'
                                    ? 'bg-amber-100 text-amber-800'
                                    : sub.status === 'LATE'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}
                              >
                                {sub.status}
                              </span>
                              <div className="text-[10px] text-slate-500 mt-1">
                                {sub.submissionCount} Version(s) in History
                              </div>
                            </td>

                            <td className="p-3.5 font-extrabold text-slate-900">
                              {sub.finalScore !== null && sub.finalScore !== undefined
                                ? `${sub.finalScore} / ${sub.maxMarks}`
                                : 'Unscored'}
                              {sub.latePenaltyDeducted > 0 && (
                                <div className="text-[10px] text-rose-600 font-semibold">
                                  Raw: {sub.rawScore} (-{sub.latePenaltyDeducted} late penalty)
                                </div>
                              )}
                            </td>

                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectSubmissionForReview(sub);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-[11px]"
                              >
                                Open Review
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (5 Cols): Full Grading & Multi-Version History Studio */}
          <div className="lg:col-span-5">
            {!activeSubmission ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-sm shadow-xs">
                Select a student submission from the table on the left to inspect files, read
                written responses, review multi-version submission history, and award marks &
                feedback.
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-indigo-600">
                      Reviewing Submission #{activeSubmission.submissionCount}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {activeSubmission.studentName}
                    </h3>
                    <p className="text-xs text-slate-500">{activeSubmission.studentEmail}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      activeSubmission.status === 'GRADED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activeSubmission.status === 'RETURNED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {activeSubmission.status}
                  </span>
                </div>

                {/* Submitted File & Written Response */}
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase text-slate-500">
                    Submitted Deliverables
                  </div>

                  {activeSubmission.fileName || activeSubmission.fileUrl ? (
                    <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {activeSubmission.fileName || 'Submitted_Attachment'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Uploaded {new Date(activeSubmission.submittedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <a
                        href={activeSubmission.fileUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-100 shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Open / Download
                      </a>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">No file attachment uploaded.</div>
                  )}

                  {activeSubmission.textResponse && (
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-700">
                        Student Written Response:
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {activeSubmission.textResponse}
                      </div>
                    </div>
                  )}
                </div>

                {/* Grading & Feedback Form */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Awarded Marks (Max: {assignment?.maxMarks}) *
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={assignment?.maxMarks || 100}
                        value={rawScoreInput}
                        onChange={(e) => setRawScoreInput(e.target.value)}
                        placeholder={`0 - ${assignment?.maxMarks}`}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-extrabold text-slate-900"
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs">
                      <div className="text-slate-500 font-semibold">Final Calculated Score</div>
                      <div className="text-base font-extrabold text-indigo-600 mt-0.5">
                        {previewFinalScore} / {assignment?.maxMarks}
                      </div>
                      {previewLatePenalty > 0 && (
                        <div className="text-[10px] text-rose-600 font-bold">
                          Includes -{previewLatePenalty} Late Penalty (
                          {assignment?.latePenaltyPercentage}%)
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Instructor Feedback (Visible to Student in My Learning) *
                    </label>
                    <textarea
                      rows={3}
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      placeholder="e.g., Good implementation. Improve mobile responsiveness and add proper form validation."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={gradingBusy}
                      onClick={() => handleGradeOrReturn('GRADED')}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Mark as Graded ({previewFinalScore}/{assignment?.maxMarks})
                    </button>

                    {assignment?.allowResubmission !== false && (
                      <button
                        type="button"
                        disabled={gradingBusy}
                        onClick={() => handleGradeOrReturn('RETURNED')}
                        className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Return for Resubmission
                      </button>
                    )}
                  </div>
                </div>

                {/* Multi-Version Submission History (Submission 1, Submission 2, Submission 3...) */}
                <div className="space-y-2.5 pt-2">
                  <div className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-indigo-600" />
                    Submission History ({activeSubmission.history?.length || 1} Versions Preserved)
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {(activeSubmission.history || []).map((ver: any) => (
                      <div
                        key={ver.versionNumber}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>Submission #{ver.versionNumber}</span>
                          <span className="text-[11px] text-indigo-700">{ver.status}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Submitted: {new Date(ver.submittedAt).toLocaleString()}
                          {ver.isLate ? ' (LATE)' : ' (On Time)'}
                        </div>
                        {ver.fileName && (
                          <div className="text-[11px] text-slate-700">
                            File: <strong>{ver.fileName}</strong>
                          </div>
                        )}
                        {ver.finalScore !== null && ver.finalScore !== undefined && (
                          <div className="text-[11px] font-bold text-emerald-700">
                            Score: {ver.finalScore} / {ver.maxMarks}
                          </div>
                        )}
                        {ver.feedback && (
                          <div className="text-[11px] text-slate-600 italic">
                            Feedback: &ldquo;{ver.feedback}&rdquo;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </InstructorPortalShell>
  );
}

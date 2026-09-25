'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Edit3,
  Copy,
  Eye,
  Trash2,
  Archive,
  ClipboardList,
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle
} from 'lucide-react';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';

export default function InstructorAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    totalAssignments: 0,
    publishedAssignments: 0,
    draftAssignments: 0,
    totalSubmissions: 0,
    pendingReviews: 0,
    lateSubmissions: 0,
    overallAvgGradePercent: 0
  });
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Preview Modal
  const [previewItem, setPreviewItem] = useState<any | null>(null);

  // Delete Protection Confirmation
  const [deleteCandidate, setDeleteCandidate] = useState<any | null>(null);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedCourseId) params.set('courseId', selectedCourseId);
      if (selectedModuleId) params.set('moduleId', selectedModuleId);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await fetch(`/api/instructor/assignments?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setAssignments(data.assignments || []);
        if (data.courses) setCourses(data.courses);
        if (data.analytics) setAnalytics(data.analytics);
      } else {
        setErrorMsg(data.error || 'Failed to load assignments.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [selectedCourseId, selectedModuleId, statusFilter]);

  const handleQuickAction = async (
    assignmentId: string,
    action: 'PUBLISH' | 'UNPUBLISH' | 'ARCHIVE' | 'DUPLICATE'
  ) => {
    setErrorMsg('');
    setActionMsg('');
    try {
      const res = await fetch(`/api/instructor/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Action failed.');
        return;
      }
      setActionMsg(data.message || 'Assignment updated!');
      fetchAssignments();
    } catch (err: any) {
      setErrorMsg(err.message || 'Action failed.');
    }
  };

  const handleDeleteAssignment = async (item: any, confirmWithSub = false) => {
    setErrorMsg('');
    setActionMsg('');
    try {
      const res = await fetch(
        `/api/instructor/assignments/${item.id}${confirmWithSub ? '?confirm=true' : ''}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (res.status === 409 && data.hasSubmissions) {
        setDeleteCandidate(item);
        return;
      }
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to delete assignment.');
        return;
      }
      setDeleteCandidate(null);
      setActionMsg(data.message || 'Assignment deleted.');
      fetchAssignments();
    } catch (err: any) {
      setErrorMsg(err.message || 'Delete failed.');
    }
  };

  const activeModules = courses.find((c) => c.id === selectedCourseId)?.modules || [];

  return (
    <InstructorPortalShell
      title="Instructor Assignment Management"
      subtitle="Create assignments, manage deadlines & late penalties, review student submissions, and provide feedback"
    >
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              Course Assignments & Practical Projects
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track submissions, pending grading reviews, late submissions, and multi-version resubmissions.
            </p>
          </div>

          <Link
            href="/instructor/assignments/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Create Assignment
          </Link>
        </div>

        {/* Analytics KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-500">Total Assignments</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {analytics.totalAssignments}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {analytics.publishedAssignments} Published • {analytics.draftAssignments} Draft
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-500">Total Submissions</div>
            <div className="text-2xl font-extrabold text-indigo-600 mt-1">
              {analytics.totalSubmissions}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Uploaded by students</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-500">Pending Reviews</div>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">
              {analytics.pendingReviews}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Awaiting instructor grade</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-500">Average Grade</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              {analytics.overallAvgGradePercent}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Across graded submissions</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-500">Late Submissions</div>
            <div className="text-2xl font-extrabold text-rose-600 mt-1">
              {analytics.lateSubmissions}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Submitted after due date</div>
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

        {/* Search & Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAssignments()}
              placeholder="Search assignment title or course..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-900"
            />
          </div>

          <select
            value={selectedCourseId}
            onChange={(e) => {
              setSelectedCourseId(e.target.value);
              setSelectedModuleId('');
            }}
            className="px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white"
          >
            <option value="">All My Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          <select
            value={selectedModuleId}
            onChange={(e) => setSelectedModuleId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white"
          >
            <option value="">All Modules</option>
            {activeModules.map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="DRAFT">DRAFT</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>

        {/* Assignments Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <ClipboardList className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="text-base font-bold text-slate-800">No Assignments Created Yet</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Create assignments and practical coursework for your students with file uploads,
                written submissions, and rubric grading.
              </p>
              <Link
                href="/instructor/assignments/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
              >
                <Plus className="w-4 h-4" />
                Create First Assignment
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                    <th className="p-4">Assignment Title & Course / Module</th>
                    <th className="p-4">Due Date & Late Policy</th>
                    <th className="p-4">Max Marks & Type</th>
                    <th className="p-4">Submissions & Pending Reviews</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {assignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{a.title}</div>
                        <div className="text-xs text-indigo-600 font-semibold mt-0.5">
                          {a.courseTitle}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Module: {a.moduleTitle}
                        </div>
                      </td>

                      <td className="p-4 text-xs">
                        <div className="font-bold text-slate-800">
                          {a.dueDate
                            ? new Date(a.dueDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })
                            : 'No Deadline'}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Late: {a.lateSubmissionPolicy.replace(/_/g, ' ')}
                          {a.lateSubmissionPolicy === 'ALLOWED_WITH_PENALTY'
                            ? ` (-${a.latePenaltyPercentage}%)`
                            : ''}
                        </div>
                      </td>

                      <td className="p-4 text-xs">
                        <div className="font-extrabold text-slate-900">{a.maxMarks} Marks</div>
                        <div className="text-slate-500">{a.submissionType.replace(/_/g, ' ')}</div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/instructor/assignments/${a.id}/submissions`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition"
                          >
                            {a.submissionsCount} Submissions
                          </Link>
                          {a.pendingReviewsCount > 0 && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                              {a.pendingReviewsCount} Pending Review
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            a.status === 'PUBLISHED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : a.status === 'ARCHIVED'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <Link
                            href={`/instructor/assignments/${a.id}/submissions`}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                          >
                            Review Submissions
                          </Link>

                          <button
                            type="button"
                            onClick={() => setPreviewItem(a)}
                            className="px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Preview
                          </button>

                          <Link
                            href={`/instructor/assignments/${a.id}/edit`}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleQuickAction(a.id, 'DUPLICATE')}
                            title="Duplicate Assignment"
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {a.status !== 'PUBLISHED' ? (
                            <button
                              type="button"
                              onClick={() => handleQuickAction(a.id, 'PUBLISH')}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                            >
                              Publish
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleQuickAction(a.id, 'UNPUBLISH')}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold"
                            >
                              Unpublish
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteAssignment(a, false)}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* PREVIEW MODAL */}
        {previewItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                    STUDENT ASSIGNMENT PREVIEW
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                    {previewItem.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  ✕ Close
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-2">
                <div>
                  <strong>Course:</strong> {previewItem.courseTitle} •{' '}
                  <strong>Module:</strong> {previewItem.moduleTitle}
                </div>
                <div>
                  <strong>Max Marks:</strong> {previewItem.maxMarks} •{' '}
                  <strong>Allowed Formats:</strong>{' '}
                  {(previewItem.allowedFileTypes || []).join(', ')} (Max{' '}
                  {previewItem.maxFileSizeMB} MB)
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap">
                {previewItem.instructions || previewItem.description}
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION */}
        {deleteCandidate && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-900">
                  Assignment Has Student Submissions ({deleteCandidate.submissionsCount})
                </h3>
              </div>
              <p className="text-xs text-slate-600">
                Archiving is recommended so student submission history is preserved.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteCandidate(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleQuickAction(deleteCandidate.id, 'ARCHIVE');
                    setDeleteCandidate(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold"
                >
                  Archive Instead
                </button>
                <button
                  onClick={() => handleDeleteAssignment(deleteCandidate, true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
                >
                  Force Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </InstructorPortalShell>
  );
}

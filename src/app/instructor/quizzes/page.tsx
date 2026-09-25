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
  Send,
  FileQuestion,
  BarChart3,
  Clock,
  Award,
  CheckCircle2,
  AlertTriangle,
  Database,
  RefreshCw,
  Users
} from 'lucide-react';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';

export default function InstructorQuizzesPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    totalQuizzes: 0,
    publishedQuizzes: 0,
    draftQuizzes: 0,
    archivedQuizzes: 0,
    totalAttempts: 0,
    overallAvgScore: 0,
    overallPassRate: 0,
    overallFailRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  // Preview Quiz Drawer
  const [previewQuiz, setPreviewQuiz] = useState<any | null>(null);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, string[]>>({});
  const [previewScoreResult, setPreviewScoreResult] = useState<any | null>(null);

  // Delete Confirmation Modal (Business rule: warn if quiz has student attempts!)
  const [deleteCandidate, setDeleteCandidate] = useState<any | null>(null);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedCourseId) params.set('courseId', selectedCourseId);
      if (selectedModuleId) params.set('moduleId', selectedModuleId);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      params.set('sort', sortBy);

      const res = await fetch(`/api/instructor/quizzes?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setQuizzes(data.quizzes || []);
        if (data.courses) setCourses(data.courses);
        if (data.analytics) setAnalytics(data.analytics);
      } else {
        setErrorMsg(data.error || 'Failed to fetch quizzes.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load quizzes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, [selectedCourseId, selectedModuleId, statusFilter, sortBy]);

  const handleQuickAction = async (
    quizId: string,
    action: 'PUBLISH' | 'UNPUBLISH' | 'ARCHIVE' | 'DUPLICATE'
  ) => {
    setErrorMsg('');
    setActionMsg('');
    try {
      const res = await fetch(`/api/instructor/quizzes/${quizId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || `Failed to ${action.toLowerCase()} quiz.`);
        return;
      }
      setActionMsg(data.message || 'Quiz updated!');
      fetchQuizzes();
    } catch (err: any) {
      setErrorMsg(err.message || 'Action failed.');
    }
  };

  const handleDeleteQuiz = async (quiz: any, confirmWithAttempts = false) => {
    setErrorMsg('');
    setActionMsg('');
    try {
      const res = await fetch(
        `/api/instructor/quizzes/${quiz.id}${confirmWithAttempts ? '?confirm=true' : ''}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (res.status === 409 && data.hasAttempts) {
        setDeleteCandidate(quiz);
        return;
      }
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to delete quiz.');
        return;
      }
      setDeleteCandidate(null);
      setActionMsg(data.message || 'Quiz deleted.');
      fetchQuizzes();
    } catch (err: any) {
      setErrorMsg(err.message || 'Delete failed.');
    }
  };

  const openStudentPreview = async (quizId: string) => {
    try {
      const res = await fetch(`/api/instructor/quizzes/${quizId}`);
      const data = await res.json();
      if (res.ok && data.quiz) {
        setPreviewQuiz(data.quiz);
        setPreviewAnswers({});
        setPreviewScoreResult(null);
      }
    } catch {}
  };

  const submitStudentPreview = async () => {
    if (!previewQuiz) return;
    try {
      const formattedAnswers = Object.entries(previewAnswers).map(([qId, optIds]) => ({
        questionId: qId,
        selectedOptionIds: optIds
      }));
      const res = await fetch(`/api/quizzes/${previewQuiz.id}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: formattedAnswers,
          isPreview: true
        })
      });
      const data = await res.json();
      if (res.ok && data.attempt) {
        setPreviewScoreResult(data.attempt);
      }
    } catch {}
  };

  const activeCourseModules =
    courses.find((c) => c.id === selectedCourseId)?.modules || [];

  return (
    <InstructorPortalShell
      title="Instructor Quiz Management"
      subtitle="Create, manage, preview, and analyze student quiz attempts across your courses"
    >
      <div className="space-y-6">
        {/* Top Action & Navigation Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-indigo-600" />
              Course Quizzes & Automated Assessments
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage Single Choice, Multiple Answer, and True/False quizzes with automated server-side grading.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/instructor/question-bank"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-800 text-xs font-bold transition"
            >
              <Database className="w-4 h-4" />
              Question Bank
            </Link>

            <Link
              href="/instructor/quizzes/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Create Quiz
            </Link>
          </div>
        </div>

        {/* Assessment Analytics Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-500">Total Quizzes</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {analytics.totalQuizzes}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {analytics.publishedQuizzes} Published • {analytics.draftQuizzes} Draft
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-500">Total Attempts</div>
            <div className="text-2xl font-extrabold text-indigo-600 mt-1">
              {analytics.totalAttempts}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Across all owned courses</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-500">Average Score</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {analytics.overallAvgScore}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Server-evaluated mean</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-500">Pass Rate</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              {analytics.overallPassRate}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Met passing percentage</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-500">Fail Rate</div>
            <div className="text-2xl font-extrabold text-rose-600 mt-1">
              {analytics.overallFailRate}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Eligible for retake</div>
          </div>
        </div>

        {actionMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between">
            <span>✓ {actionMsg}</span>
            <button onClick={() => setActionMsg('')} className="text-xs underline">
              Dismiss
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center justify-between">
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="text-xs underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Search & Filters Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchQuizzes()}
              placeholder="Search quiz title, course, or module..."
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
            {activeCourseModules.map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="DRAFT">DRAFT</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>

        {/* Quizzes Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">Loading your quizzes...</div>
          ) : quizzes.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileQuestion className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="text-base font-bold text-slate-800">No Quizzes Found</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Create your first assessment quiz for your courses with Single Choice, Multiple
                Answer, and True/False questions.
              </p>
              <Link
                href="/instructor/quizzes/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
              >
                <Plus className="w-4 h-4" />
                Create First Quiz
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                    <th className="p-4">Quiz Title & Course / Module</th>
                    <th className="p-4">Questions & Marks</th>
                    <th className="p-4">Rules (Pass / Time / Attempts)</th>
                    <th className="p-4">Student Results</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Dates</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {quizzes.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{q.title}</div>
                        <div className="text-xs text-indigo-600 font-semibold mt-0.5">
                          {q.courseTitle}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Module: {q.moduleTitle}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-800">
                          {q.questionCount} Questions
                        </div>
                        <div className="text-xs text-slate-500">
                          Total Marks: <strong>{q.totalMarks}</strong>
                        </div>
                        {q.randomizeQuestions && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-bold">
                            Random Pool ({q.questionsPerAttempt}/{q.questionBankSize})
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-xs text-slate-600 space-y-0.5">
                        <div>
                          Passing: <strong className="text-slate-900">{q.passingPercentage}%</strong>
                        </div>
                        <div>
                          Attempts:{' '}
                          <strong className="text-slate-900">
                            {q.attemptsAllowed === 0 ? 'Unlimited' : q.attemptsAllowed}
                          </strong>{' '}
                          ({q.resultPolicy === 'HIGHEST_SCORE' ? 'Highest' : 'Latest'})
                        </div>
                        <div>
                          Time Limit:{' '}
                          <strong className="text-slate-900">
                            {q.timeLimitMinutes ? `${q.timeLimitMinutes} mins` : 'Unlimited'}
                          </strong>
                        </div>
                      </td>

                      <td className="p-4">
                        <Link
                          href={`/instructor/quizzes/${q.id}/results`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          {q.attemptsCount} Attempts ({q.passRate}% Pass)
                        </Link>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            q.status === 'PUBLISHED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : q.status === 'ARCHIVED'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>

                      <td className="p-4 text-xs text-slate-500">
                        <div>Created: {new Date(q.createdAt).toLocaleDateString()}</div>
                        <div>Updated: {new Date(q.updatedAt).toLocaleDateString()}</div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openStudentPreview(q.id)}
                            title="Preview Quiz as Student"
                            className="px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Preview
                          </button>

                          <Link
                            href={`/instructor/quizzes/${q.id}/edit`}
                            title="Edit Quiz"
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleQuickAction(q.id, 'DUPLICATE')}
                            title="Duplicate Quiz"
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {q.status !== 'PUBLISHED' ? (
                            <button
                              type="button"
                              onClick={() => handleQuickAction(q.id, 'PUBLISH')}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                            >
                              Publish
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleQuickAction(q.id, 'UNPUBLISH')}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold"
                            >
                              Unpublish
                            </button>
                          )}

                          {q.status !== 'ARCHIVED' && (
                            <button
                              type="button"
                              onClick={() => handleQuickAction(q.id, 'ARCHIVE')}
                              title="Archive Quiz"
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteQuiz(q, false)}
                            title="Delete Quiz"
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

        {/* DELETE PROTECTION CONFIRMATION DIALOG (When Student Attempts Exist) */}
        {deleteCandidate && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 text-amber-700">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-bold text-slate-900">
                  Quiz Has Existing Student Attempts ({deleteCandidate.attemptsCount})
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>{deleteCandidate.title}</strong> already has{' '}
                <strong>{deleteCandidate.attemptsCount}</strong> recorded student attempt(s). To
                preserve student score history, we strongly recommend <strong>Archiving</strong> this
                quiz instead of deleting it.
              </p>
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteCandidate(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleQuickAction(deleteCandidate.id, 'ARCHIVE');
                    setDeleteCandidate(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                >
                  Archive Quiz Instead (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteQuiz(deleteCandidate, true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  Force Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* INTERACTIVE STUDENT QUIZ PREVIEW MODAL */}
        {previewQuiz && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
                    STUDENT PREVIEW MODE (No Attempt Saved)
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{previewQuiz.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewQuiz(null)}
                  className="text-sm font-bold text-slate-500 hover:text-slate-800"
                >
                  ✕ Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {previewScoreResult && (
                  <div
                    className={`p-4 rounded-xl border ${
                      previewScoreResult.passed
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                    }`}
                  >
                    <div className="font-extrabold text-base">
                      Server Evaluation: {previewScoreResult.passed ? 'PASSED 🎉' : 'FAILED ❌'} —{' '}
                      {previewScoreResult.obtainedMarks} / {previewScoreResult.totalMarks} Marks (
                      {previewScoreResult.percentage}%)
                    </div>
                  </div>
                )}

                {(previewQuiz.questions || []).map((q: any, i: number) => {
                  const sel = previewAnswers[q.id] || [];
                  return (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-sm text-slate-900">
                          {i + 1}. {q.question}
                        </div>
                        <span className="text-xs font-bold text-indigo-700">
                          {q.marks} Marks ({q.type})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {(q.options || []).map((opt: any) => {
                          const active = sel.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                if (q.type === 'MULTIPLE_ANSWER') {
                                  const next = active
                                    ? sel.filter((id) => id !== opt.id)
                                    : [...sel, opt.id];
                                  setPreviewAnswers({ ...previewAnswers, [q.id]: next });
                                } else {
                                  setPreviewAnswers({ ...previewAnswers, [q.id]: [opt.id] });
                                }
                              }}
                              className={`p-2.5 rounded-lg border text-left text-xs font-semibold flex items-center justify-between ${
                                active
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white text-slate-800 border-slate-200'
                              }`}
                            >
                              <span>{opt.text}</span>
                              {previewScoreResult && opt.isCorrect && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">
                                  ✓ Correct
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setPreviewQuiz(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={submitStudentPreview}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  Test Server Evaluation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </InstructorPortalShell>
  );
}

'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  BarChart3,
  User,
  Edit3
} from 'lucide-react';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';

export default function InstructorQuizResultsPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [quiz, setQuiz] = useState<any | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    totalAttempts: 0,
    passedAttempts: 0,
    failedAttempts: 0,
    passRate: 0,
    failRate: 0,
    avgScore: 0,
    avgCompletionTimeSeconds: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Active Attempt Inspection ("View Attempt")
  const [activeAttempt, setActiveAttempt] = useState<any | null>(null);

  useEffect(() => {
    const loadResults = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/instructor/quizzes/${id}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to load quiz results.');
          return;
        }
        setQuiz(data.quiz);
        setAttempts(data.attempts || []);
        if (data.analytics) setAnalytics(data.analytics);
      } catch (err: any) {
        setError(err.message || 'Failed to load quiz results.');
      } finally {
        setLoading(false);
      }
    };
    loadResults();
  }, [id]);

  const filteredAttempts = attempts.filter((att) => {
    if (resultFilter === 'PASSED' && !att.passed) return false;
    if (resultFilter === 'FAILED' && att.passed) return false;
    if (statusFilter !== 'ALL' && att.status !== statusFilter) return false;
    if (
      search &&
      !att.studentName.toLowerCase().includes(search.toLowerCase()) &&
      !att.studentEmail.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '1m 20s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <InstructorPortalShell
      title={quiz ? `Student Results: ${quiz.title}` : 'Quiz Results & Analytics'}
      subtitle="Inspect student quiz attempts, question-wise accuracy, and reproducible randomized responses"
    >
      <div className="space-y-6">
        {/* Top Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/instructor/quizzes"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Quizzes
            </Link>
            {quiz && (
              <div>
                <h2 className="text-base font-extrabold text-slate-900">{quiz.title}</h2>
                <p className="text-xs text-slate-500">
                  {quiz.courseTitle} • {quiz.moduleTitle} • Passing: {quiz.passingPercentage}% (
                  {quiz.totalMarks} Total Marks)
                </p>
              </div>
            )}
          </div>

          {quiz && (
            <Link
              href={`/instructor/quizzes/${quiz.id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              <Edit3 className="w-4 h-4" />
              Edit Quiz
            </Link>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold">
            {error}
          </div>
        )}

        {/* KPI Analytics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-500">Total Attempts</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {analytics.totalAttempts}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-500">Average Score</div>
            <div className="text-2xl font-extrabold text-indigo-600 mt-1">
              {analytics.avgScore}%
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-500">Pass Rate</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              {analytics.passRate}% ({analytics.passedAttempts})
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-500">Fail Rate</div>
            <div className="text-2xl font-extrabold text-rose-600 mt-1">
              {analytics.failRate}% ({analytics.failedAttempts})
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-500">Avg Completion Time</div>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">
              {formatDuration(analytics.avgCompletionTimeSeconds)}
            </div>
          </div>
        </div>

        {/* Question-Wise Performance Breakdown */}
        {quiz?.questions && quiz.questions.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Question-Wise Performance Analytics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {quiz.questions.map((q: any, idx: number) => (
                <div
                  key={q.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      Q{idx + 1}. {q.question}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {q.type} • {q.marks} Marks • {q.totalResponses} Responses
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        q.accuracyPercent >= 70
                          ? 'bg-emerald-100 text-emerald-800'
                          : q.accuracyPercent >= 40
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {q.accuracyPercent}% Accuracy
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name or email..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-900"
            />
          </div>

          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value as any)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white"
          >
            <option value="ALL">All Results (Pass & Fail)</option>
            <option value="PASSED">PASSED Only</option>
            <option value="FAILED">FAILED Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white"
          >
            <option value="ALL">All Attempt Statuses</option>
            <option value="GRADED">GRADED</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="AUTO_SUBMITTED">AUTO_SUBMITTED (Time Expired)</option>
          </select>
        </div>

        {/* Student Attempts Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">Loading student attempts...</div>
          ) : filteredAttempts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No student quiz attempts match the current filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                    <th className="p-4">Student</th>
                    <th className="p-4">Attempt #</th>
                    <th className="p-4">Started At</th>
                    <th className="p-4">Submitted At</th>
                    <th className="p-4">Score & Marks</th>
                    <th className="p-4">Pass / Fail</th>
                    <th className="p-4">Attempt Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredAttempts.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{att.studentName}</div>
                        <div className="text-xs text-slate-500">{att.studentEmail}</div>
                      </td>

                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">
                          Attempt #{att.attemptNumber}
                        </span>
                      </td>

                      <td className="p-4 text-xs text-slate-600">
                        {new Date(att.startedAt).toLocaleString()}
                      </td>

                      <td className="p-4 text-xs text-slate-600">
                        <div>{new Date(att.submittedAt).toLocaleString()}</div>
                        <div className="text-[11px] text-slate-400">
                          Duration: {formatDuration(att.durationSeconds)}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-extrabold text-slate-900">
                          {att.obtainedMarks} / {att.totalMarks} Marks
                        </div>
                        <div className="text-xs font-bold text-indigo-600">
                          {att.percentage}%
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            att.passed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {att.passed ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> PASSED
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" /> FAILED
                            </>
                          )}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">
                          {att.status}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => setActiveAttempt(att)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Attempt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FULL ATTEMPT INSPECTION VIEW ("View Attempt") */}
        {activeAttempt && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
              <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold">
                    Attempt #{activeAttempt.attemptNumber} • {activeAttempt.status}
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                    {activeAttempt.studentName} ({activeAttempt.studentEmail})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Final Score: <strong>{activeAttempt.obtainedMarks}</strong> /{' '}
                    <strong>{activeAttempt.totalMarks}</strong> Marks ({activeAttempt.percentage}% —{' '}
                    {activeAttempt.passed ? 'PASSED' : 'FAILED'})
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveAttempt(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  ✕ Close Attempt Review
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {(activeAttempt.questionBreakdown || []).map((qb: any, idx: number) => (
                  <div
                    key={qb.questionId || idx}
                    className={`p-4 rounded-2xl border space-y-3 ${
                      qb.isCorrect
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-rose-50/40 border-rose-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="font-bold text-sm text-slate-900">
                        <span className="text-indigo-600 mr-1.5">Q{idx + 1}.</span>
                        {qb.questionText}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 ${
                          qb.isCorrect
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        Marks Awarded: {qb.marksAwarded} / {qb.maxMarks}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(qb.options || []).map((opt: any) => {
                        const studentPicked = (qb.selectedOptionIds || []).includes(opt.id);
                        const isRightOpt =
                          opt.isCorrect || (qb.correctOptionIds || []).includes(opt.id);

                        return (
                          <div
                            key={opt.id}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                              studentPicked && isRightOpt
                                ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold'
                                : studentPicked && !isRightOpt
                                ? 'bg-rose-100 border-rose-400 text-rose-950 font-bold'
                                : isRightOpt
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <span>{opt.text}</span>
                            <div className="flex items-center gap-1.5">
                              {studentPicked && (
                                <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-bold">
                                  Student Answer
                                </span>
                              )}
                              {isRightOpt && (
                                <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">
                                  ✓ Correct Answer
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {qb.explanation && (
                      <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700">
                        <strong>Explanation:</strong> {qb.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </InstructorPortalShell>
  );
}

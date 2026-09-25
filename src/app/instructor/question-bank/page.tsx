'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Database,
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  FileQuestion,
  Send,
  ArrowLeft
} from 'lucide-react';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';

export default function InstructorQuestionBankPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');

  // Multi-Select to Import into Quiz
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetQuizId, setTargetQuizId] = useState('');

  // Question Builder Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<'SINGLE_CHOICE' | 'MULTIPLE_ANSWER' | 'TRUE_FALSE'>(
    'SINGLE_CHOICE'
  );
  const [qMarks, setQMarks] = useState(5);
  const [qDifficulty, setQDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [qCategory, setQCategory] = useState('Engineering');
  const [qTopic, setQTopic] = useState('Core Fundamentals');
  const [qCourseId, setQCourseId] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  const [qOptions, setQOptions] = useState([
    { id: 'opt_1', text: '', isCorrect: true },
    { id: 'opt_2', text: '', isCorrect: false },
    { id: 'opt_3', text: '', isCorrect: false },
    { id: 'opt_4', text: '', isCorrect: false }
  ]);

  const fetchBank = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (courseFilter) params.set('courseId', courseFilter);
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (difficultyFilter !== 'ALL') params.set('difficulty', difficultyFilter);

      const res = await fetch(`/api/instructor/question-bank?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setQuestions(data.questions || []);
        setCourses(data.courses || []);
        setQuizzes(data.quizzes || []);
        if (!targetQuizId && data.quizzes?.length > 0) {
          setTargetQuizId(data.quizzes[0].id);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load Question Bank.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBank();
  }, [courseFilter, typeFilter, difficultyFilter]);

  const resetForm = () => {
    setEditingId(null);
    setQText('');
    setQType('SINGLE_CHOICE');
    setQMarks(5);
    setQExplanation('');
    setQOptions([
      { id: 'opt_1', text: '', isCorrect: true },
      { id: 'opt_2', text: '', isCorrect: false },
      { id: 'opt_3', text: '', isCorrect: false },
      { id: 'opt_4', text: '', isCorrect: false }
    ]);
  };

  const handleTypeChange = (nextType: 'SINGLE_CHOICE' | 'MULTIPLE_ANSWER' | 'TRUE_FALSE') => {
    setQType(nextType);
    if (nextType === 'TRUE_FALSE') {
      setQOptions([
        { id: 'tf_1', text: 'True', isCorrect: true },
        { id: 'tf_2', text: 'False', isCorrect: false }
      ]);
    } else if (qType === 'TRUE_FALSE') {
      setQOptions([
        { id: 'opt_1', text: '', isCorrect: true },
        { id: 'opt_2', text: '', isCorrect: false },
        { id: 'opt_3', text: '', isCorrect: false },
        { id: 'opt_4', text: '', isCorrect: false }
      ]);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setActionMsg('');

    if (!qText.trim()) {
      setErrorMsg('Question text is required.');
      return;
    }

    try {
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch('/api/instructor/question-bank', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          question: qText,
          type: qType,
          marks: qMarks,
          difficulty: qDifficulty,
          category: qCategory,
          topic: qTopic,
          courseId: qCourseId || null,
          explanation: qExplanation,
          options: qOptions
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to save question.');
        return;
      }
      setActionMsg(data.message || 'Question saved!');
      resetForm();
      fetchBank();
    } catch (err: any) {
      setErrorMsg(err.message || 'Save failed.');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      const res = await fetch(`/api/instructor/question-bank?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(data.message || 'Question deleted.');
        fetchBank();
      }
    } catch {}
  };

  const handleBulkAddToQuiz = async () => {
    if (!targetQuizId || selectedIds.length === 0) return;
    setErrorMsg('');
    setActionMsg('');
    try {
      const res = await fetch('/api/instructor/question-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_TO_QUIZ',
          quizId: targetQuizId,
          questionIds: selectedIds
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to import questions.');
        return;
      }
      setActionMsg(data.message);
      setSelectedIds([]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Import failed.');
    }
  };

  return (
    <InstructorPortalShell
      title="Instructor Question Bank"
      subtitle="Build reusable Single Choice, Multiple Answer, and True/False questions and import them into any Quiz"
    >
      <div className="space-y-6">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/instructor/quizzes"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Quizzes
            </Link>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Reusable Question Repository ({questions.length} Questions)
              </h2>
              <p className="text-xs text-slate-500">
                Select multiple questions below to push them into any of your quizzes with automatic
                duplicate prevention.
              </p>
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-xl">
              <span className="text-xs font-bold text-indigo-900">
                {selectedIds.length} Selected →
              </span>
              <select
                value={targetQuizId}
                onChange={(e) => setTargetQuizId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-indigo-300 bg-white text-xs font-semibold text-slate-800"
              >
                <option value="">Select Target Quiz</option>
                {quizzes.map((qz) => (
                  <option key={qz.id} value={qz.id}>
                    {qz.title} ({qz.courseTitle})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBulkAddToQuiz}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                + Add Selected to Quiz
              </button>
            </div>
          )}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Create / Edit Question Form */}
          <form
            onSubmit={handleSaveQuestion}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 h-fit"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                {editingId ? 'Edit Reusable Question' : 'Create Reusable Question'}
              </h3>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-bold text-rose-600"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Question Type *
              </label>
              <select
                value={qType}
                onChange={(e) => handleTypeChange(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
              >
                <option value="SINGLE_CHOICE">Single Choice (MCQ)</option>
                <option value="MULTIPLE_ANSWER">Multiple Answer</option>
                <option value="TRUE_FALSE">True / False</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Question Prompt *
              </label>
              <textarea
                rows={3}
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder="Write a clear, unambiguous question..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Marks</label>
                <input
                  type="number"
                  min={1}
                  value={qMarks}
                  onChange={(e) => setQMarks(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Difficulty</label>
                <select
                  value={qDifficulty}
                  onChange={(e) => setQDifficulty(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
                >
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Category</label>
                <input
                  type="text"
                  value={qCategory}
                  onChange={(e) => setQCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Topic</label>
                <input
                  type="text"
                  value={qTopic}
                  onChange={(e) => setQTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600">
                Options & Correct Answer(s)
              </label>
              {qOptions.map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (qType === 'MULTIPLE_ANSWER') {
                        setQOptions(
                          qOptions.map((o, i) =>
                            i === idx ? { ...o, isCorrect: !o.isCorrect } : o
                          )
                        );
                      } else {
                        setQOptions(
                          qOptions.map((o, i) => ({ ...o, isCorrect: i === idx }))
                        );
                      }
                    }}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold shrink-0 ${
                      opt.isCorrect
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {opt.isCorrect ? '✓ Correct' : 'Option'}
                  </button>
                  <input
                    type="text"
                    value={opt.text}
                    readOnly={qType === 'TRUE_FALSE'}
                    onChange={(e) =>
                      setQOptions(
                        qOptions.map((o, i) => (i === idx ? { ...o, text: e.target.value } : o))
                      )
                    }
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Explanation (Optional)
              </label>
              <input
                type="text"
                value={qExplanation}
                onChange={(e) => setQExplanation(e.target.value)}
                placeholder="Rationale shown after grading..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
            >
              {editingId ? 'Update Question in Bank' : '+ Save to Question Bank'}
            </button>
          </form>

          {/* Right Column: Question Bank List & Filters */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-2.5">
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchBank()}
                  placeholder="Search question text, topic, category..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
              >
                <option value="ALL">All Question Types</option>
                <option value="SINGLE_CHOICE">Single Choice</option>
                <option value="MULTIPLE_ANSWER">Multiple Answer</option>
                <option value="TRUE_FALSE">True / False</option>
              </select>

              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
              >
                <option value="ALL">All Difficulties</option>
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 text-sm">
                  Loading Question Bank...
                </div>
              ) : questions.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 text-sm">
                  Your Question Bank is empty. Use the form on the left to add reusable questions.
                </div>
              ) : (
                questions.map((item) => {
                  const checked = selectedIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition ${
                        checked
                          ? 'bg-indigo-50/60 border-indigo-400'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex items-start gap-3 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedIds((prev) =>
                                checked
                                  ? prev.filter((id) => id !== item.id)
                                  : [...prev, item.id]
                              )
                            }
                            className="mt-1 w-4 h-4 rounded text-indigo-600"
                          />
                          <div className="space-y-1.5 flex-1">
                            <div className="font-bold text-sm text-slate-900">{item.question}</div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
                                {item.type}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                                {item.marks} Marks
                              </span>
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold">
                                {item.difficulty}
                              </span>
                              <span className="text-slate-500">
                                {item.category} • {item.topic}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 pt-1">
                              {(item.options || []).map((opt: any) => (
                                <div
                                  key={opt.id}
                                  className={`px-2.5 py-1 rounded-lg text-xs border ${
                                    opt.isCorrect
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                      : 'bg-slate-50 border-slate-200 text-slate-600'
                                  }`}
                                >
                                  {opt.isCorrect ? '✓ ' : ''}
                                  {opt.text}
                                </div>
                              ))}
                            </div>
                          </div>
                        </label>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(item.id);
                              setQText(item.question);
                              setQType(item.type);
                              setQMarks(item.marks || 5);
                              setQDifficulty(item.difficulty || 'MEDIUM');
                              setQCategory(item.category || 'General');
                              setQTopic(item.topic || 'Core');
                              setQExplanation(item.explanation || '');
                              setQOptions(item.options || []);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(item.id)}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </InstructorPortalShell>
  );
}

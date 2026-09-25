'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Eye,
  Save,
  Send,
  Database,
  CheckCircle2,
  HelpCircle,
  Clock,
  Shuffle,
  Award,
  Sparkles,
  Image as ImageIcon,
  AlertCircle,
  CheckSquare,
  CircleDot,
  ToggleLeft
} from 'lucide-react';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';

export interface QuestionDraft {
  id: string;
  question: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_ANSWER' | 'TRUE_FALSE';
  marks: number;
  explanation: string;
  imageUrl?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  topic?: string;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
}

interface CourseOption {
  id: string;
  title: string;
  slug: string;
  modules: Array<{
    id: string;
    title: string;
    lessons: Array<{ id: string; title: string; type: string }>;
  }>;
}

export default function QuizStudioBuilder({ quizId }: { quizId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCourseId = searchParams?.get('courseId') || '';
  const initialModuleId = searchParams?.get('moduleId') || '';
  const initialLessonId = searchParams?.get('lessonId') || '';

  const isEdit = Boolean(quizId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Courses hierarchy belonging strictly to logged-in Instructor
  const [courses, setCourses] = useState<CourseOption[]>([]);

  // Quiz Basic Information & Settings
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState(initialCourseId);
  const [moduleId, setModuleId] = useState(initialModuleId);
  const [lessonId, setLessonId] = useState(initialLessonId);
  const [passingPercentage, setPassingPercentage] = useState<number>(60);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(20);
  const [attemptsAllowed, setAttemptsAllowed] = useState<number>(3); // 0 = unlimited
  const [resultPolicy, setResultPolicy] = useState<'HIGHEST_SCORE' | 'LATEST_SCORE'>('HIGHEST_SCORE');
  const [multipleAnswerScoringRule, setMultipleAnswerScoringRule] = useState<
    'EXACT_MATCH' | 'PARTIAL_CREDIT'
  >('EXACT_MATCH');
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [questionBankSize, setQuestionBankSize] = useState<number>(20);
  const [questionsPerAttempt, setQuestionsPerAttempt] = useState<number>(10);
  const [showResultImmediately, setShowResultImmediately] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [allowRetake, setAllowRetake] = useState(true);
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');

  // Questions List
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    {
      id: `q_${Date.now()}_1`,
      question: '',
      type: 'SINGLE_CHOICE',
      marks: 5,
      explanation: '',
      imageUrl: '',
      difficulty: 'MEDIUM',
      topic: 'General',
      options: [
        { id: 'opt_1', text: '', isCorrect: true },
        { id: 'opt_2', text: '', isCorrect: false },
        { id: 'opt_3', text: '', isCorrect: false },
        { id: 'opt_4', text: '', isCorrect: false }
      ]
    }
  ]);

  // Question Bank Import Drawer State
  const [showBankDrawer, setShowBankDrawer] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const [bankSearch, setBankSearch] = useState('');

  // Interactive Student Preview Mode
  const [previewMode, setPreviewMode] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, string[]>>({});
  const [previewResult, setPreviewResult] = useState<any>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const listRes = await fetch('/api/instructor/quizzes');
        const listData = await listRes.json();
        if (listData.courses) {
          setCourses(listData.courses);
          if (!courseId && listData.courses.length > 0 && !isEdit) {
            const firstCourse = listData.courses[0];
            setCourseId(firstCourse.id);
            if (firstCourse.modules?.length > 0) {
              setModuleId(firstCourse.modules[0].id);
            }
          }
        }

        if (isEdit && quizId) {
          const res = await fetch(`/api/instructor/quizzes/${quizId}`);
          const data = await res.json();
          if (!res.ok) {
            setErrorMsg(data.error || 'Failed to load quiz');
            return;
          }
          const q = data.quiz;
          setTitle(q.title || '');
          setDescription(q.description || '');
          setCourseId(q.courseId || '');
          setModuleId(q.moduleId || '');
          setLessonId(q.lessonId || '');
          setPassingPercentage(Number(q.passingPercentage ?? 60));
          setTimeLimitMinutes(Number(q.timeLimitMinutes ?? 20));
          setAttemptsAllowed(Number(q.attemptsAllowed ?? 3));
          setResultPolicy(q.resultPolicy || 'HIGHEST_SCORE');
          setMultipleAnswerScoringRule(q.multipleAnswerScoringRule || 'EXACT_MATCH');
          setRandomizeQuestions(Boolean(q.randomizeQuestions));
          setQuestionBankSize(Number(q.questionBankSize || q.questions?.length || 10));
          setQuestionsPerAttempt(Number(q.questionsPerAttempt || q.questions?.length || 10));
          setShowResultImmediately(q.showResultImmediately ?? true);
          setShowCorrectAnswers(q.showCorrectAnswers ?? true);
          setAllowRetake(q.allowRetake ?? true);
          setStatus(q.status || 'DRAFT');

          if (Array.isArray(q.questions) && q.questions.length > 0) {
            setQuestions(
              q.questions.map((item: any, idx: number) => ({
                id: item.id || `q_${idx}`,
                question: item.question || '',
                type: item.type || 'SINGLE_CHOICE',
                marks: Number(item.marks || 1),
                explanation: item.explanation || '',
                imageUrl: item.imageUrl || '',
                difficulty: item.difficulty || 'MEDIUM',
                topic: item.topic || 'General',
                options: Array.isArray(item.options)
                  ? item.options.map((o: any, oIdx: number) => ({
                      id: o.id || `opt_${idx}_${oIdx}`,
                      text: o.text || '',
                      isCorrect: Boolean(o.isCorrect)
                    }))
                  : []
              }))
            );
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to initialize quiz studio');
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [quizId, isEdit]);

  const selectedCourseObj = courses.find((c) => c.id === courseId);
  const availableModules = selectedCourseObj?.modules || [];
  const selectedModuleObj = availableModules.find((m) => m.id === moduleId);
  const availableLessons = selectedModuleObj?.lessons || [];

  const totalMarksCalculated = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

  // Question Manipulation Helpers
  const addQuestion = (qType: 'SINGLE_CHOICE' | 'MULTIPLE_ANSWER' | 'TRUE_FALSE') => {
    const newId = `q_${Date.now()}_${questions.length + 1}`;
    const defaultOptions =
      qType === 'TRUE_FALSE'
        ? [
            { id: `${newId}_opt_1`, text: 'True', isCorrect: true },
            { id: `${newId}_opt_2`, text: 'False', isCorrect: false }
          ]
        : [
            { id: `${newId}_opt_1`, text: '', isCorrect: true },
            { id: `${newId}_opt_2`, text: '', isCorrect: false },
            { id: `${newId}_opt_3`, text: '', isCorrect: false },
            { id: `${newId}_opt_4`, text: '', isCorrect: false }
          ];

    setQuestions((prev) => [
      ...prev,
      {
        id: newId,
        question: '',
        type: qType,
        marks: 5,
        explanation: '',
        imageUrl: '',
        difficulty: 'MEDIUM',
        topic: 'General',
        options: defaultOptions
      }
    ]);
  };

  const duplicateQuestion = (index: number) => {
    const orig = questions[index];
    const dupId = `q_${Date.now()}_dup`;
    const clone: QuestionDraft = {
      ...orig,
      id: dupId,
      question: `${orig.question} (Copy)`,
      options: orig.options.map((o, i) => ({
        ...o,
        id: `${dupId}_opt_${i}`
      }))
    };
    const next = [...questions];
    next.splice(index + 1, 0, clone);
    setQuestions(next);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      setErrorMsg('Quiz must contain at least 1 question.');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const next = [...questions];
    const [removed] = next.splice(index, 1);
    next.splice(targetIdx, 0, removed);
    setQuestions(next);
  };

  const updateQuestionField = (index: number, field: keyof QuestionDraft, value: any) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q;
        if (field === 'type') {
          const newType = value as QuestionDraft['type'];
          if (newType === 'TRUE_FALSE') {
            return {
              ...q,
              type: 'TRUE_FALSE',
              options: [
                { id: `${q.id}_tf_1`, text: 'True', isCorrect: true },
                { id: `${q.id}_tf_2`, text: 'False', isCorrect: false }
              ]
            };
          }
          if (q.type === 'TRUE_FALSE') {
            return {
              ...q,
              type: newType,
              options: [
                { id: `${q.id}_o1`, text: '', isCorrect: true },
                { id: `${q.id}_o2`, text: '', isCorrect: false },
                { id: `${q.id}_o3`, text: '', isCorrect: false },
                { id: `${q.id}_o4`, text: '', isCorrect: false }
              ]
            };
          }
          if (newType === 'SINGLE_CHOICE') {
            // Ensure only 1 option is marked correct
            let foundFirst = false;
            return {
              ...q,
              type: 'SINGLE_CHOICE',
              options: q.options.map((o) => {
                if (o.isCorrect && !foundFirst) {
                  foundFirst = true;
                  return o;
                }
                return { ...o, isCorrect: false };
              })
            };
          }
        }
        return { ...q, [field]: value };
      })
    );
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        return {
          ...q,
          options: q.options.map((o, oi) => (oi === optIndex ? { ...o, text } : o))
        };
      })
    );
  };

  const toggleOptionCorrect = (qIndex: number, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        if (q.type === 'SINGLE_CHOICE' || q.type === 'TRUE_FALSE') {
          return {
            ...q,
            options: q.options.map((o, oi) => ({ ...o, isCorrect: oi === optIndex }))
          };
        }
        // MULTIPLE_ANSWER allows multiple correct selections
        return {
          ...q,
          options: q.options.map((o, oi) =>
            oi === optIndex ? { ...o, isCorrect: !o.isCorrect } : o
          )
        };
      })
    );
  };

  const addOptionToQuestion = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        return {
          ...q,
          options: [
            ...q.options,
            { id: `${q.id}_opt_${Date.now()}`, text: '', isCorrect: false }
          ]
        };
      })
    );
  };

  const removeOptionFromQuestion = (qIndex: number, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        if (q.options.length <= 2) return q;
        return {
          ...q,
          options: q.options.filter((_, oi) => oi !== optIndex)
        };
      })
    );
  };

  // Load Question Bank for Import
  const openQuestionBankDrawer = async () => {
    setShowBankDrawer(true);
    try {
      const res = await fetch('/api/instructor/question-bank');
      const data = await res.json();
      if (data.questions) {
        setBankQuestions(data.questions);
      }
    } catch {}
  };

  const importSelectedFromBank = () => {
    const existingNormalized = new Set(questions.map((q) => q.question.trim().toLowerCase()));
    const toImport = bankQuestions.filter((bq) => selectedBankIds.includes(bq.id));
    let importedCount = 0;
    let duplicateSkipped = 0;

    const appended: QuestionDraft[] = [];
    for (const bq of toImport) {
      const norm = String(bq.question || '').trim().toLowerCase();
      if (existingNormalized.has(norm)) {
        duplicateSkipped++;
        continue;
      }
      existingNormalized.add(norm);
      importedCount++;
      appended.push({
        id: `q_bank_${Date.now()}_${importedCount}`,
        question: bq.question,
        type: bq.type || 'SINGLE_CHOICE',
        marks: Number(bq.marks || 2),
        explanation: bq.explanation || '',
        imageUrl: bq.imageUrl || '',
        difficulty: bq.difficulty || 'MEDIUM',
        topic: bq.topic || 'General',
        options: Array.isArray(bq.options)
          ? bq.options.map((o: any, idx: number) => ({
              id: `opt_${Date.now()}_${idx}`,
              text: o.text,
              isCorrect: Boolean(o.isCorrect)
            }))
          : []
      });
    }

    if (appended.length > 0) {
      // Remove empty initial placeholder if it has no text
      const cleanedExisting =
        questions.length === 1 && !questions[0].question.trim() ? [] : questions;
      setQuestions([...cleanedExisting, ...appended]);
    }
    setSelectedBankIds([]);
    setShowBankDrawer(false);
    setSuccessMsg(
      duplicateSkipped > 0
        ? `Imported ${importedCount} question(s) from Question Bank (${duplicateSkipped} duplicate(s) skipped).`
        : `Imported ${importedCount} question(s) from Question Bank!`
    );
  };

  // Save or Publish Quiz
  const handleSaveQuiz = async (targetStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!title.trim()) {
      setErrorMsg('Quiz Title is required.');
      return;
    }
    if (!courseId) {
      setErrorMsg('Please select a Course owned by you.');
      return;
    }
    if (questions.length === 0) {
      setErrorMsg('Please add at least 1 question.');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setErrorMsg(`Question #${i + 1} cannot be empty.`);
        return;
      }
      const validOpts = q.options.filter((o) => o.text.trim());
      if (validOpts.length < 2) {
        setErrorMsg(`Question #${i + 1} must have at least 2 non-empty options.`);
        return;
      }
      if (!validOpts.some((o) => o.isCorrect)) {
        setErrorMsg(`Question #${i + 1} must have at least 1 correct answer selected.`);
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        description: description.trim(),
        courseId,
        moduleId,
        lessonId,
        passingPercentage: Number(passingPercentage),
        timeLimitMinutes: Number(timeLimitMinutes) || null,
        attemptsAllowed: allowRetake ? Number(attemptsAllowed) : 1,
        resultPolicy,
        multipleAnswerScoringRule,
        randomizeQuestions,
        questionBankSize: randomizeQuestions ? Number(questionBankSize || questions.length) : questions.length,
        questionsPerAttempt: randomizeQuestions
          ? Math.min(questions.length, Number(questionsPerAttempt || questions.length))
          : questions.length,
        showResultImmediately,
        showCorrectAnswers,
        allowRetake,
        status: targetStatus,
        questions
      };

      const url = isEdit ? `/api/instructor/quizzes/${quizId}` : '/api/instructor/quizzes';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to save quiz.');
        return;
      }

      setStatus(targetStatus);
      setSuccessMsg(data.message || 'Quiz saved successfully!');
      setTimeout(() => {
        router.push('/instructor/quizzes');
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unexpected error while saving quiz.');
    } finally {
      setSaving(false);
    }
  };

  // Evaluate Preview Quiz Locally (Does NOT record a real student attempt!)
  const runStudentPreviewEvaluation = () => {
    let earned = 0;
    let total = 0;
    for (const q of questions) {
      const m = Number(q.marks) || 1;
      total += m;
      const sel = previewAnswers[q.id] || [];
      const corr = q.options.filter((o) => o.isCorrect).map((o) => o.id);
      const isExact =
        sel.length === corr.length &&
        sel.every((id) => corr.includes(id)) &&
        corr.every((id) => sel.includes(id));
      if (isExact) {
        earned += m;
      } else if (
        q.type === 'MULTIPLE_ANSWER' &&
        multipleAnswerScoringRule === 'PARTIAL_CREDIT' &&
        !sel.some((id) => !corr.includes(id)) &&
        sel.length > 0
      ) {
        earned += Number(((sel.length / corr.length) * m).toFixed(2));
      }
    }
    const pct = total > 0 ? Number(((earned / total) * 100).toFixed(1)) : 100;
    setPreviewResult({
      obtainedMarks: earned,
      totalMarks: total,
      percentage: pct,
      passed: pct >= passingPercentage
    });
  };

  return (
    <InstructorPortalShell
      title={isEdit ? `Edit Quiz: ${title || 'Assessment'}` : 'Create New Quiz'}
      subtitle="Full-Page Studio Quiz Builder — Configure rules, scoring policy, question bank randomization, and questions"
    >
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              href="/instructor/quizzes"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Quizzes
            </Link>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              {questions.length} Questions • {totalMarksCalculated} Total Marks
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setPreviewResult(null);
                setPreviewMode(!previewMode);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition ${
                previewMode
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Eye className="w-4 h-4" />
              {previewMode ? 'Exit Student Preview' : 'Preview Quiz as Student'}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveQuiz('DRAFT')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold transition"
            >
              <Save className="w-4 h-4" />
              Save as Draft
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveQuiz('PUBLISHED')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm transition"
            >
              <Send className="w-4 h-4" />
              {saving ? 'Saving...' : 'Publish Quiz'}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-sm font-medium">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STUDENT PREVIEW MODE */}
        {previewMode ? (
          <div className="bg-white border-2 border-amber-300 rounded-2xl p-6 shadow-md space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 mb-2">
                  <Eye className="w-3.5 h-3.5" />
                  STUDENT PREVIEW SIMULATION (Does Not Create Real Student Attempts)
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  {title || 'Untitled Assessment Quiz'}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {description || 'Read each question carefully and select the best answer(s).'}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm font-semibold text-slate-700 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  {timeLimitMinutes ? `${timeLimitMinutes} Mins` : 'No Time Limit'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" />
                  Pass: {passingPercentage}% ({totalMarksCalculated} Marks)
                </span>
              </div>
            </div>

            {previewResult && (
              <div
                className={`p-5 rounded-2xl border ${
                  previewResult.passed
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold">
                      Preview Result: {previewResult.passed ? 'PASSED 🎉' : 'FAILED ❌'}
                    </h3>
                    <p className="text-sm mt-1">
                      Obtained Marks: <strong>{previewResult.obtainedMarks}</strong> /{' '}
                      <strong>{previewResult.totalMarks}</strong> ({previewResult.percentage}%) —
                      Required Passing Threshold: <strong>{passingPercentage}%</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewAnswers({});
                      setPreviewResult(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-50"
                  >
                    Reset Preview Attempt
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-5">
              {questions.map((q, idx) => {
                const selected = previewAnswers[q.id] || [];
                return (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="font-bold text-slate-900">
                        <span className="text-indigo-600 mr-2">Q{idx + 1}.</span>
                        {q.question || 'Untitled Question'}
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 shrink-0">
                        {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'} •{' '}
                        {q.type.replace('_', ' ')}
                      </span>
                    </div>

                    {q.imageUrl && (
                      <img
                        src={q.imageUrl}
                        alt="Question visual"
                        className="max-h-48 rounded-xl border border-slate-200 object-contain"
                      />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2">
                      {q.options.map((opt) => {
                        const isSelected = selected.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              if (q.type === 'MULTIPLE_ANSWER') {
                                const next = isSelected
                                  ? selected.filter((id) => id !== opt.id)
                                  : [...selected, opt.id];
                                setPreviewAnswers({ ...previewAnswers, [q.id]: next });
                              } else {
                                setPreviewAnswers({ ...previewAnswers, [q.id]: [opt.id] });
                              }
                            }}
                            className={`text-left p-3.5 rounded-xl border text-sm font-medium transition flex items-center justify-between ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            <span>{opt.text || 'Option'}</span>
                            {previewResult && opt.isCorrect && (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-bold">
                                ✓ Correct
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {previewResult && q.explanation && (
                      <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={runStudentPreviewEvaluation}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm"
              >
                Submit Preview & Calculate Score
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* SECTION 1: QUIZ BASIC INFORMATION & CONFIGURATION */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    1. Quiz Basic Information & Assessment Rules
                  </h2>
                  <p className="text-xs text-slate-500">
                    Link this quiz to your Course, Module, and Lesson, and configure scoring &
                    randomization policies.
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    status === 'PUBLISHED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : status === 'ARCHIVED'
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Status: {status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                    Quiz Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Module 1 Mastery Assessment: Full-Stack Architecture"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                    Description / Student Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide clear instructions on passing score, time limit, and multiple-answer rules..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Course / Module / Lesson Selectors (Strictly Owned by Instructor) */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                    Course (Owned by You) *
                  </label>
                  <select
                    value={courseId}
                    onChange={(e) => {
                      const nextCourseId = e.target.value;
                      setCourseId(nextCourseId);
                      const cObj = courses.find((c) => c.id === nextCourseId);
                      setModuleId(cObj?.modules?.[0]?.id || '');
                      setLessonId('');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
                  >
                    <option value="">Select Course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                    Module / Section *
                  </label>
                  <select
                    value={moduleId}
                    onChange={(e) => {
                      setModuleId(e.target.value);
                      setLessonId('');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
                  >
                    <option value="">Auto-Select / Create Module</option>
                    {availableModules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                    Target Lesson (Optional — Auto-creates Quiz Lesson if blank)
                  </label>
                  <select
                    value={lessonId}
                    onChange={(e) => setLessonId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
                  >
                    <option value="">+ Create Dedicated Quiz Lesson in Module</option>
                    {availableLessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title} ({l.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                      Total Marks
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={totalMarksCalculated}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-sm font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                      Passing % *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={passingPercentage}
                      onChange={(e) => setPassingPercentage(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                      Time Limit (Min)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={timeLimitMinutes}
                      onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                      placeholder="0 = No limit"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900"
                    />
                  </div>
                </div>

                {/* Attempts & Scoring Policies */}
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                    Attempts Allowed
                  </label>
                  <select
                    value={attemptsAllowed}
                    onChange={(e) => setAttemptsAllowed(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
                  >
                    <option value={1}>1 Attempt Only</option>
                    <option value={2}>2 Attempts</option>
                    <option value={3}>3 Attempts</option>
                    <option value={5}>5 Attempts</option>
                    <option value={0}>Unlimited Attempts</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                      Result Policy (Multiple Attempts)
                    </label>
                    <select
                      value={resultPolicy}
                      onChange={(e) =>
                        setResultPolicy(e.target.value as 'HIGHEST_SCORE' | 'LATEST_SCORE')
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
                    >
                      <option value="HIGHEST_SCORE">Highest Score</option>
                      <option value="LATEST_SCORE">Latest Score</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                      Multiple-Answer Scoring Rule
                    </label>
                    <select
                      value={multipleAnswerScoringRule}
                      onChange={(e) =>
                        setMultipleAnswerScoringRule(
                          e.target.value as 'EXACT_MATCH' | 'PARTIAL_CREDIT'
                        )
                      }
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 bg-white"
                    >
                      <option value="EXACT_MATCH">Exact Match Only (All Correct Options)</option>
                      <option value="PARTIAL_CREDIT">Partial Credit (No Wrong Option)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Toggles & Random Question Bank Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={randomizeQuestions}
                    onChange={(e) => setRandomizeQuestions(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Randomize Questions</div>
                    <div className="text-[11px] text-slate-500">Shuffle & draw subset</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showResultImmediately}
                    onChange={(e) => setShowResultImmediately(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Show Result Immediately</div>
                    <div className="text-[11px] text-slate-500">Instant grade on submit</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCorrectAnswers}
                    onChange={(e) => setShowCorrectAnswers(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Show Correct Answers</div>
                    <div className="text-[11px] text-slate-500">Reveal explanations</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowRetake}
                    onChange={(e) => setAllowRetake(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Allow Retake</div>
                    <div className="text-[11px] text-slate-500">Up to max attempts</div>
                  </div>
                </label>
              </div>

              {randomizeQuestions && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-indigo-950 mb-1">
                      Question Bank Pool Size (Total Questions in Pool)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={questionBankSize}
                      onChange={(e) => setQuestionBankSize(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-indigo-300 bg-white text-sm"
                    />
                    <p className="text-[11px] text-indigo-700 mt-1">
                      Example: 100 questions in pool (Currently {questions.length} attached)
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-indigo-950 mb-1">
                      Questions Shown to Each Student per Attempt
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={questions.length || 100}
                      value={questionsPerAttempt}
                      onChange={(e) => setQuestionsPerAttempt(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-indigo-300 bg-white text-sm"
                    />
                    <p className="text-[11px] text-indigo-700 mt-1">
                      Each student receives a randomized subset & exact served questions are stored
                      per attempt.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: QUESTIONS BUILDER & QUESTION BANK IMPORT */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    2. Questions Studio ({questions.length} Questions • {totalMarksCalculated}{' '}
                    Marks)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Add Single Choice (MCQ), Multiple Answer, or True/False questions, or import
                    from your reusable Question Bank.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={openQuestionBankDrawer}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 text-xs font-bold transition"
                  >
                    <Database className="w-3.5 h-3.5" />
                    + Import from Question Bank
                  </button>

                  <button
                    type="button"
                    onClick={() => addQuestion('SINGLE_CHOICE')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition"
                  >
                    <CircleDot className="w-3.5 h-3.5" />
                    + Single Choice (MCQ)
                  </button>

                  <button
                    type="button"
                    onClick={() => addQuestion('MULTIPLE_ANSWER')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    + Multiple Answer
                  </button>

                  <button
                    type="button"
                    onClick={() => addQuestion('TRUE_FALSE')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition"
                  >
                    <ToggleLeft className="w-3.5 h-3.5" />
                    + True / False
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {questions.map((q, qIdx) => (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                          #{qIdx + 1}
                        </span>
                        <select
                          value={q.type}
                          onChange={(e) => updateQuestionField(qIdx, 'type', e.target.value)}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800"
                        >
                          <option value="SINGLE_CHOICE">Single Choice (MCQ)</option>
                          <option value="MULTIPLE_ANSWER">Multiple Answer (Checkboxes)</option>
                          <option value="TRUE_FALSE">True / False</option>
                        </select>

                        <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl border border-slate-300">
                          <span className="text-xs font-semibold text-slate-600">Marks:</span>
                          <input
                            type="number"
                            min={1}
                            value={q.marks}
                            onChange={(e) =>
                              updateQuestionField(qIdx, 'marks', Number(e.target.value) || 1)
                            }
                            className="w-14 text-xs font-bold text-slate-900 outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => moveQuestion(qIdx, 'UP')}
                          disabled={qIdx === 0}
                          title="Move Question Up"
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
                        >
                          <ArrowUp className="w-4 h-4 text-slate-700" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(qIdx, 'DOWN')}
                          disabled={qIdx === questions.length - 1}
                          title="Move Question Down"
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
                        >
                          <ArrowDown className="w-4 h-4 text-slate-700" />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateQuestion(qIdx)}
                          title="Duplicate Question"
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIdx)}
                          title="Delete Question"
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Question Prompt *
                        </label>
                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) => updateQuestionField(qIdx, 'question', e.target.value)}
                          placeholder="Enter the question text..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Optional Image / Diagram URL
                        </label>
                        <input
                          type="url"
                          value={q.imageUrl || ''}
                          onChange={(e) => updateQuestionField(qIdx, 'imageUrl', e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Answer Options */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">
                          Answer Options (Click the badge to mark Correct Answer
                          {q.type === 'MULTIPLE_ANSWER' ? 's' : ''})
                        </span>
                        {q.type !== 'TRUE_FALSE' && (
                          <button
                            type="button"
                            onClick={() => addOptionToQuestion(qIdx)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                          >
                            + Add Option
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {q.options.map((opt, optIdx) => (
                          <div
                            key={opt.id}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border ${
                              opt.isCorrect
                                ? 'bg-emerald-50/80 border-emerald-400'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleOptionCorrect(qIdx, optIdx)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition ${
                                opt.isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {opt.isCorrect ? '✓ Correct' : 'Mark Correct'}
                            </button>

                            <input
                              type="text"
                              value={opt.text}
                              readOnly={q.type === 'TRUE_FALSE'}
                              onChange={(e) => updateOptionText(qIdx, optIdx, e.target.value)}
                              placeholder={`Option ${optIdx + 1}`}
                              className="flex-1 text-sm text-slate-900 bg-transparent outline-none"
                            />

                            {q.type !== 'TRUE_FALSE' && q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeOptionFromQuestion(qIdx, optIdx)}
                                className="text-slate-400 hover:text-rose-600 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Explanation / Feedback (Shown after submission)
                      </label>
                      <input
                        type="text"
                        value={q.explanation}
                        onChange={(e) => updateQuestionField(qIdx, 'explanation', e.target.value)}
                        placeholder="Explain why the correct answer is right..."
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* QUESTION BANK IMPORT DRAWER */}
        {showBankDrawer && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Import Questions from Your Question Bank
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select reusable questions to add into this quiz. Duplicate questions are
                    automatically prevented.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBankDrawer(false)}
                  className="text-sm font-bold text-slate-500 hover:text-slate-800"
                >
                  ✕ Close
                </button>
              </div>

              <div className="p-4 border-b border-slate-100">
                <input
                  type="text"
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder="Search questions by text, topic, or category..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {bankQuestions.filter(
                  (bq) =>
                    !bankSearch ||
                    bq.question.toLowerCase().includes(bankSearch.toLowerCase()) ||
                    (bq.topic || '').toLowerCase().includes(bankSearch.toLowerCase())
                ).length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm">
                    No reusable questions found in your Question Bank yet. Visit{' '}
                    <Link
                      href="/instructor/question-bank"
                      className="text-indigo-600 font-bold underline"
                    >
                      Question Bank
                    </Link>{' '}
                    to create reusable questions.
                  </div>
                ) : (
                  bankQuestions
                    .filter(
                      (bq) =>
                        !bankSearch ||
                        bq.question.toLowerCase().includes(bankSearch.toLowerCase()) ||
                        (bq.topic || '').toLowerCase().includes(bankSearch.toLowerCase())
                    )
                    .map((bq) => {
                      const checked = selectedBankIds.includes(bq.id);
                      return (
                        <label
                          key={bq.id}
                          className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                            checked
                              ? 'bg-indigo-50 border-indigo-400'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedBankIds((prev) =>
                                checked ? prev.filter((id) => id !== bq.id) : [...prev, bq.id]
                              );
                            }}
                            className="mt-1 w-4 h-4 rounded text-indigo-600"
                          />
                          <div className="flex-1">
                            <div className="font-bold text-sm text-slate-900">{bq.question}</div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                              <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                                {bq.type}
                              </span>
                              <span>• {bq.marks || 1} Marks</span>
                              <span>• {bq.difficulty || 'MEDIUM'}</span>
                              <span>• Topic: {bq.topic || 'General'}</span>
                            </div>
                          </div>
                        </label>
                      );
                    })
                )}
              </div>

              <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 rounded-b-2xl">
                <span className="text-xs font-bold text-slate-600">
                  {selectedBankIds.length} Question(s) Selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBankDrawer(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={selectedBankIds.length === 0}
                    onClick={importSelectedFromBank}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold"
                  >
                    Import Selected into Quiz
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </InstructorPortalShell>
  );
}

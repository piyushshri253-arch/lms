'use client';

import React, { useState, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';
import { BuilderSection, BuilderLesson, QuizConfig, QuizQuestion } from './CourseCurriculumStep';

interface CourseFinalAssignmentStepProps {
  sections: BuilderSection[];
  onChangeSections: (sections: BuilderSection[]) => void;
  courseTitle?: string;
  onJumpToStep?: (stepIndex: number) => void;
  isMinorEditMode?: boolean;
}

export const CourseFinalAssignmentStep: React.FC<CourseFinalAssignmentStepProps> = ({
  sections,
  onChangeSections,
  courseTitle,
  onJumpToStep,
  isMinorEditMode = false
}) => {
  const { showToast } = useApp();

  // Find existing Final Assignment in the curriculum
  const finalAssignmentInfo = useMemo(() => {
    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const sec = sections[sIdx];
      const lessons = sec.lessons || [];
      for (let lIdx = 0; lIdx < lessons.length; lIdx++) {
        const les = lessons[lIdx];
        if (
          les.isFinalAssignment ||
          (les.type === 'QUIZ' && /final\s*(assessment|assignment|exam)/i.test(les.title || '')) ||
          /final\s*(assessment|assignment|exam)/i.test(les.title || '')
        ) {
          let parsedQuiz: QuizConfig = { questions: [], passingScore: 80, attemptLimit: 0 };
          if (les.quizData && typeof les.quizData === 'object') {
            parsedQuiz = {
              questions: Array.isArray(les.quizData.questions) ? les.quizData.questions : [],
              passingScore: les.quizData.passingScore || 80,
              attemptLimit: les.quizData.attemptLimit || 0
            };
          } else if (typeof les.quizData === 'string') {
            try {
              const p = JSON.parse(les.quizData);
              parsedQuiz = {
                questions: Array.isArray(p.questions) ? p.questions : [],
                passingScore: p.passingScore || 80,
                attemptLimit: p.attemptLimit || 0
              };
            } catch {}
          }
          return {
            sectionId: sec.id,
            sectionIndex: sIdx,
            sectionTitle: sec.title,
            lessonId: les.id,
            lessonIndex: lIdx,
            lesson: les,
            quizConfig: parsedQuiz
          };
        }
      }
    }
    return null;
  }, [sections]);

  // Handler to auto-create the Last Module with Final Assignment
  const handleAddFinalAssignment = () => {
    if (isMinorEditMode) {
      showToast({
        title: 'Curriculum Locked 🔒',
        description: 'Cannot add a new final assignment module in Quick Minor Edit mode.',
        type: 'error'
      });
      return;
    }

    // If sections already has modules, append a dedicated last module for certification
    const nextModNum = sections.length + 1;
    const finalModuleTitle = 'Course Completion & Certification';
    const finalModId = `sec-${Date.now()}-${nextModNum}`;
    const finalLessonId = `les-${Date.now()}-${nextModNum}-final`;

    const initialQuiz: QuizConfig = {
      passingScore: 80,
      attemptLimit: 0,
      questions: [
        {
          id: `q-${Date.now()}-1`,
          question: 'Comprehensive Course Question 1: What core architecture was implemented?',
          options: ['Option A: Client-Server Architecture', 'Option B: Monolithic System', 'Option C: Unsecured Storage', 'Option D: None of the above'],
          correctIndex: 0,
          explanation: 'Modern scalable applications leverage modular client-server architectures with secure API boundaries.',
          points: 10
        },
        {
          id: `q-${Date.now()}-2`,
          question: 'Comprehensive Course Question 2: Which best practice is critical before deploying to production?',
          options: ['Option A: Skip testing', 'Option B: End-to-end testing & security validation', 'Option C: Hardcode secret keys', 'Option D: Remove CORS checks'],
          correctIndex: 1,
          explanation: 'Thorough testing, dependency auditing, and strict security validation ensure high availability and data integrity.',
          points: 10
        }
      ]
    };

    const newFinalLesson: BuilderLesson = {
      id: finalLessonId,
      clientKey: finalLessonId,
      tempId: finalLessonId,
      title: 'Final Assignment',
      description: 'Mandatory comprehensive assessment covering all curriculum modules. Students must achieve the configured passing percentage to pass the course and unlock the official Certificate of Completion.',
      type: 'QUIZ',
      duration: '30:00',
      durationSeconds: 1800,
      isFree: false,
      isPublished: true,
      isFinalAssignment: true,
      order: 1,
      quizData: initialQuiz,
      subLessons: []
    };

    const newFinalSection: BuilderSection = {
      id: finalModId,
      clientKey: finalModId,
      tempId: finalModId,
      title: finalModuleTitle,
      description: 'Mandatory certification exam and certificate qualification module.',
      order: nextModNum,
      lessons: [newFinalLesson]
    };

    const updated = [...sections, newFinalSection];
    onChangeSections(updated);

    showToast({
      title: 'Final Assignment & Last Module Created! 🏆',
      description: `Added "Module ${nextModNum}: ${finalModuleTitle}" with Final Assignment exam.`,
      type: 'success'
    });
  };

  // Update Final Assignment Lesson details
  const updateFinalLesson = (patch: Partial<BuilderLesson>) => {
    if (!finalAssignmentInfo) return;
    const { sectionId, lessonId } = finalAssignmentInfo;

    const updated = sections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        lessons: sec.lessons.map((les) => {
          if (les.id !== lessonId) return les;
          return { ...les, ...patch, isFinalAssignment: true, type: 'QUIZ' as const };
        })
      };
    });
    onChangeSections(updated);
  };

  // Update Quiz Config (questions, passing score, attempt limit)
  const updateQuizConfig = (patch: Partial<QuizConfig>) => {
    if (!finalAssignmentInfo) return;
    const currentQ = finalAssignmentInfo.quizConfig;
    const nextConfig: QuizConfig = { ...currentQ, ...patch };
    updateFinalLesson({ quizData: nextConfig });
  };

  // Add 2 Questions (Even Pair)
  const handleAddQuestionPair = () => {
    if (!finalAssignmentInfo) return;
    if (isMinorEditMode) {
      showToast({
        title: 'Questions Locked 🔒',
        description: 'Cannot add questions in Quick Minor Edit mode. Only spelling fixes are allowed.',
        type: 'error'
      });
      return;
    }
    const currentQuestions = finalAssignmentInfo.quizConfig.questions || [];
    const baseLen = currentQuestions.length;

    const newPair: QuizQuestion[] = [
      {
        id: `q-${Date.now()}-${baseLen + 1}`,
        question: '',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: 0,
        explanation: '',
        points: 10
      },
      {
        id: `q-${Date.now()}-${baseLen + 2}`,
        question: '',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: 0,
        explanation: '',
        points: 10
      }
    ];

    const nextQuestions = [...currentQuestions, ...newPair];
    updateQuizConfig({ questions: nextQuestions });

    showToast({
      title: 'Added 2 Questions (Even Pair) ✓',
      description: `Added questions ${baseLen + 1} & ${baseLen + 2}. Total: ${nextQuestions.length} questions.`,
      type: 'success'
    });
  };

  // Delete Question
  const handleDeleteQuestion = (qIdx: number) => {
    if (!finalAssignmentInfo) return;
    if (isMinorEditMode) {
      showToast({
        title: 'Questions Locked 🔒',
        description: 'Cannot delete questions in Quick Minor Edit mode. Only spelling fixes are allowed.',
        type: 'error'
      });
      return;
    }
    const currentQuestions = finalAssignmentInfo.quizConfig.questions || [];
    const nextQuestions = currentQuestions.filter((_, idx) => idx !== qIdx);
    updateQuizConfig({ questions: nextQuestions });

    if (nextQuestions.length > 0 && nextQuestions.length % 2 !== 0) {
      showToast({
        title: 'Odd Questions Count ⚠️',
        description: `Final Assignment now has ${nextQuestions.length} question(s). Note: Even number of questions (2, 4, 6, 8) is required for publishing.`,
        type: 'info'
      });
    }
  };

  // Remove entire Final Assignment
  const handleRemoveFinalAssignment = () => {
    if (!finalAssignmentInfo) return;
    if (isMinorEditMode) {
      showToast({
        title: 'Curriculum Locked 🔒',
        description: 'Cannot remove final assignment in Quick Minor Edit mode.',
        type: 'error'
      });
      return;
    }
    const { sectionId, lessonId } = finalAssignmentInfo;

    // If the section only has this one final assignment lesson, remove the whole section
    const targetSec = sections.find((s) => s.id === sectionId);
    let updated: BuilderSection[];

    if (targetSec && targetSec.lessons.length <= 1) {
      updated = sections.filter((s) => s.id !== sectionId).map((s, idx) => ({ ...s, order: idx + 1 }));
    } else {
      updated = sections.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          lessons: s.lessons.filter((l) => l.id !== lessonId).map((l, idx) => ({ ...l, order: idx + 1 }))
        };
      });
    }

    onChangeSections(updated);
    showToast({
      title: 'Final Assignment Removed',
      description: 'The final certification assessment has been removed.',
      type: 'info'
    });
  };

  // Calculate metrics
  const qList = finalAssignmentInfo?.quizConfig?.questions || [];
  const qCount = qList.length;
  const isEvenCount = qCount >= 2 && qCount % 2 === 0;
  const totalPoints = qList.reduce((sum, q) => sum + (Number(q.points) || 10), 0);
  const passingScore = finalAssignmentInfo?.quizConfig?.passingScore ?? 80;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Header */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/25">
              <Icon name="workspace_premium" size={30} fill />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-black text-on-surface">Final Assignment (Certificate Gate)</h3>
                {finalAssignmentInfo ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    <Icon name="check_circle" size={12} className="text-emerald-600" />
                    <span>Configured in Last Module</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full border border-rose-300">
                    <Icon name="warning" size={12} className="text-rose-600" />
                    <span>Missing — Required for Certificate</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant mt-1 max-w-2xl">
                Every course requires a Final Assignment at the end of the curriculum. When enrolled students achieve your required passing percentage, the LMS unlocks their verified Certificate of Completion.
              </p>
            </div>
          </div>

          {!finalAssignmentInfo && !isMinorEditMode && (
            <button
              type="button"
              onClick={handleAddFinalAssignment}
              className="px-5 py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-extrabold text-sm rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:scale-[1.02] shrink-0"
            >
              <Icon name="workspace_premium" size={18} fill />
              <span>+ Add Final Assignment (Auto-adds Last Module)</span>
            </button>
          )}
        </div>
      </div>

      {/* State A: Final Assignment NOT YET ADDED */}
      {!finalAssignmentInfo && (
        <div className="bg-gradient-to-br from-amber-50/60 via-yellow-50/40 to-surface-container-lowest border-2 border-dashed border-amber-300 rounded-3xl p-8 sm:p-12 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center text-3xl shadow-sm">
            🎓
          </div>
          <div className="max-w-xl mx-auto space-y-2">
            <h4 className="text-lg font-black text-amber-950">
              No Final Assignment Configured Yet
            </h4>
            <p className="text-xs sm:text-sm text-amber-900/80 leading-relaxed">
              Click the button below to automatically append the <strong>final certification module</strong> at the end of your curriculum with 2 pre-configured questions ready to customize.
            </p>
          </div>
          <div>
            {!isMinorEditMode ? (
              <button
                type="button"
                onClick={handleAddFinalAssignment}
                className="px-6 py-3.5 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-amber-500/30 transition-all inline-flex items-center gap-2.5 cursor-pointer transform hover:scale-[1.02]"
              >
                <Icon name="add_task" size={20} />
                <span>+ Add Final Assignment (Auto-creates Last Module)</span>
              </button>
            ) : (
              <span className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 inline-flex items-center gap-1.5 select-none">
                <Icon name="lock" size={14} className="text-slate-400" />
                <span>Final Assignment Locked (Quick Minor Edit)</span>
              </span>
            )}
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-6 text-[11px] font-bold text-amber-900/70">
            <span className="flex items-center gap-1.5">
              <Icon name="verified" size={15} className="text-emerald-600" />
              <span>Unlocks Certificate of Completion</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="rule" size={15} className="text-purple-600" />
              <span>Even Questions Rule (2, 4, 6...)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="percent" size={15} className="text-blue-600" />
              <span>Configurable Passing Threshold (e.g. 80%)</span>
            </span>
          </div>
        </div>
      )}

      {/* State B: Final Assignment CONFIGURED & EDITABLE */}
      {finalAssignmentInfo && (
        <div className="space-y-6">
          {/* Module Location Banner */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                M{finalAssignmentInfo.sectionIndex + 1}
              </div>
              <div>
                <p className="text-xs font-black text-amber-950">
                  Location: Module {finalAssignmentInfo.sectionIndex + 1} — {finalAssignmentInfo.sectionTitle}
                </p>
                <p className="text-[11px] text-amber-800">
                  Positioned at the end of the curriculum as the student qualification exam.
                </p>
              </div>
            </div>

            {!isMinorEditMode && (
              <button
                type="button"
                onClick={handleRemoveFinalAssignment}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-100/60 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors cursor-pointer self-start sm:self-auto shrink-0 flex items-center gap-1.5"
              >
                <Icon name="delete" size={14} />
                <span>Remove Final Assignment</span>
              </button>
            )}
          </div>

          {/* Exam Configuration Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Exam Title */}
              <div className="md:col-span-1 space-y-1.5">
                <label className="text-xs font-black text-on-surface flex items-center gap-1.5">
                  <Icon name="title" size={14} className="text-primary" />
                  <span>Exam Title *</span>
                </label>
                <input
                  type="text"
                  value={finalAssignmentInfo.lesson.title || 'Final Assignment'}
                  onChange={(e) => updateFinalLesson({ title: e.target.value })}
                  placeholder="Final Assignment"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              {/* Passing Score */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-on-surface flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Icon name="percent" size={14} className="text-emerald-600" />
                    <span>Passing Threshold *</span>
                  </span>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    {passingScore}%
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={40}
                    max={100}
                    step={5}
                    value={passingScore}
                    onChange={(e) => updateQuizConfig({ passingScore: Number(e.target.value) })}
                    className="flex-1 accent-emerald-600 cursor-pointer"
                  />
                  <input
                    type="number"
                    min={40}
                    max={100}
                    value={passingScore}
                    onChange={(e) => updateQuizConfig({ passingScore: Math.min(100, Math.max(40, Number(e.target.value) || 80)) })}
                    className="w-16 px-2 py-2 text-center text-xs font-black text-emerald-900 border border-emerald-300 rounded-lg bg-emerald-50 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-on-surface-variant">
                  Students must achieve this percentage to unlock certificate.
                </p>
              </div>

              {/* Duration & Retake Limit */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-on-surface flex items-center gap-1">
                    <Icon name="timer" size={13} className="text-blue-600" />
                    <span>Time (mm:ss)</span>
                  </label>
                  <input
                    type="text"
                    value={finalAssignmentInfo.lesson.duration || '30:00'}
                    onChange={(e) => updateFinalLesson({ duration: e.target.value })}
                    placeholder="30:00"
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs font-bold text-on-surface focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-on-surface flex items-center gap-1">
                    <Icon name="replay" size={13} className="text-purple-600" />
                    <span>Retakes</span>
                  </label>
                  <select
                    value={finalAssignmentInfo.quizConfig.attemptLimit || 0}
                    onChange={(e) => updateQuizConfig({ attemptLimit: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-xl border border-outline-variant bg-surface text-xs font-bold text-on-surface focus:outline-none cursor-pointer"
                  >
                    <option value={0}>Unlimited</option>
                    <option value={1}>1 Attempt</option>
                    <option value={2}>2 Attempts</option>
                    <option value={3}>3 Attempts</option>
                    <option value={5}>5 Attempts</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Exam Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-on-surface flex items-center gap-1.5">
                <Icon name="description" size={14} className="text-slate-500" />
                <span>Exam Instructions for Students</span>
              </label>
              <textarea
                rows={2}
                value={finalAssignmentInfo.lesson.description || ''}
                onChange={(e) => updateFinalLesson({ description: e.target.value })}
                placeholder="Comprehensive final exam covering all curriculum modules. Achieve 80% or higher to unlock your certificate."
                className="w-full px-3.5 py-2 rounded-xl border border-outline-variant bg-surface text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Questions Header & Even Validation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h4 className="text-base font-black text-on-surface flex items-center gap-2">
                <span>Final Exam Questions</span>
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-black flex items-center justify-center">
                  {qCount}
                </span>
              </h4>

              {/* Even vs Odd Badge */}
              {isEvenCount ? (
                <span className="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                  <Icon name="check_circle" size={13} className="text-emerald-600" />
                  <span>✓ Even Count ({qCount} Questions) — Valid for Publishing</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-rose-50 text-rose-800 border border-rose-300 flex items-center gap-1 shadow-2xs animate-pulse">
                  <Icon name="warning" size={13} className="text-rose-600" />
                  <span>⚠️ Odd Count ({qCount} Questions) — Must be Even (2, 4, 6, 8...)</span>
                </span>
              )}

              <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-purple-100 text-purple-900 border border-purple-200">
                Total Marks: {totalPoints} pts
              </span>
            </div>

            {!isMinorEditMode && (
              <button
                type="button"
                onClick={handleAddQuestionPair}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <Icon name="library_add" size={16} />
                <span>+ Add 2 Questions (Even Pair)</span>
              </button>
            )}
          </div>

          {/* Questions List */}
          {qCount === 0 ? (
            <div className="p-8 text-center bg-surface-container-lowest border border-dashed border-outline-variant rounded-2xl space-y-3">
              <p className="text-xs font-bold text-on-surface-variant">
                No questions added to this final exam yet.
              </p>
              {!isMinorEditMode && (
                <button
                  type="button"
                  onClick={handleAddQuestionPair}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  + Add Initial 2 Questions
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {qList.map((q, qIdx) => (
                <div
                  key={q.id || qIdx}
                  className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-2xs space-y-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                        Q{qIdx + 1}
                      </span>
                      <span className="text-xs font-black text-on-surface">Question {qIdx + 1}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-purple-200 rounded-lg shadow-2xs">
                        <span className="text-[11px] font-black text-purple-900">Marks:</span>
                        <input
                          type="number"
                          min={1}
                          value={q.points ?? 10}
                          onChange={(e) => {
                            const nextQ = [...qList];
                            nextQ[qIdx] = { ...q, points: Math.max(1, Number(e.target.value) || 1) };
                            updateQuizConfig({ questions: nextQ });
                          }}
                          className="w-12 px-1 text-center text-xs font-black text-purple-900 border-b border-purple-400 focus:outline-none"
                        />
                        <span className="text-[10px] font-bold text-purple-700">pts</span>
                      </div>

                      {!isMinorEditMode && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(qIdx)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Question"
                        >
                          <Icon name="delete" size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={q.question || ''}
                      onChange={(e) => {
                        const nextQ = [...qList];
                        nextQ[qIdx] = { ...q, question: e.target.value };
                        updateQuizConfig({ questions: nextQ });
                      }}
                      placeholder={`Enter question ${qIdx + 1} prompt...`}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-surface text-xs font-bold text-on-surface focus:outline-none focus:border-purple-600"
                    />
                  </div>

                  {/* Options (A, B, C, D) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {['A', 'B', 'C', 'D'].map((letter, optIdx) => {
                      const isCorrect = q.correctIndex === optIdx;
                      return (
                        <div
                          key={letter}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${
                            isCorrect
                              ? 'bg-emerald-50/80 border-emerald-400 ring-1 ring-emerald-400 shadow-2xs'
                              : 'bg-surface border-outline-variant/70 hover:border-slate-300'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              const nextQ = [...qList];
                              nextQ[qIdx] = { ...q, correctIndex: optIdx };
                              updateQuizConfig({ questions: nextQ });
                            }}
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 cursor-pointer transition-colors ${
                              isCorrect
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-slate-200 hover:bg-emerald-200 text-slate-700'
                            }`}
                            title={`Set Option ${letter} as Correct`}
                          >
                            {letter}
                          </button>
                          <input
                            type="text"
                            value={q.options?.[optIdx] || ''}
                            onChange={(e) => {
                              const nextQ = [...qList];
                              const nextOpts = [...(q.options || ['', '', '', ''])];
                              nextOpts[optIdx] = e.target.value;
                              nextQ[qIdx] = { ...q, options: nextOpts };
                              updateQuizConfig({ questions: nextQ });
                            }}
                            placeholder={`Option ${letter}`}
                            className="w-full bg-transparent text-xs text-on-surface focus:outline-none"
                          />
                          {isCorrect && (
                            <span className="text-[10px] font-black text-emerald-700 shrink-0 uppercase tracking-wide">
                              ✓ Correct
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <div className="pt-1">
                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={(e) => {
                        const nextQ = [...qList];
                        nextQ[qIdx] = { ...q, explanation: e.target.value };
                        updateQuizConfig({ questions: nextQ });
                      }}
                      placeholder="Optional explanation shown to students after submitting..."
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-surface/50 text-[11px] text-on-surface-variant focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Actions */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/60">
            {!isMinorEditMode && (
              <button
                type="button"
                onClick={handleAddQuestionPair}
                className="px-4 py-2.5 bg-purple-100 hover:bg-purple-200 text-purple-900 font-extrabold text-xs rounded-xl border border-purple-300 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Icon name="library_add" size={16} />
                <span>+ Add 2 More Questions (Even Pair)</span>
              </button>
            )}

            {isMinorEditMode && (
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 select-none">
                <Icon name="lock" size={14} className="text-amber-600 shrink-0" />
                <span>Final assignment questions locked in Quick Minor Edit. Only typos/spelling fixes are permitted.</span>
              </div>
            )}

            {onJumpToStep && (
              <button
                type="button"
                onClick={() => onJumpToStep(4)}
                className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer ml-auto"
              >
                <span>Proceed to Pricing &amp; Access →</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

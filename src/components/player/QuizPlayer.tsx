'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { QuizConfig } from '@/components/course-builder/CourseCurriculumStep';
import confetti from 'canvas-confetti';

interface QuizPlayerProps {
  title: string;
  lessonId?: string;
  quizData?: QuizConfig | string | null;
  onPass: () => void;
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({ title, lessonId, quizData, onPass }) => {
  const config: QuizConfig = React.useMemo(() => {
    if (!quizData) {
      return {
        passingScore: 70,
        attemptLimit: 0,
        questions: [
          {
            id: 'q1',
            question: 'What is the main advantage of responsive web design?',
            options: [
              'Optimal viewing experience across all devices and screen sizes',
              'Faster database indexing speed',
              'Eliminating the need for CSS media queries',
              'Reducing server memory consumption'
            ],
            correctIndex: 0,
            explanation: 'Responsive web design uses flexible layouts and CSS media queries so pages automatically adjust to desktop, tablet, and mobile screens.',
            points: 1
          }
        ]
      };
    }
    if (typeof quizData === 'string') {
      try {
        return JSON.parse(quizData);
      } catch {
        return { passingScore: 70, attemptLimit: 0, questions: [] };
      }
    }
    return quizData;
  }, [quizData]);

  const questions = config.questions || [];
  const passingScore = config.passingScore || 70;

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [qIndex: number]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [scorePercent, setScorePercent] = useState<number>(0);
  const [passed, setPassed] = useState<boolean>(false);

  const currentQ = questions[currentIndex] || questions[0];
  const answeredCount = Object.keys(selectedAnswers).length;
  const isAllAnswered = questions.length > 0 && answeredCount === questions.length;
  const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  const handleSelect = (optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: optionIndex }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. Try server-side scoring if lessonId is present
      if (lessonId) {
        const payloadAnswers = questions.map((q, idx) => ({
          questionId: q.id || `q_${idx}`,
          selectedOptionId: q.options && q.options[selectedAnswers[idx]] ? q.options[selectedAnswers[idx]] : undefined,
          selectedOptionIds: q.options && q.options[selectedAnswers[idx]] ? [q.options[selectedAnswers[idx]]] : []
        }));

        const res = await fetch(`/api/quizzes/${lessonId}/attempts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: payloadAnswers })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.attempt) {
            setScorePercent(data.attempt.score);
            setPassed(data.attempt.passed);
            setIsSubmitted(true);

            if (data.attempt.passed) {
              confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
              onPass();
            }
            return;
          }
        }
      }

      // 2. Client-side evaluation fallback
      let totalPoints = 0;
      let earnedPoints = 0;

      questions.forEach((q, idx) => {
        const pts = q.points || 1;
        totalPoints += pts;
        if (selectedAnswers[idx] === q.correctIndex) {
          earnedPoints += pts;
        }
      });

      const percent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 100;
      const isPassing = percent >= passingScore;

      setScorePercent(percent);
      setPassed(isPassing);
      setIsSubmitted(true);

      if (isPassing) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        onPass();
      }
    } catch {
      // Fallback
      let totalPoints = 0;
      let earnedPoints = 0;

      questions.forEach((q, idx) => {
        const pts = q.points || 1;
        totalPoints += pts;
        if (selectedAnswers[idx] === q.correctIndex) {
          earnedPoints += pts;
        }
      });

      const percent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 100;
      const isPassing = percent >= passingScore;

      setScorePercent(percent);
      setPassed(isPassing);
      setIsSubmitted(true);

      if (isPassing) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        onPass();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
    setScorePercent(0);
    setPassed(false);
    setCurrentIndex(0);
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl p-8 text-center space-y-3 text-slate-800 border border-slate-200">
        <Icon name="help" size={32} className="mx-auto text-slate-400" />
        <h3 className="font-bold text-base">No questions available in this quiz</h3>
        <p className="text-xs text-slate-500">The instructor has not added questions yet.</p>
      </div>
    );
  }

  const isCurrentAnswered = selectedAnswers[currentIndex] !== undefined;
  const currentSelectedOption = selectedAnswers[currentIndex];
  const isCurrentCorrect = isSubmitted ? currentSelectedOption === currentQ.correctIndex : null;

  return (
    <div className="w-full max-w-3xl mx-auto bg-white border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden text-slate-900 animate-in fade-in duration-200 flex flex-col">
      {/* 1. Header Bar: Quiz Title + Stepper Badge + Passing Criteria */}
      <div className="px-5 sm:px-7 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-mono font-bold uppercase tracking-wider">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-xs text-slate-500 font-semibold font-mono">
              Passing: {passingScore}%
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1 truncate max-w-lg">
            {title}
          </h2>
        </div>

        {/* Top Result Banner when Submitted */}
        {isSubmitted && (
          <div className="flex items-center gap-2">
            <div
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-extrabold flex items-center gap-1.5 border shadow-2xs ${
                passed
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              <Icon name={passed ? 'check_circle' : 'cancel'} size={16} fill={passed} />
              <span>Score: {scorePercent}% ({passed ? 'PASSED' : 'RETAKE NEEDED'})</span>
            </div>
            {!passed && (
              <button
                type="button"
                onClick={handleRetry}
                className="px-3 py-1.5 bg-slate-800 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Retake Quiz"
              >
                <Icon name="refresh" size={14} />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Progress Tracker Bar & Question Pills */}
      <div className="px-5 sm:px-7 py-3 bg-white border-b border-slate-100 flex flex-col gap-2">
        {/* Progress Bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
          <span>
            {answeredCount} of {questions.length} answered ({progressPercent}%)
          </span>
          {isSubmitted ? (
            <span className="text-indigo-600 font-mono">Review Mode</span>
          ) : (
            <span>Select one option per question</span>
          )}
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Stepper Pills: [1] [2] [3] ... [N] */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
          {questions.map((q, idx) => {
            const isAnswered = selectedAnswers[idx] !== undefined;
            const isCurrent = idx === currentIndex;
            const isOptionCorrect = isSubmitted ? selectedAnswers[idx] === q.correctIndex : null;

            let pillClass = 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200';

            if (isSubmitted) {
              if (isOptionCorrect) {
                pillClass = 'bg-emerald-500 text-white border-emerald-600 font-bold';
              } else {
                pillClass = 'bg-rose-500 text-white border-rose-600 font-bold';
              }
            } else if (isCurrent) {
              pillClass = 'bg-indigo-600 text-white border-indigo-700 font-extrabold ring-2 ring-indigo-400/40';
            } else if (isAnswered) {
              pillClass = 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold';
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`w-7 h-7 rounded-lg text-xs font-mono flex items-center justify-center border transition-all cursor-pointer ${pillClass}`}
                title={`Jump to Question ${idx + 1}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Question Body (One Question At A Time) */}
      <div className="p-6 sm:p-8 flex-1 space-y-5 bg-white">
        {/* Question Header & Points */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 uppercase tracking-wide font-mono">
            Question {currentIndex + 1}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Points: {currentQ.points || 1}
          </span>
        </div>

        {/* Question Text */}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
          {currentQ.question}
        </h3>

        {/* Options List */}
        <div className="space-y-3 pt-2">
          {(currentQ.options || []).map((optionText, optIdx) => {
            const isSelected = currentSelectedOption === optIdx;
            const isCorrectOption = optIdx === currentQ.correctIndex;

            let cardStyle = 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50 text-slate-800';

            if (isSubmitted) {
              if (isCorrectOption) {
                cardStyle = 'bg-emerald-50/90 border-emerald-500 text-emerald-950 font-bold shadow-xs';
              } else if (isSelected && !isCorrectOption) {
                cardStyle = 'bg-rose-50/90 border-rose-500 text-rose-950 line-through';
              } else {
                cardStyle = 'border-slate-200 text-slate-400 opacity-60';
              }
            } else if (isSelected) {
              cardStyle = 'bg-indigo-50/80 border-indigo-600 text-indigo-950 font-bold shadow-2xs ring-1 ring-indigo-500/20';
            }

            return (
              <button
                key={optIdx}
                type="button"
                disabled={isSubmitted}
                onClick={() => handleSelect(optIdx)}
                className={`w-full text-left p-3.5 sm:p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default ${cardStyle}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Letter badge: [A], [B], [C]... */}
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : isSubmitted && isCorrectOption
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span className="text-xs sm:text-sm leading-relaxed">{optionText}</span>
                </div>

                {/* Status indicator on right */}
                <div className="shrink-0">
                  {isSubmitted ? (
                    isCorrectOption ? (
                      <span className="flex items-center gap-1 text-emerald-700 text-xs font-bold font-mono">
                        <Icon name="check_circle" size={18} fill className="text-emerald-600" />
                        <span className="hidden sm:inline">Correct</span>
                      </span>
                    ) : isSelected ? (
                      <span className="flex items-center gap-1 text-rose-600 text-xs font-bold font-mono">
                        <Icon name="cancel" size={18} fill className="text-rose-500" />
                        <span className="hidden sm:inline">Incorrect</span>
                      </span>
                    ) : null
                  ) : (
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation Banner (visible after submission) */}
        {isSubmitted && currentQ.explanation && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Icon name="info" size={16} className="text-indigo-600" />
              <span>Explanation & Key Learning:</span>
            </div>
            <p className="leading-relaxed pl-5">{currentQ.explanation}</p>
          </div>
        )}
      </div>

      {/* 4. Navigation Footer Controls */}
      <div className="px-5 sm:px-7 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
        {/* Previous Question Button */}
        <button
          type="button"
          disabled={currentIndex <= 0}
          onClick={handlePrev}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer shadow-2xs"
        >
          <Icon name="arrow_back" size={14} />
          <span>Previous Question</span>
        </button>

        {/* Answered State Tracker */}
        <div className="text-center text-xs text-slate-500 font-medium hidden sm:block">
          {isCurrentAnswered ? (
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <Icon name="check" size={14} /> Answer selected
            </span>
          ) : (
            <span className="text-slate-400">Not answered yet</span>
          )}
        </div>

        {/* Next / Submit Button */}
        <div className="flex items-center gap-2">
          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              <span>Next Question</span>
              <Icon name="arrow_forward" size={14} />
            </button>
          ) : !isSubmitted ? (
            <button
              type="button"
              disabled={answeredCount === 0 || isSubmitting}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-colors cursor-pointer shadow-md disabled:opacity-50"
            >
              <Icon name={isSubmitting ? 'sync' : 'done_all'} size={15} className={isSubmitting ? 'animate-spin' : ''} />
              <span>{isSubmitting ? 'Scoring Quiz...' : 'Submit Answers'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentIndex(0)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-800 transition-colors cursor-pointer shadow-2xs"
            >
              <Icon name="replay" size={14} />
              <span>Review from Start</span>
            </button>
          )}

          {/* Quick Submit Button if student answered all and is not on last question */}
          {!isSubmitted && isAllAnswered && currentIndex < questions.length - 1 && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
              title="Submit Quiz Now"
            >
              <Icon name="done" size={14} />
              <span className="hidden md:inline">Submit Now</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

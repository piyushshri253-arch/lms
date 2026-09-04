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
            question: 'What is the main advantage of event-driven architecture?',
            options: ['Loose coupling and asynchronous scalability', 'Monolithic database constraints', 'Synchronous blocking execution', 'Zero observability required'],
            correctIndex: 0,
            explanation: 'Event-driven systems decouple producers and consumers, enabling massive scale and asynchronous event processing.',
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

  const [selectedAnswers, setSelectedAnswers] = useState<{ [qIndex: number]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [scorePercent, setScorePercent] = useState<number>(0);
  const [passed, setPassed] = useState<boolean>(false);

  const handleSelect = (qIndex: number, optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }));
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
              confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
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
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
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
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
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
  };

  return (
    <div className="w-full max-w-[1000px] mx-auto bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
      {/* Quiz Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-800 text-[10px] font-mono font-bold uppercase">
              Interactive Knowledge Check
            </span>
            <span className="text-xs text-on-surface-variant font-bold font-mono">
              Passing Grade: {passingScore}%
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-on-surface mt-1">{title}</h2>
        </div>

        {isSubmitted && (
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-2xl font-mono text-sm font-extrabold flex items-center gap-2 ${
              passed ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-700 border border-rose-500/30'
            }`}>
              <Icon name={passed ? 'check_circle' : 'cancel'} size={18} />
              <span>Score: {scorePercent}% ({passed ? 'PASSED' : 'FAILED'})</span>
            </div>
            {!passed && (
              <button
                type="button"
                onClick={handleRetry}
                className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Icon name="refresh" size={16} />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {questions.map((q, qIdx) => {
          const isAnswered = selectedAnswers[qIdx] !== undefined;
          const selectedOption = selectedAnswers[qIdx];
          const isCorrect = isSubmitted ? selectedOption === q.correctIndex : null;

          return (
            <div
              key={q.id || qIdx}
              className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                isSubmitted
                  ? isCorrect
                    ? 'bg-emerald-500/5 border-emerald-500/30'
                    : 'bg-rose-500/5 border-rose-500/30'
                  : 'bg-surface-container-low border-outline-variant'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="text-xs font-mono font-bold text-on-surface-variant">
                  Question {qIdx + 1} of {questions.length}
                </span>
                {isSubmitted && (
                  <span className={`text-xs font-bold font-mono flex items-center gap-1 ${
                    isCorrect ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    <Icon name={isCorrect ? 'check' : 'close'} size={16} />
                    <span>{isCorrect ? 'Correct (+1)' : 'Incorrect (0)'}</span>
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-on-surface mt-2 mb-4">
                {q.question}
              </h3>

              {/* Options */}
              <div className="space-y-2.5">
                {(q.options || []).map((opt, optIdx) => {
                  const isSelected = selectedOption === optIdx;
                  const isThisCorrect = optIdx === q.correctIndex;

                  let optClass = 'bg-surface-container-lowest border-outline-variant hover:border-primary/50 text-on-surface';

                  if (isSubmitted) {
                    if (isThisCorrect) {
                      optClass = 'bg-emerald-500/10 border-emerald-500 text-emerald-900 font-bold';
                    } else if (isSelected && !isThisCorrect) {
                      optClass = 'bg-rose-500/10 border-rose-500 text-rose-900 line-through';
                    } else {
                      optClass = 'opacity-50 border-outline-variant';
                    }
                  } else if (isSelected) {
                    optClass = 'bg-primary/5 border-primary text-primary font-bold shadow-xs';
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={isSubmitted}
                      onClick={() => handleSelect(qIdx, optIdx)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default ${optClass}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-surface-container-high flex items-center justify-center text-xs font-mono font-bold text-on-surface-variant shrink-0">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {isSubmitted && isThisCorrect && (
                        <Icon name="check_circle" size={16} className="text-emerald-700 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation on submission */}
              {isSubmitted && q.explanation && (
                <div className="mt-4 p-3.5 rounded-xl bg-surface-container-high text-xs text-on-surface-variant border border-outline-variant">
                  <span className="font-bold text-on-surface block mb-0.5">Explanation:</span>
                  <p>{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit Action Bar */}
      {!isSubmitted && (
        <div className="pt-4 flex items-center justify-between border-t border-outline-variant">
          <span className="text-xs text-on-surface-variant font-medium">
            {Object.keys(selectedAnswers).length} of {questions.length} questions answered
          </span>

          <button
            type="button"
            disabled={Object.keys(selectedAnswers).length === 0 || isSubmitting}
            onClick={handleSubmit}
            className="px-6 py-3 bg-primary hover:bg-primary-container text-on-primary font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Icon name={isSubmitting ? 'sync' : 'done_all'} size={16} className={isSubmitting ? 'animate-spin' : ''} />
            <span>{isSubmitting ? 'Evaluating Submission...' : 'Submit Answers & Calculate Score'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

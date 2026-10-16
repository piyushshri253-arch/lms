'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { QuizConfig } from '@/components/course-builder/CourseCurriculumStep';
import { useApp } from '@/context/AppContext';
import confetti from 'canvas-confetti';

interface QuizPlayerProps {
  title: string;
  lessonId?: string;
  quizData?: QuizConfig | string | null;
  isFinalAssignment?: boolean;
  certificateNumber?: string;
  onPass?: () => void;
  onPassResult?: (result: {
    scorePercent: number;
    passingScore: number;
    correctCount: number;
    totalQuestions: number;
    passed: boolean;
    certificate?: { certificateNumber: string; url: string } | null;
  }) => void;
  onAutoAdvanceNext?: () => void;
  onClaimCertificate?: () => void;
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({
  title,
  lessonId,
  quizData,
  isFinalAssignment = false,
  certificateNumber,
  onPass,
  onPassResult,
  onAutoAdvanceNext,
  onClaimCertificate
}) => {
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
  const [showResultScreen, setShowResultScreen] = useState<boolean>(false);
  const [scorePercent, setScorePercent] = useState<number>(0);
  const [passed, setPassed] = useState<boolean>(false);
  const [earnedPointsState, setEarnedPointsState] = useState<number>(0);
  const [totalPointsState, setTotalPointsState] = useState<number>(0);
  const [correctCountState, setCorrectCountState] = useState<number>(0);
  const { showToast } = useApp();
  const [copiedCertLink, setCopiedCertLink] = useState<boolean>(false);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);

  const certNumber = certificateNumber || 'MT-2026-FINAL';
  const certificateFullUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/certificate/${certNumber}`
      : `/certificate/${certNumber}`;

  const handleCopyCertificateLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(certificateFullUrl);
      setCopiedCertLink(true);
      showToast({
        title: 'Certificate Link Copied! 📋',
        description: 'Shareable certificate verification link copied to clipboard.',
        type: 'success'
      });
      setTimeout(() => setCopiedCertLink(false), 3000);
    }
  };

  // 5-second countdown timer when student passes
  useEffect(() => {
    if (autoAdvanceCountdown === null || isTimerPaused) return;

    if (autoAdvanceCountdown <= 0) {
      setAutoAdvanceCountdown(null);
      onAutoAdvanceNext?.();
      return;
    }

    const timer = setTimeout(() => {
      setAutoAdvanceCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoAdvanceCountdown, isTimerPaused, onAutoAdvanceNext]);

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
      // Calculate points & correct count
      let totalPoints = 0;
      let earnedPoints = 0;
      let correctCount = 0;

      questions.forEach((q, idx) => {
        const pts = q.points || 1;
        totalPoints += pts;
        if (selectedAnswers[idx] === q.correctIndex) {
          earnedPoints += pts;
          correctCount += 1;
        }
      });

      const calculatedPercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 100;
      const calculatedPassed = calculatedPercent >= passingScore;

      // 1. Try server-side scoring if lessonId is present
      if (lessonId) {
        try {
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
              const serverScore = data.attempt.score;
              const serverPassed = data.attempt.passed;
              setScorePercent(serverScore);
              setPassed(serverPassed);
              setEarnedPointsState(earnedPoints);
              setTotalPointsState(totalPoints);
              setCorrectCountState(correctCount);
              setIsSubmitted(true);
              setShowResultScreen(true);

              if (serverPassed) {
                confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
                onPass?.();
                onPassResult?.({
                  scorePercent: serverScore,
                  passingScore,
                  correctCount,
                  totalQuestions: questions.length,
                  passed: true,
                  certificate: data.attempt?.certificate || null
                });
                if (!isFinalAssignment) {
                  setAutoAdvanceCountdown(5);
                  setIsTimerPaused(false);
                } else {
                  setAutoAdvanceCountdown(null);
                }
              } else {
                setAutoAdvanceCountdown(null);
                setIsTimerPaused(false);
              }
              return;
            }
          }
        } catch {
          // Fall through to client-side evaluation
        }
      }

      // 2. Client-side evaluation fallback
      setEarnedPointsState(earnedPoints);
      setTotalPointsState(totalPoints);
      setCorrectCountState(correctCount);
      setScorePercent(calculatedPercent);
      setPassed(calculatedPassed);
      setIsSubmitted(true);
      setShowResultScreen(true);

      if (calculatedPassed) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        onPass?.();
        onPassResult?.({
          scorePercent: calculatedPercent,
          passingScore,
          correctCount,
          totalQuestions: questions.length,
          passed: true
        });
        if (!isFinalAssignment) {
          setAutoAdvanceCountdown(5);
          setIsTimerPaused(false);
        } else {
          setAutoAdvanceCountdown(null);
        }
      } else {
        setAutoAdvanceCountdown(null);
        setIsTimerPaused(false);
      }
    } catch {
      let totalPoints = 0;
      let earnedPoints = 0;
      let correctCount = 0;

      questions.forEach((q, idx) => {
        const pts = q.points || 1;
        totalPoints += pts;
        if (selectedAnswers[idx] === q.correctIndex) {
          earnedPoints += pts;
          correctCount += 1;
        }
      });

      const percent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 100;
      const isPassing = percent >= passingScore;

      setEarnedPointsState(earnedPoints);
      setTotalPointsState(totalPoints);
      setCorrectCountState(correctCount);
      setScorePercent(percent);
      setPassed(isPassing);
      setIsSubmitted(true);
      setShowResultScreen(true);

      if (isPassing) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        onPass?.();
        onPassResult?.({
          scorePercent: percent,
          passingScore,
          correctCount,
          totalQuestions: questions.length,
          passed: true
        });
        if (!isFinalAssignment) {
          setAutoAdvanceCountdown(5);
          setIsTimerPaused(false);
        } else {
          setAutoAdvanceCountdown(null);
        }
      } else {
        setAutoAdvanceCountdown(null);
        setIsTimerPaused(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
    setShowResultScreen(false);
    setScorePercent(0);
    setPassed(false);
    setCurrentIndex(0);
    setAutoAdvanceCountdown(null);
    setIsTimerPaused(false);
  };

  const handleImmediateNext = () => {
    setAutoAdvanceCountdown(null);
    setIsTimerPaused(true);
    onAutoAdvanceNext?.();
  };

  const handleStayAndReview = () => {
    setAutoAdvanceCountdown(null);
    setIsTimerPaused(true);
    setShowResultScreen(false);
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

  // 1. DEDICATED BIG RESULT SCREEN (Shown immediately upon submit)
  if (isSubmitted && showResultScreen) {
    return (
      <div className="w-full max-w-3xl mx-auto bg-white border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
              Assessment Results
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
              {title}
            </h2>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 border shadow-2xs ${
              passed
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-rose-100 text-rose-800 border-rose-300'
            }`}
          >
            <Icon name={passed ? 'check_circle' : 'cancel'} size={15} fill={passed} />
            <span>{passed ? 'PASSED' : 'RETAKE REQUIRED'}</span>
          </div>
        </div>

        {/* Central Result Hero */}
        <div className="p-6 sm:p-10 flex flex-col items-center text-center space-y-6">
          {/* Circular Score Badge */}
          <div className="relative flex items-center justify-center">
            <div
              className={`w-32 h-32 rounded-full flex flex-col items-center justify-center border-4 shadow-xl transition-all ${
                passed
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-950'
                  : 'border-rose-500 bg-rose-50 text-rose-950'
              }`}
            >
              <span className="text-4xl font-mono font-black">{scorePercent}%</span>
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                {passed ? 'Passed ✓' : 'Failed ✕'}
              </span>
            </div>
            {passed && (
              <div className="absolute -top-1.5 -right-1.5 w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg animate-bounce">
                <Icon name="emoji_events" size={20} />
              </div>
            )}
          </div>

          {/* Heading & Subtitle */}
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              {isFinalAssignment
                ? passed
                  ? 'Congratulations! You Passed the Final Assignment 🎓'
                  : 'Final Assignment Not Passed ❌'
                : passed
                ? 'Congratulations! You Passed 🎉'
                : 'Assessment Not Passed ❌'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {isFinalAssignment
                ? passed
                  ? `You scored ${scorePercent}%, successfully achieving the ${passingScore}% passing threshold. Your verified Course Certificate of Completion is unlocked!`
                  : `You scored ${scorePercent}%, which is below the required ${passingScore}% mark. Passing this Final Assignment is required to unlock your certificate.`
                : passed
                ? `You scored ${scorePercent}%, successfully reaching the ${passingScore}% passing threshold required by your instructor.`
                : `You scored ${scorePercent}%, which is below the required ${passingScore}% passing score. Review the questions and retake the quiz to proceed.`}
            </p>
          </div>

          {/* Score Metrics Breakdown */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-lg">
            <div className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Your Score</span>
              <span className={`text-base sm:text-lg font-black font-mono ${passed ? 'text-emerald-700' : 'text-rose-700'}`}>
                {scorePercent}%
              </span>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Correct Answers</span>
              <span className="text-base sm:text-lg font-black font-mono text-slate-800">
                {correctCountState} / {questions.length}
              </span>
            </div>
            <div className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Passing Mark</span>
              <span className="text-base sm:text-lg font-black font-mono text-indigo-700">
                {passingScore}%
              </span>
            </div>
          </div>

          {/* IF PASSED: Check if Final Assignment or Regular Quiz */}
          {passed ? (
            isFinalAssignment ? (
              <div className="w-full max-w-lg p-6 rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50/70 to-emerald-50 border-2 border-amber-400 shadow-xl space-y-4 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center shadow-md text-2xl shrink-0">
                    🎓
                  </div>
                  <div className="text-left">
                    <h4 className="text-base sm:text-lg font-black text-slate-900">
                      Course Certificate Unlocked!
                    </h4>
                    <p className="text-xs text-amber-900 font-medium">
                      Outstanding accomplishment! You have satisfied all completion criteria.
                    </p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-white/80 p-3.5 rounded-xl border border-amber-200 text-left">
                  Your official verified <strong>Certificate of Completion</strong> is ready. You can download your high-resolution certificate now or review your test responses.
                </p>

                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleStayAndReview}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition cursor-pointer shadow-2xs"
                  >
                    Review Answers
                  </button>

                  {/* Copy Certificate Link */}
                  <button
                    type="button"
                    onClick={handleCopyCertificateLink}
                    className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
                      copiedCertLink
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Icon name={copiedCertLink ? 'check' : 'content_copy'} size={15} />
                    <span>{copiedCertLink ? 'Link Copied! ✓' : 'Copy Certificate Link'}</span>
                  </button>

                  {onClaimCertificate && (
                    <button
                      type="button"
                      onClick={() => {
                        confetti({ particleCount: 160, spread: 100, origin: { y: 0.5 } });
                        onClaimCertificate();
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white text-xs font-extrabold rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer transform hover:scale-[1.02]"
                    >
                      <Icon name="workspace_premium" size={18} />
                      <span>Download Certificate 🎓</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Regular Quiz: 5-Second Auto-Advance Countdown Card */
              <div className="w-full max-w-lg p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 shadow-md space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs sm:text-sm">
                    <Icon name="timer" size={18} className="text-emerald-600 animate-spin" />
                    <span>
                      {autoAdvanceCountdown !== null && autoAdvanceCountdown > 0
                        ? `Auto-advancing to next lecture in ${autoAdvanceCountdown}s...`
                        : 'Advancing now...'}
                    </span>
                  </div>
                  {autoAdvanceCountdown !== null && (
                    <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-mono font-black text-sm flex items-center justify-center shadow">
                      {autoAdvanceCountdown}
                    </span>
                  )}
                </div>

                {/* Progress bar countdown */}
                <div className="h-1.5 w-full bg-emerald-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${((autoAdvanceCountdown ?? 0) / 5) * 100}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleStayAndReview}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition cursor-pointer"
                  >
                    Stay &amp; Review Answers
                  </button>
                  <button
                    type="button"
                    onClick={handleImmediateNext}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-lg shadow transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>Next Lecture Now</span>
                    <Icon name="arrow_forward" size={14} />
                  </button>
                </div>
              </div>
            )
          ) : (
            /* IF FAILED: Big Screen Failure Notice (No auto-advance) */
            isFinalAssignment ? (
              <div className="w-full max-w-lg p-6 rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 border-2 border-rose-300 shadow-md space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow shrink-0">
                    <Icon name="lock" size={20} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm sm:text-base font-extrabold text-rose-950">
                      Certificate Locked — Final Assignment Not Passed
                    </h4>
                    <p className="text-xs text-rose-700">
                      Passing mark required: {passingScore}% (Your score: {scorePercent}%)
                    </p>
                  </div>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed bg-white/70 p-3 rounded-xl border border-rose-200 text-left">
                  The verified Certificate of Completion is awarded only after successfully passing this Final Assignment. Review the answers and explanations below, then retake the assignment to earn your certificate!
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Icon name="refresh" size={16} />
                    <span>Retake Final Assignment</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResultScreen(false)}
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Icon name="visibility" size={15} />
                    <span>Review Answers &amp; Explanations</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-lg p-5 rounded-2xl bg-rose-50/80 border-2 border-rose-300 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-rose-900 font-extrabold text-xs sm:text-sm">
                  <Icon name="lock" size={18} className="text-rose-600 shrink-0" />
                  <span>Next Lecture Progression Locked</span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed text-left">
                  You must achieve at least <strong>{passingScore}%</strong> on this quiz to unlock completion. Retake the quiz or review the questions and explanations below.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Icon name="refresh" size={16} />
                    <span>Retake Quiz Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResultScreen(false)}
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Icon name="visibility" size={15} />
                    <span>Review Answers &amp; Explanations</span>
                  </button>
                </div>
              </div>
            )
          )}
        </div>
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

        {/* Top Result Banner when in Review Mode */}
        {isSubmitted && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowResultScreen(true)}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-extrabold flex items-center gap-1.5 border shadow-2xs cursor-pointer hover:opacity-90 transition-opacity ${
                passed
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
              title="Click to view full score card"
            >
              <Icon name={passed ? 'check_circle' : 'cancel'} size={16} fill={passed} />
              <span>Score: {scorePercent}% ({passed ? 'PASSED' : 'RETAKE NEEDED'})</span>
              <span className="text-[10px] underline ml-1">Score Card</span>
            </button>

            {isFinalAssignment ? (
              passed && onClaimCertificate ? (
                <button
                  type="button"
                  onClick={() => {
                    confetti({ particleCount: 160, spread: 100, origin: { y: 0.5 } });
                    onClaimCertificate();
                  }}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Claim & Download Certificate"
                >
                  <Icon name="workspace_premium" size={16} />
                  <span>Download Certificate</span>
                </button>
              ) : !passed ? (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                  title="Retake Final Assignment"
                >
                  <Icon name="refresh" size={14} />
                  <span>Retake Final Assignment</span>
                </button>
              ) : null
            ) : (
              <>
                {passed && onAutoAdvanceNext && (
                  <button
                    type="button"
                    onClick={handleImmediateNext}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                    title="Continue to Next Lecture"
                  >
                    <span>Next Lecture</span>
                    <Icon name="arrow_forward" size={14} />
                  </button>
                )}

                {!passed && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                    title="Retake Quiz"
                  >
                    <Icon name="refresh" size={14} />
                    <span>Retake Quiz</span>
                  </button>
                )}
              </>
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
              <span>{isSubmitting ? 'Scoring Assessment...' : isFinalAssignment ? 'Submit Final Assignment' : 'Submit Answers'}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowResultScreen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-700 transition-colors cursor-pointer"
              >
                <Icon name="poll" size={14} />
                <span>Score Summary</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentIndex(0)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-800 transition-colors cursor-pointer shadow-2xs"
              >
                <Icon name="replay" size={14} />
                <span>Review from Start</span>
              </button>
              {isFinalAssignment && passed && onClaimCertificate && (
                <button
                  type="button"
                  onClick={() => {
                    confetti({ particleCount: 160, spread: 100, origin: { y: 0.5 } });
                    onClaimCertificate();
                  }}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white text-xs font-extrabold transition-colors cursor-pointer shadow-md"
                >
                  <Icon name="workspace_premium" size={16} />
                  <span>Download Certificate</span>
                </button>
              )}
              {isFinalAssignment && !passed && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-colors cursor-pointer shadow-md"
                >
                  <Icon name="refresh" size={15} />
                  <span>Retake Final Assignment</span>
                </button>
              )}
              {!isFinalAssignment && passed && onAutoAdvanceNext && (
                <button
                  type="button"
                  onClick={handleImmediateNext}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-colors cursor-pointer shadow-sm"
                >
                  <span>Next Lecture</span>
                  <Icon name="arrow_forward" size={14} />
                </button>
              )}
            </>
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

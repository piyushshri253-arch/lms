'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';
import confetti from 'canvas-confetti';

export interface FinalAssessmentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  scorePercent: number;
  passingScore?: number;
  correctCount: number;
  totalQuestions: number;
  certificateNumber?: string;
  courseTitle?: string;
  onViewCertificate?: () => void;
  onReviewAnswers?: () => void;
}

export const FinalAssessmentSuccessModal: React.FC<FinalAssessmentSuccessModalProps> = ({
  isOpen,
  onClose,
  scorePercent,
  passingScore = 70,
  correctCount,
  totalQuestions,
  certificateNumber,
  courseTitle,
  onViewCertificate,
  onReviewAnswers
}) => {
  const { showToast } = useApp();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const certNumber = certificateNumber || 'MT-2026-FINAL';
  const certificateFullUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/certificate/${certNumber}`
      : `/certificate/${certNumber}`;

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(certificateFullUrl);
      setCopied(true);
      showToast({
        title: 'Certificate Link Copied! 📋',
        description: 'Shareable certificate link has been copied to your clipboard.',
        type: 'success'
      });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleDownloadCertificate = () => {
    confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 } });
    if (onViewCertificate) {
      onViewCertificate();
    } else if (typeof window !== 'undefined') {
      window.open(`/certificate/${certNumber}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-400/40 dark:border-amber-500/30 overflow-hidden flex flex-col my-6 text-slate-900 dark:text-white animate-in zoom-in-95 duration-200">
        {/* Top Celebratory Header */}
        <div className="relative px-6 py-8 bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 text-white text-center overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-white/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-yellow-300/20 rounded-full blur-2xl pointer-events-none" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/15 hover:bg-black/30 text-white/90 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <Icon name="close" size={18} />
          </button>

          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 text-4xl shadow-inner mb-3 animate-bounce">
            🎓
          </div>

          <div className="space-y-1 max-w-md mx-auto">
            <span className="px-3 py-1 rounded-full bg-white/25 text-white text-[11px] font-mono font-black uppercase tracking-wider inline-block">
              Final Assessment Passed ✓
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-xs">
              Congratulations! 🎉
            </h2>
            <p className="text-xs sm:text-sm text-amber-100 font-medium">
              You have successfully completed the course curriculum and achieved the passing score!
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Test Score Showcase Card */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-18 h-18 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex flex-col items-center justify-center shadow-md font-mono shrink-0">
                <span className="text-2xl font-black leading-none">{scorePercent}%</span>
                <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 opacity-90">Passed</span>
              </div>
              <div className="space-y-0.5 text-left">
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                  Assessment Performance
                </span>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Test Score: <span className="text-emerald-700 dark:text-emerald-400">{scorePercent}%</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {correctCount} out of {totalQuestions} questions correct (Required: {passingScore}%)
                </p>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5 shrink-0">
              <Icon name="verified" size={16} />
              <span>Verified Pass</span>
            </div>
          </div>

          {/* Side-by-side Certificate Action Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/70 via-yellow-50/40 to-slate-50 dark:from-amber-950/20 dark:via-slate-800/40 dark:to-slate-800/60 border-2 border-amber-300 dark:border-amber-700/60 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Icon name="workspace_premium" size={20} className="text-amber-600 dark:text-amber-400" />
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    Verified Course Certificate
                  </h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Your official Certificate of Completion has been generated and sealed in the registry.
                </p>
              </div>
              {certificateNumber && (
                <span className="font-mono text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 shrink-0">
                  #{certNumber}
                </span>
              )}
            </div>

            {/* Prominent Action Buttons: Download & Copy Link */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* 1. Download Certificate Button */}
              <button
                type="button"
                onClick={handleDownloadCertificate}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-extrabold text-xs shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] cursor-pointer"
              >
                <Icon name="download" size={17} />
                <span>Download Certificate</span>
              </button>

              {/* 2. Copy Certificate Link Button */}
              <button
                type="button"
                onClick={handleCopyLink}
                className={`py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                  copied
                    ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-400 text-emerald-800 dark:text-emerald-200'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200'
                }`}
              >
                <Icon name={copied ? 'check' : 'content_copy'} size={16} />
                <span>{copied ? 'Link Copied! ✓' : 'Copy Certificate Link'}</span>
              </button>
            </div>
          </div>

          {/* Footer secondary controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
            {onReviewAnswers ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReviewAnswers();
                }}
                className="text-slate-600 dark:text-slate-400 hover:text-primary font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Icon name="visibility" size={15} />
                <span>Review Test Answers</span>
              </button>
            ) : <span />}

            <div className="flex items-center gap-2 ml-auto">
              {onViewCertificate && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewCertificate();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  View Preview
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold hover:bg-slate-800 dark:hover:bg-slate-100 transition cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

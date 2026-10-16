'use client';

import React, { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ArticleContentRenderer } from './ArticleContentRenderer';

interface ArticlePlayerProps {
  title: string;
  lessonId?: string;
  type: 'TEXT' | 'PDF' | 'DOWNLOAD';
  content?: string | null;
  pdfUrl?: string | null;
  fileUrl?: string | null;
  allowDownload?: boolean;
  duration?: string;
  isCompleted?: boolean;
  hasNextLesson?: boolean;
  nextLessonTitle?: string;
  onComplete: () => void;
}

export const ArticlePlayer: React.FC<ArticlePlayerProps> = ({
  title,
  lessonId,
  type,
  content,
  pdfUrl,
  fileUrl,
  allowDownload = false,
  duration = '05:00',
  isCompleted,
  hasNextLesson = false,
  nextLessonTitle,
  onComplete
}) => {
  const [resolvedPdfUrl, setResolvedPdfUrl] = useState<string | null>(pdfUrl || null);
  const [resolvedFileUrl, setResolvedFileUrl] = useState<string | null>(fileUrl || null);
  const [canDownloadPdf, setCanDownloadPdf] = useState<boolean>(allowDownload);
  const [canDownloadFile, setCanDownloadFile] = useState<boolean>(allowDownload);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);
  const [watermark, setWatermark] = useState<{ enabled: boolean; text: string }>({
    enabled: true,
    text: 'Protected Document • Morena LMS DRM'
  });

  const handleCompleteAndNext = () => {
    setIsAdvancing(true);
    onComplete();
    setTimeout(() => {
      setIsAdvancing(false);
    }, 2000);
  };

  useEffect(() => {
    let isMounted = true;
    const verifyDocumentAccess = async () => {
      if (type === 'TEXT') {
        // Plain text articles/notes do not require PDF stream verification
        return;
      }
      if (!lessonId || lessonId === 'placeholder' || lessonId.startsWith('placeholder') || lessonId.length < 5) {
        setResolvedPdfUrl(pdfUrl || null);
        setResolvedFileUrl(fileUrl || null);
        return;
      }

      try {
        const res = await fetch(`/api/lessons/${lessonId}/stream`);
        const data = await res.json();
        if (!isMounted) return;

        if (res.ok && data.allowed) {
          setResolvedPdfUrl(data.pdfUrl || pdfUrl || null);
          setResolvedFileUrl(data.fileUrl || null);
          setCanDownloadPdf(Boolean(data.securityPolicy?.allowPdfDownload && data.allowDownload));
          setCanDownloadFile(Boolean(data.securityPolicy?.allowResourceDownload && data.allowDownload));
          if (data.watermark) setWatermark(data.watermark);
          setAccessError(null);
        } else {
          setAccessError(data.error || 'Course enrollment required to view this protected PDF/document.');
        }
      } catch {
        if (isMounted) {
          setResolvedPdfUrl(pdfUrl || null);
        }
      }
    };

    verifyDocumentAccess();
    return () => {
      isMounted = false;
    };
  }, [lessonId, pdfUrl, fileUrl, type]);

  if (accessError) {
    return (
      <div className="w-full max-w-[1000px] mx-auto bg-slate-950 rounded-3xl p-10 text-center space-y-4 border border-rose-500/20 select-none">
        <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
          <Icon name="lock" size={32} />
        </div>
        <h3 className="text-lg font-bold text-white">Protected Document Locked</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">{accessError}</p>
      </div>
    );
  }

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="w-full max-w-[1000px] mx-auto bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-10 shadow-xs space-y-6 animate-in fade-in duration-200 select-none"
    >
      {/* Article Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                type === 'TEXT'
                  ? 'bg-secondary/10 text-secondary'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {type === 'TEXT' ? 'Reading Guide' : 'Signed Protected PDF'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <Icon name="verified_user" size={12} />
              <span>256-Bit Student Bound</span>
            </span>
            <span className="text-xs text-on-surface-variant font-mono">
              Estimated: {duration}
            </span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight mt-1">{title}</h1>
        </div>

        <button
          type="button"
          onClick={handleCompleteAndNext}
          disabled={isAdvancing}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
            isCompleted
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
              : 'bg-primary text-on-primary hover:bg-primary-container'
          }`}
        >
          <Icon name={isCompleted ? 'check_circle' : isAdvancing ? 'hourglass_top' : 'task_alt'} size={16} fill={isCompleted} />
          <span>
            {isAdvancing
              ? 'Opening Next... 🚀'
              : isCompleted
              ? hasNextLesson
                ? 'Completed ✓ (Next →)'
                : 'Completed ✓'
              : hasNextLesson
              ? 'Mark as Read & Next →'
              : 'Mark as Read'}
          </span>
        </button>
      </div>

      {/* PDF / Document Reader */}
      {(type === 'PDF' || type === 'DOWNLOAD') && (
        <div className="space-y-4">
          <div className="p-6 bg-surface-container-low rounded-2xl border border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Icon name="picture_as_pdf" size={28} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-surface">Curriculum PDF Reference Asset</h3>
                <p className="text-xs text-on-surface-variant">
                  {canDownloadPdf
                    ? 'Authorized for download and offline reference by your course instructor.'
                    : 'View-only DRM enabled — downloading & printing are restricted by the instructor.'}
                </p>
              </div>
            </div>

            {resolvedPdfUrl && canDownloadPdf ? (
              <a
                href={resolvedPdfUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Icon name="download" size={16} />
                <span>Download Signed PDF</span>
              </a>
            ) : resolvedFileUrl && canDownloadFile ? (
              <a
                href={resolvedFileUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Icon name="download" size={16} />
                <span>Download Resource</span>
              </a>
            ) : (
              <span className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold flex items-center gap-1.5 shrink-0">
                <Icon name="lock" size={14} />
                <span>View-Only Mode (Download Disabled)</span>
              </span>
            )}
          </div>

          {resolvedPdfUrl && (
            <div className="w-full h-[600px] rounded-2xl overflow-hidden border border-outline-variant bg-slate-900 relative">
              <iframe
                src={
                  canDownloadPdf
                    ? resolvedPdfUrl
                    : resolvedPdfUrl.includes('#')
                    ? resolvedPdfUrl
                    : `${resolvedPdfUrl}#toolbar=0&navpanes=0&scrollbar=1`
                }
                title={title}
                className="w-full h-full border-0"
              />
              {watermark.enabled && (
                <div className="absolute bottom-4 right-4 z-20 pointer-events-none px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-xs border border-white/10 text-[10px] font-mono text-white/75 select-none">
                  {watermark.text}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rich Text / Article Content */}
      {type === 'TEXT' && (
        <div className="max-w-none space-y-4 text-xs sm:text-sm leading-relaxed text-on-surface relative">
          <ArticleContentRenderer content={content} />
          {watermark.enabled && (
            <div className="pt-4 border-t border-outline-variant/40 text-[10px] font-mono text-on-surface-variant/60 flex items-center justify-between">
              <span>Licensed to: {watermark.text}</span>
              <span>Do Not Redistribute</span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Completion & Next Lecture Action Bar */}
      <div className="pt-6 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
        <div className="text-xs text-on-surface-variant flex items-center gap-2">
          <Icon name="auto_stories" size={18} className="text-primary shrink-0" />
          <span>
            {isCompleted
              ? 'You have finished reading this lecture.'
              : 'Finished reading this guide? Mark it as complete to continue.'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCompleteAndNext}
          disabled={isAdvancing}
          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
            isCompleted
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
              : 'bg-primary text-on-primary hover:bg-primary-container'
          }`}
        >
          <Icon name={isCompleted ? 'check_circle' : isAdvancing ? 'hourglass_top' : 'task_alt'} size={16} fill={isCompleted} />
          <span>
            {isAdvancing
              ? 'Opening Next... 🚀'
              : isCompleted
              ? hasNextLesson
                ? 'Next Lecture →'
                : 'Completed ✓'
              : hasNextLesson
              ? 'Mark as Read & Next Lecture →'
              : 'Mark as Read'}
          </span>
        </button>
      </div>
    </div>
  );
};

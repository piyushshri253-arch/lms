'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';

interface ArticlePlayerProps {
  title: string;
  type: 'TEXT' | 'PDF' | 'DOWNLOAD';
  content?: string | null;
  pdfUrl?: string | null;
  fileUrl?: string | null;
  duration?: string;
  isCompleted?: boolean;
  onComplete: () => void;
}

export const ArticlePlayer: React.FC<ArticlePlayerProps> = ({
  title,
  type,
  content,
  pdfUrl,
  fileUrl,
  duration = '05:00',
  isCompleted,
  onComplete
}) => {
  return (
    <div className="w-full max-w-[1000px] mx-auto bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-10 shadow-xs space-y-6 animate-in fade-in duration-200">
      {/* Article Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                type === 'TEXT'
                  ? 'bg-secondary/10 text-secondary'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {type === 'TEXT' ? 'Reading Guide' : 'Document Resource'}
            </span>
            <span className="text-xs text-on-surface-variant font-mono">
              Estimated: {duration}
            </span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight mt-1">{title}</h1>
        </div>

        <button
          type="button"
          onClick={onComplete}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
            isCompleted
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-primary text-on-primary hover:bg-primary-container'
          }`}
        >
          <Icon name="check_circle" size={16} fill={isCompleted} />
          <span>{isCompleted ? 'Completed ✓' : 'Mark as Read'}</span>
        </button>
      </div>

      {/* PDF / Document Reader */}
      {type === 'PDF' && (
        <div className="space-y-4">
          <div className="p-6 bg-surface-container-low rounded-2xl border border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Icon name="picture_as_pdf" size={28} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-surface">Curriculum PDF Reference Asset</h3>
                <p className="text-xs text-on-surface-variant">
                  High-resolution document attachment for this lecture module.
                </p>
              </div>
            </div>

            {pdfUrl ? (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Icon name="download" size={16} />
                <span>Open / Download PDF</span>
              </a>
            ) : (
              <span className="text-xs font-mono text-outline">PDF processing...</span>
            )}
          </div>

          {pdfUrl && (
            <div className="w-full h-[600px] rounded-2xl overflow-hidden border border-outline-variant bg-slate-900">
              <iframe src={pdfUrl} title={title} className="w-full h-full border-0" />
            </div>
          )}
        </div>
      )}

      {/* Rich Text / Article Content */}
      {type === 'TEXT' && (
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-4 text-xs sm:text-sm leading-relaxed text-on-surface">
          {content ? (
            <div className="whitespace-pre-wrap font-sans text-on-surface leading-7">
              {content}
            </div>
          ) : (
            <div className="py-12 text-center text-on-surface-variant text-xs">
              This reading guide is being prepared by the course instructor.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

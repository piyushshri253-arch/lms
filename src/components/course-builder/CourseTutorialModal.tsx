'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';

interface CourseTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLang?: 'en' | 'hi';
}

interface ChapterItem {
  id: number;
  title: string;
  time: string;
  seconds: number;
}

const CHAPTERS: Record<'en' | 'hi', ChapterItem[]> = {
  en: [
    { id: 1, title: '1. Intro & Studio Tour', time: '0:00', seconds: 0 },
    { id: 2, title: '2. Download Template (.xlsx)', time: '0:16', seconds: 16.2 },
    { id: 3, title: '3. Sheet 1: Course Details', time: '0:35', seconds: 35.5 },
    { id: 4, title: '4. Sheet 2: Curriculum Structure', time: '1:06', seconds: 66.2 },
    { id: 5, title: '5. Sheet 3: Quizzes & MCQs', time: '1:38', seconds: 98.1 },
    { id: 6, title: '6. Step 1: Upload & Auto-Fill', time: '2:02', seconds: 122.6 },
    { id: 7, title: '7. Step 2: Curriculum Builder', time: '2:23', seconds: 144.0 },
    { id: 8, title: '8. Step 3 & 4: Media & Pricing', time: '2:49', seconds: 169.2 },
    { id: 9, title: '9. Step 5: Review & Submit', time: '3:10', seconds: 190.1 },
    { id: 10, title: '10. Outro & Publishing Summary', time: '3:30', seconds: 210.4 }
  ],
  hi: [
    { id: 1, title: '1. Intro & Studio Tour', time: '0:00', seconds: 0 },
    { id: 2, title: '2. Download Template (.xlsx)', time: '0:17', seconds: 17.0 },
    { id: 3, title: '3. Sheet 1: Course Details', time: '0:35', seconds: 35.0 },
    { id: 4, title: '4. Sheet 2: Curriculum Structure', time: '0:59', seconds: 59.0 },
    { id: 5, title: '5. Sheet 3: Quizzes & MCQs', time: '1:25', seconds: 85.0 },
    { id: 6, title: '6. Step 1: Upload & Auto-Fill', time: '1:47', seconds: 107.0 },
    { id: 7, title: '7. Step 2: Curriculum Builder', time: '2:07', seconds: 127.0 },
    { id: 8, title: '8. Step 3 & 4: Media & Pricing', time: '2:28', seconds: 148.0 },
    { id: 9, title: '9. Step 5: Review & Submit', time: '2:44', seconds: 164.0 },
    { id: 10, title: '10. Outro & Publishing Summary', time: '3:00', seconds: 180.0 }
  ]
};

export const CourseTutorialModal: React.FC<CourseTutorialModalProps> = ({
  isOpen,
  onClose,
  defaultLang = 'en'
}) => {
  const [lang, setLang] = useState<'en' | 'hi'>(defaultLang);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeChapter, setActiveChapter] = useState<number>(1);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // When language switches, reload video source smoothly
  const handleLanguageSwitch = (newLang: 'en' | 'hi') => {
    if (newLang === lang) return;
    setLang(newLang);
    setActiveChapter(1);
    if (videoRef.current) {
      const src =
        newLang === 'en'
          ? '/tutorial/MORENA_Course_Excel_Upload_Tutorial_EN.mp4'
          : '/tutorial/MORENA_Course_Excel_Upload_Tutorial.mp4';
      videoRef.current.src = src;
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  };

  const seekToChapter = (ch: ChapterItem) => {
    setActiveChapter(ch.id);
    if (videoRef.current) {
      videoRef.current.currentTime = ch.seconds;
      videoRef.current.play().catch(() => {});
    }
  };

  if (!isOpen) return null;

  const currentChapters = CHAPTERS[lang];
  const videoSrc =
    lang === 'en'
      ? '/tutorial/MORENA_Course_Excel_Upload_Tutorial_EN.mp4'
      : '/tutorial/MORENA_Course_Excel_Upload_Tutorial.mp4';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-violet-600/30 text-violet-300 border border-violet-500/30">
                MORENA TEACH STUDIO
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                1080p Full HD
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
              <Icon name="smart_display" size={22} className="text-violet-400" />
              <span>Course Bulk Excel Upload Video Tutorial</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => handleLanguageSwitch('en')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  lang === 'en'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🌐</span>
                <span>English</span>
              </button>
              <button
                type="button"
                onClick={() => handleLanguageSwitch('hi')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  lang === 'hi'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🇮🇳</span>
                <span>Hindi (हिन्दी)</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700"
              title="Close Tutorial (Esc)"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Video Player */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-xl aspect-video">
              <video
                ref={videoRef}
                key={videoSrc}
                src={videoSrc}
                poster="/tutorial/poster.png"
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              >
                Your browser does not support HTML5 video.
              </video>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                <Icon name="info" size={16} className="text-violet-400" />
                <span>
                  {lang === 'en'
                    ? 'Currently playing English Narration (3m 42s)'
                    : 'Currently playing Hindi Voiceover (3m 15s)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={videoSrc}
                  download
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1.5 transition-all"
                  title="Download MP4 for offline viewing"
                >
                  <Icon name="download" size={14} />
                  <span>Download MP4</span>
                </a>
                <a
                  href="/tutorial/index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center gap-1.5 border border-slate-700 transition-all"
                  title="Open full dedicated page in new tab"
                >
                  <Icon name="open_in_new" size={14} />
                  <span>Full Screen Page</span>
                </a>
              </div>
            </div>
          </div>

          {/* Chapters Sidebar */}
          <div className="space-y-3 flex flex-col">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
                <Icon name="list" size={18} className="text-violet-400" />
                <span>Video Chapters</span>
              </h4>
              <span className="text-[11px] text-slate-400">Click to jump</span>
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-[380px] pr-1">
              {currentChapters.map((ch) => {
                const isSelected = activeChapter === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => seekToChapter(ch)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 text-xs ${
                      isSelected
                        ? 'bg-violet-600/20 border-violet-500/50 text-white font-bold'
                        : 'bg-slate-800/70 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                    }`}
                  >
                    <span className="truncate">{ch.title}</span>
                    <span className="font-mono text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                      {ch.time}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Helper Box */}
            <div className="mt-auto bg-gradient-to-br from-violet-950/40 to-slate-900 p-3.5 rounded-xl border border-violet-500/20 text-xs space-y-1.5">
              <div className="font-extrabold text-violet-300 flex items-center gap-1.5">
                <Icon name="lightbulb" size={15} />
                <span>Quick Workflow Tip:</span>
              </div>
              <p className="text-slate-300 text-[11.5px] leading-relaxed">
                Step 1: Download official template ➔ Step 2: Fill in Excel ➔ Step 3: Click 'Upload & Auto-Fill' ➔ Step 4: Review Curriculum & attach videos!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseTutorialModal;

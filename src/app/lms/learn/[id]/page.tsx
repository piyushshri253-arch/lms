'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LMS_ROUTES } from '@/lib/lms-routes';

export default function LmsCoursePlayerPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;

  const [activeLesson, setActiveLesson] = useState('1.1 Deep Dive into React Server Components');
  const [completedLessons, setCompletedLessons] = useState<string[]>([
    '1.1 Deep Dive into React Server Components'
  ]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'NOTES' | 'DISCUSSIONS' | 'RESOURCES'>('NOTES');

  const toggleComplete = (title: string) => {
    if (completedLessons.includes(title)) {
      setCompletedLessons(completedLessons.filter((l) => l !== title));
    } else {
      setCompletedLessons([...completedLessons, title]);
    }
  };

  const modules = [
    {
      title: 'Module 1: Architecture & Server Components',
      lessons: [
        { title: '1.1 Deep Dive into React Server Components', duration: '24m', completed: true },
        { title: '1.2 Server Actions and Optimistic Updates', duration: '32m', completed: false },
        { title: '1.3 Streaming SSR and Suspense Boundaries', duration: '18m', completed: false }
      ]
    },
    {
      title: 'Module 2: Multi-Tenant Database Design',
      lessons: [
        { title: '2.1 Prisma Schema Modeling and Compound Unique Indexes', duration: '28m', completed: false },
        { title: '2.2 Dynamic Tenant Routing & Subdomain Resolution', duration: '35m', completed: false }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#04060e] text-white flex flex-col antialiased select-none">
      {/* Top Header */}
      <header className="h-16 px-6 bg-[#060a1a] border-b border-emerald-500/20 flex items-center justify-between z-30">
        <div className="flex items-center gap-4">
          <Link
            href={LMS_ROUTES.MY_COURSES}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-mono font-bold"
          >
            <Icon name="arrow_back" size={16} />
            <span>Exit Player</span>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div>
            <h1 className="text-xs sm:text-sm font-black text-white truncate max-w-md">
              Full-Stack Next.js 16 Masterclass
            </h1>
            <p className="text-[10px] font-mono text-emerald-400">
              Module: {activeLesson}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Progress:</span>
            <span className="text-emerald-400 font-bold">25%</span>
          </div>
          <button
            type="button"
            onClick={() => toggleComplete(activeLesson)}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              completedLessons.includes(activeLesson)
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
            }`}
          >
            <Icon name="check_circle" size={16} />
            <span>{completedLessons.includes(activeLesson) ? 'Completed' : 'Mark as Complete'}</span>
          </button>
        </div>
      </header>

      {/* Main Player Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0">
        {/* Left: Video / Lesson Display */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto max-w-5xl mx-auto w-full">
          {/* Mock Video Player Canvas */}
          <div className="w-full aspect-video rounded-3xl bg-[#080d20] border border-emerald-500/25 relative overflow-hidden shadow-2xl flex flex-col justify-between p-6">
            <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
              <span>AADHYARA Player v2.4 (Ultra HD 4K)</span>
              <span>1080p 60fps</span>
            </div>

            <div className="flex flex-col items-center justify-center space-y-3">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-20 h-20 rounded-full bg-emerald-600/90 hover:bg-emerald-500 hover:scale-110 text-white flex items-center justify-center shadow-2xl shadow-emerald-600/50 transition-all cursor-pointer"
              >
                <Icon name={isPlaying ? 'pause' : 'play_arrow'} size={40} />
              </button>
              <span className="text-xs font-mono text-slate-300">
                {isPlaying ? 'Playing Lecture Stream...' : 'Click to Play Lesson Stream'}
              </span>
            </div>

            {/* Video Controls Bar */}
            <div className="p-3 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-between text-xs font-mono text-slate-300">
              <div className="flex items-center gap-3">
                <Icon name="volume_up" size={16} />
                <span>04:12 / 24:30</span>
              </div>
              <div className="flex items-center gap-3">
                <span>Speed: 1.0x</span>
                <Icon name="fullscreen" size={18} className="cursor-pointer" />
              </div>
            </div>
          </div>

          {/* Lesson Tabs */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              {(['NOTES', 'DISCUSSIONS', 'RESOURCES'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab
                      ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'NOTES' && (
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs text-slate-300 leading-relaxed">
                <h3 className="text-sm font-bold text-white">Lesson Summary & Key Concepts</h3>
                <p>
                  In this session, we analyze the execution lifecycle of React Server Components in Next.js 16.
                  Unlike client components, Server Components have zero bundle overhead and can execute server-only code
                  securely without exposing database credentials to the client bundle.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Curriculum Sidebar */}
        <aside className="w-full lg:w-96 bg-[#060a1a] border-l border-emerald-500/15 p-5 space-y-6 overflow-y-auto shrink-0">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Course Modules
            </h2>
            <span className="text-[11px] font-mono text-emerald-400">2 Modules</span>
          </div>

          <div className="space-y-4">
            {modules.map((mod, idx) => (
              <div key={idx} className="space-y-2">
                <h3 className="text-xs font-bold text-emerald-300">{mod.title}</h3>
                <div className="space-y-1">
                  {mod.lessons.map((lesson, lIdx) => {
                    const isCurrent = activeLesson === lesson.title;
                    const isDone = completedLessons.includes(lesson.title);

                    return (
                      <button
                        key={lIdx}
                        onClick={() => setActiveLesson(lesson.title)}
                        className={`w-full p-3 rounded-xl text-left text-xs transition-all flex items-center justify-between cursor-pointer border ${
                          isCurrent
                            ? 'bg-emerald-600/20 border-emerald-500/40 text-white font-bold shadow-md'
                            : 'bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            name={isDone ? 'check_circle' : 'play_circle'}
                            size={16}
                            className={isDone ? 'text-emerald-400' : isCurrent ? 'text-emerald-300' : 'text-slate-400'}
                          />
                          <span className="truncate">{lesson.title}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                          {lesson.duration}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

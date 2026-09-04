'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Icon } from '../ui/Icon';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface LessonItem {
  id: string;
  type: string;
  name: string;
  time: string;
  icon: string;
  color: string;
}

const INITIAL_LESSONS_1: LessonItem[] = [
  { id: 'l1', type: 'video', name: '01. Distributed Event Loops & Async I/O', time: '18 min', icon: 'play_circle', color: 'text-indigo-400' },
  { id: 'l2', type: 'pdf', name: '02. Architecture Spec Sheet & Cheatsheet', time: 'PDF Guide', icon: 'description', color: 'text-purple-400' },
  { id: 'l3', type: 'quiz', name: '03. Memory Leak Diagnostic Knowledge Check', time: '10 Questions', icon: 'quiz', color: 'text-amber-400' }
];

const INITIAL_LESSONS_2: LessonItem[] = [
  { id: 'l4', type: 'video', name: '04. Building gRPC & WebSocket Gateways', time: '24 min', icon: 'play_circle', color: 'text-indigo-400' },
  { id: 'l5', type: 'code', name: '05. Hands-on Code Lab: Redis Cache Clustering', time: 'Interactive Lab', icon: 'code', color: 'text-emerald-400' }
];

export const CourseBuilderShowcaseSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const studioRef = useRef<HTMLDivElement>(null);
  const [lessons1, setLessons1] = useState<LessonItem[]>(INITIAL_LESSONS_1);
  const [lessons2, setLessons2] = useState<LessonItem[]>(INITIAL_LESSONS_2);

  const handleAddLiveLesson = (sectionNum: 1 | 2) => {
    const newId = `new-${Date.now()}`;
    const newLesson: LessonItem = {
      id: newId,
      type: 'quiz',
      name: `0${(sectionNum === 1 ? lessons1.length : lessons2.length) + 1}. Live Interactive Checkpoint & Assessment`,
      time: 'Instant Check',
      icon: 'sparkles',
      color: 'text-pink-400'
    };

    if (sectionNum === 1) {
      setLessons1((prev) => [...prev, newLesson]);
    } else {
      setLessons2((prev) => [...prev, newLesson]);
    }
  };

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 75%',
          end: 'bottom 60%',
          scrub: 1
        }
      });

      tl.from('.builder-element', {
        opacity: 0,
        x: -30,
        stagger: 0.1,
        ease: 'power2.out'
      });

      tl.from(
        '.builder-lesson-block',
        {
          opacity: 0,
          scale: 0.9,
          y: 20,
          stagger: 0.12,
          ease: 'back.out(1.5)'
        },
        '-=0.4'
      );
    },
    { scope: containerRef }
  );

  return (
    <section
      id="course-studio"
      ref={containerRef}
      className="relative py-28 md:py-36 bg-[#050711] text-white overflow-hidden border-t border-white/[0.06]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3.5 py-1 rounded-full border border-indigo-500/20">
            03 — COURSE STUDIO BUILDER
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            Build courses without{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
              the complexity.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            Drag, drop, and structure rich multi-format curricula in seconds. Mix 4K video, PDFs, interactive quizzes,
            and coding labs with effortless precision.
          </p>
        </div>

        {/* Interactive Studio Canvas Mockup */}
        <div
          ref={studioRef}
          className="mt-14 p-4 sm:p-6 rounded-3xl bg-gradient-to-b from-white/10 via-white/5 to-transparent border border-white/20 shadow-2xl shadow-black/80"
        >
          {/* Top Studio Control Bar */}
          <div className="p-4 bg-[#0d1124] rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <Icon name="architecture" size={22} />
              </div>
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase bg-emerald-500/10 px-2 py-0.5 rounded">
                  STUDIO EDITOR • AUTOSAVING
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Fullstack Distributed Systems &amp; GenAI Masterclass
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold text-slate-300 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                Price: ₹4,999
              </span>
              <Link
                href="/admin/courses/builder"
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Icon name="publish" size={16} />
                <span>Publish Course</span>
              </Link>
            </div>
          </div>

          {/* Curriculum Tree & Lesson Docking */}
          <div className="mt-5 space-y-4">
            {/* Section 01 */}
            <div className="builder-element p-4 sm:p-5 rounded-2xl bg-[#090d1c] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Icon name="folder_open" size={18} className="text-indigo-400" />
                  <h4 className="font-bold text-sm text-white">Section 01: Core Systems Architecture</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAddLiveLesson(1)}
                    className="text-[10px] font-mono text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 px-2.5 py-1 rounded-lg border border-indigo-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Icon name="add" size={12} />
                    <span>Add Item</span>
                  </button>
                  <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                    {lessons1.length} Lessons
                  </span>
                </div>
              </div>

              {/* Lessons */}
              <div className="space-y-2 pt-1">
                {lessons1.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="builder-lesson-block p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 flex items-center justify-between transition-all group animate-in fade-in zoom-in-95 duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="cursor-grab text-slate-400 group-hover:text-white">
                        <Icon name="drag_indicator" size={16} />
                      </div>
                      <Icon name={lesson.icon} size={20} className={lesson.color} />
                      <span className="text-xs font-semibold text-slate-200">{lesson.name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-slate-400">{lesson.time}</span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        READY
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 02 */}
            <div className="builder-element p-4 sm:p-5 rounded-2xl bg-[#090d1c] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Icon name="folder_open" size={18} className="text-purple-400" />
                  <h4 className="font-bold text-sm text-white">Section 02: High-Throughput Microservices</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAddLiveLesson(2)}
                    className="text-[10px] font-mono text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 px-2.5 py-1 rounded-lg border border-purple-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Icon name="add" size={12} />
                    <span>Add Item</span>
                  </button>
                  <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                    {lessons2.length} Lessons
                  </span>
                </div>
              </div>

              {/* Lessons */}
              <div className="space-y-2 pt-1">
                {lessons2.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="builder-lesson-block p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 flex items-center justify-between transition-all group animate-in fade-in zoom-in-95 duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="cursor-grab text-slate-400 group-hover:text-white">
                        <Icon name="drag_indicator" size={16} />
                      </div>
                      <Icon name={lesson.icon} size={20} className={lesson.color} />
                      <span className="text-xs font-semibold text-slate-200">{lesson.name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-slate-400">{lesson.time}</span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        READY
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Add Trigger */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/20 text-center sm:text-left">
            <div>
              <p className="font-bold text-xs text-white">Ready to create your curriculum?</p>
              <p className="text-[11px] text-slate-400">
                Support for 4K Video CDN, YouTube/Vimeo embeds, PDFs, quizzes, and code assessments.
              </p>
            </div>
            <Link
              href="/admin/courses/builder"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Icon name="add" size={16} />
              <span>Open Course Studio</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

'use client';

import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import confetti from 'canvas-confetti';
import { Icon } from '../ui/Icon';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export const StudentExperienceShowcaseSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const certificateModalRef = useRef<HTMLDivElement>(null);
  const [progressVal, setProgressVal] = useState(72);
  const [isCompleted, setIsCompleted] = useState(false);
  const confettiTriggeredRef = useRef(false);

  const fireConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b']
      });
    } catch {}
  };

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 70%',
          end: 'bottom 60%',
          scrub: 1.2
        }
      });

      // Animate progress value
      tl.to(
        progressBarRef.current,
        {
          width: '100%',
          ease: 'power1.inOut',
          onUpdate: function () {
            const currentWidth = parseFloat(progressBarRef.current?.style.width || '72');
            const clamped = Math.min(100, Math.max(72, Math.round(currentWidth)));
            setProgressVal(clamped);
            if (clamped >= 100 && !confettiTriggeredRef.current) {
              confettiTriggeredRef.current = true;
              setIsCompleted(true);
              fireConfetti();
            }
          }
        }
      );

      // Reveal Certificate Diploma Modal with glowing bounce
      tl.fromTo(
        certificateModalRef.current,
        {
          opacity: 0,
          scale: 0.8,
          y: 40,
          rotateX: 15
        },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          rotateX: 0,
          ease: 'back.out(1.7)'
        },
        '-=0.2'
      );
    },
    { scope: containerRef }
  );

  return (
    <section
      id="student-experience"
      ref={containerRef}
      className="relative py-28 md:py-36 bg-[#050711] text-white overflow-hidden border-t border-white/[0.06]"
    >
      <div className="absolute top-1/2 left-1/3 w-[600px] h-[600px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3.5 py-1 rounded-full border border-purple-500/20">
            05 — STUDENT EXPERIENCE
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            Give your students an experience{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-300 to-amber-300">
              they'll want to finish.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            MORENA TEACH boasts a 94.2% course completion rate — 6x higher than traditional platforms.
            Distraction-free theater players, interactive coding checkpoints, and automated accredited diplomas.
          </p>
        </div>

        {/* Interactive Classroom Mockup with Live Progress Climb */}
        <div className="mt-14 p-4 sm:p-6 rounded-3xl bg-gradient-to-b from-white/10 via-white/5 to-transparent border border-white/20 shadow-2xl shadow-black/80 space-y-6">
          {/* Top Classroom Bar */}
          <div className="p-4 bg-[#0d1124] rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/30">
                <Icon name="play_lesson" size={22} />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold">
                  STUDENT THEATER MODE • LESSON 42 OF 42
                </span>
                <h3 className="text-base font-extrabold text-white">
                  Capstone: Production Multi-Region Cluster Deployment
                </h3>
              </div>
            </div>

            {/* Dynamic Animated Progress Bar Indicator */}
            <div className="w-full sm:w-64 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold font-mono">
                <span className="text-slate-400">Course Progress</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span>{progressVal}%</span>
                  {progressVal === 100 && (
                    <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.2 rounded font-bold animate-pulse">
                      PASSED ✓
                    </span>
                  )}
                </span>
              </div>
              <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  ref={progressBarRef}
                  style={{ width: '72%' }}
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-300 shadow-md"
                />
              </div>
            </div>
          </div>

          {/* Video Player Canvas + Interactive Quiz Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Left: Video Player Mockup (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl bg-black border border-white/10 overflow-hidden relative group aspect-video flex flex-col justify-between p-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-mono text-emerald-400 font-bold border border-white/10">
                  4K ULTRA HD • 60 FPS
                </span>
                <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-mono text-slate-300">
                  Speed: 1.5x
                </span>
              </div>

              {/* Play Button Icon */}
              <div className="self-center w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-indigo-600 transition-all shadow-xl cursor-pointer">
                <Icon name="play_arrow" size={32} />
              </div>

              {/* Bottom Video Progress Scrub */}
              <div className="space-y-1.5 bg-black/70 p-2 rounded-xl backdrop-blur-md">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                  <span>24:18 / 24:18 (Complete)</span>
                  <span className="text-emerald-400 font-bold">1080p Adaptive HLS</span>
                </div>
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full w-full" />
                </div>
              </div>
            </div>

            {/* Right: Certificate Diploma Celebration Card (5 cols) */}
            <div
              ref={certificateModalRef}
              className="lg:col-span-5 p-6 rounded-2xl bg-gradient-to-b from-[#121029] via-[#0d0f20] to-[#070913] border border-amber-500/40 shadow-[0_0_60px_rgba(245,158,11,0.25)] text-center space-y-4 relative overflow-hidden"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-300 mx-auto flex items-center justify-center border border-amber-500/30 shadow-lg animate-bounce">
                <Icon name="workspace_premium" size={32} fill />
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-extrabold block">
                  OFFICIAL ACCREDITED DIPLOMA
                </span>
                <h4 className="text-xl font-black text-white mt-1">Certificate of Technical Mastery</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Awarded to <span className="text-white font-bold">Rahul Sharma</span> for completing the Distributed Systems &amp; GenAI Masterclass.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400 text-left">
                <div>
                  <p className="text-slate-300 font-bold">ID: MT-2026-CERT-8841</p>
                  <p className="text-[9px]">Verified On-Chain &amp; Publicly Shareable</p>
                </div>
                <span className="text-emerald-400 font-bold">VERIFIED ✓</span>
              </div>

              <button
                onClick={fireConfetti}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Icon name="celebration" size={16} />
                <span>Celebrate &amp; Add to LinkedIn</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


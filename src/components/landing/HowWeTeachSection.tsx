'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Icon } from '../ui/Icon';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export const HowWeTeachSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: 'step-1',
      number: '01',
      title: 'Visual Concept Deconstruction',
      subtitle: 'From intimidation to clarity',
      description:
        'Great teachers don’t just read slides. They break dense engineering and design systems down into intuitive visual models, visual analogies, and atomic building blocks that click on day one.',
      icon: 'lightbulb',
      badge: 'Cognitive Framing',
      teacherQuote:
        '“We treat every complex problem like a set of nested Russian dolls: peel the outer abstraction, master the inner mechanism.”',
      preview: {
        type: 'diagram',
        title: 'Microservices Mesh Routing',
        highlight: 'Decoupled Event Sinks'
      }
    },
    {
      id: 'step-2',
      number: '02',
      title: 'Guided Live Demonstration',
      subtitle: 'See how senior architects think in real-time',
      description:
        'Watch world-class practitioners make decisions live: tackling unexpected edge-cases, refactoring suboptimal code, and structuring scalable patterns right before your eyes.',
      icon: 'draw',
      badge: 'Live Architecture',
      teacherQuote:
        '“You learn more from watching an expert debug a critical concurrency bug for 10 minutes than from reading 100 pages of syntax reference.”',
      preview: {
        type: 'code',
        title: 'Concurrent Distributed Lock',
        highlight: 'useOptimistic + Redlock'
      }
    },
    {
      id: 'step-3',
      number: '03',
      title: 'Interactive Socratic Dialogue',
      subtitle: 'No question goes unanswered',
      description:
        'Learning is a two-way human dialogue. Ask questions via voice or interactive thread, request deeper alternate explanations, and receive instant personalized mentorship.',
      icon: 'forum',
      badge: 'Active Q&A',
      teacherQuote:
        '“There are no silly questions in our cohort. We explore the &apos;why&apos; behind every pattern until everyone achieves complete mastery.”',
      preview: {
        type: 'dialogue',
        title: 'Student Query Resolution',
        highlight: 'Contextual Breakdown'
      }
    },
    {
      id: 'step-4',
      number: '04',
      title: 'Active Sandbox Application',
      subtitle: 'Hands-on practice with automated guardrails',
      description:
        'Reinforce every lecture immediately inside interactive sandboxes. Submit code, run end-to-end test suites, and receive automated linting alongside instructor reviews.',
      icon: 'terminal',
      badge: 'Instant Validation',
      teacherQuote:
        '“True understanding only happens when your hands touch the keyboard and your code passes the rigorous test suite.”',
      preview: {
        type: 'sandbox',
        title: 'End-to-End Test Suite',
        highlight: '100% Tests Passing'
      }
    }
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header entrance animation
      gsap.from('.how-we-teach-header', {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%'
        },
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power2.out'
      });

      // Cards staggered entrance
      gsap.from('.method-step-card', {
        scrollTrigger: {
          trigger: '.method-steps-grid',
          start: 'top 75%'
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out'
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const current = steps[activeStep];

  return (
    <section
      id="how-we-teach"
      ref={containerRef}
      className="py-20 md:py-32 px-4 sm:px-8 lg:px-10 bg-surface-container-lowest border-y border-outline-variant/60 relative overflow-hidden"
    >
      <div className="max-w-container-max mx-auto">
        {/* Section Header */}
        <div className="how-we-teach-header text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-extrabold uppercase tracking-wider mb-4">
            <Icon name="psychology_alt" size={18} />
            <span>The Teaching Methodology</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-on-surface tracking-tight mb-4 leading-tight">
            How Great Teachers Make Hard Concepts Intuitive
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
            Our pedagogical framework bridges the gap between passive consumption and active mastery through four systematic phases of engagement.
          </p>
        </div>

        {/* Interactive Methodology Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Interactive Step Selector */}
          <div className="lg:col-span-6 flex flex-col gap-4 method-steps-grid">
            {steps.map((step, idx) => {
              const isActive = activeStep === idx;
              return (
                <div
                  key={step.id}
                  onClick={() => setActiveStep(idx)}
                  className={`method-step-card p-5 sm:p-6 rounded-2xl border transition-all cursor-pointer select-none group relative overflow-hidden ${
                    isActive
                      ? 'bg-surface border-primary shadow-lg ring-1 ring-primary/30'
                      : 'bg-surface-container-low/40 border-outline-variant hover:bg-surface hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Step Number & Icon */}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-base shrink-0 transition-colors ${
                        isActive
                          ? 'bg-primary text-on-primary shadow-md'
                          : 'bg-surface-container text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary'
                      }`}
                    >
                      <Icon name={step.icon} size={24} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-bold text-primary uppercase tracking-widest">
                          Phase {step.number} • {step.badge}
                        </span>
                        {isActive && (
                          <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                        {step.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-on-surface-variant mt-1 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Dynamic Live Teaching Canvas Showcase */}
          <div className="lg:col-span-6 bg-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl flex flex-col justify-between relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

            {/* Window Top Controls */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 relative z-10">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-slate-400 ml-2">
                  aadhyara://classroom/{current.preview.type}
                </span>
              </div>
              <span className="text-[11px] font-bold bg-primary/20 text-primary-fixed border border-primary/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                {current.preview.highlight}
              </span>
            </div>

            {/* Dynamic Stage Canvas Body */}
            <div className="my-8 relative z-10 flex-1 flex flex-col justify-center">
              {current.preview.type === 'diagram' && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-4 bg-slate-900/90 rounded-xl border border-primary/40 shadow-lg">
                      <Icon name="dns" size={28} className="text-primary mx-auto mb-1" />
                      <p className="text-xs font-bold text-white">Client Edge</p>
                      <p className="text-[10px] text-slate-400 font-mono">CDN Gateway</p>
                    </div>
                    <div className="p-4 bg-primary/20 rounded-xl border border-primary text-white shadow-xl flex flex-col items-center justify-center scale-105">
                      <Icon name="hub" size={28} className="text-emerald-400 mx-auto mb-1 animate-spin duration-10000" />
                      <p className="text-xs font-bold text-emerald-300">Visual Core</p>
                      <p className="text-[10px] text-slate-300 font-mono">Event Mesh</p>
                    </div>
                    <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800">
                      <Icon name="database" size={28} className="text-slate-400 mx-auto mb-1" />
                      <p className="text-xs font-bold text-white">Sharded DB</p>
                      <p className="text-[10px] text-slate-400 font-mono">PostgreSQL</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between">
                    <span>⚡ Latency Benchmark: 14ms (99th Percentile)</span>
                    <span className="text-emerald-400 font-bold">Optimal</span>
                  </div>
                </div>
              )}

              {current.preview.type === 'code' && (
                <div className="space-y-3 font-mono text-xs animate-in fade-in duration-300 bg-slate-900 p-5 rounded-2xl border border-slate-800">
                  <div className="text-slate-500">// Step 2: Instructor live concurrent lock pattern</div>
                  <div className="text-purple-400">
                    export async function <span className="text-yellow-300">acquireDistributedLock</span>(key: string) {'{'}
                  </div>
                  <div className="pl-4 text-emerald-400">
                    const lock = await redis.set(key, uuid(), &apos;NX&apos;, &apos;PX&apos;, 5000);
                  </div>
                  <div className="pl-4 text-blue-300">
                    if (!lock) throw new <span className="text-amber-400">ConcurrencyConflictError</span>(key);
                  </div>
                  <div className="pl-4 text-slate-300">return new MutexGuard(lock);</div>
                  <div className="text-purple-400">{'}'}</div>
                </div>
              )}

              {current.preview.type === 'dialogue' && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 flex items-start gap-3">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuA3BAq1bllNzTessPrGfirr7x2fOSIg9MHCenFEmWD6YmHa9gGgjbG0oKNnZ_g3hrui47MjKWPBaFN1Wt22X4Xlzsx9u_pqMjVXxA059z84ymf0_i5MNt6MbpVt12QRQCYIRloP1fHn9heNIuUoe8e9_dAVsCYfrpTBTtWCxTEnj_opfKx8XlyPZYidfickFRQpqsDpFT6oGc3U82YzH_9m4ACMOXUxiaZDko8XofuRtOTKuXntGVpv4w"
                      alt="Student"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-200">Alex Chen (Student)</p>
                      <p className="text-xs text-slate-300 mt-0.5">
                        &ldquo;Why use Socratic questions instead of just giving the architectural answer upfront?&rdquo;
                      </p>
                    </div>
                  </div>
                  <div className="p-3.5 bg-primary/20 rounded-xl border border-primary/40 flex items-start gap-3 ml-4">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDoFp1eGreTcQey2rw2vDSmyE9aflnOmqG-crHKiWwH45vzG_urMXpKbamcO2FcEjqZAi5izN1rjayugOQY27KHt8M-sZRukHX7p4choT3q8pRGjUn1Xtp2XrUKPDGc0W5FbLtMZQmkRNcqVIyfcFXXKRJGct2tRUuyrKWOJRuPBYHK-O9NV7Ytd5oQS3fMgzYUq30Or3FHs3uFrTzqn9jUzKTAS6yNaPLA3sRGV-udytprlKo6Ac8AUQ"
                      alt="Instructor"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-xs font-bold text-primary-fixed">Dr. Elena Rodriguez</p>
                      <p className="text-xs text-slate-200 mt-0.5">
                        &ldquo;Because discovering the solution yourself builds permanent neural pathways. When you solve it, you own it forever.&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {current.preview.type === 'sandbox' && (
                <div className="space-y-3 font-mono text-xs animate-in fade-in duration-300 bg-slate-900 p-5 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Icon name="check_circle" fill size={18} />
                    <span>Test Suite: 18 passed, 0 failed</span>
                  </div>
                  <div className="text-slate-400 pl-6 space-y-1">
                    <p>✓ handles network partition gracefully (3ms)</p>
                    <p>✓ prevents race condition on double mutation (6ms)</p>
                    <p>✓ respects semantic dark mode contrast threshold (2ms)</p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-primary-fixed flex items-center justify-between">
                    <span>Grade: 100/100 (Exceptional)</span>
                    <span className="text-emerald-400 font-bold">✓ Ready for Production</span>
                  </div>
                </div>
              )}
            </div>

            {/* Teacher Wisdom Quote Footer */}
            <div className="pt-4 border-t border-slate-800/80 relative z-10">
              <p className="text-xs text-slate-300 italic leading-relaxed">
                {current.teacherQuote}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

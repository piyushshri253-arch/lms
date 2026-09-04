'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Icon } from '../ui/Icon';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export const LearningJourneySection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  const journeySteps = [
    {
      step: '01',
      title: 'Learn',
      subtitle: 'Foundational Mental Models',
      description:
        'Deconstruct intimidating concepts through immersive video explanations, visual interactive diagrams, and live architectural reasoning from seasoned educators.',
      icon: 'school',
      metric: '40+ hrs on-demand video',
      badge: 'Step 1'
    },
    {
      step: '02',
      title: 'Practice',
      subtitle: 'Hands-On Guided Sandboxes',
      description:
        'Get immediate feedback. Write code, compose design tokens, and solve real-world algorithmic problems with instant unit test runners right in your browser.',
      icon: 'code',
      metric: '120+ interactive exercises',
      badge: 'Step 2'
    },
    {
      step: '03',
      title: 'Apply',
      subtitle: 'Production-Grade Capstones',
      description:
        'Build complete, end-to-end applications and enterprise design systems that you can confidently ship to production and present in your portfolio.',
      icon: 'rocket_launch',
      metric: '4 portfolio capstones',
      badge: 'Step 3'
    },
    {
      step: '04',
      title: 'Improve',
      subtitle: '1-on-1 Mentor & Peer Critique',
      description:
        'Submit your work for in-depth line-by-line code and visual reviews. Learn the subtle trade-offs and edge cases that separate juniors from staff engineers.',
      icon: 'rate_review',
      metric: 'Personalized feedback',
      badge: 'Step 4'
    },
    {
      step: '05',
      title: 'Achieve',
      subtitle: 'Accreditation & Career Growth',
      description:
        'Earn tamper-proof verified certificates, join an exclusive alumni network of builders, and step into senior roles at top tech companies worldwide.',
      icon: 'workspace_premium',
      metric: 'Verified certification',
      badge: 'Step 5'
    }
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate the timeline vertical line
      gsap.fromTo(
        lineRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 70%',
            end: 'bottom 85%',
            scrub: true
          }
        }
      );

      // Stagger animate journey items
      const cards = gsap.utils.toArray<HTMLElement>('.journey-card');
      cards.forEach((card, index) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: 'top 85%'
          },
          x: index % 2 === 0 ? -40 : 40,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out'
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="py-20 md:py-32 px-4 sm:px-8 lg:px-10 bg-surface-container-lowest border-b border-outline-variant/60 relative overflow-hidden"
    >
      <div className="max-w-container-max mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-4">
            <Icon name="route" size={18} />
            <span>The 5-Stage Mastery Path</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-on-surface tracking-tight mb-4">
            Your Structured Learning Journey
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
            We guide you from curious learner to confident master through a proven, step-by-step evolution.
          </p>
        </div>

        {/* Timeline Path */}
        <div className="relative max-w-4xl mx-auto">
          {/* Glowing Center Line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-1 bg-outline-variant/50 -translate-x-1/2">
            <div
              ref={lineRef}
              className="w-full h-full bg-gradient-to-b from-primary via-indigo-500 to-emerald-500 origin-top"
            />
          </div>

          <div className="space-y-12 md:space-y-16">
            {journeySteps.map((step, idx) => {
              const isEven = idx % 2 === 0;

              return (
                <div
                  key={step.step}
                  className={`journey-card relative flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-12 pl-12 md:pl-0 ${
                    isEven ? 'md:flex-row-reverse' : ''
                  }`}
                >
                  {/* Timeline Center Node */}
                  <div className="absolute left-4 md:left-1/2 -translate-x-1/2 top-0 md:top-auto w-9 h-9 rounded-full bg-surface-container-lowest border-4 border-primary text-primary flex items-center justify-center font-bold text-xs shadow-lg z-10">
                    <Icon name={step.icon} size={16} />
                  </div>

                  {/* Content Card (Span 1/2) */}
                  <div className={`w-full md:w-1/2 ${isEven ? 'md:text-right' : 'md:text-left'}`}>
                    <div className="bg-surface border border-outline-variant rounded-2xl p-6 sm:p-7 shadow-sm hover:border-primary/40 hover:shadow-md transition-all group">
                      <div
                        className={`flex items-center gap-2 mb-2 ${
                          isEven ? 'md:justify-end' : 'md:justify-start'
                        }`}
                      >
                        <span className="text-[11px] font-bold uppercase tracking-widest text-primary font-mono">
                          {step.badge}
                        </span>
                        <span className="text-outline text-xs">•</span>
                        <span className="text-xs font-semibold text-emerald-600">
                          {step.metric}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-on-surface group-hover:text-primary transition-colors">
                        {step.title}
                      </h3>
                      <p className="text-xs font-semibold text-secondary mb-3">
                        {step.subtitle}
                      </p>

                      <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Empty Spacer Column for Desktop */}
                  <div className="hidden md:block w-1/2" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Icon } from '../ui/Icon';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const TESTIMONIALS = [
  {
    name: 'Vikram Aditya',
    role: 'Creator & Founder, CloudScale Academy',
    type: 'CREATOR',
    quote:
      'We migrated 14,000 engineers from a fragmented 6-tool stack to AADHYARA in a weekend. Direct UPI and Stripe checkout generated ₹48 Lakhs in the first month with 0% platform take.',
    metric: '₹48L+ Revenue',
    avatar: 'VA'
  },
  {
    name: 'Dr. Elena Rostova',
    role: 'Distributed Systems Professor',
    type: 'EDUCATOR',
    quote:
      'Our students love the distraction-free theater player and interactive coding assessments. Course completion rates increased from 38% on legacy LMS to 92.4% on AADHYARA.',
    metric: '92.4% Completion',
    avatar: 'ER'
  },
  {
    name: 'Marcus Vance',
    role: 'Head Coach, Fullstack Accelerator',
    type: 'COACH',
    quote:
      'The drag-and-drop course studio saved our instructional team 20 hours every week. Video transcoding is instantaneous and the automated LinkedIn certificate generation is magical.',
    metric: '20 hrs/wk Saved',
    avatar: 'MV'
  },
  {
    name: 'Aanya Sen',
    role: 'VP of Learning, FinTech Institute',
    type: 'INSTITUTE',
    quote:
      'Role-based multi-tenant security, targeted batch announcements, and bank-grade session controls gave our enterprise compliance team complete peace of mind.',
    metric: '100% Enterprise SLA',
    avatar: 'AS'
  }
];

export const SocialProofTestimonialsSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

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

      tl.from('.testimonial-card', {
        opacity: 0,
        y: 40,
        scale: 0.92,
        stagger: 0.1,
        ease: 'power2.out'
      });
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      className="relative py-28 md:py-36 bg-[#070913] text-white overflow-hidden border-t border-white/[0.06]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3.5 py-1 rounded-full border border-indigo-500/20">
            09 — SOCIAL PROOF &amp; TRUST
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            Built for people who{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
              teach, create and grow.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            Over 50,000+ courses delivered. Hear from industry-leading instructors and engineering bootcamps running on
            AADHYARA.
          </p>
        </div>

        {/* 4 Testimonial Cards */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          {TESTIMONIALS.map((item, idx) => (
            <div
              key={idx}
              className="testimonial-card p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20">
                    {item.type}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    {item.metric}
                  </span>
                </div>

                <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium italic">
                  "{item.quote}"
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center font-bold text-sm text-white shadow-md">
                  {item.avatar}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">{item.name}</h4>
                  <p className="text-xs text-slate-400">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};


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

interface ShowcaseItem {
  id: string;
  tag: string;
  tagColor: string;
  title: string;
  instructor: string;
  role: string;
  rating: string;
  enrolled: string;
  image: string;
  price: string;
  category: string;
  gradient: string;
}

const SHOWCASE_CARDS: ShowcaseItem[] = [
  {
    id: 'coffee-craft',
    tag: 'ARTISAN CRAFT',
    tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    title: 'Artisan Coffee Roasting & Sensory Profile Design',
    instructor: 'Elena Rostova',
    role: 'Master Roaster & Q-Grader',
    rating: '4.99 ★ (840 reviews)',
    enrolled: '3,420 Enrolled',
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
    price: '₹3,499',
    category: 'Lifestyle & Culinary',
    gradient: 'from-amber-950/80 via-black/60 to-transparent'
  },
  {
    id: 'luxury-direction',
    tag: 'CINEMATOGRAPHY',
    tagColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    title: 'Editorial Video Production & Luxury Brand Aesthetic',
    instructor: 'Marcus Vance',
    role: 'Vogue & GQ Lead Cinematographer',
    rating: '4.97 ★ (1,210 reviews)',
    enrolled: '5,890 Enrolled',
    image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80',
    price: '₹4,999',
    category: 'Film & Photography',
    gradient: 'from-rose-950/80 via-black/60 to-transparent'
  },
  {
    id: 'spatial-3d',
    tag: 'SPATIAL UI/UX',
    tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    title: 'Spatial Audio & 3D Interactive Web Architecture',
    instructor: 'Aria Takahashi',
    role: 'Ex-Apple Vision Creative Director',
    rating: '4.98 ★ (960 reviews)',
    enrolled: '4,150 Enrolled',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    price: '₹6,499',
    category: 'Spatial Design',
    gradient: 'from-cyan-950/80 via-black/60 to-transparent'
  },
  {
    id: 'deeptech-ai',
    tag: 'GENAI & LLM OPS',
    tagColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    title: 'Autonomous Multi-Agent AI Systems in Production',
    instructor: 'Dr. Vikram Rao',
    role: 'Principal AI Researcher',
    rating: '4.96 ★ (2,400 reviews)',
    enrolled: '8,920 Enrolled',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80',
    price: '₹7,999',
    category: 'Artificial Intelligence',
    gradient: 'from-indigo-950/80 via-black/60 to-transparent'
  },
  {
    id: 'haute-typography',
    tag: 'EDITORIAL BRANDING',
    tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    title: 'Haute Typography & Modern Identity Systems',
    instructor: 'Chloe Dubois',
    role: 'Identity Director, Paris',
    rating: '4.95 ★ (640 reviews)',
    enrolled: '2,810 Enrolled',
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
    price: '₹3,899',
    category: 'Visual Design',
    gradient: 'from-purple-950/80 via-black/60 to-transparent'
  }
];

export const EditorialShowcaseReel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Reveal on Scroll
      gsap.from('.editorial-header', {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%'
        },
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out'
      });

      gsap.from('.editorial-card', {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 75%'
        },
        y: 60,
        opacity: 0,
        stagger: 0.12,
        duration: 0.8,
        ease: 'power3.out'
      });
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      className="py-24 lg:py-32 bg-[#04060f] text-white relative overflow-hidden border-t border-b border-white/10"
    >
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Editorial Typography */}
        <div className="editorial-header flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 lg:mb-16">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.12] text-slate-300 text-xs font-mono font-bold uppercase tracking-wider backdrop-blur-md">
              <Icon name="auto_awesome" size={15} className="text-amber-400" />
              <span>Aesthetic &bull; Craft &bull; Masterclasses</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1] font-display">
              Curated for creators who demand{' '}
              <span className="bg-gradient-to-r from-amber-300 via-rose-300 to-indigo-300 bg-clip-text text-transparent">
                visual perfection.
              </span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Every course created on AADHYARA features dynamic responsive video playback, high-definition typography, and frictionless multi-currency checkouts.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/courses"
              className="px-6 py-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold text-xs border border-white/20 backdrop-blur-md transition-all flex items-center gap-2 group"
            >
              <span>Explore All 120+ Curricula</span>
              <Icon name="arrow_forward" size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Interactive Horizontal Cards Reel */}
        <div
          ref={marqueeRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {SHOWCASE_CARDS.map((card) => (
            <div
              key={card.id}
              className="editorial-card group relative rounded-3xl overflow-hidden bg-[#0c1022] border border-white/10 shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:border-white/25 hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between"
            >
              {/* Media Image Container with Zoom */}
              <div className="relative h-64 sm:h-72 overflow-hidden bg-slate-900">
                <img
                  src={card.image}
                  alt={card.title}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${card.gradient}`} />

                {/* Floating Category Pill */}
                <div className="absolute top-4 left-4 z-10">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase border backdrop-blur-md ${card.tagColor}`}>
                    {card.tag}
                  </span>
                </div>

                {/* Top Right Enrolled Pill */}
                <div className="absolute top-4 right-4 z-10">
                  <span className="px-2.5 py-1 rounded-full bg-black/60 text-slate-300 text-[10px] font-mono font-bold border border-white/10 backdrop-blur-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{card.enrolled}</span>
                  </span>
                </div>

                {/* Bottom Instructor Info inside Image */}
                <div className="absolute bottom-4 left-4 right-4 z-10">
                  <p className="text-[11px] font-mono text-slate-300 font-bold uppercase">{card.category}</p>
                  <h3 className="text-lg sm:text-xl font-black text-white leading-tight mt-0.5 group-hover:text-amber-200 transition-colors">
                    {card.title}
                  </h3>
                </div>
              </div>

              {/* Card Meta Footer */}
              <div className="p-5 bg-[#090d1f] flex items-center justify-between border-t border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-xs shadow-md">
                    {card.instructor.charAt(0)}
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-white">{card.instructor}</h5>
                    <p className="text-[10px] text-slate-400">{card.role}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400 block">{card.rating}</span>
                  <span className="text-sm font-mono font-black text-emerald-400">{card.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Social Trust Proof */}
        <div className="mt-14 pt-8 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-xs text-slate-400 font-mono">
          <div>
            <p className="text-2xl font-black text-white font-display">99.98%</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Video CDN Uptime</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white font-display">₹48.2 Cr</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Processed Creator GMV</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white font-display">100%</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Automated Certificates</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white font-display">0%</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Platform Cut on Sales</p>
          </div>
        </div>
      </div>
    </section>
  );
};

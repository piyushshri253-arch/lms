'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface SlideData {
  id: number;
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  bgImage: string;
  bgColor: string;
  bgPosition?: string;
  hasGradientOverlay?: boolean;
}

const SLIDES: SlideData[] = [
  {
    id: 1,
    title: 'Build in-demand skills',
    description:
      'Get access to 26,000 courses from real-world experts with one subscription on Morena Teach.',
    ctaText: 'Learn more',
    ctaLink: '/courses',
    bgImage: '/images/udemy-red-hero-clean.png',
    bgColor: '#ea2b2b',
    bgPosition: 'center right',
    hasGradientOverlay: false
  },
  {
    id: 2,
    title: 'Skills for your teaching journey',
    description:
      'Master modern classroom pedagogy, early childhood brain development, and inclusive teaching models with accredited educator courses.',
    ctaText: 'Explore Courses',
    ctaLink: '/courses',
    bgImage:
      'https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1600&auto=format&fit=crop',
    bgColor: '#1e293b',
    bgPosition: 'center',
    hasGradientOverlay: true
  },
  {
    id: 3,
    title: 'Inspire young minds with confidence',
    description:
      'Hands-on multisensory apparatus, phonics fluency, and sensory regulation strategies to elevate every child’s potential.',
    ctaText: 'Explore Montessori',
    ctaLink: '/courses?category=Montessori%20%26%20Child%20Psychology',
    bgImage:
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1600&auto=format&fit=crop',
    bgColor: '#0f766e',
    bgPosition: 'center',
    hasGradientOverlay: true
  },
  {
    id: 4,
    title: 'Transform your classroom leadership',
    description:
      'Empower diverse learners with neurodiversity support, active learning protocols, and accredited teaching standards.',
    ctaText: 'View Masterclasses',
    ctaLink: '/courses?category=Pedagogy%20%26%20Teaching%20Methods',
    bgImage:
      'https://images.unsplash.com/photo-1580582932707-520aed937b7b?q=80&w=1600&auto=format&fit=crop',
    bgColor: '#4c1d95',
    bgPosition: 'center',
    hasGradientOverlay: true
  }
];

export const UdemyHeroBillboard: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Smooth automatic slide transition every 5 seconds
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused]);

  return (
    <section className="w-full bg-white">
      {/* Billboard Hero Container */}
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 py-4 md:py-6">
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="relative w-full h-[360px] sm:h-[400px] bg-[#ea2b2b] overflow-hidden rounded-none sm:rounded-lg shadow-sm group"
        >
          {/* Stacked Animated Slides with Smooth Crossfade */}
          {SLIDES.map((slide, idx) => {
            const isActive = idx === currentSlide;
            return (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  isActive
                    ? 'opacity-100 z-10 pointer-events-auto'
                    : 'opacity-0 z-0 pointer-events-none'
                }`}
                style={{
                  backgroundColor: slide.bgColor,
                  backgroundImage: `url(${slide.bgImage})`,
                  backgroundPosition: slide.bgPosition || 'center right',
                  backgroundSize: 'cover',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                {/* Subtle contrast gradient on photo-heavy slides */}
                {slide.hasGradientOverlay && (
                  <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-transparent hidden md:block" />
                )}

                {/* Floating Udemy-Style Pure White Information Card (Exact Requested Design) */}
                <div className="h-full flex items-center px-4 sm:px-8 md:px-12 lg:px-14">
                  <div className="max-w-[440px] bg-white p-6 sm:p-8 md:p-9 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.12)] rounded-md border border-gray-100/60 transition-transform duration-500">
                    {/* Headline */}
                    <h1 className="text-2xl sm:text-[30px] lg:text-[32px] font-extrabold text-[#1c1d1f] leading-[1.2] tracking-tight mb-3">
                      {slide.title}
                    </h1>

                    {/* Subtitle / Description */}
                    <p className="text-sm sm:text-base text-[#2d2f31] leading-relaxed mb-6 font-normal">
                      {slide.description}
                    </p>

                    {/* Signature Udemy Purple Action Button */}
                    <Link
                      href={slide.ctaLink}
                      className="inline-block px-6 py-3 text-sm font-bold text-white bg-[#5624d0] hover:bg-[#401b9c] rounded-md transition-all shadow-sm active:scale-[0.98]"
                    >
                      {slide.ctaText}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Minimal Subtle Bottom Progress Dots (Auto Indicator) */}
          <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/20 backdrop-blur-xs px-3 py-1.5 rounded-full">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentSlide
                    ? 'w-6 bg-white shadow-xs'
                    : 'w-2 bg-white/50 hover:bg-white/90'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Udemy Partner / Academy Trust Strip */}
        <div className="mt-8 pt-6 border-b border-[#d1d7dc] pb-8">
          <p className="text-center text-xs sm:text-sm font-normal text-[#6a6f73] mb-5">
            Trusted by over <strong className="text-[#2d2f31] font-bold">10,000+</strong> educators, preschool networks & premier teacher academies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-75 grayscale hover:grayscale-0 transition-all duration-300">
            <div className="flex items-center gap-2 font-bold text-[#2d2f31] text-sm">
              <Icon name="school" size={20} className="text-[#5022c3]" />
              <span>Early Years Federation</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-[#2d2f31] text-sm">
              <Icon name="verified" size={20} className="text-teal-700" />
              <span>National Montessori Council</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-[#2d2f31] text-sm">
              <Icon name="psychology" size={20} className="text-purple-700" />
              <span>Child Development Institute</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-[#2d2f31] text-sm">
              <Icon name="auto_stories" size={20} className="text-amber-700" />
              <span>Phonics Excellence Hub</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-[#2d2f31] text-sm">
              <Icon name="workspace_premium" size={20} className="text-blue-700" />
              <span>STEM Primary Alliance</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


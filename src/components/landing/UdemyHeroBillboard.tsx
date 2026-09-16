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
}

const SLIDES: SlideData[] = [
  {
    id: 1,
    title: 'Skills for your teaching journey',
    description:
      'Master modern classroom pedagogy, early childhood brain development, and inclusive teaching models with accredited educator courses.',
    ctaText: 'Explore Courses',
    ctaLink: '#courses-selection',
    bgImage:
      'https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 2,
    title: 'Inspire young minds with confidence',
    description:
      'Hands-on multisensory apparatus, phonics fluency, and sensory regulation strategies to elevate every child’s potential.',
    ctaText: 'Explore Montessori',
    ctaLink: '/courses?category=Montessori%20%26%20Child%20Psychology',
    bgImage:
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 3,
    title: 'Transform your classroom leadership',
    description:
      'Empower diverse learners with neurodiversity support, active learning protocols, and international teaching standards.',
    ctaText: 'View Pedagogy Masterclasses',
    ctaLink: '/courses?category=Pedagogy%20%26%20Teaching%20Methods',
    bgImage:
      'https://images.unsplash.com/photo-1580582932707-520aed937b7b?q=80&w=1600&auto=format&fit=crop'
  }
];

export const UdemyHeroBillboard: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[currentSlide];

  return (
    <section className="w-full bg-white">
      {/* Billboard Hero Container */}
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 py-4 md:py-6">
        <div className="relative w-full h-[360px] sm:h-[400px] bg-[#f7f9fa] overflow-hidden flex items-center">
          {/* High-Resolution Background Photography without dark muddy filter */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700"
            style={{ backgroundImage: `url(${slide.bgImage})` }}
          >
            {/* Soft, light fade on the left to ensure maximum readability of the white card */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent hidden md:block" />
          </div>

          {/* Floating Udemy-Style Pure White Information Card */}
          <div className="relative z-10 mx-4 sm:ml-10 md:ml-14 max-w-[440px] bg-white p-6 sm:p-8 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)] border border-transparent">
            {/* Headline */}
            <h1 className="text-2xl sm:text-[32px] font-bold text-[#2d2f31] leading-[1.2] tracking-tight mb-2.5">
              {slide.title}
            </h1>

            {/* Subtitle / Description */}
            <p className="text-sm sm:text-base text-[#2d2f31] leading-relaxed mb-5 font-normal">
              {slide.description}
            </p>

            {/* Action Button */}
            <Link
              href={slide.ctaLink}
              className="inline-block px-5 py-3 text-sm font-bold text-white bg-[#2d2f31] hover:bg-[#1c1d1f] rounded-none sm:rounded-[4px] transition-colors shadow-sm"
            >
              {slide.ctaText}
            </Link>
          </div>

          {/* Slider Prev / Next Arrows (Udemy Circular Outline Design) */}
          <button
            onClick={() => setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)}
            aria-label="Previous banner slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/95 hover:bg-white text-[#2d2f31] shadow-md border border-[#d1d7dc] flex items-center justify-center transition-all hidden md:flex"
          >
            <Icon name="chevron_left" size={24} />
          </button>
          <button
            onClick={() => setCurrentSlide((prev) => (prev + 1) % SLIDES.length)}
            aria-label="Next banner slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/95 hover:bg-white text-[#2d2f31] shadow-md border border-[#d1d7dc] flex items-center justify-center transition-all hidden md:flex"
          >
            <Icon name="chevron_right" size={24} />
          </button>
        </div>

        {/* 3. Udemy Partner / Academy Trust Strip */}
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

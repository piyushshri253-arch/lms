'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface SlideData {
  id: number;
  title: React.ReactNode;
  description: React.ReactNode;
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
    title: <span className="whitespace-normal sm:whitespace-nowrap">Build in-demand skills</span>,
    description: (
      <>
        Get unlimited access to top accredited courses taught by{' '}
        <br className="hidden sm:inline" />
        industry leaders and master educators on Morena{' '}
        <br className="hidden sm:inline" />
        Teach.
      </>
    ),
    ctaText: 'Explore Courses',
    ctaLink: '/courses',
    bgImage: '/images/hero-red-student.jpg',
    bgColor: '#dc2626',
    bgPosition: 'right top',
    hasGradientOverlay: false
  },
  {
    id: 2,
    title: (
      <>
        Learn from industry <br />experts
      </>
    ),
    description: (
      <>
        Empower your teaching career with modern{' '}
        <br className="hidden sm:inline" />
        pedagogy, hands-on child psychology, and{' '}
        <br className="hidden sm:inline" />
        certifications.
      </>
    ),
    ctaText: 'Explore Masterclasses',
    ctaLink: '/courses',
    bgImage: '/images/hero-violet-teacher.jpg',
    bgColor: '#4c1d95',
    bgPosition: 'right top',
    hasGradientOverlay: false
  },
  {
    id: 3,
    title: <span className="whitespace-normal sm:whitespace-nowrap">Accelerate your career</span>,
    description: (
      <>
        Build practical teaching skills, grow your confidence,{' '}
        <br className="hidden sm:inline" />
        and explore new opportunities in your teaching{' '}
        <br className="hidden sm:inline" />
        career.
      </>
    ),
    ctaText: 'Get Started Today',
    ctaLink: '/courses',
    bgImage: '/images/hero-teal-tech.jpg',
    bgColor: '#0f766e',
    bgPosition: 'right top',
    hasGradientOverlay: false
  }
];

interface CertificationItem {
  title: string;
  subtitle: string;
  tag: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  iconBorder: string;
}

const CERTIFICATIONS: CertificationItem[] = [
  {
    title: 'ISO 21001 : 2018',
    subtitle: 'Educational Organizations Management System',
    tag: 'Certified',
    icon: 'verified',
    iconBg: 'bg-blue-50',
    iconColor: 'text-[#0284c7]',
    iconBorder: 'border-blue-200'
  },
  {
    title: 'ISO 27001 : 2022',
    subtitle: 'Information Security Management System',
    tag: 'Certified',
    icon: 'security',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-[#4f46e5]',
    iconBorder: 'border-indigo-200'
  },
  {
    title: 'MSME Registered',
    subtitle: 'Registered Educational Partner',
    tag: 'Govt. of India',
    icon: 'workspace_premium',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-[#059669]',
    iconBorder: 'border-emerald-200'
  },
  {
    title: 'NSDC Partner',
    subtitle: 'Training Partner with ID: TP361612',
    tag: 'Skill India',
    icon: 'school',
    iconBg: 'bg-purple-50',
    iconColor: 'text-[#7c3aed]',
    iconBorder: 'border-purple-200'
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
          className="relative w-full min-h-[400px] sm:h-[440px] md:h-[480px] bg-[#4c1d95] overflow-hidden rounded-xl shadow-sm group"
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
                  backgroundPosition: slide.bgPosition || 'right top',
                  backgroundSize: 'cover',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                {/* Subtle contrast gradient on photo-heavy slides (pointer-events-none ensures button clicks are never blocked) */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/45 sm:from-black/30 via-transparent to-transparent pointer-events-none" />

                {/* Floating Udemy-Style Pure White Information Card with Identical Dimensions Across All Slides */}
                <div className="h-full flex items-center px-4 sm:px-8 md:px-12 lg:px-14 py-6 sm:py-0 relative z-20 pointer-events-auto">
                  <div className="w-full max-w-[460px] min-h-[290px] sm:min-h-[310px] md:min-h-[320px] flex flex-col justify-between bg-white p-6 sm:p-8 md:p-9 shadow-[0_4px_24px_rgba(0,0,0,0.12)] rounded-2xl border border-gray-100 transition-transform duration-500 relative z-20 pointer-events-auto">
                    <div className="flex-1 flex flex-col text-left">
                      {/* Headline with Uniform 2-Line Alignment & Height matching screenshot */}
                      <h1 className="text-2xl sm:text-[28px] lg:text-[32px] font-bold text-[#1c1d1f] leading-[1.2] tracking-tight mb-3 sm:mb-3.5 min-h-[56px] sm:min-h-[68px] flex items-start">
                        {slide.title}
                      </h1>

                      {/* Subtitle / Description with Balanced 3-Line Cadence */}
                      <p className="text-xs sm:text-[15px] text-[#2d2f31] leading-relaxed mb-6 font-normal min-h-[64px] sm:min-h-[72px]">
                        {slide.description}
                      </p>
                    </div>

                    {/* Signature Udemy Purple Action Button - Always 100% Clickable & Navigates to /courses */}
                    <div className="mt-auto pt-1 relative z-30 pointer-events-auto text-left">
                      <Link
                        href={slide.ctaLink}
                        className="relative z-30 inline-block px-6 py-3 text-xs sm:text-sm font-bold text-white bg-[#5624d0] hover:bg-[#401b9c] rounded-lg transition-all shadow-sm active:scale-[0.98] cursor-pointer pointer-events-auto"
                      >
                        {slide.ctaText}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Minimal Subtle Bottom Progress Dots */}
          <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/35 backdrop-blur-xs px-3.5 py-1.5 rounded-full">
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

        {/* Marquee Certification & Accreditation Strip */}
        <div className="mt-8 pt-6 border-b border-[#d1d7dc] pb-8 overflow-hidden">
          <p className="text-center text-xs sm:text-sm font-normal text-[#6a6f73] mb-5">
            Trusted by over <strong className="text-[#2d2f31] font-bold">10,000+</strong> educators, preschool networks & premier teacher academies
          </p>

          {/* Marquee Carousel with Gradient Edge Masks */}
          <div className="relative w-full overflow-hidden">
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-r from-white to-transparent z-10" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-l from-white to-transparent z-10" />

            <div className="animate-marquee-scroll flex items-center gap-4 sm:gap-6 py-1">
              {/* Item List (Rendered Twice for Seamless Infinite Marquee Loop) */}
              {[...CERTIFICATIONS, ...CERTIFICATIONS].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-5 py-2.5 bg-white hover:bg-purple-50/70 border border-[#d1d7dc] rounded-full transition-all duration-200 shrink-0 shadow-2xs group cursor-default"
                >
                  <div className={`w-8 h-8 rounded-full ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0 border ${item.iconBorder}`}>
                    <Icon name={item.icon} size={17} />
                  </div>
                  <div className="flex flex-col text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#2d2f31] text-xs sm:text-sm tracking-tight group-hover:text-[#5624d0] transition-colors whitespace-nowrap">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-[#5022c3] uppercase tracking-wider whitespace-nowrap border border-purple-100">
                        {item.tag}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#6a6f73] font-medium leading-tight whitespace-nowrap">
                      {item.subtitle}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


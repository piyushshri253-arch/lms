'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { Icon } from '../ui/Icon';

export const HeroSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtextRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const visualCardRef = useRef<HTMLDivElement>(null);
  const floatingBadge1 = useRef<HTMLDivElement>(null);
  const floatingBadge2 = useRef<HTMLDivElement>(null);
  const floatingBadge3 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        '.hero-pill-badge',
        { y: -20, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.7 }
      )
        .fromTo(
          headlineRef.current,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9 },
          '-=0.4'
        )
        .fromTo(
          subtextRef.current,
          { y: 25, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8 },
          '-=0.5'
        )
        .fromTo(
          ctaRef.current,
          { y: 20, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.7 },
          '-=0.5'
        )
        .fromTo(
          visualCardRef.current,
          { y: 50, opacity: 0, scale: 0.96 },
          { y: 0, opacity: 1, scale: 1, duration: 1.1, ease: 'power2.out' },
          '-=0.7'
        )
        .fromTo(
          [floatingBadge1.current, floatingBadge2.current, floatingBadge3.current],
          { y: 30, opacity: 0, scale: 0.8 },
          { y: 0, opacity: 1, scale: 1, duration: 0.8, stagger: 0.15, ease: 'back.out(1.8)' },
          '-=0.6'
        );

      // Continuous floating physics
      gsap.to(floatingBadge1.current, {
        y: -10,
        rotation: 1,
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      gsap.to(floatingBadge2.current, {
        y: 12,
        rotation: -1,
        duration: 3.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.4
      });

      gsap.to(floatingBadge3.current, {
        y: -8,
        duration: 4.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.8
      });

      // Desktop Mouse Parallax
      const handleMouseMove = (e: MouseEvent) => {
        if (window.innerWidth < 1024) return;
        const { clientX, clientY } = e;
        const xPos = (clientX / window.innerWidth - 0.5) * 16;
        const yPos = (clientY / window.innerHeight - 0.5) * 16;

        gsap.to(floatingBadge1.current, { x: xPos * 1.4, y: yPos * 1.4, duration: 0.9 });
        gsap.to(floatingBadge2.current, { x: -xPos * 1.6, y: -yPos * 1.6, duration: 1.1 });
        gsap.to(floatingBadge3.current, { x: xPos * 0.9, y: yPos * 0.9, duration: 1.3 });
      };

      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative pt-10 sm:pt-16 lg:pt-20 pb-20 lg:pb-32 px-4 sm:px-8 lg:px-10 overflow-hidden bg-surface border-b border-outline-variant/60"
    >
      {/* Background Soft Glow Lights */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[20%] right-[5%] w-[55vw] h-[55vw] max-w-[800px] max-h-[800px] rounded-full bg-primary/10 blur-[130px]" />
        <div className="absolute top-[35%] -left-[10%] w-[45vw] h-[45vw] max-w-[600px] max-h-[600px] rounded-full bg-indigo-500/10 blur-[110px]" />
        <div className="absolute bottom-0 right-[25%] w-[35vw] h-[35vw] max-w-[500px] max-h-[500px] rounded-full bg-amber-500/5 blur-[100px]" />
      </div>

      <div className="max-w-container-max mx-auto">
        {/* Asymmetrical 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Left Column: Headline, Description & CTAs (Span 7) */}
          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
            {/* Top Micro-Pill */}
            <div className="hero-pill-badge inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/80 shadow-xs backdrop-blur-md">
              <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-ping" />
              <span className="text-xs font-bold text-on-surface uppercase tracking-wider font-mono">
                ✨ Next-Generation Deep-Tech LMS
              </span>
            </div>

            {/* Main Headline */}
            <h1
              ref={headlineRef}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-on-surface tracking-tight leading-[1.08]"
            >
              Learn. Grow.{' '}
              <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-600 to-indigo-800">
                Build Your Future.
              </span>
            </h1>

            {/* Supporting Description */}
            <p
              ref={subtextRef}
              className="text-base sm:text-lg lg:text-xl text-on-surface-variant max-w-2xl leading-relaxed font-medium"
            >
              Master scalable software engineering, distributed cloud architecture, modern design systems, and product leadership. Learn directly through production-ready capstone systems guided by industry practitioners.
            </p>

            {/* CTAs Button Row */}
            <div
              ref={ctaRef}
              className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto"
            >
              <Link
                href="/courses"
                className="px-8 py-4 bg-primary text-on-primary font-bold text-sm rounded-2xl hover:bg-primary-container shadow-md hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2.5 group cursor-pointer"
              >
                <span>Explore Courses</span>
                <Icon
                  name="arrow_forward"
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>

              <Link
                href="/register"
                className="px-8 py-4 bg-surface-container-lowest text-on-surface font-bold text-sm rounded-2xl border border-outline-variant hover:border-primary hover:bg-surface-container-low transition-all flex items-center justify-center gap-2.5 shadow-xs cursor-pointer group"
              >
                <Icon name="play_circle" fill size={20} className="text-primary group-hover:scale-110 transition-transform" />
                <span>Start Learning</span>
              </Link>
            </div>

            {/* Social Proof & Trust Badges */}
            <div className="pt-4 flex flex-col sm:flex-row sm:items-center gap-6 border-t border-outline-variant/60 w-full">
              {/* Avatar Stack */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2.5 overflow-hidden">
                  <img
                    className="inline-block h-9 w-9 rounded-full ring-2 ring-surface object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnUOQAIWgHlv8K4gx6OUWk8S8ulEKlq00Dpl6NrYPKr2ShkxFzBQca9zKSU8oRuywYaTGEIJUD0fp56GjeB0EyLCE1I3_7wNjSudu66jfy239Ml2ZyynC4vD6eAOHdstwkWVthOc3L7GK2C-rbFCpWb8QfYdO4r8DwTtXQR5jhZPMyfL4DJmE1uPHnnpbC0l9CWWnfw8_XQmfioVHKqTGD-KDQVZBAG84TS3AB4eV3lX-E10vWDxsLvA"
                    alt="Student"
                  />
                  <img
                    className="inline-block h-9 w-9 rounded-full ring-2 ring-surface object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuARxBvdgEK03RaEotNyeUUPP7iYzTqdwc0an34A4LQf4ZfFninSsfUgRRMX8EySn6Y7eFjAe2s5L0ua2JlqDCCP6l_Z0HH8N6CmqNF4rpwZifkBZDEHtYXDtFZn2k9VEyr0pYM8NTyVxuxayNFjQiZOmmNEcJnKeebjSvt0boctfKn0g5NOcdcJ09l6f3L2HYmAprqeopxF3CN5n38nd8N910k9ORrJ2l4IXn5JKkJnoyV5TYFs02Y6rg"
                    alt="Student"
                  />
                  <img
                    className="inline-block h-9 w-9 rounded-full ring-2 ring-surface object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6go6huVNcSmSp4GDBh5zxs9F-7u4bbwFV4_Z354hWyqEq3keUQdIhOnw0rnBCiEhDx08yts1a7p4OiSO5qFmKSFrT6yPE-2j01kdPVcftjPvI-IZ2h6C-KVRPB9BrX_oPeTp_s1_VCRW4ybt6VXON4FFOirMdFXpwhXpe_EJY6Zd7a4e_ro6a2dkJmeSjEBMVj1mS8mF1SDuKg-7QULUyvUhcOcbujuoi_5xorDen64iDcFk7DiQ22Q"
                    alt="Student"
                  />
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary text-xs font-bold ring-2 ring-surface">
                    12k+
                  </div>
                </div>
                <div>
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Icon key={i} name="star" fill size={14} />
                    ))}
                  </div>
                  <p className="text-xs font-bold text-on-surface">4.9 / 5 from verified learners</p>
                </div>
              </div>

              <div className="hidden sm:block h-8 w-[1px] bg-outline-variant/60" />

              <div className="flex items-center gap-4 text-xs font-semibold text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <Icon name="verified" size={16} className="text-emerald-600" />
                  <span>Verified Diplomas</span>
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="all_inclusive" size={16} className="text-primary" />
                  <span>Lifetime Access</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Floating Interactive Hero Showcase Stage (Span 5) */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            {/* Main Layered Showcase Card */}
            <div
              ref={visualCardRef}
              className="relative w-full rounded-3xl bg-surface-container-lowest border-2 border-outline-variant/80 p-4 sm:p-5 shadow-2xl overflow-visible group hover:border-primary/40 transition-all duration-500"
            >
              {/* Hero Course Media Mockup */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-surface-container shadow-inner border border-outline-variant/50">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBfSK-qNFG7rZx20vQ1L8m13W422kT-esoQzVPjbuKICGsyBtAypO0ON2yIUDtGNQZl-1BmPNBLCRzfehpqn2Qh4FcikJioN_BmHUDgUsIcDSa7ggt-zoSXzEgNGPgidwydnTDCGkzfHaZF9vDV95VQrNJ9O2YZBvlqbWR94Z6hAsuH-pFJ6rNijbiIiF2a6TxDw9okxS29w27lGJwoWoUmXQseao9d4Du8Nf--4mdIfIXnErsrKliDuA"
                  alt="Modern Masterclass Preview"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Video Play Button Overlay */}
                <Link
                  href="/courses/ui-ux-design-masterclass"
                  className="absolute inset-0 flex items-center justify-center group/btn"
                >
                  <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-md text-primary flex items-center justify-center shadow-xl group-hover/btn:scale-110 group-hover/btn:bg-primary group-hover/btn:text-white transition-all duration-300">
                    <Icon name="play_arrow" fill size={32} className="ml-1" />
                  </div>
                </Link>

                {/* Top Badge */}
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full border border-white/20">
                  Featured Masterclass
                </div>

                {/* Bottom Video Meta Strip */}
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end text-white">
                  <div>
                    <span className="text-[10px] text-white/80 uppercase font-bold block">Lecture 1.2</span>
                    <p className="text-xs font-bold text-white truncate max-w-[200px]">Design Tokens &amp; Spatial Cognition</p>
                  </div>
                  <span className="text-[11px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded-md backdrop-blur-md">
                    42.5h Total
                  </span>
                </div>
              </div>

              {/* Lower Details Card inside Showcase */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDoFp1eGreTcQey2rw2vDSmyE9aflnOmqG-crHKiWwH45vzG_urMXpKbamcO2FcEjqZAi5izN1rjayugOQY27KHt8M-sZRukHX7p4choT3q8pRGjUn1Xtp2XrUKPDGc0W5FbLtMZQmkRNcqVIyfcFXXKRJGct2tRUuyrKWOJRuPBYHK-O9NV7Ytd5oQS3fMgzYUq30Or3FHs3uFrTzqn9jUzKTAS6yNaPLA3sRGV-udytprlKo6Ac8AUQ"
                      alt="Dr. Elena Rodriguez"
                      className="w-8 h-8 rounded-full object-cover border border-outline-variant"
                    />
                    <div>
                      <p className="text-xs font-bold text-on-surface">Dr. Elena Rodriguez</p>
                      <p className="text-[10px] text-on-surface-variant">Lead Design Systems Architect</p>
                    </div>
                  </div>
                  <span className="font-mono font-black text-base text-primary">$149.99</span>
                </div>
              </div>

              {/* Floating Badge 1: 100% Certified Diplomas (Top Right) */}
              <div
                ref={floatingBadge1}
                className="absolute -top-6 -right-4 sm:-right-6 bg-surface-container-lowest/95 backdrop-blur-xl border border-outline-variant rounded-2xl p-3.5 shadow-xl flex items-center gap-3 z-20"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <Icon name="workspace_premium" fill size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                    Verified Credential
                  </span>
                  <p className="text-xs font-black text-on-surface">100% Accredited Certificate</p>
                </div>
              </div>

              {/* Floating Badge 2: Active Student Cohort (Bottom Left) */}
              <div
                ref={floatingBadge2}
                className="absolute -bottom-6 -left-4 sm:-left-6 bg-surface-container-lowest/95 backdrop-blur-xl border border-outline-variant rounded-2xl p-3.5 shadow-xl flex items-center gap-3 z-20"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
                  <Icon name="bolt" fill size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-on-surface">Live Cohort Online</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-[11px] text-on-surface-variant font-medium">1,420 students learning right now</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

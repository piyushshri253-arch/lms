'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Icon } from '../ui/Icon';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

type AcademyThemeMode = 'CREATOR' | 'TECH' | 'ENTERPRISE';
type MockupTab = 'VIDEO' | 'AI_BUILDER' | 'SALES' | 'CERTIFICATE';

export const SaaSHeroSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const dashboardWrapperRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Interactive Hero States
  const [activeTheme, setActiveTheme] = useState<AcademyThemeMode>('CREATOR');
  const [activeMockTab, setActiveMockTab] = useState<MockupTab>('VIDEO');
  const [isPlayingVideo, setIsPlayingVideo] = useState(true);
  const [videoProgress, setVideoProgress] = useState(42);
  const [liveReactions, setLiveReactions] = useState([
    { id: 1, text: '🔥 Crystal clear explanation!', user: 'Rohan M.', time: 'Just now' },
    { id: 2, text: '💡 Best masterclass on Distributed AI', user: 'Priya K.', time: '2m ago' }
  ]);

  // Video progress simulator
  useEffect(() => {
    if (!isPlayingVideo) return;
    const interval = setInterval(() => {
      setVideoProgress((prev) => (prev >= 100 ? 0 : prev + 1));
    }, 400);
    return () => clearInterval(interval);
  }, [isPlayingVideo]);

  // Dynamic Content Profiles based on Active Academy Mode
  const themeProfiles = {
    CREATOR: {
      tag: '✨ FOR CREATORS & INFLUENCERS',
      title: 'Crafted for Lifestyle, Design & Creator Academies',
      color: 'from-amber-400 via-orange-400 to-rose-500',
      badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      heroSub: 'Sell cohort masterclasses, digital workshops, and subscription communities with instant payouts and zero platform cut.',
      courseName: 'Artisan Coffee Roasting & Sensory Masterclass',
      modules: '24 4K Video Lessons • 6 Tasting Guides • Barista Certification',
      revenue: '₹18,40,000',
      price: '₹3,499',
      activeStudents: '14,920',
      rating: '4.98 ★'
    },
    TECH: {
      tag: '⚡ FOR CODING & TECH BOOTCAMPS',
      title: 'Built for Deep-Tech & Fullstack Engineering',
      color: 'from-cyan-400 via-indigo-400 to-fuchsia-500',
      badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
      heroSub: 'Deliver hands-on code labs, live cloud sandboxes, and verifiable tamper-proof certificates at global scale.',
      courseName: 'Full-Stack Distributed Systems & GenAI Ops',
      modules: '48 Modules • 120 Code Challenges • 8 Production Labs',
      revenue: '₹32,50,000',
      price: '₹8,999',
      activeStudents: '28,400',
      rating: '4.95 ★'
    },
    ENTERPRISE: {
      tag: '🏢 FOR CORPORATE & ENTERPRISE TRAINING',
      title: 'Engineered for Compliance & Workforce Upskilling',
      color: 'from-emerald-400 via-teal-300 to-indigo-400',
      badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      heroSub: 'Role-based multi-tenancy, custom enterprise SSO, automated compliance reporting, and white-label domains.',
      courseName: 'Executive AI Leadership & Cloud Governance',
      modules: '16 Cohort Sessions • Automated Audit Logs • ISO Compliance',
      revenue: '₹64,00,000',
      price: '₹24,999',
      activeStudents: '8,200',
      rating: '4.99 ★'
    }
  };

  const currentTheme = themeProfiles[activeTheme];

  // 3D Mouse Parallax Tilt Effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dashboardRef.current || window.innerWidth < 1024) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const rotateX = (y / (rect.height / 2)) * -6;
    const rotateY = (x / (rect.width / 2)) * 6;

    gsap.to(dashboardRef.current, {
      rotateX,
      rotateY,
      duration: 0.5,
      ease: 'power2.out',
      transformPerspective: 1200
    });
  };

  const handleMouseLeave = () => {
    if (!dashboardRef.current) return;
    gsap.to(dashboardRef.current, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.8,
      ease: 'power2.out'
    });
  };

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from('.hero-badge', {
        opacity: 0,
        y: -20,
        scale: 0.9,
        duration: 0.8,
        delay: 0.1
      });

      tl.from(
        '.headline-word',
        {
          opacity: 0,
          y: 40,
          rotateX: -40,
          stagger: 0.08,
          duration: 0.9
        },
        '-=0.5'
      );

      tl.from(
        subtitleRef.current,
        {
          opacity: 0,
          y: 20,
          duration: 0.7
        },
        '-=0.4'
      );

      tl.from(
        ctaRef.current,
        {
          opacity: 0,
          y: 20,
          scale: 0.95,
          duration: 0.6
        },
        '-=0.4'
      );

      tl.from(
        dashboardWrapperRef.current,
        {
          opacity: 0,
          scale: 0.82,
          rotateX: 20,
          y: 60,
          duration: 1.2,
          ease: 'power4.out'
        },
        '-=0.5'
      );

      tl.from(
        '.hero-float-chip',
        {
          opacity: 0,
          scale: 0.5,
          y: 30,
          stagger: 0.12,
          duration: 0.8,
          ease: 'back.out(1.7)'
        },
        '-=0.6'
      );

      // Continuous Floating Animations for Badges
      gsap.to('.hero-float-chip-1', {
        y: '-=12',
        duration: 2.6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      gsap.to('.hero-float-chip-2', {
        y: '+=14',
        duration: 3.1,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.4
      });

      gsap.to('.hero-float-chip-3', {
        y: '-=10',
        duration: 2.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.2
      });

      gsap.to('.hero-float-chip-4', {
        y: '+=12',
        duration: 3.3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 0.6
      });

      // Scroll-driven Parallax Scaling
      gsap.to(dashboardWrapperRef.current, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1
        },
        scale: 1.05,
        y: -30,
        rotateX: -3,
        ease: 'none'
      });
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-screen pt-32 pb-24 md:pt-40 md:pb-36 bg-[#070913] text-white overflow-hidden flex flex-col items-center justify-center"
    >
      {/* Dynamic Aurora Ambient Glows */}
      <div className="absolute inset-0 bg-grid-pattern opacity-25 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[550px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-pink-500/10 blur-[140px] rounded-full pointer-events-none transition-all duration-700" />
      <div className="absolute -bottom-20 left-1/4 w-[450px] h-[450px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
        {/* Top Product Pill */}
        <div className="hero-badge inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.12] backdrop-blur-md mb-6 shadow-inner shadow-white/5">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold tracking-wide text-slate-200">
            AADHYARA 3.0 • Next-Gen LMS Architecture
          </span>
          <span className="text-[10px] font-mono font-bold uppercase bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-400/30">
            Multi-Tenant
          </span>
        </div>

        {/* Cinematic Headline */}
        <h1
          ref={headlineRef}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] font-display perspective-1200"
        >
          <div className="overflow-hidden inline-block mr-3">
            <span className="headline-word inline-block text-white">Build.</span>
          </div>
          <div className="overflow-hidden inline-block mr-3">
            <span className={`headline-word inline-block bg-gradient-to-r ${currentTheme.color} bg-clip-text text-transparent transition-all duration-500`}>
              Teach.
            </span>
          </div>
          <div className="overflow-hidden inline-block mr-3">
            <span className="headline-word inline-block text-white">Scale.</span>
          </div>
          <br className="hidden sm:inline" />
          <div className="overflow-hidden inline-block">
            <span className="headline-word inline-block text-slate-300 font-light">Your own</span>
          </div>{' '}
          <div className="overflow-hidden inline-block">
            <span className="headline-word inline-block text-white underline decoration-indigo-500/60 decoration-wavy underline-offset-8">
              Academy.
            </span>
          </div>
        </h1>

        {/* Supporting Copy */}
        <p
          ref={subtitleRef}
          className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal"
        >
          {currentTheme.heroSub}
        </p>

        {/* High-Conversion Dual CTAs */}
        <div
          ref={ctaRef}
          className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto"
        >
          <Link
            href="/company-signup"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border border-white/20 flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Launch Your Academy</span>
            <Icon name="arrow_forward" size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          <a
            href="#platform"
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 hover:text-white font-bold text-sm border border-white/[0.12] backdrop-blur-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Icon name="play_circle" size={18} className="text-indigo-400" />
            <span>Interactive Demo</span>
          </a>
        </div>

        {/* Interactive Mode Switcher Pills */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
          <span className="text-xs font-mono text-slate-400 mr-1 hidden sm:inline">Preview Mode:</span>
          {(['CREATOR', 'TECH', 'ENTERPRISE'] as AcademyThemeMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveTheme(mode)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTheme === mode
                  ? 'bg-white text-slate-900 shadow-md scale-105'
                  : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10'
              }`}
            >
              <Icon
                name={mode === 'CREATOR' ? 'palette' : mode === 'TECH' ? 'terminal' : 'corporate_fare'}
                size={15}
                className={activeTheme === mode ? 'text-indigo-600' : 'text-slate-400'}
              />
              <span>{mode === 'CREATOR' ? 'Creators & Lifestyle' : mode === 'TECH' ? 'Coding & Tech' : 'Corporate Enterprise'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hero 3D Interactive Mockup Showcase */}
      <div
        ref={dashboardWrapperRef}
        className="relative mt-12 sm:mt-16 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 perspective-2000"
      >
        {/* Floating Holographic Parallax Micro-Widgets */}
        <div className="pointer-events-none">
          {/* Card 1: Revenue Velocity */}
          <div className="hero-float-chip hero-float-chip-1 absolute -top-8 -left-2 sm:-left-6 z-20 hidden md:flex items-center gap-3 p-3.5 rounded-2xl glass-dark-elevated border border-emerald-500/30 text-left shadow-2xl backdrop-blur-xl">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-md">
              <Icon name="payments" size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Direct Payouts</p>
              <p className="text-sm font-extrabold text-white flex items-center gap-1">
                <span>+ ₹48,500.00</span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 rounded">
                  0% Fee
                </span>
              </p>
            </div>
          </div>

          {/* Card 2: 100% Verifiable Certificates */}
          <div className="hero-float-chip hero-float-chip-2 absolute -top-10 -right-2 sm:-right-6 z-20 hidden md:flex items-center gap-3 p-3.5 rounded-2xl glass-dark-elevated border border-purple-500/30 text-left shadow-2xl backdrop-blur-xl">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shadow-md">
              <Icon name="workspace_premium" size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Accredited Certificates</p>
              <p className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <span>100% Verifiable</span>
                <span className="text-[10px] text-purple-300 font-mono font-bold bg-purple-500/10 px-1.5 rounded">
                  Tamper Proof
                </span>
              </p>
            </div>
          </div>

          {/* Card 3: 4K Ultra-Low Buffering */}
          <div className="hero-float-chip hero-float-chip-3 absolute -bottom-6 left-6 z-20 hidden lg:flex items-center gap-3 p-3 rounded-2xl glass-dark-elevated border border-cyan-500/30 text-left shadow-2xl backdrop-blur-xl">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shadow-md">
              <Icon name="play_arrow" size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">4K Global Video CDN</p>
              <p className="text-xs font-bold text-white flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse inline-block" />
                <span>Zero Buffering &bull; 60fps</span>
              </p>
            </div>
          </div>

          {/* Card 4: AI Lesson Co-Pilot */}
          <div className="hero-float-chip hero-float-chip-4 absolute -bottom-6 right-6 z-20 hidden lg:flex items-center gap-3 p-3 rounded-2xl glass-dark-elevated border border-amber-500/30 text-left shadow-2xl backdrop-blur-xl">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-md">
              <Icon name="auto_awesome" size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">AI Academy Co-Pilot</p>
              <p className="text-xs font-bold text-white">
                <span>Curriculum generated in 2.4s</span>
              </p>
            </div>
          </div>
        </div>

        {/* Central Realistic 3D Laptop Display Container */}
        <div
          ref={dashboardRef}
          className="relative rounded-3xl p-2.5 sm:p-3.5 bg-gradient-to-b from-white/20 via-white/5 to-transparent border border-white/20 shadow-[0_30px_100px_rgba(0,0,0,0.85)] preserve-3d transition-transform duration-150"
        >
          {/* Laptop Top Bezel & Tabs */}
          <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-[#0d1124] rounded-t-2xl border-b border-white/10 text-xs text-slate-400 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="ml-2 font-mono text-[11px] text-slate-400 hidden sm:inline">
                https://academy.aadhyara.com/learn/{activeTheme.toLowerCase()}
              </span>
            </div>

            {/* Interactive Internal Tabs */}
            <div className="flex items-center gap-1.5">
              {[
                { id: 'VIDEO', label: 'Interactive Player', icon: 'smart_display' },
                { id: 'AI_BUILDER', label: 'AI Studio', icon: 'auto_awesome' },
                { id: 'SALES', label: 'Live Ticker', icon: 'trending_up' },
                { id: 'CERTIFICATE', label: 'Certificate', icon: 'workspace_premium' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMockTab(tab.id as MockupTab)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    activeMockTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'hover:bg-white/10 text-slate-300'
                  }`}
                >
                  <Icon name={tab.icon} size={14} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Laptop Screen Body */}
          <div className="bg-[#090d1e] rounded-b-2xl p-4 sm:p-6 text-left min-h-[380px] flex flex-col justify-between">
            {/* TAB 1: INTERACTIVE 4K VIDEO CLASSROOM */}
            {activeMockTab === 'VIDEO' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Video Stage */}
                  <div className="md:col-span-8 rounded-2xl bg-[#04060f] border border-white/10 p-4 relative overflow-hidden flex flex-col justify-between min-h-[260px]">
                    <div className="flex items-center justify-between z-10">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold border border-rose-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                          LIVE CLASSROOM
                        </span>
                        <span className="text-[11px] font-bold text-slate-300 font-mono">1080p 60fps</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Audio visualizer wave */}
                        <div className="flex items-end gap-0.5 h-4">
                          {[60, 100, 40, 80, 50, 90, 30].map((h, i) => (
                            <span
                              key={i}
                              style={{ height: `${isPlayingVideo ? h : 20}%` }}
                              className="w-1 bg-indigo-400 rounded-full transition-all duration-200"
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Center Action */}
                    <div className="text-center py-6 z-10">
                      <button
                        onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                        className="w-14 h-14 rounded-full bg-indigo-600/90 hover:bg-indigo-500 text-white flex items-center justify-center shadow-xl mx-auto transition-transform hover:scale-110 cursor-pointer"
                      >
                        <Icon name={isPlayingVideo ? 'pause' : 'play_arrow'} size={28} />
                      </button>
                      <h4 className="font-extrabold text-sm sm:text-base text-white mt-3">{currentTheme.courseName}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Lesson 04 &bull; Architectural Blueprint &amp; Frameworks</p>
                    </div>

                    {/* Bottom Progress Bar */}
                    <div className="space-y-1.5 z-10">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>12:40</span>
                        <span>{videoProgress}% Watched</span>
                        <span>28:00</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden cursor-pointer">
                        <div
                          style={{ width: `${videoProgress}%` }}
                          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sidebar Chat & Notes */}
                  <div className="md:col-span-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Icon name="chat" size={14} className="text-indigo-400" />
                          <span>Class Q&amp;A Feed</span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400">1,420 Online</span>
                      </div>

                      <div className="space-y-2 mt-2.5">
                        {liveReactions.map((r) => (
                          <div key={r.id} className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-[11px]">
                            <div className="flex items-center justify-between font-bold text-indigo-300">
                              <span>{r.user}</span>
                              <span className="text-[9px] text-slate-400 font-mono">{r.time}</span>
                            </div>
                            <p className="text-slate-200 mt-0.5">{r.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10">
                      <input
                        type="text"
                        placeholder="Ask instructor..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: AI COURSE ARCHITECT */}
            {activeMockTab === 'AI_BUILDER' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 text-purple-300 flex items-center justify-center">
                      <Icon name="auto_awesome" size={22} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-white">AI Curriculum Engine Active</h4>
                      <p className="text-xs text-slate-400">Prompt: "Build a comprehensive 6-week roadmap with quizzes"</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold border border-purple-500/40">
                    GENERATED IN 2.4s
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                    <span className="text-[10px] font-mono text-indigo-400 font-bold">MODULE 01</span>
                    <h5 className="font-bold text-white">Foundations &amp; Core Architecture</h5>
                    <p className="text-[11px] text-slate-400">6 Lessons &bull; 2 Quizzes &bull; 1 Assignment</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                    <span className="text-[10px] font-mono text-purple-400 font-bold">MODULE 02</span>
                    <h5 className="font-bold text-white">Advanced Practice &amp; Deep-Dive Labs</h5>
                    <p className="text-[11px] text-slate-400">8 Lessons &bull; 4 Hands-on Projects</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">MODULE 03</span>
                    <h5 className="font-bold text-white">Capstone Exam &amp; Certification</h5>
                    <p className="text-[11px] text-slate-400">Timed Assessment &bull; Automated Grading</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: REALTIME SALES TICKER */}
            {activeMockTab === 'SALES' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                    <p className="text-[10px] uppercase font-mono text-slate-400">Monthly Run Rate</p>
                    <p className="text-lg font-black text-white mt-1">{currentTheme.revenue}</p>
                    <span className="text-[10px] text-emerald-400 font-bold font-mono">↑ +38.2% this month</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                    <p className="text-[10px] uppercase font-mono text-slate-400">Active Students</p>
                    <p className="text-lg font-black text-white mt-1">{currentTheme.activeStudents}</p>
                    <span className="text-[10px] text-indigo-400 font-bold font-mono">Global Learners</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                    <p className="text-[10px] uppercase font-mono text-slate-400">Course Price</p>
                    <p className="text-lg font-black text-white mt-1">{currentTheme.price}</p>
                    <span className="text-[10px] text-purple-400 font-bold font-mono">Instant Payouts</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                    <p className="text-[10px] uppercase font-mono text-slate-400">Avg Rating</p>
                    <p className="text-lg font-black text-white mt-1">{currentTheme.rating}</p>
                    <span className="text-[10px] text-amber-400 font-bold font-mono">Verified Reviews</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                    <span>Live Checkout Stream</span>
                    <span className="text-[10px] font-mono text-emerald-400">Syncing with Razorpay &amp; Stripe</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-200">Rahul Sharma</p>
                        <p className="text-[10px] text-slate-400 font-mono">rahul@tech.io</p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">Paid {currentTheme.price}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-200">Devon Chen</p>
                        <p className="text-[10px] text-slate-400 font-mono">devon@acme.com</p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">Paid $99.00</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-200">Priya Nair</p>
                        <p className="text-[10px] text-slate-400 font-mono">priya.n@design.io</p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">Paid {currentTheme.price}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ACCREDITED CERTIFICATE */}
            {activeMockTab === 'CERTIFICATE' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                      VERIFIABLE DIGITAL CREDENTIAL
                    </span>
                    <h3 className="text-lg font-black text-white">Certificate of Master Completion</h3>
                    <p className="text-xs text-slate-400">Awarded to Alex Mercer for mastering {currentTheme.courseName}</p>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 pt-1">
                      <span>ID: <code>CERT-2026-89401</code></span>
                      <span>&bull;</span>
                      <span className="text-emerald-400 font-bold">SHA-256 Validated</span>
                    </div>
                  </div>

                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 text-slate-950 flex flex-col items-center justify-center font-black shadow-2xl shrink-0">
                    <Icon name="verified" size={28} />
                    <span className="text-[9px] uppercase font-mono font-bold mt-1">CERTIFIED</span>
                  </div>
                </div>
              </div>
            )}

            {/* Universal Mini Footer inside Laptop */}
            <div className="pt-4 mt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                <span className="font-mono text-[11px]">System Status: All 8 Engine Services Nominal</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span>Multi-Tenant DB</span>
                <span>&bull;</span>
                <span>AES-256 Secure</span>
                <span>&bull;</span>
                <span>Razorpay / Stripe</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


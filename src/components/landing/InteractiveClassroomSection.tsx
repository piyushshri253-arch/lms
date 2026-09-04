'use client';

import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Icon } from '../ui/Icon';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export const InteractiveClassroomSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedTheme, setSelectedTheme] = useState<'indigo' | 'emerald' | 'rose'>('indigo');
  const [activeTab, setActiveTab] = useState<'ui' | 'code' | 'critique'>('ui');
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testOutput, setTestOutput] = useState('All systems nominal. Ready to run live validation.');

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.classroom-header', {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%'
        },
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
      });

      gsap.from('.classroom-stage', {
        scrollTrigger: {
          trigger: '.classroom-stage',
          start: 'top 75%'
        },
        scale: 0.95,
        y: 30,
        opacity: 0,
        duration: 1,
        ease: 'power3.out'
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleRunTests = () => {
    setIsTestRunning(true);
    setTestOutput('Running automated test assertions...');
    setTimeout(() => {
      setIsTestRunning(false);
      setTestOutput('✓ 100% Passed: WCAG AAA Contrast Verified, Zero layout shifts detected.');
    }, 1200);
  };

  const themeColors = {
    indigo: {
      primary: '#3525cd',
      bg: 'bg-indigo-600',
      text: 'text-indigo-600',
      border: 'border-indigo-600',
      lightBg: 'bg-indigo-50',
      badge: 'Deep Indigo'
    },
    emerald: {
      primary: '#059669',
      bg: 'bg-emerald-600',
      text: 'text-emerald-600',
      border: 'border-emerald-600',
      lightBg: 'bg-emerald-50',
      badge: 'Emerald Mint'
    },
    rose: {
      primary: '#e11d48',
      bg: 'bg-rose-600',
      text: 'text-rose-600',
      border: 'border-rose-600',
      lightBg: 'bg-rose-50',
      badge: 'Rose Amber'
    }
  }[selectedTheme];

  return (
    <section
      ref={containerRef}
      className="py-20 md:py-32 px-4 sm:px-8 lg:px-10 bg-surface relative overflow-hidden"
    >
      <div className="max-w-container-max mx-auto">
        {/* Header */}
        <div className="classroom-header text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container border border-outline-variant text-on-surface text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
            <Icon name="touch_app" size={18} className="text-primary" />
            <span>Live Interactive Sandbox</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-on-surface tracking-tight mb-4">
            Try Our Live Classroom Right Here
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
            See how students interact with lessons in real-time. Toggle design tokens below and watch live UI components re-render instantly with automated instructor feedback.
          </p>
        </div>

        {/* Interactive Classroom Stage */}
        <div className="classroom-stage bg-surface-container-lowest border-2 border-outline-variant rounded-3xl shadow-2xl overflow-hidden">
          {/* Top Stage Bar */}
          <div className="p-4 sm:p-6 bg-surface-container-low/60 border-b border-outline-variant flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold">
                <Icon name="code_blocks" size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-on-surface">
                  Hands-On Design Token Synchronization
                </h3>
                <p className="text-xs text-on-surface-variant">Live collaborative sandbox session</p>
              </div>
            </div>

            {/* Theme Selector Controls */}
            <div className="flex items-center gap-2 bg-surface-container p-1.5 rounded-xl border border-outline-variant/60 w-full sm:w-auto justify-between">
              <span className="text-xs font-bold text-on-surface-variant px-2 hidden sm:inline">Theme:</span>
              {(['indigo', 'emerald', 'rose'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTheme(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                    selectedTheme === t
                      ? 'bg-surface-container-lowest text-on-surface shadow-sm ring-1 ring-primary/40'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Sandbox Body (2 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
            {/* Left: Code & Control Panel (Span 6) */}
            <div className="lg:col-span-6 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-outline-variant flex flex-col justify-between space-y-6">
              {/* Tab navigation */}
              <div className="flex border-b border-outline-variant gap-6 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('ui')}
                  className={`pb-2.5 transition-colors ${
                    activeTab === 'ui'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  Token Settings
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  className={`pb-2.5 transition-colors ${
                    activeTab === 'code'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  CSS Code Spec
                </button>
                <button
                  onClick={() => setActiveTab('critique')}
                  className={`pb-2.5 transition-colors ${
                    activeTab === 'critique'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  Teacher Critique
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1">
                {activeTab === 'ui' && (
                  <div className="space-y-4 text-xs animate-in fade-in duration-200">
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      Select how primary tokens map to nested components and check accessibility compliance.
                    </p>
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center p-3 bg-surface rounded-xl border border-outline-variant/50">
                        <span className="font-semibold text-on-surface">Primary Accent Token</span>
                        <span className="font-mono font-bold text-primary">{themeColors.primary}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-surface rounded-xl border border-outline-variant/50">
                        <span className="font-semibold text-on-surface">Target Contrast Ratio</span>
                        <span className="font-mono font-bold text-emerald-600">7.2:1 (AAA)</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-surface rounded-xl border border-outline-variant/50">
                        <span className="font-semibold text-on-surface">Surface Tint Elevation</span>
                        <span className="font-mono font-bold text-on-surface">Level 2 (Ambient)</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'code' && (
                  <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs space-y-1.5 animate-in fade-in duration-200">
                    <p className="text-slate-500">// Generated Design Tokens for {themeColors.badge}</p>
                    <p className="text-purple-400">:root {'{'}</p>
                    <p className="pl-4 text-emerald-400">--brand-primary: {themeColors.primary};</p>
                    <p className="pl-4 text-emerald-400">--brand-container: {themeColors.primary}1A;</p>
                    <p className="pl-4 text-emerald-400">--elevation-ambient: 0 10px 15px -3px rgba(0,0,0,0.05);</p>
                    <p className="text-purple-400">{'}'}</p>
                  </div>
                )}

                {activeTab === 'critique' && (
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <img
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDoFp1eGreTcQey2rw2vDSmyE9aflnOmqG-crHKiWwH45vzG_urMXpKbamcO2FcEjqZAi5izN1rjayugOQY27KHt8M-sZRukHX7p4choT3q8pRGjUn1Xtp2XrUKPDGc0W5FbLtMZQmkRNcqVIyfcFXXKRJGct2tRUuyrKWOJRuPBYHK-O9NV7Ytd5oQS3fMgzYUq30Or3FHs3uFrTzqn9jUzKTAS6yNaPLA3sRGV-udytprlKo6Ac8AUQ"
                        alt="Instructor"
                        className="w-8 h-8 rounded-full object-cover border border-primary"
                      />
                      <span className="font-bold text-xs text-on-surface">Dr. Elena Rodriguez (Instructor)</span>
                    </div>
                    <p className="text-xs text-on-surface leading-relaxed">
                      &ldquo;Great token assignment! The {themeColors.badge} variant maintains strict WCAG compliance while giving user action buttons strong visual affordance.&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* Action Test Runner */}
              <div className="pt-4 border-t border-outline-variant/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className="text-xs font-mono text-on-surface-variant truncate max-w-xs">
                  {testOutput}
                </p>
                <button
                  onClick={handleRunTests}
                  disabled={isTestRunning}
                  className="px-5 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl hover:bg-primary-container transition-all shadow-sm flex items-center gap-2 shrink-0 disabled:opacity-50"
                >
                  <Icon name={isTestRunning ? 'sync' : 'play_arrow'} size={16} className={isTestRunning ? 'animate-spin' : ''} />
                  <span>{isTestRunning ? 'Validating...' : 'Run Unit Tests'}</span>
                </button>
              </div>
            </div>

            {/* Right: Live Rendered Component Canvas (Span 6) */}
            <div className="lg:col-span-6 p-6 sm:p-8 bg-surface-container-low/40 flex flex-col items-center justify-center">
              <div className="w-full max-w-sm bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-xl space-y-5 transition-all duration-300">
                {/* Live Card Header */}
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-white"
                    style={{ backgroundColor: themeColors.primary }}
                  >
                    Live Preview
                  </span>
                  <span className="text-xs font-mono text-on-surface-variant">Active Sandbox</span>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-lg text-on-surface">
                    Scalable Design Token Demo
                  </h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    This component dynamically adapts its background, borders, and CTA colors directly from your selected theme token.
                  </p>
                </div>

                {/* Live Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-on-surface">Mastery Progress</span>
                    <span style={{ color: themeColors.primary }}>84%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: '84%', backgroundColor: themeColors.primary }}
                    />
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  style={{ backgroundColor: themeColors.primary }}
                  className="w-full text-white font-bold text-xs py-3 rounded-xl shadow-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Icon name="rocket_launch" size={16} />
                  <span>Deploy to Production</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';

export const LearningExperienceSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'player' | 'notes' | 'discussions' | 'certificates'>('player');

  const features = [
    {
      id: 'player',
      label: 'HD Video Player',
      icon: 'ondemand_video',
      title: 'Distraction-Free High-Definition Player',
      description: 'Stream 4K/1080p lectures with custom playback speeds (0.75x to 2x), keyboard shortcuts, interactive chapter markers, and instant lesson completion tracking.'
    },
    {
      id: 'notes',
      label: 'Synced Personal Notes',
      icon: 'edit_note',
      title: 'Real-Time Video-Synced Notes',
      description: 'Capture critical thoughts, architectural diagrams, and code snippets directly alongside the video with auto-saved database synchronization.'
    },
    {
      id: 'discussions',
      label: 'Student Community',
      icon: 'forum',
      title: 'Collaborative Question & Answer Forum',
      description: 'Never get stuck on an ambiguous error. Ask questions directly within each lesson thread and receive answers from faculty and cohort peers.'
    },
    {
      id: 'certificates',
      label: 'Verified Diplomas',
      icon: 'workspace_premium',
      title: 'Automated Cryptographic Certification',
      description: 'Reach 100% completion on all lessons to instantly generate an official accredited diploma with a public verification URL for LinkedIn.'
    }
  ];

  const currentFeature = features.find((f) => f.id === activeTab) || features[0];

  return (
    <section className="py-20 lg:py-28 px-4 sm:px-8 lg:px-10 bg-surface-container-low border-b border-outline-variant/60 relative overflow-hidden">
      <div className="max-w-container-max mx-auto space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider font-mono">
            <Icon name="laptop_chromebook" size={16} />
            <span>Interactive Learning Experience</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-on-surface tracking-tight">
            Built for Deep Comprehension
          </h2>
          <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
            Our classroom is meticulously engineered to provide an engaging, distraction-free environment for mastering difficult technical subjects.
          </p>
        </div>

        {/* Feature Tabs Selector */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2 bg-surface-container-lowest p-2 rounded-2xl border border-outline-variant/80 shadow-xs overflow-x-auto max-w-full">
            {features.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveTab(f.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === f.id
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <Icon name={f.icon} size={16} />
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Classroom Mockup Container */}
        <div className="bg-surface-container-lowest border-2 border-outline-variant rounded-3xl p-6 sm:p-10 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Details */}
          <div className="lg:col-span-5 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-xs">
              <Icon name={currentFeature.icon} size={24} />
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
              {currentFeature.title}
            </h3>

            <p className="text-sm text-on-surface-variant leading-relaxed">
              {currentFeature.description}
            </p>

            <div className="pt-2">
              <Link
                href="/courses/ui-ux-design-masterclass"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs transition-all cursor-pointer"
              >
                <span>Experience Demo Lesson</span>
                <Icon name="arrow_forward" size={14} />
              </Link>
            </div>
          </div>

          {/* Right Visual Sandbox Display */}
          <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-outline-variant bg-slate-950 text-white shadow-2xl p-4 sm:p-6 space-y-4">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 text-slate-300 font-bold">MORENA TEACH Classroom 2.0</span>
              </div>
              <span className="bg-primary/20 text-indigo-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                Live Environment
              </span>
            </div>

            {/* Video & Interface Preview */}
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCpF7QuytsdIC8UBOTt9_RvqyVInZ1JFsLQBPUw5O3uQjMM-EKbQ7t4nre7mK3BmTl7QYJMcJZGJyPKje1i5SRHyFZyyGgwWvJJKMsDfGkMpTnLg4OGiyqJ8r0PHKE2JjIciMlB-surwaioHi3RMNYj9iqj5DLA0xbftAqrK0o-n1tyVcJmjm7q1u2iPT61TROhWK5l59Di-sBDNVe6nWEDRNjZvEWq68C34hR6q4Y0H48hVuKq8YwJpw"
                alt="Classroom Interface"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />

              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md">
                    <Icon name="play_arrow" fill size={18} className="text-white" />
                  </span>
                  <span className="font-mono text-[11px] text-slate-300">14:20 / 42:30</span>
                </div>
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-700 text-[10px] font-mono text-emerald-400">
                  <span>✓ 100% Synced</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};


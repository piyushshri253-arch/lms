'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '../ui/Icon';

export const LmsFeaturesSection: React.FC = () => {
  const lmsFeatures = [
    {
      title: 'Course Studio Builder',
      description: 'Drag-and-drop curriculum builder with sections, video uploads, download resources, and rich markdown.',
      icon: 'auto_stories',
      badge: 'Curriculum'
    },
    {
      title: 'Adaptive Video Streaming',
      description: '4K global CDN video player with playback speeds, resume memory, timestamps, and closed captions.',
      icon: 'play_circle',
      badge: 'Streaming'
    },
    {
      title: 'Quizzes & Evaluations',
      description: 'Multiple choice, timed quizzes, passing grades, instant automated scoring, and retake attempts.',
      icon: 'quiz',
      badge: 'Assessments'
    },
    {
      title: 'Assignments & Review',
      description: 'Student file submissions, instructor rubric grading, feedback notes, and status workflows.',
      icon: 'assignment',
      badge: 'Submissions'
    },
    {
      title: 'Accredited Certificates',
      description: 'Dynamic certificate generation with verifiable unique hash numbers and instant PDF downloads.',
      icon: 'workspace_premium',
      badge: 'Credentials'
    },
    {
      title: 'Progress & CRM Analytics',
      description: 'Real-time student progress tracking, completion percentages, discussion forums, and engagement heatmaps.',
      icon: 'insights',
      badge: 'Analytics'
    }
  ];

  return (
    <section className="py-24 bg-[#060814] text-white border-t border-white/10 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-10 w-96 h-96 bg-emerald-600/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono uppercase text-emerald-300 font-bold tracking-wider mb-4">
            <span>The Education Engine</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Teach With MORENA TEACH Learning
          </h2>
          <p className="text-base sm:text-lg text-slate-300 mt-4 leading-relaxed font-normal">
            A state-of-the-art learning management system designed to make teaching effortless and student learning unforgettable.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lmsFeatures.map((feat) => (
            <div
              key={feat.title}
              className="p-8 rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between group shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon name={feat.icon} size={22} />
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/5 text-emerald-300 border border-white/10">
                    {feat.badge}
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                  {feat.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                  {feat.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span>Included in Learning</span>
                <Icon name="check" size={16} className="text-emerald-400" />
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="mt-14 text-center">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/30 hover:shadow-emerald-600/50 transition-all cursor-pointer"
          >
            <span>🎓 Explore Learning Platform</span>
            <Icon name="arrow_forward" size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
};

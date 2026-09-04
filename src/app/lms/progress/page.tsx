'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LMS_ROUTES } from '@/lib/lms-routes';
import { LmsLayout } from '@/components/lms/LmsLayout';

export default function LmsProgressPage() {
  return (
    <LmsLayout activePath={LMS_ROUTES.PROGRESS} pageTitle="Learning Progress">
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.03] p-6 rounded-3xl border border-emerald-500/20 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 mb-1">
              <Link href={LMS_ROUTES.DASHBOARD} className="hover:text-emerald-400 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-emerald-400">Study Analytics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Learning Progress & Study Streaks
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Monitor weekly study hours, completed modules, and mastery milestones.
            </p>
          </div>

          <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-300 flex items-center gap-2 self-start sm:self-auto">
            <span>🔥</span>
            <span>14-Day Study Streak Active</span>
          </div>
        </div>

        {/* Analytics Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          {[
            { label: 'Weekly Study Hours', value: '18.5 hrs', change: '+22% vs last week', icon: 'schedule' },
            { label: 'Completed Lessons', value: '72 lessons', change: '8 lessons this week', icon: 'task_alt' },
            { label: 'Quizzes Passed', value: '14 / 15', change: '94% average score', icon: 'quiz' },
            { label: 'Credentials Earned', value: '2 Verified', change: '1 in progress', icon: 'military_tech' }
          ].map((stat, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">{stat.label}</span>
                <Icon name={stat.icon} size={18} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-[11px] font-mono text-emerald-400">{stat.change}</div>
            </div>
          ))}
        </div>

        {/* Weekly Activity Map */}
        <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4 shadow-xl">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <span>📊</span>
            <span>Weekly Study Activity</span>
          </h3>

          <div className="grid grid-cols-7 gap-3 pt-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
              <div key={day} className="text-center space-y-2">
                <div className="h-28 rounded-xl bg-white/[0.03] border border-white/10 p-1 flex flex-col justify-end">
                  <div
                    className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-lg transition-all"
                    style={{ height: `${[60, 85, 45, 100, 70, 90, 80][idx]}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-400">{day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LmsLayout>
  );
}

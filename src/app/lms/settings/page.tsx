'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';
import { LMS_ROUTES } from '@/lib/lms-routes';
import { LmsLayout } from '@/components/lms/LmsLayout';

export default function LmsSettingsPage() {
  const { showToast } = useApp();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [courseReminders, setCourseReminders] = useState(true);

  const handleSave = () => {
    showToast?.({
      title: 'Preferences Saved',
      description: 'Your learning preferences have been updated.',
      type: 'success'
    });
  };

  return (
    <LmsLayout activePath={LMS_ROUTES.SETTINGS} pageTitle="Settings">
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.03] p-6 rounded-3xl border border-emerald-500/20 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 mb-1">
              <Link href={LMS_ROUTES.DASHBOARD} className="hover:text-emerald-400 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-emerald-400">Preferences</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Learning Platform Preferences
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Configure notification frequencies, study alerts, and security settings.
            </p>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 space-y-6 shadow-xl max-w-2xl">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <span>🔔</span>
            <span>Study & Course Notifications</span>
          </h2>

          <div className="space-y-4 pt-2">
            {[
              {
                title: 'Email Course Updates',
                desc: 'Receive alerts when instructors post new lectures or announcements.',
                state: emailNotifications,
                toggle: () => setEmailNotifications(!emailNotifications)
              },
              {
                title: 'Weekly Study Digest',
                desc: 'Receive weekly progress digests, completed quizzes, and streak alerts.',
                state: weeklyDigest,
                toggle: () => setWeeklyDigest(!weeklyDigest)
              },
              {
                title: 'Assignment Deadlines',
                desc: 'Receive push & email reminders 48h before project submissions close.',
                state: courseReminders,
                toggle: () => setCourseReminders(!courseReminders)
              }
            ].map((pref, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">{pref.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{pref.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={pref.toggle}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    pref.state ? 'bg-emerald-600' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                      pref.state ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleSave}
              className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </LmsLayout>
  );
}

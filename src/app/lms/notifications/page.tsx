'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LMS_ROUTES } from '@/lib/lms-routes';
import { LmsLayout } from '@/components/lms/LmsLayout';

export default function LmsNotificationsPage() {
  const [notifications] = useState([
    {
      id: 'notif-1',
      title: 'New module published in Next.js 16 Masterclass',
      time: '2 hours ago',
      read: false,
      icon: 'auto_stories'
    },
    {
      id: 'notif-2',
      title: 'Your certificate for Enterprise AI Agents is ready to download',
      time: '1 day ago',
      read: true,
      icon: 'military_tech'
    },
    {
      id: 'notif-3',
      title: 'Instructor Sarah Jenkins reviewed your code assignment',
      time: '3 days ago',
      read: true,
      icon: 'task_alt'
    }
  ]);

  return (
    <LmsLayout activePath={LMS_ROUTES.NOTIFICATIONS} pageTitle="Notifications">
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.03] p-6 rounded-3xl border border-emerald-500/20 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 mb-1">
              <Link href={LMS_ROUTES.DASHBOARD} className="hover:text-emerald-400 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-emerald-400">Notifications</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Learning Notifications
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Course announcements, project feedback, and certificate alerts.
            </p>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3 max-w-3xl">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                notif.read
                  ? 'bg-white/[0.02] border-white/5 text-slate-400'
                  : 'bg-emerald-950/20 border-emerald-500/30 text-white'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Icon name={notif.icon} size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-snug">{notif.title}</h4>
                  <span className="text-[10px] font-mono text-slate-400">{notif.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </LmsLayout>
  );
}

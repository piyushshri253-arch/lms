'use client';

import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Search,
  ExternalLink,
  ShieldCheck,
  Megaphone,
  Check,
  Trash2,
  Filter
} from 'lucide-react';

export interface SeoNotificationItem {
  id: string;
  category: 'TASK' | 'INDEXING' | 'ALERT' | 'COURSE';
  title: string;
  description: string;
  time: string;
  unread: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'NORMAL';
  actionUrl?: string;
}

const INITIAL_NOTIFICATIONS: SeoNotificationItem[] = [
  {
    id: 'n-1',
    category: 'TASK',
    title: 'New SEO Task Assigned to Priya Sharma',
    description: 'Meta Description & Open Graph update for Mathematics Course (Deadline: Apr 30, 2026).',
    time: '12m ago',
    unread: true,
    priority: 'HIGH'
  },
  {
    id: 'n-2',
    category: 'TASK',
    title: 'Task Submitted for Manager Review',
    description: 'Amit Kumar submitted Keyword Optimization on Science Course for your approval.',
    time: '28m ago',
    unread: true,
    priority: 'HIGH'
  },
  {
    id: 'n-3',
    category: 'INDEXING',
    title: 'Google Search Console Crawl Complete',
    description: '24 URLs successfully crawled and indexed on property https://morenateach.com/.',
    time: '1h ago',
    unread: true,
    priority: 'NORMAL'
  },
  {
    id: 'n-4',
    category: 'COURSE',
    title: 'New Course Published in LMS Database',
    description: 'Digital Campus & ERP Management is published and automatically queued for SEO optimization.',
    time: '3h ago',
    unread: false,
    priority: 'MEDIUM'
  },
  {
    id: 'n-5',
    category: 'ALERT',
    title: 'Keyword Ranking Surge: Position #1.1',
    description: '"morena teach official website" hit position #1 with 11 organic search clicks.',
    time: '5h ago',
    unread: false,
    priority: 'NORMAL'
  },
  {
    id: 'n-6',
    category: 'TASK',
    title: 'SEO Work Approved by Manager',
    description: 'Sneha Patel completed Image Alt Text on English Course and manager approved changes.',
    time: 'Yesterday',
    unread: false,
    priority: 'NORMAL'
  }
];

export function SeoNotificationsView() {
  const [notifications, setNotifications] = useState<SeoNotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'TASK' | 'INDEXING'>('ALL');
  const [toast, setToast] = useState<string | null>(null);

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD') return n.unread;
    if (filter === 'TASK') return n.category === 'TASK';
    if (filter === 'INDEXING') return n.category === 'INDEXING';
    return true;
  });

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setToast('All notifications marked as read! ✓');
    setTimeout(() => setToast(null), 3000);
  };

  const handleClearRead = () => {
    setNotifications((prev) => prev.filter((n) => n.unread));
    setToast('Cleared all read notifications! ✓');
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n))
    );
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in">
      {/* Toast Alert */}
      {toast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{toast}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold uppercase tracking-wider mb-2">
            <Bell size={13} className="text-rose-600" />
            <span>SEO NOTIFICATION CENTER</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Alerts &amp; Activity Stream</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-500 text-white">
              {notifications.filter((n) => n.unread).length} Unread
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time alerts on course publication, task deadlines, approvals, and Google index status.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Check size={13} className="text-blue-600" />
            <span>Mark All Read</span>
          </button>
          <button
            type="button"
            onClick={handleClearRead}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={13} />
            <span>Clear Read</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-x-auto">
        {[
          { id: 'ALL', label: `All Alerts (${notifications.length})` },
          { id: 'UNREAD', label: `Unread (${notifications.filter((n) => n.unread).length})` },
          { id: 'TASK', label: 'Tasks & Reviews' },
          { id: 'INDEXING', label: 'Google Search Index' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              filter === tab.id
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xs divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 italic text-xs">
            No notifications in this filter category.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => handleToggleRead(item.id)}
              className={`py-4 px-3 rounded-2xl transition-all cursor-pointer flex items-start justify-between gap-4 ${
                item.unread ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    item.category === 'TASK'
                      ? 'bg-blue-100 text-blue-600'
                      : item.category === 'INDEXING'
                      ? 'bg-emerald-100 text-emerald-600'
                      : item.category === 'COURSE'
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  {item.category === 'TASK' ? (
                    <Layers size={17} />
                  ) : item.category === 'INDEXING' ? (
                    <Search size={17} />
                  ) : item.category === 'COURSE' ? (
                    <CheckCircle2 size={17} />
                  ) : (
                    <Bell size={17} />
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                    {item.unread && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                    {item.priority === 'HIGH' && (
                      <span className="px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 text-[9px] font-bold">
                        HIGH
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">{item.description}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 font-mono font-medium">{item.time}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

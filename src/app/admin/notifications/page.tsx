'use client';

import React, { useState, Suspense } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useAdmin } from '@/context/AdminContext';
import { useApp } from '@/context/AppContext';

function NotificationsPageContent() {
  const { hasPermission, activeFacility } = useAdmin();
  const { showToast } = useApp();

  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    message: '',
    audience: 'ALL_STUDENTS',
    courseId: '',
    priority: 'NORMAL'
  });

  const [notifications, setNotifications] = useState<any[]>([
    {
      id: 'notif-1',
      title: 'Scheduled Maintenance Notice: Platform Upgrade',
      message: 'The learning portal will undergo 15 minutes of routine database optimization tonight at 2:00 AM IST.',
      audience: 'All Students in Facility',
      priority: 'HIGH',
      sentAt: 'Today, 10:30 AM',
      deliveredCount: 1240,
      readCount: 840
    },
    {
      id: 'notif-2',
      title: 'Next.js 15 Masterclass: Live Q&A Session Tomorrow',
      message: 'Dr. Sameer Verma will host a live question & answer workshop on Turbopack caching strategies.',
      audience: 'Course: Full-Stack Next.js 15',
      priority: 'NORMAL',
      sentAt: 'Yesterday, 04:15 PM',
      deliveredCount: 540,
      readCount: 420
    },
    {
      id: 'notif-3',
      title: 'Welcome to Term 2 Academic Schedule',
      message: 'New coursework, syllabus guidelines, and grading rubrics have been published to your student dashboards.',
      audience: 'All Facility Learners',
      priority: 'NORMAL',
      sentAt: '10 Sept 2026',
      deliveredCount: 1210,
      readCount: 1150
    }
  ]);

  // RBAC Access Guard: notification.view
  if (!hasPermission('notification.view')) {
    return (
      <div className="p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-3xl space-y-3 max-w-lg mx-auto mt-12">
        <div className="w-12 h-12 rounded-full bg-error-container/30 text-error flex items-center justify-center mx-auto">
          <Icon name="lock" size={24} />
        </div>
        <h2 className="text-base font-extrabold text-on-surface">Access Denied</h2>
        <p className="text-xs text-outline">
          Your administrator account does not possess the <strong>notification.view</strong> permission for{' '}
          {activeFacility?.name || 'this facility'}.
        </p>
      </div>
    );
  }

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('notification.send')) {
      showToast('Permission notification.send required', 'error');
      return;
    }
    const newNotif = {
      id: `notif-${Date.now()}`,
      title: form.title,
      message: form.message,
      audience:
        form.audience === 'ALL_STUDENTS'
          ? 'All Students in Facility'
          : form.audience === 'FACULTY'
          ? 'Facility Faculty & Instructors'
          : 'Specific Course Learners',
      priority: form.priority,
      sentAt: 'Just now',
      deliveredCount: 1240,
      readCount: 0
    };
    setNotifications([newNotif, ...notifications]);
    setIsBroadcastModalOpen(false);
    setForm({
      title: '',
      message: '',
      audience: 'ALL_STUDENTS',
      courseId: '',
      priority: 'NORMAL'
    });
    showToast('Broadcast notification dispatched across institutional channels', 'success');
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
              Institutional Notifications &amp; Announcements
            </h1>
            <span className="text-[11px] font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full">
              {activeFacility?.name}
            </span>
          </div>
          <p className="text-xs text-outline font-medium mt-1">
            Dispatch urgent updates, lecture alerts, and system notices directly to student dashboards and emails.
          </p>
        </div>

        {/* Action Button: Send Broadcast (guarded by notification.send) */}
        {hasPermission('notification.send') && (
          <button
            type="button"
            onClick={() => setIsBroadcastModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Icon name="campaign" size={16} />
            <span>+ Send Broadcast</span>
          </button>
        )}
      </div>

      {/* Notifications Log */}
      <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-5 shadow-2xs space-y-4">
        <h3 className="font-extrabold text-sm text-on-surface">Sent Notification History</h3>

        <div className="divide-y divide-outline-variant/30">
          {notifications.map((notif) => (
            <div key={notif.id} className="py-4 space-y-2 first:pt-0 last:pb-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      notif.priority === 'HIGH'
                        ? 'bg-rose-500/10 text-rose-700'
                        : 'bg-indigo-500/10 text-indigo-700'
                    }`}
                  >
                    {notif.priority}
                  </span>
                  <h4 className="font-bold text-xs sm:text-sm text-on-surface">{notif.title}</h4>
                </div>
                <span className="text-[11px] font-mono text-outline">{notif.sentAt}</span>
              </div>

              <p className="text-xs text-on-surface-variant font-medium leading-relaxed max-w-3xl">
                {notif.message}
              </p>

              <div className="flex items-center justify-between text-[11px] font-mono text-outline pt-1">
                <span className="flex items-center gap-1">
                  <Icon name="groups" size={14} />
                  <span>Audience: {notif.audience}</span>
                </span>
                <span>
                  Delivered: <strong className="text-on-surface">{notif.deliveredCount}</strong> • Read: <strong className="text-emerald-600">{notif.readCount}</strong> ({Math.round((notif.readCount / notif.deliveredCount) * 100)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Send Broadcast Notification */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
              <div className="flex items-center gap-2">
                <Icon name="campaign" size={20} className="text-primary" />
                <h3 className="font-black text-sm text-on-surface">Dispatch Broadcast Notice</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBroadcastModalOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-on-surface block mb-1">Notice Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Schedule Change: Workshop Time"
                  className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-bold text-on-surface block mb-1">Audience Scope</label>
                <select
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
                >
                  <option value="ALL_STUDENTS">All Registered Students in {activeFacility?.name}</option>
                  <option value="FACULTY">Facility Faculty &amp; Instructors</option>
                  <option value="COURSE">Specific Course Enrollees</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-on-surface block mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
                >
                  <option value="NORMAL">Normal Announcement</option>
                  <option value="HIGH">High Priority (Highlights in App)</option>
                  <option value="URGENT">Urgent (App Banner + Email)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-on-surface block mb-1">Message Content</label>
                <textarea
                  rows={4}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Type the announcement details here..."
                  className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-outline-variant/40">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant/80 text-xs font-bold text-outline hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 cursor-pointer"
                >
                  Send Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NotificationsAdminPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-outline">Loading Notifications Hub...</div>}>
      <NotificationsPageContent />
    </Suspense>
  );
}

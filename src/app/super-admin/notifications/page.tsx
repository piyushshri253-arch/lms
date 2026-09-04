'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

export default function SuperAdminNotificationsPage() {
  const { showToast } = useApp();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'ACCOUNT' | 'SYSTEM'>('ALL');
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('ALL');
  const [courseId, setCourseId] = useState('');
  const [notifType, setNotifType] = useState('SYSTEM');
  const [isDispatching, setIsDispatching] = useState(false);

  const fetchNotificationsAndCourses = async (activeFilter = filter) => {
    setIsLoading(true);
    try {
      const [nRes, cRes] = await Promise.all([
        fetch(`/api/super-admin/notifications?filter=${activeFilter}`),
        fetch('/api/super-admin/courses')
      ]);

      if (nRes.ok) {
        const d = await nRes.json();
        setNotifications(d.notifications || []);
        setUnreadCount(d.unreadCount || 0);
        setTotalCount(d.totalCount || 0);
      }
      if (cRes.ok) {
        const c = await cRes.json();
        setCourses(c.courses || []);
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to load notifications.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificationsAndCourses(filter);
  }, [filter]);

  const handleMarkAsRead = async (id: string, isRead = true) => {
    try {
      const res = await fetch('/api/super-admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isRead })
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead } : n))
        );
        setUnreadCount((c) => Math.max(0, isRead ? c - 1 : c + 1));
      }
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/super-admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true })
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        showToast({ title: 'Success', description: 'All notifications marked as read.', type: 'success' });
      }
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/super-admin/notifications?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        setTotalCount((c) => Math.max(0, c - 1));
        showToast({ title: 'Removed', description: 'Notification deleted.', type: 'info' });
      }
    } catch {}
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDispatching(true);
    try {
      const res = await fetch('/api/super-admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          targetAudience: courseId ? undefined : targetAudience,
          courseId: courseId || undefined,
          type: notifType
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch notification');

      showToast({ title: 'Notification Broadcast Dispatched', description: data.message, type: 'success' });
      setIsBroadcastOpen(false);
      setTitle('');
      setMessage('');
      setCourseId('');
      await fetchNotificationsAndCourses(filter);
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/super-admin" className="hover:text-primary">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Notifications Control Center</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-on-surface tracking-tight">
              Platform Notifications &amp; Registration Alerts
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 font-mono text-xs font-black animate-pulse">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Real-time feed of new student registrations, account verifications, system events, and broadcast dispatcher.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2.5 bg-surface text-on-surface border border-outline-variant hover:bg-surface-container rounded-xl font-bold text-xs cursor-pointer transition-all"
            >
              Mark All as Read
            </button>
          )}

          <button
            onClick={() => setIsBroadcastOpen(true)}
            className="px-5 py-2.5 bg-primary text-on-primary font-extrabold text-xs rounded-xl hover:bg-primary-container shadow-xs flex items-center gap-2 cursor-pointer transition-all"
          >
            <Icon name="campaign" size={18} />
            <span>Dispatch Notification</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant pb-2 overflow-x-auto">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'ALL'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          All ({totalCount})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'UNREAD'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('ACCOUNT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'ACCOUNT'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Registrations &amp; Accounts
        </button>
        <button
          onClick={() => setFilter('SYSTEM')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'SYSTEM'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          System Alerts
        </button>
      </div>

      {/* Notifications List Container */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
            <Icon name="sync" size={20} className="animate-spin text-primary" />
            <span>Loading notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center mx-auto">
              <Icon name="notifications_off" size={24} />
            </div>
            <p className="text-sm font-bold text-on-surface">No notifications found</p>
            <p className="text-xs text-on-surface-variant">
              When new students register or events occur, they will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/40">
            {notifications.map((n) => {
              const isAccountEvent = n.type === 'ACCOUNT' || n.title?.includes('Registered') || n.title?.includes('Activated');

              return (
                <div
                  key={n.id}
                  className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs transition-colors ${
                    !n.isRead ? 'bg-primary/5 hover:bg-primary/8' : 'hover:bg-surface-container-low/40'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-xs ${
                        isAccountEvent
                          ? 'bg-indigo-500/15 text-indigo-700'
                          : n.type === 'SECURITY'
                          ? 'bg-rose-500/15 text-rose-700'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      <Icon
                        name={
                          isAccountEvent
                            ? 'person_add'
                            : n.type === 'SECURITY'
                            ? 'security'
                            : 'notifications'
                        }
                        size={20}
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-black text-sm ${!n.isRead ? 'text-primary' : 'text-on-surface'}`}>
                          {n.title}
                        </span>
                        <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/50">
                          {n.type}
                        </span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping inline-block" />
                        )}
                      </div>

                      <p className="text-on-surface-variant text-xs leading-relaxed max-w-2xl">
                        {n.message}
                      </p>

                      {isAccountEvent && (
                        <div className="pt-1 flex items-center gap-3">
                          <Link
                            href="/super-admin/students"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                          >
                            <span>Open Students Directory</span>
                            <Icon name="arrow_forward" size={12} />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <span className="text-[11px] font-mono text-outline">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>

                    <button
                      onClick={() => handleMarkAsRead(n.id, !n.isRead)}
                      title={n.isRead ? 'Mark as unread' : 'Mark as read'}
                      className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    >
                      <Icon name={n.isRead ? 'mark_email_unread' : 'drafts'} size={18} />
                    </button>

                    <button
                      onClick={() => handleDelete(n.id)}
                      title="Delete notification"
                      className="p-1.5 rounded-lg hover:bg-error-container/30 text-outline hover:text-error transition-colors cursor-pointer"
                    >
                      <Icon name="delete" size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Broadcast Modal */}
      <Modal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        maxWidth="md"
        title="Dispatch Targeted Notification"
        subtitle="Broadcast directly to user inboxes and toast alert streams"
      >
        <form onSubmit={handleBroadcast} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Target Audience
            </label>
            <select
              value={targetAudience}
              onChange={(e) => {
                setTargetAudience(e.target.value);
                setCourseId('');
              }}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">All Platform Users</option>
              <option value="STUDENTS">All Students</option>
              <option value="INSTRUCTORS">All Faculty Instructors</option>
              <option value="ADMINS">All Administrative Staff</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Or Target Specific Course Cohort
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="">-- No specific course cohort --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.enrollmentCount} enrolled)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Notification Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New Live Workshop Added to Your Curriculum"
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Notification Body
            </label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Full notification details..."
              className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <div className="pt-3 border-t border-outline-variant/40 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsBroadcastOpen(false)}
              className="px-4 py-2 text-xs rounded-xl border border-outline-variant cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDispatching}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-xs cursor-pointer"
            >
              {isDispatching ? 'Broadcasting...' : 'Dispatch Notification'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

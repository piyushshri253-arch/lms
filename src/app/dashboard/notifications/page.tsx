'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

export default function StudentNotificationsPage() {
  const { showToast } = useApp();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/student/notifications');
      if (res.ok) {
        const d = await res.json();
        setNotifications(d.notifications || []);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const res = await fetch('/api/student/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });
      if (res.ok) {
        await fetchNotifications();
      }
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/student/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      });
      if (res.ok) {
        showToast({ title: 'All marked as read', type: 'info' });
        await fetchNotifications();
      }
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/dashboard" className="hover:text-primary">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Notifications</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">Notifications Hub</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Course updates, certificates, announcements, and payment notices
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
          >
            Mark All as Read ({unreadCount})
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && handleMarkAsRead(n.id)}
              className={`p-5 rounded-3xl border transition-all flex items-start justify-between gap-4 cursor-pointer ${
                n.isRead
                  ? 'bg-surface-container-lowest border-outline-variant/60 opacity-80'
                  : 'bg-primary/5 border-primary/30 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                    n.type === 'CERTIFICATE'
                      ? 'bg-amber-100 text-amber-700'
                      : n.type === 'ENROLLMENT'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  <Icon
                    name={
                      n.type === 'CERTIFICATE'
                        ? 'workspace_premium'
                        : n.type === 'ENROLLMENT'
                        ? 'school'
                        : 'notifications'
                    }
                    size={20}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm text-on-surface">{n.title}</h3>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-outline font-mono block pt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {!n.isRead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(n.id);
                  }}
                  className="text-xs font-bold text-primary hover:underline shrink-0"
                >
                  Mark read
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="bg-surface-container-lowest p-12 rounded-3xl border border-outline-variant/80 text-center space-y-2">
            <Icon name="notifications_none" size={28} className="text-outline mx-auto" />
            <p className="font-bold text-sm text-on-surface">No notifications</p>
            <p className="text-xs text-outline">You're all caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
}

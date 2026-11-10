'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function ReviewerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, logout, showToast } = useApp();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        const notifs = data.notifications || [];
        setNotifications(notifs);
        setUnreadCount(data.unreadCount !== undefined ? data.unreadCount : notifs.filter((n: any) => !n.isRead).length);
      }
    } catch {
      // Ignore background notification fetch errors
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true })
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = async (id: string, link?: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isRead: true })
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setShowNotifications(false);
      if (link && link.startsWith('/reviewer')) {
        router.push(link);
      } else {
        router.push('/reviewer');
      }
    } catch {}
  };

  const [reviewerUser, setReviewerUser] = useState<any>(null);
  const [isLoadingReviewer, setIsLoadingReviewer] = useState(true);

  const fetchReviewerProfile = async () => {
    try {
      const res = await fetch('/api/reviewer/me');
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          setReviewerUser(data.user);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingReviewer(false);
    }
  };

  useEffect(() => {
    fetchReviewerProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout?portal=reviewer', { method: 'POST' });
      showToast({ title: 'Logged Out', description: 'Auditor session signed out.', type: 'info' });
      router.push('/reviewer/login');
    } catch (e: any) {
      showToast({ title: 'Error', description: e.message || 'Logout failed', type: 'error' });
    }
  };

  const isReviewerRole =
    currentUser &&
    ['REVIEWER', 'AUDITOR', 'ADMIN', 'SUPER_ADMIN', 'LMS_ADMIN', 'SALES_ADMIN', 'INSTRUCTOR'].includes(
      currentUser.role
    );

  const activeReviewer = reviewerUser || (isReviewerRole ? currentUser : null);

  const isRestricted = !isLoadingReviewer && !activeReviewer && currentUser && currentUser.role === 'STUDENT';

  if (isRestricted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/5">
            <Icon name="verified_user" size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Audit Studio Restricted</h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              You are currently signed in as <span className="font-semibold text-slate-200">{currentUser.name || currentUser.email}</span> with role <span className="font-bold text-amber-400 uppercase tracking-wide text-xs px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">{currentUser.role}</span>.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              The Course Audit Studio is exclusively reserved for Course Auditors and Platform Administrators to evaluate and approve submissions.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                router.push('/reviewer/login');
              }}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              Sign In with Auditor Account
            </button>
            <button
              onClick={() => {
                if (currentUser.role === 'INSTRUCTOR') {
                  router.push('/instructor');
                } else {
                  router.push('/student/learning');
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
            >
              Return to {currentUser.role === 'INSTRUCTOR' ? 'Instructor Dashboard' : 'Student Dashboard'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900 font-sans selection:bg-blue-500/20">
      {children}
    </div>
  );
}

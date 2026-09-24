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

  const activeReviewer = reviewerUser || (currentUser?.role === 'REVIEWER' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' ? currentUser : null);

  const isRestricted = !isLoadingReviewer && !activeReviewer && currentUser && (currentUser.role === 'INSTRUCTOR' || currentUser.role === 'STUDENT');

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 transition-colors">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-4">
            <Link href="/reviewer" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Icon name="verified" size={24} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                    MORENA TEACH
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                    AUDITOR STUDIO
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Quality Assurance & Curriculum Audit</p>
              </div>
            </Link>
          </div>

          {/* Center Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/reviewer"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                pathname === '/reviewer'
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon name="rate_review" size={18} />
              Audit Queue
            </Link>
          </nav>

          {/* Right Action Icons & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle (Light / Dark) */}
            <ThemeToggle variant="icon" />

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications && unreadCount > 0) {
                    markAllRead();
                  }
                }}
                className="relative p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Notifications"
              >
                <Icon name="notifications" size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n.id, n.link)}
                          className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                            !n.isRead ? 'bg-indigo-50/70 dark:bg-indigo-950/20' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-base text-indigo-600 dark:text-indigo-400 mt-0.5">
                              <Icon name="info" size={16} />
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-900 dark:text-slate-200">{n.title}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                {new Date(n.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Chip */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
              <UserAvatar
                name={activeReviewer?.name || 'Auditor'}
                avatar={activeReviewer?.avatar}
                size="sm"
              />
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                  {activeReviewer?.name || 'Quality Auditor'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                    {activeReviewer?.role === 'SUPER_ADMIN' ? 'Super Admin' : activeReviewer?.role === 'ADMIN' ? 'Admin' : 'Course Auditor'}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors ml-1 cursor-pointer"
                title="Sign Out"
              >
                <Icon name="logout" size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white/80 dark:bg-slate-950/80 py-6 text-center text-xs text-slate-500 transition-colors">
        <p>MORENA TEACH LMS • Course Quality & Content Audit Portal</p>
      </footer>
    </div>
  );
}

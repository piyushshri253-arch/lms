'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { UserAvatar } from '../ui/UserAvatar';

interface AppHeaderProps {
  onMenuToggle?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onMenuToggle }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, logout, showToast } = useApp();

  const effectiveRole =
    currentUser?.role ||
    (pathname.startsWith('/admin')
      ? 'ADMIN'
      : pathname.startsWith('/super-admin')
      ? 'SUPER_ADMIN'
      : pathname.startsWith('/instructor')
      ? 'INSTRUCTOR'
      : pathname.startsWith('/reviewer')
      ? 'REVIEWER'
      : 'STUDENT');

  const notificationsUrl =
    effectiveRole === 'SUPER_ADMIN'
      ? '/super-admin/notifications'
      : effectiveRole === 'ADMIN'
      ? '/admin/notifications'
      : effectiveRole === 'INSTRUCTOR'
      ? '/instructor'
      : effectiveRole === 'REVIEWER'
      ? '/reviewer'
      : '/student/learning?tab=notifications';

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Quick Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  // Notifications State
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // App Launcher Drawer State
  const [isAppsOpen, setIsAppsOpen] = useState(false);
  const appsRef = useRef<HTMLDivElement>(null);

  // User Profile Dropdown State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Docs Modal State
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  // Enrolled Courses for "Resume Learning"
  const [firstEnrolledCourseId, setFirstEnrolledCourseId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/notifications')
      .then((res) => res.ok && res.json())
      .then((data) => {
        if (data) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      })
      .catch(() => {});

    fetch('/api/student/courses')
      .then((res) => res.ok && res.json())
      .then((data) => {
        if (data?.enrolledCourses?.length > 0) {
          setFirstEnrolledCourseId(data.enrolledCourses[0].courseId || data.enrolledCourses[0].course?.id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (appsRef.current && !appsRef.current.contains(e.target as Node)) {
        setIsAppsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/courses?search=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const d = await res.json();
          setSearchResults(d.courses?.slice(0, 5) || []);
          setIsSearchOpen(true);
        }
      } catch {}
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      router.push(`/courses?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim()) return;
    setIsCreatingCourse(true);

    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: courseTitle.trim(),
          description: `Comprehensive curriculum covering modern engineering principles and architecture for ${courseTitle.trim()}.`,
          price: 149.99,
          level: 'ALL_LEVELS',
          status: 'DRAFT'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create course');

      showToast({
        title: 'Course Initialized!',
        description: `Draft "${courseTitle}" created successfully.`,
        type: 'success'
      });

      setIsCreateOpen(false);
      setCourseTitle('');
      router.push(`/admin/content`);
    } catch (err: any) {
      showToast({
        title: 'Creation Failed',
        description: err.message || 'Could not initialize course.',
        type: 'error'
      });
    } finally {
      setIsCreatingCourse(false);
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
      setIsNotifOpen(false);

      if (link) {
        let target = link;
        if (effectiveRole === 'INSTRUCTOR') {
          if (
            target.startsWith('/dashboard') ||
            target.startsWith('/student') ||
            target.startsWith('/admin')
          ) {
            target = '/instructor';
          } else if (target.startsWith('/instructor/courses/') && !target.includes('/builder')) {
            const courseId = target.replace('/instructor/courses/', '');
            target = `/instructor/courses/builder?courseId=${courseId}`;
          }
        } else if (effectiveRole === 'REVIEWER') {
          if (!target.startsWith('/reviewer')) {
            target = '/reviewer';
          }
        } else if (effectiveRole === 'STUDENT') {
          if (target.startsWith('/dashboard/notifications') || target === '/dashboard') {
            target = '/student/learning?tab=notifications';
          }
        }
        router.push(target);
      } else {
        router.push(notificationsUrl);
      }
    } catch {}
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true })
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      showToast({ title: 'Notifications Cleared', type: 'info' });
    } catch {}
  };

  const handleResumeLearning = () => {
    if (firstEnrolledCourseId) {
      router.push(`/learn/${firstEnrolledCourseId}`);
    } else {
      showToast({
        title: 'Explore Masterclasses',
        description: 'Choose a course from the catalog to begin learning.',
        type: 'info'
      });
      router.push('/courses');
    }
  };

  const handleSignOut = async () => {
    setIsProfileOpen(false);
    await logout();
    showToast({ title: 'Signed Out', description: 'See you next time!', type: 'info' });
    router.push('/login');
  };

  return (
    <>
      <header className="bg-surface/95 backdrop-blur-md sticky top-0 z-30 border-b border-outline-variant/80 shadow-xs h-[72px]">
        <div className="flex justify-between items-center w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto h-full gap-4">
          {/* Left: Mobile Toggle & Search */}
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuToggle}
              className="lg:hidden text-on-surface-variant hover:bg-surface-container rounded-xl p-2 transition-all cursor-pointer"
            >
              <Icon name="menu" size={24} />
            </button>

            <Link href="/" className="lg:hidden font-black text-base text-primary flex items-center gap-1.5 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-black">
                A
              </div>
              <span className="font-display">MORENA TEACH</span>
            </Link>

            {/* Desktop Instant Search */}
            <div ref={searchRef} className="relative hidden md:block w-72 lg:w-84">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Icon
                  name="search"
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setIsSearchOpen(true)}
                  placeholder="Search courses..."
                  className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant/80 rounded-2xl text-xs font-semibold text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </form>

              {/* Live Instant Search Autocomplete Popup */}
              {isSearchOpen && searchResults.length > 0 && (
                <div className="absolute left-0 top-11 w-full bg-surface-container-lowest border border-outline-variant/80 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-2.5 bg-surface-container-low/70 border-b border-outline-variant/60 text-[10px] font-mono font-bold uppercase text-outline">
                    Search Results ({searchResults.length})
                  </div>
                  <div className="divide-y divide-outline-variant/40">
                    {searchResults.map((c) => (
                      <Link
                        key={c.id}
                        href={`/courses/${c.id}`}
                        onClick={() => setIsSearchOpen(false)}
                        className="p-3 hover:bg-surface-container-low flex items-center gap-3 transition-colors block"
                      >
                        {c.thumbnail ? (
                          <img
                            src={c.thumbnail}
                            alt={c.title}
                            className="w-10 h-8 rounded-lg object-cover bg-surface-container shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-8 rounded-lg bg-surface-container flex items-center justify-center text-outline shrink-0">
                            <Icon name="school" size={16} />
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <p className="font-bold text-xs text-on-surface truncate">{c.title}</p>
                          <p className="text-[10px] text-outline font-mono">${c.price} • {c.category?.name || 'Computer Science'}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link
                    href={`/courses?search=${encodeURIComponent(searchQuery)}`}
                    onClick={() => setIsSearchOpen(false)}
                    className="p-2.5 bg-surface-container-low/50 text-center text-xs font-bold text-primary block hover:underline"
                  >
                    View All Results &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Center Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-6">
            <Link
              href="/courses"
              className="text-on-surface-variant hover:text-primary font-bold text-xs transition-colors py-1 flex items-center gap-1"
            >
              <span>Explore</span>
            </Link>

            <Link
              href={notificationsUrl}
              className="text-on-surface-variant hover:text-primary font-bold text-xs transition-colors py-1 flex items-center gap-1"
            >
              <span>Announcements</span>
            </Link>

            <button
              onClick={() => setIsDocsOpen(true)}
              className="text-on-surface-variant hover:text-primary font-bold text-xs transition-colors py-1 flex items-center gap-1 cursor-pointer"
            >
              <span>Platform Docs</span>
            </button>
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'INSTRUCTOR') && (
              <Link
                href="/admin/courses/builder"
                className="hidden sm:flex items-center gap-1.5 bg-surface-container-lowest border border-outline-variant hover:border-primary text-on-surface font-bold text-xs rounded-xl px-3.5 py-2 hover:bg-surface-container-low transition-all cursor-pointer shadow-xs"
              >
                <Icon name="add" size={16} />
                <span>Create Course</span>
              </Link>
            )}

            {effectiveRole === 'REVIEWER' && (
              <Link
                href="/reviewer"
                className="hidden sm:flex items-center gap-1.5 bg-indigo-600 text-white font-bold text-xs rounded-xl px-4 py-2 hover:bg-indigo-700 transition-all shadow-md cursor-pointer"
              >
                <Icon name="rate_review" size={16} />
                <span>Review Studio</span>
              </Link>
            )}

            {effectiveRole === 'STUDENT' && (
              <button
                onClick={handleResumeLearning}
                className="hidden sm:flex items-center gap-1.5 bg-primary text-on-primary font-bold text-xs rounded-xl px-4 py-2 hover:bg-primary-container transition-all shadow-md cursor-pointer"
              >
                <Icon name="play_arrow" size={16} />
                <span>Resume Learning</span>
              </button>
            )}

            {/* Icon Action Matrix */}
            <div className="flex items-center gap-1.5 border-l border-outline-variant pl-3 ml-1">
              {/* Notification Bell Dropdown */}
              <div ref={notifRef} className="relative">
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="text-on-surface-variant hover:bg-surface-container rounded-xl p-2 transition-all relative cursor-pointer"
                  aria-label="Notifications"
                >
                  <Icon name="notifications" size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-600 rounded-full border-2 border-surface flex items-center justify-center animate-pulse" />
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 top-12 w-80 sm:w-96 bg-surface-container-lowest border border-outline-variant/80 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-3 bg-surface-container-low/70 border-b border-outline-variant/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                          Notifications
                        </span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.2 bg-primary/10 text-primary font-mono text-[10px] font-bold rounded-full">
                            {unreadCount} unread
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllNotificationsRead}
                            className="text-[11px] font-bold text-outline hover:text-on-surface cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                        <Link
                          href={notificationsUrl}
                          onClick={() => setIsNotifOpen(false)}
                          className="text-[11px] font-bold text-primary hover:underline"
                        >
                          View All
                        </Link>
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-outline-variant/40">
                      {notifications.length > 0 ? (
                        notifications.slice(0, 6).map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n.id, n.link)}
                            className={`p-3.5 text-xs space-y-1 cursor-pointer transition-colors ${
                              n.isRead
                                ? 'hover:bg-surface-container-low/40 opacity-75'
                                : 'bg-primary/5 hover:bg-primary/10'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-on-surface truncate">{n.title}</span>
                              {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                            </div>
                            <p className="text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed">
                              {n.message}
                            </p>
                            <span className="text-[9px] font-mono text-outline block pt-0.5">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-xs text-outline space-y-1">
                          <Icon name="notifications_none" size={24} className="mx-auto text-outline/60" />
                          <p>You're all caught up!</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* App Launcher Grid Dropdown */}
              <div ref={appsRef} className="relative">
                <button
                  onClick={() => setIsAppsOpen(!isAppsOpen)}
                  className="text-on-surface-variant hover:bg-surface-container rounded-xl p-2 transition-all relative cursor-pointer"
                  aria-label="App Launcher"
                >
                  <Icon name="apps" size={20} />
                </button>

                {isAppsOpen && (
                  <div className="absolute right-0 top-12 w-72 bg-surface-container-lowest border border-outline-variant/80 rounded-2xl shadow-2xl z-50 p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-outline px-2 block">
                      MORENA TEACH Ecosystem
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/dashboard"
                        onClick={() => setIsAppsOpen(false)}
                        className="p-3 rounded-xl bg-surface-container-low hover:bg-primary/10 border border-outline-variant/60 hover:border-primary/40 flex flex-col items-center text-center gap-1.5 transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                          <Icon name="school" size={18} />
                        </div>
                        <span className="font-bold text-[11px] text-on-surface group-hover:text-primary">
                          Student Portal
                        </span>
                      </Link>

                      <Link
                        href="/courses"
                        onClick={() => setIsAppsOpen(false)}
                        className="p-3 rounded-xl bg-surface-container-low hover:bg-primary/10 border border-outline-variant/60 hover:border-primary/40 flex flex-col items-center text-center gap-1.5 transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-700 flex items-center justify-center font-bold">
                          <Icon name="storefront" size={18} />
                        </div>
                        <span className="font-bold text-[11px] text-on-surface group-hover:text-indigo-700">
                          Course Catalog
                        </span>
                      </Link>

                      {(currentUser?.role === 'INSTRUCTOR' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
                        <Link
                          href="/instructor"
                          onClick={() => setIsAppsOpen(false)}
                          className="p-3 rounded-xl bg-surface-container-low hover:bg-primary/10 border border-outline-variant/60 hover:border-primary/40 flex flex-col items-center text-center gap-1.5 transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                            <Icon name="school" size={18} />
                          </div>
                          <span className="font-bold text-[11px] text-on-surface group-hover:text-primary">
                            Instructor Studio
                          </span>
                        </Link>
                      )}

                      {(currentUser?.role === 'REVIEWER' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
                        <Link
                          href="/reviewer"
                          onClick={() => setIsAppsOpen(false)}
                          className="p-3 rounded-xl bg-surface-container-low hover:bg-primary/10 border border-outline-variant/60 hover:border-primary/40 flex flex-col items-center text-center gap-1.5 transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-700 flex items-center justify-center font-bold">
                            <Icon name="rate_review" size={18} />
                          </div>
                          <span className="font-bold text-[11px] text-on-surface group-hover:text-indigo-700">
                            Review Studio
                          </span>
                        </Link>
                      )}

                      {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
                        <Link
                          href="/admin"
                          onClick={() => setIsAppsOpen(false)}
                          className="p-3 rounded-xl bg-surface-container-low hover:bg-primary/10 border border-outline-variant/60 hover:border-primary/40 flex flex-col items-center text-center gap-1.5 transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
                            <Icon name="admin_panel_settings" size={18} />
                          </div>
                          <span className="font-bold text-[11px] text-on-surface group-hover:text-emerald-700">
                            Organization Admin
                          </span>
                        </Link>
                      )}

                      {currentUser?.role === 'SUPER_ADMIN' && (
                        <Link
                          href="/super-admin"
                          onClick={() => setIsAppsOpen(false)}
                          className="p-3 rounded-xl bg-surface-container-low hover:bg-amber-500/10 border border-outline-variant/60 hover:border-amber-500/40 flex flex-col items-center text-center gap-1.5 transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
                            <Icon name="shield" size={18} />
                          </div>
                          <span className="font-bold text-[11px] text-on-surface group-hover:text-amber-800">
                            Super Admin
                          </span>
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar & Profile Menu */}
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="rounded-full transition-transform hover:scale-105 cursor-pointer block"
                >
                  <UserAvatar
                    avatar={currentUser?.avatar}
                    name={currentUser?.name || ''}
                    size="sm"
                    className="w-9 h-9"
                  />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 top-12 w-64 bg-surface-container-lowest border border-outline-variant/80 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-3 bg-surface-container-low rounded-xl space-y-1 mb-1">
                      <div className="flex items-center justify-between">
                        <p className="font-extrabold text-xs text-on-surface truncate">
                          {currentUser?.name || (effectiveRole === 'ADMIN' ? 'Company Admin' : effectiveRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Account')}
                        </p>
                        <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {effectiveRole}
                        </span>
                      </div>
                      <p className="text-[10px] text-outline font-mono truncate">
                        {currentUser?.email || (currentUser?.organizationName || '')}
                      </p>
                    </div>

                    {effectiveRole === 'SUPER_ADMIN' ? (
                      <>
                        <Link
                          href="/super-admin/profile"
                          onClick={() => setIsProfileOpen(false)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors"
                        >
                          <Icon name="person" size={16} className="text-primary" />
                          <span>Super Admin Profile</span>
                        </Link>
                        <Link
                          href="/super-admin"
                          onClick={() => setIsProfileOpen(false)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors"
                        >
                          <Icon name="admin_panel_settings" size={16} className="text-primary" />
                          <span>Command Center</span>
                        </Link>
                        <Link
                          href="/super-admin/organizations"
                          onClick={() => setIsProfileOpen(false)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors"
                        >
                          <Icon name="domain" size={16} className="text-primary" />
                          <span>All Companies</span>
                        </Link>
                      </>
                    ) : effectiveRole === 'ADMIN' ? (
                      <>
                        <Link
                          href="/admin/profile"
                          onClick={() => setIsProfileOpen(false)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors"
                        >
                          <Icon name="person" size={16} className="text-primary" />
                          <span>Admin Profile</span>
                        </Link>
                        <Link
                          href="/admin"
                          onClick={() => setIsProfileOpen(false)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors"
                        >
                          <Icon name="dashboard" size={16} className="text-primary" />
                          <span>Company Dashboard</span>
                        </Link>
                        <Link
                          href="/admin/settings"
                          onClick={() => setIsProfileOpen(false)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors"
                        >
                          <Icon name="settings" size={16} className="text-primary" />
                          <span>Company Settings</span>
                        </Link>
                      </>
                    ) : effectiveRole === 'INSTRUCTOR' ? (
                      <>
                        <Link
                          href="/instructor/profile"
                          onClick={() => setIsProfileOpen(false)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors"
                        >
                          <Icon name="person" size={16} className="text-primary" />
                          <span>Faculty Profile</span>
                        </Link>
                        <Link
                          href="/instructor"
                          onClick={() => setIsProfileOpen(false)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors"
                        >
                          <Icon name="school" size={16} className="text-primary" />
                          <span>Instructor Studio</span>
                        </Link>
                      </>
                    ) : effectiveRole === 'REVIEWER' ? (
                      <>
                        <Link
                          href="/reviewer"
                          onClick={() => setIsProfileOpen(false)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors"
                        >
                          <Icon name="rate_review" size={16} className="text-indigo-500" />
                          <span>Review Queue</span>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/lms/profile"
                          onClick={() => setIsProfileOpen(false)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors"
                        >
                          <Icon name="person" size={16} className="text-outline" />
                          <span>My Profile</span>
                        </Link>

                        <Link
                          href="/lms/dashboard"
                          onClick={() => setIsProfileOpen(false)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors"
                        >
                          <Icon name="dashboard" size={16} className="text-outline" />
                          <span>LMS Dashboard</span>
                        </Link>

                        <Link
                          href="/lms/my-courses"
                          onClick={() => setIsProfileOpen(false)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors"
                        >
                          <Icon name="school" size={16} className="text-outline" />
                          <span>My Enrolled Courses</span>
                        </Link>

                        <Link
                          href="/lms/certificates"
                          onClick={() => setIsProfileOpen(false)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors"
                        >
                          <Icon name="workspace_premium" size={16} className="text-outline" />
                          <span>Diplomas &amp; Certificates</span>
                        </Link>

                        <Link
                          href="/lms/orders"
                          onClick={() => setIsProfileOpen(false)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2 transition-colors"
                        >
                          <Icon name="receipt_long" size={16} className="text-outline" />
                          <span>Orders &amp; Receipts</span>
                        </Link>
                      </>
                    )}

                    <div className="pt-1 border-t border-outline-variant/40">
                      <button
                        onClick={handleSignOut}
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Icon name="logout" size={16} className="text-rose-600" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Course Creation Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        maxWidth="md"
        title="Quick Course Creation"
        subtitle="Set up a new curriculum draft instantly in the database"
      >
        <form onSubmit={handleCreateCourse} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-on-surface uppercase tracking-wider">
              Course Title
            </label>
            <input
              type="text"
              required
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder="e.g. Distributed Systems with Go &amp; gRPC"
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary"
            />
          </div>

          <div className="pt-3 border-t border-outline-variant/40 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs rounded-xl border border-outline-variant cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingCourse}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-xs cursor-pointer"
            >
              {isCreatingCourse ? 'Creating Draft...' : 'Initialize Course'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Documentation & Student Guide Modal */}
      <Modal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
        maxWidth="lg"
        title="MORENA TEACH Platform Documentation"
        subtitle="Organization LMS &amp; Multi-Tenant Reference Guide"
      >
        <div className="space-y-4 text-xs text-on-surface leading-relaxed max-h-[400px] overflow-y-auto pr-2 font-body-md">
          <div className="p-4 bg-surface-container-low rounded-2xl space-y-2">
            <h4 className="font-extrabold text-sm text-primary flex items-center gap-1.5">
              <Icon name="domain" size={18} />
              <span>Multi-Tenant Architecture</span>
            </h4>
            <p className="text-on-surface-variant">
              Every organization operates within an isolated database context with dedicated user registries, courses, student progress, analytics, and custom branding.
            </p>
          </div>

          <div className="p-4 bg-surface-container-low rounded-2xl space-y-2">
            <h4 className="font-extrabold text-sm text-emerald-700 flex items-center gap-1.5">
              <Icon name="verified" size={18} />
              <span>Accredited Certificate Verification</span>
            </h4>
            <p className="text-on-surface-variant">
              Students completing 100% of required curriculum automatically receive a verified certificate with a tamper-resistant diploma ID verifiable across the web.
            </p>
          </div>

          <div className="p-4 bg-surface-container-low rounded-2xl space-y-2">
            <h4 className="font-extrabold text-sm text-amber-700 flex items-center gap-1.5">
              <Icon name="security" size={18} />
              <span>Role-Based Access Control &amp; RBAC</span>
            </h4>
            <p className="text-on-surface-variant">
              Server-side authorization verifies tenant ownership on every request, preventing cross-tenant data leakage and privilege escalation.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
};

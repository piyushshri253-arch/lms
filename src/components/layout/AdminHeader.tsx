'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useAdmin } from '@/context/AdminContext';
import { Icon } from '../ui/Icon';
import { UserAvatar } from '../ui/UserAvatar';

interface AdminHeaderProps {
  onMenuToggle?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onMenuToggle }) => {
  const router = useRouter();
  const { currentUser, logout, showToast } = useApp();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Profile Dropdown State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Real-Time Notifications State
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'PAYMENT' | 'STUDENT' | 'COURSES' | 'SUPPORT'>('ALL');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const notifRef = useRef<HTMLDivElement>(null);
  const knownNotifIdsRef = useRef<Set<string>>(new Set());
  const isInitialFetchRef = useRef(true);

  // Help & Support Modal State
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Initialize sound preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('lms_sound_enabled');
      if (stored !== null) setSoundEnabled(stored === 'true');
    } catch {}
  }, []);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('lms_sound_enabled', String(next));
      } catch {}
      return next;
    });
  };

  // High-fidelity web audio chime synthesizer
  const playNotificationChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Note 1 (E5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);

      // Note 2 (B5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.08);
      gain2.gain.setValueAtTime(0.15, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.42);
    } catch {}
  }, []);

  // Live polling (every 6 seconds) for instant LMS notifications
  const fetchNotifications = useCallback(
    async (isPollingCall = false) => {
      try {
        const res = await fetch('/api/notifications');
        if (!res.ok) return;
        const data = await res.json();
        if (!data || !data.notifications) return;

        const incoming: any[] = data.notifications;
        setNotifications(incoming);
        setUnreadCount(data.unreadCount || 0);

        if (!isInitialFetchRef.current && isPollingCall) {
          const newEvents = incoming.filter((n) => !knownNotifIdsRef.current.has(n.id));
          if (newEvents.length > 0) {
            if (soundEnabled) playNotificationChime();
            const top = newEvents[0];
            showToast({
              title: `🔔 Real-Time LMS Alert: ${top.title}`,
              description: top.message,
              type: 'info'
            });
          }
        }

        incoming.forEach((n) => knownNotifIdsRef.current.add(n.id));
        isInitialFetchRef.current = false;
      } catch {}
    },
    [soundEnabled, playNotificationChime, showToast]
  );

  useEffect(() => {
    fetchNotifications(false);
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true })
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      setIsSearching(true);
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/courses?search=${encodeURIComponent(searchQuery)}`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data.courses || []);
            setShowSearchResults(true);
          }
        } catch {
        } finally {
          setIsSearching(false);
        }
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery]);

  const companySlug = currentUser?.organizationSlug || 'morena-teach';

  return (
    <header className="sticky top-0 z-30 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 h-16 shadow-xs select-none">
      {/* Left: Mobile Menu Toggle, MORENA TEACH Brand & Facility Switcher */}
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-xl text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            title="Toggle Sidebar"
          >
            <Icon name="menu" size={20} />
          </button>
        )}

        {/* Brand Logo & Name */}
        <Link href="/admin" className="flex items-center gap-2 mr-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center font-black text-sm shadow-sm tracking-tighter">
            M
          </div>
          <span className="font-black text-sm text-on-surface tracking-tight hidden sm:inline-block">
            MORENA TEACH <span className="text-primary font-bold">LMS</span>
          </span>
        </Link>

        {/* Platform Role Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-low text-xs font-semibold text-on-surface">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-bold text-[11px] uppercase tracking-wider text-on-surface-variant">
            {currentUser?.role === 'SUPER_ADMIN' ? 'Super Admin Portal' : 'Admin Console'}
          </span>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div ref={searchRef} className="relative flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Icon
            name="search"
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
            placeholder="Search students, courses, enrollments, reports..."
            className="w-full bg-surface-container-low border border-outline-variant/80 rounded-2xl pl-10 pr-10 py-2 text-xs font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
          />
          {isSearching && (
            <Icon
              name="sync"
              size={16}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary animate-spin"
            />
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest border border-outline-variant/80 rounded-2xl shadow-2xl overflow-hidden divide-y divide-outline-variant/40 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="p-2.5 bg-surface-container-low text-[10px] font-mono font-extrabold uppercase text-outline flex justify-between">
              <span>{searchResults.length} Result(s)</span>
              <span>Click to view</span>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-outline-variant/20">
              {searchResults.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/courses?search=${encodeURIComponent(c.title)}`}
                  onClick={() => setShowSearchResults(false)}
                  className="p-3 flex items-center justify-between hover:bg-surface-container-low transition-colors block group"
                >
                  <div>
                    <span className="font-extrabold text-xs text-on-surface group-hover:text-primary transition-colors">
                      {c.title}
                    </span>
                    <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">
                      {c.category?.name || 'Curriculum'} • {c.level || 'All Levels'}
                    </p>
                  </div>
                  <Icon name="arrow_forward" size={14} className="text-outline group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Controls: Storefront, Help/Support, Notifications & Admin Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Storefront Link */}
        <Link
          href={`/org/${companySlug}`}
          target="_blank"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline-variant/80 hover:border-primary text-xs font-bold text-on-surface hover:text-primary bg-surface-container-lowest hover:bg-surface-container-low transition-all"
          title="View your public institution course catalog"
        >
          <Icon name="visibility" size={15} />
          <span>Live Storefront</span>
          <Icon name="north_east" size={12} className="text-outline" />
        </Link>

        {/* Help & Support Button */}
        <button
          type="button"
          onClick={() => setIsHelpOpen(true)}
          className="p-2 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          title="Help & Support"
        >
          <Icon name="help_outline" size={20} />
        </button>

        {/* Real-Time Live Notifications Bell */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container transition-colors relative cursor-pointer group"
            title="Real-Time LMS Notifications"
          >
            <Icon name="notifications" size={20} className="group-hover:rotate-6 transition-transform" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white font-black text-[9px] rounded-full flex items-center justify-center ring-2 ring-surface-container-lowest shadow-sm animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 top-12 w-96 bg-surface-container-lowest border border-outline-variant/90 rounded-2xl shadow-2xl z-50 p-3 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header with Live Sync Status & Sound Toggle */}
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs text-on-surface">LMS Live Notifications</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[9px] font-mono font-black border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleSound}
                    className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                    title={soundEnabled ? 'Mute notification chimes' : 'Unmute notification chimes'}
                  >
                    <Icon name={soundEnabled ? 'volume_up' : 'volume_off'} size={15} className={soundEnabled ? 'text-primary' : 'text-outline'} />
                  </button>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                {(
                  [
                    { key: 'ALL', label: 'All', icon: 'grid_view' },
                    { key: 'PAYMENT', label: 'Payments', icon: 'payments' },
                    { key: 'STUDENT', label: 'Students', icon: 'school' },
                    { key: 'COURSES', label: 'Courses', icon: 'menu_book' },
                    { key: 'SUPPORT', label: 'Support', icon: 'support_agent' }
                  ] as const
                ).map((tab) => {
                  const count =
                    tab.key === 'ALL'
                      ? notifications.length
                      : notifications.filter((n) => n.type === tab.key).length;
                  const isActive = notifFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setNotifFilter(tab.key)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                        isActive
                          ? 'bg-primary text-on-primary shadow-2xs'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[9px] font-mono px-1 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-outline-variant/40 text-outline'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Notification List */}
              <div className="max-h-72 overflow-y-auto divide-y divide-outline-variant/30 pr-0.5">
                {notifications.filter((n) => (notifFilter === 'ALL' ? true : n.type === notifFilter)).length === 0 ? (
                  <div className="p-6 text-center text-xs text-outline space-y-1">
                    <Icon name="notifications_none" size={24} className="mx-auto opacity-40 mb-1" />
                    <p className="font-semibold">No notifications under this filter</p>
                    <p className="text-[10px]">Real-time events will appear automatically.</p>
                  </div>
                ) : (
                  notifications
                    .filter((n) => (notifFilter === 'ALL' ? true : n.type === notifFilter))
                    .slice(0, 15)
                    .map((n) => {
                      const isPayment = n.type === 'PAYMENT';
                      const isStudent = n.type === 'STUDENT';
                      const isCourse = n.type === 'COURSES';
                      const isSupport = n.type === 'SUPPORT';
                      const isAnnouncement = n.type === 'ANNOUNCEMENT';

                      const iconName = isPayment
                        ? 'payments'
                        : isStudent
                        ? 'school'
                        : isCourse
                        ? 'menu_book'
                        : isSupport
                        ? 'support_agent'
                        : isAnnouncement
                        ? 'campaign'
                        : 'notifications';

                      const badgeBg = isPayment
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : isStudent
                        ? 'bg-blue-500/10 text-blue-600'
                        : isCourse
                        ? 'bg-purple-500/10 text-purple-600'
                        : isSupport
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-indigo-500/10 text-indigo-600';

                      const timeStr = n.createdAt
                        ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Live';

                      return (
                        <Link
                          key={n.id}
                          href={n.link || '/admin/notifications'}
                          onClick={() => setIsNotifOpen(false)}
                          className="py-2.5 px-2 hover:bg-surface-container-low transition-colors rounded-xl flex items-start gap-2.5 block group"
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${badgeBg}`}>
                            <Icon name={iconName} size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                                {n.title}
                              </p>
                              <span className="text-[9px] font-mono text-outline shrink-0">{timeStr}</span>
                            </div>
                            <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-0.5 leading-snug">
                              {n.message}
                            </p>
                          </div>
                        </Link>
                      );
                    })
                )}
              </div>

              {/* Dropdown Footer */}
              <div className="pt-2 border-t border-outline-variant/60 flex items-center justify-between text-[11px]">
                <span className="text-outline font-mono text-[10px]">Auto-syncs every 6s</span>
                <Link
                  href={currentUser?.role === 'SUPER_ADMIN' ? '/super-admin/notifications' : '/admin/notifications'}
                  onClick={() => setIsNotifOpen(false)}
                  className="font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <span>Full Notifications View</span>
                  <Icon name="arrow_forward" size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-[1px] bg-outline-variant/60 mx-1" />

        {/* Admin Profile Dropdown Button */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1.5 rounded-2xl hover:bg-surface-container transition-all cursor-pointer group border border-transparent hover:border-outline-variant"
            title="Administrator Account"
          >
            <UserAvatar
              avatar={currentUser?.avatar}
              name={currentUser?.name || 'Administrator'}
              size="sm"
              className="w-9 h-9 border border-outline-variant"
            />
            <div className="hidden lg:block text-left pr-1">
              <p className="text-xs font-black text-on-surface leading-tight truncate max-w-[120px]">
                {currentUser?.name || 'Administrator'}
              </p>
              <p className="text-[10px] font-mono font-extrabold text-primary uppercase">
                ADMIN
              </p>
            </div>
            <Icon name="expand_more" size={16} className="text-outline group-hover:text-on-surface transition-colors" />
          </button>

          {/* Admin Profile Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 top-12 w-64 bg-surface-container-lowest border border-outline-variant/80 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header Box */}
              <div className="p-3 bg-surface-container-low rounded-xl space-y-1 mb-1">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-xs text-on-surface truncate">
                    {currentUser?.name || 'Administrator'}
                  </p>
                  <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700">
                    ADMIN
                  </span>
                </div>
                <p className="text-[10px] text-outline font-mono truncate">
                  {currentUser?.email || 'admin@morenateach.com'}
                </p>
                <p className="text-[10px] font-semibold text-primary truncate pt-0.5 flex items-center gap-1">
                  <Icon name="verified" size={12} />
                  <span>MORENA TEACH LMS</span>
                </p>
              </div>

              {/* Explicit Admin Profile Link */}
              <Link
                href="/admin/profile"
                onClick={() => setIsProfileOpen(false)}
                className="px-3 py-2.5 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors group"
              >
                <Icon name="badge" size={17} className="text-primary group-hover:scale-110 transition-transform" />
                <span>My Profile & Permissions</span>
              </Link>

              {/* Platform Settings */}
              <Link
                href="/admin/settings"
                onClick={() => setIsProfileOpen(false)}
                className="px-3 py-2.5 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container flex items-center gap-2.5 transition-colors group"
              >
                <Icon name="settings" size={17} className="text-primary group-hover:scale-110 transition-transform" />
                <span>Platform Settings</span>
              </Link>

              {/* Sign Out */}
              <div className="pt-1 border-t border-outline-variant/40">
                <button
                  type="button"
                  onClick={async () => {
                    setIsProfileOpen(false);
                    await logout();
                    window.location.href = '/admin/login';
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-bold text-error hover:bg-error-container/20 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Icon name="logout" size={17} className="text-error" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help & Support Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <Icon name="help_outline" size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-on-surface">MORENA TEACH Help & Support</h3>
                  <p className="text-[11px] text-outline font-mono">Documentation & LMS Assistance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-on-surface-variant">
              <div className="p-3 bg-surface-container-low rounded-xl space-y-1">
                <p className="font-bold text-on-surface">MORENA TEACH LMS Operations</p>
                <p className="text-[11px]">
                  MORENA TEACH LMS operates as a single unified educational ecosystem. All approved courses automatically connect to the main landing page.
                </p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl space-y-1">
                <p className="font-bold text-on-surface">Role-Based Access (RBAC)</p>
                <p className="text-[11px]">
                  Your actions are strictly governed by your assigned permissions. Check your accessible roles and granted permissions in <Link href="/admin/profile" onClick={() => setIsHelpOpen(false)} className="text-primary underline font-bold">My Profile</Link>.
                </p>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl space-y-1">
                <p className="font-bold text-on-surface">Contact Platform Support</p>
                <p className="text-[11px]">
                  Direct Support Desk: <strong className="font-mono text-on-surface">support@morenateach.com</strong><br />
                  Emergency Hotline: <strong className="font-mono text-on-surface">+91 1800-MORENA</strong>
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Close Support
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useApp } from '@/context/AppContext';

export const SuperAdminHeader: React.FC = () => {
  const router = useRouter();
  const { currentUser, logout, showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Real-Time Notifications State
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'PAYMENT' | 'STUDENT' | 'COURSES' | 'SUPPORT'>('ALL');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const notifRef = useRef<HTMLDivElement>(null);
  const knownNotifIdsRef = useRef<Set<string>>(new Set());
  const isInitialFetchRef = useRef(true);

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
        const res = await fetch('/api/super-admin/notifications');
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
              title: `🔔 Super Admin Alert: ${top.title}`,
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
      await fetch('/api/super-admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true })
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
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
          const res = await fetch(`/api/super-admin/search?q=${encodeURIComponent(searchQuery)}`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data.results || []);
            setShowResults(true);
          }
        } catch {
        } finally {
          setIsSearching(false);
        }
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchQuery]);

  return (
    <header className="sticky top-0 z-20 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/80 px-6 py-3.5 flex items-center justify-between gap-4 h-16">
      {/* Global Cross-Entity Search */}
      <div ref={searchRef} className="relative flex-1 max-w-lg">
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
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Global search across students, admins, courses, orders, certificates, tickets..."
            className="w-full bg-surface border border-outline-variant/80 rounded-2xl pl-10 pr-10 py-2 text-xs font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
          />
          {isSearching && (
            <Icon
              name="sync"
              size={16}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary animate-spin"
            />
          )}
        </div>

        {/* Live Search Modal Results */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest border border-outline-variant/80 rounded-2xl shadow-2xl overflow-hidden divide-y divide-outline-variant/40 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="p-2 bg-surface-container-low text-[10px] font-mono font-extrabold uppercase text-outline flex justify-between">
              <span>{searchResults.length} Match(es) Found</span>
              <span>ESC to close</span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-outline-variant/20">
              {searchResults.map((r, i) => (
                <Link
                  key={i}
                  href={r.url}
                  onClick={() => setShowResults(false)}
                  className="p-3 flex items-center justify-between hover:bg-surface-container-low transition-colors block group"
                >
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-primary px-1.5 py-0.5 rounded bg-primary/10 mr-2">
                      {r.type}
                    </span>
                    <span className="font-extrabold text-xs text-on-surface group-hover:text-primary transition-colors">
                      {r.title}
                    </span>
                    <p className="text-[11px] text-on-surface-variant font-mono mt-0.5 ml-1">
                      {r.subtitle}
                    </p>
                  </div>
                  <Icon name="arrow_forward" size={14} className="text-outline group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Controls: Health Badge & Admin Profile */}
      <div className="flex items-center gap-3">
        <Link
          href="/super-admin/health"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-[11px] font-mono font-extrabold hover:bg-emerald-500/20 transition-colors"
          title="All Platform Services Operational"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-700 animate-pulse" />
          <span className="hidden sm:inline">HEALTHY</span>
        </Link>

        <div className="h-6 w-[1px] bg-outline-variant/60" />

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
                  <span className="font-black text-xs text-on-surface">Master Live Notifications</span>
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
                    <p className="text-[10px]">Real-time events will stream here automatically.</p>
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
                          href={n.link || '/super-admin/notifications'}
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
                  href="/super-admin/notifications"
                  onClick={() => setIsNotifOpen(false)}
                  className="font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <span>All Notifications</span>
                  <Icon name="arrow_forward" size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-[1px] bg-outline-variant/60" />

        <Link
          href="/super-admin/settings"
          className="p-2 border border-outline-variant rounded-xl text-outline hover:text-primary hover:bg-surface-container transition-colors"
          title="Platform Settings"
        >
          <Icon name="settings" size={18} />
        </Link>

        <Link
          href="/super-admin/profile"
          className="flex items-center gap-2 pl-2 border-l border-outline-variant/60 hover:opacity-80 transition-opacity"
          title="Open Master Profile"
        >
          <UserAvatar
            avatar={currentUser?.avatar}
            name={currentUser?.name || 'Super Admin'}
            size="sm"
            shape="rounded"
            className="w-8 h-8"
          />
          <div className="hidden md:block text-left">
            <p className="text-xs font-black text-on-surface leading-tight">
              {currentUser?.name || 'Super Admin'}
            </p>
            <span className="text-[10px] font-mono font-extrabold text-primary uppercase">
              SUPER_ADMIN
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
};

'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  CheckCircle2,
  RotateCcw,
  Clock,
  UserCheck,
  Bell,
  User,
  Settings,
  LogOut,
  GraduationCap,
  Search,
  Menu,
  X,
  ChevronDown,
  Check,
  ArrowRight
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface AuditorPortalShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

function AuditorPortalShellInner({
  children,
  title,
  subtitle,
  actions
}: AuditorPortalShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser, logout } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [sidebarProfileMenuOpen, setSidebarProfileMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);
  const [notificationsFilter, setNotificationsFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  useEffect(() => {
    setHeaderMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setHeaderMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setHeaderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const [reviewerUser, setReviewerUser] = useState<{
    id?: string;
    name?: string;
    email?: string;
    avatar?: string | null;
    role?: string;
  } | null>(null);

  const [counts, setCounts] = useState({
    pendingReview: 12,
    changesRequested: 6,
    approved: 48,
    total: 66,
    pendingInstructors: 0
  });

  const [notifications, setNotifications] = useState([
    {
      id: 'notif_1',
      title: 'New Course Submission',
      desc: 'Digital Marketing Masterclass was submitted for v1.0 quality audit.',
      time: '10 mins ago',
      isRead: false,
      link: '/reviewer/inspect?filter=IN_REVIEW'
    },
    {
      id: 'notif_2',
      title: 'Course Syllabus Revised',
      desc: 'Instructor updated lecture videos for Web Development Bootcamp.',
      time: '1 hour ago',
      isRead: false,
      link: '/reviewer/inspect?filter=CHANGES_REQUESTED'
    },
    {
      id: 'notif_3',
      title: 'New Instructor Application',
      desc: 'Dr. Neha Gupta submitted verified resume & credentials for evaluation.',
      time: '2 hours ago',
      isRead: false,
      link: '/reviewer/instructors'
    },
    {
      id: 'notif_4',
      title: 'Audit Complete Verified',
      desc: 'Machine Learning Basics was published successfully to student portal.',
      time: 'Yesterday',
      isRead: true,
      link: '/reviewer/inspect?filter=APPROVED'
    }
  ]);

  const [formattedDateTime, setFormattedDateTime] = useState('');

  const fetchUserProfile = () => {
    fetch('/api/reviewer/me')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d?.user) {
          setReviewerUser(d.user);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchUserProfile();

    // Listen to profile update events
    const handleProfileUpdated = () => fetchUserProfile();
    window.addEventListener('reviewer_profile_updated', handleProfileUpdated);
    return () => window.removeEventListener('reviewer_profile_updated', handleProfileUpdated);
  }, []);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      setFormattedDateTime(now.toLocaleDateString('en-GB', options).replace(',', ' •'));
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Fetch live course counts for sidebar badges
    fetch('/api/reviewer/courses?status=ALL')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d?.stats) {
          setCounts((prev) => ({
            ...prev,
            pendingReview: d.stats.pendingReview ?? 12,
            changesRequested: d.stats.changesRequested ?? 6,
            approved: d.stats.approved ?? 48,
            total: d.stats.total ?? 66
          }));
        }
      })
      .catch(() => {});

    // Fetch instructor onboarding counts
    fetch('/api/reviewer/instructors')
      .then((r) => r.json())
      .then((d) => {
        if (d?.summary?.pendingOnboarding !== undefined) {
          setCounts((prev) => ({ ...prev, pendingInstructors: d.summary.pendingOnboarding }));
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout?portal=REVIEWER', { method: 'POST' });
    } catch {}
    try {
      await logout({ silent: true });
    } catch {}
    router.replace('/reviewer/login');
  };

  const currentFilter = searchParams?.get('filter') || '';

  const activeReviewerName = reviewerUser?.name || currentUser?.name || 'Anurag Singh';
  const activeAvatar = reviewerUser?.avatar || currentUser?.avatar || null;
  const initials = activeReviewerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'AS';

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const navMenuItems = [
    {
      label: 'Dashboard',
      href: '/reviewer',
      icon: LayoutDashboard,
      isActive: pathname === '/reviewer' && !currentFilter,
      badge: null
    },
    {
      label: 'Course Reviews',
      href: '/reviewer/inspect',
      icon: BookOpen,
      isActive: pathname === '/reviewer/inspect' && (!currentFilter || currentFilter === 'ALL'),
      badge: null
    },
    {
      label: 'Pending Reviews',
      href: '/reviewer/inspect?filter=IN_REVIEW',
      icon: ClipboardList,
      isActive: pathname === '/reviewer/inspect' && currentFilter === 'IN_REVIEW',
      badge: counts.pendingReview > 0 ? { text: String(counts.pendingReview), color: 'bg-rose-500' } : null
    },
    {
      label: 'Approved Courses',
      href: '/reviewer/inspect?filter=APPROVED',
      icon: CheckCircle2,
      isActive: pathname === '/reviewer/inspect' && currentFilter === 'APPROVED',
      badge: null
    },
    {
      label: 'Revision Requests',
      href: '/reviewer/inspect?filter=CHANGES_REQUESTED',
      icon: RotateCcw,
      isActive: pathname === '/reviewer/inspect' && currentFilter === 'CHANGES_REQUESTED',
      badge: counts.changesRequested > 0 ? { text: String(counts.changesRequested), color: 'bg-amber-500' } : null
    },
    {
      label: 'Review History',
      href: '/reviewer/inspect?filter=HISTORY',
      icon: Clock,
      isActive: pathname === '/reviewer/inspect' && currentFilter === 'HISTORY',
      badge: null
    },
    {
      label: 'Instructor Onboarding & Resumes',
      href: '/reviewer/instructors',
      icon: UserCheck,
      isActive: pathname?.startsWith('/reviewer/instructors'),
      badge: counts.pendingInstructors > 0 ? { text: String(counts.pendingInstructors), color: 'bg-indigo-500' } : null
    }
  ];

  const bottomMenuItems = [
    {
      label: 'My Profile',
      href: '/reviewer/profile',
      icon: User,
      isActive: pathname === '/reviewer/profile'
    },
    {
      label: 'Settings',
      href: '/reviewer/settings',
      icon: Settings,
      isActive: pathname === '/reviewer/settings'
    }
  ];

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 1. Left Sidebar (White Theme - exactly as requested by user) */}
      <aside
        className={`fixed lg:sticky top-0 inset-y-0 left-0 z-50 w-64 shrink-0 h-screen flex flex-col justify-between bg-white border-r border-slate-200/90 text-slate-800 shadow-xs transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-4 py-5 space-y-4">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2">
            <Link href="/reviewer" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                  Morena Teach
                </h1>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">
                  Learning. Built Better
                </p>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Box with Smooth Accordion Menu */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setSidebarProfileMenuOpen((prev) => !prev)}
              aria-expanded={sidebarProfileMenuOpen}
              className="w-full p-3 flex items-center gap-3 hover:bg-blue-50/60 transition-colors group cursor-pointer text-left"
              title="Toggle Profile Menu"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 text-blue-700 font-extrabold text-sm flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                {activeAvatar ? (
                  <img src={activeAvatar} alt={activeReviewerName} className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 truncate transition-colors">
                  {activeReviewerName}
                </div>
                <div className="text-[11px] text-slate-500">Auditor</div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Online</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 ml-auto transition-transform duration-200 ease-out ${
                      sidebarProfileMenuOpen ? 'rotate-180 text-blue-600' : 'rotate-0'
                    }`}
                  />
                </div>
              </div>
            </button>

            <div
              className={`grid transition-all duration-200 ease-out ${
                sidebarProfileMenuOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="px-2 pb-2 pt-1 border-t border-slate-200/80 space-y-0.5 bg-white/70">
                  <Link
                    href="/reviewer/profile"
                    onClick={() => {
                      setSidebarProfileMenuOpen(false);
                      setSidebarOpen(false);
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    href="/reviewer/settings"
                    onClick={() => {
                      setSidebarProfileMenuOpen(false);
                      setSidebarOpen(false);
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Settings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navMenuItems.map((item) => {
              const IconComp = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    item.isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <IconComp
                      className={`w-4 h-4 shrink-0 ${
                        item.isActive ? 'text-white' : 'text-slate-500'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold text-white leading-none ${item.badge.color}`}
                    >
                      {item.badge.text}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Notifications Item in Navigation (Interactive drawer trigger) */}
            <button
              type="button"
              onClick={() => setShowNotificationsDrawer(true)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Bell className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">Notifications</span>
              </div>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold text-white bg-rose-500 leading-none">
                  {unreadCount}
                </span>
              )}
            </button>
          </nav>

          {/* Bottom Divider: My Profile, Settings, Logout */}
          <div className="pt-2 border-t border-slate-100 space-y-1">
            {bottomMenuItems.map((item) => {
              const IconComp = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    item.isActive
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <IconComp className={`w-4 h-4 ${item.isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-500 group-hover:text-rose-600" />
              <span>Logout</span>
            </button>
          </div>

          {/* Bottom Promo Card: "Quality Education Our Priority" */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 p-4 border border-blue-200/70 text-center space-y-2 mt-auto">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white mx-auto flex items-center justify-center shadow-md shadow-blue-500/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="text-xs font-black text-slate-900 leading-snug">
              Quality Education<br />Our Priority
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between gap-4 shadow-2xs">
          {/* Mobile menu trigger */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-extrabold text-sm text-slate-900">Morena Teach</span>
          </div>

          {/* Search Bar matching image: "Search courses, instructors... (Ctrl + K)" */}
          <div className="hidden sm:flex items-center flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search courses, instructors... (Ctrl + K)"
              className="w-full bg-[#f1f5f9] hover:bg-slate-100 focus:bg-white border border-transparent focus:border-blue-500 text-xs font-medium text-slate-800 rounded-full pl-9 pr-4 py-2 outline-none transition-all"
            />
          </div>

          {/* Right Area: Bell Notification & Live Date & Profile Avatar */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Notification Bell (Triggers Notification Drawer) */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationsDrawer(true)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer relative"
                title="View Notifications"
              >
                <Bell className="w-4 h-4 text-slate-700" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                )}
              </button>
            </div>

            {/* Live Date / Time Stamp */}
            <div className="text-xs font-semibold text-slate-600 hidden md:block">
              {formattedDateTime || 'Thu, 6 Nov 2026 • 09:24 AM'}
            </div>

            {/* Auditor Name & Avatar Pill with Smooth Animated Dropdown */}
            <div className="relative" ref={headerMenuRef}>
              <button
                type="button"
                onClick={() => setHeaderMenuOpen((prev) => !prev)}
                aria-expanded={headerMenuOpen}
                aria-haspopup="menu"
                className={`flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full border text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  headerMenuOpen
                    ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-blue-100 border border-blue-200 text-blue-700 font-extrabold text-[11px] flex items-center justify-center overflow-hidden shrink-0">
                  {activeAvatar ? (
                    <img src={activeAvatar} alt={activeReviewerName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <span className="hidden sm:inline truncate max-w-[130px]">
                  {activeReviewerName}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ease-out ${
                    headerMenuOpen ? 'rotate-180 text-blue-600' : 'rotate-0 text-slate-400'
                  }`}
                />
              </button>

              {/* Smooth Animated Auditor Dropdown */}
              <div
                role="menu"
                className={`absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 text-slate-800 shadow-xl shadow-slate-200/70 origin-top-right transition-all duration-200 ease-out z-50 overflow-hidden ${
                  headerMenuOpen
                    ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                }`}
              >
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {activeReviewerName}
                  </div>
                  <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mt-0.5">
                    Auditor Studio
                  </div>
                </div>

                <div className="p-1.5 space-y-0.5">
                  <Link
                    href="/reviewer/profile"
                    onClick={() => setHeaderMenuOpen(false)}
                    role="menuitem"
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    <User className="w-4 h-4 shrink-0 text-blue-600" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    href="/reviewer/settings"
                    onClick={() => setHeaderMenuOpen(false)}
                    role="menuitem"
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    <Settings className="w-4 h-4 shrink-0 text-indigo-500" />
                    <span>Settings</span>
                  </Link>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      handleLogout();
                    }}
                    role="menuitem"
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Optional Actions injected by child */}
            {actions}
          </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      {/* 3. Interactive Notifications Drawer / Slide-over */}
      {showNotificationsDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setShowNotificationsDrawer(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Auditor Notifications</h3>
                    <p className="text-[11px] text-slate-500">{unreadCount} unread alerts</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowNotificationsDrawer(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Tabs */}
              <div className="px-5 pt-3 pb-1 flex items-center gap-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setNotificationsFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    notificationsFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationsFilter('UNREAD')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    notificationsFilter === 'UNREAD'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-3 space-y-1">
                {notifications
                  .filter((n) => notificationsFilter === 'ALL' || !n.isRead)
                  .map((notif) => (
                    <Link
                      key={notif.id}
                      href={notif.link}
                      onClick={() => setShowNotificationsDrawer(false)}
                      className={`block p-3.5 rounded-2xl transition-all hover:bg-blue-50/50 ${
                        !notif.isRead ? 'bg-blue-50/30 border border-blue-100' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-xs text-slate-900">{notif.title}</div>
                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                          {notif.time}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{notif.desc}</p>
                      <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-blue-600">
                        <span>Review now</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </Link>
                  ))}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <Link
                  href="/reviewer/inspect"
                  onClick={() => setShowNotificationsDrawer(false)}
                  className="text-xs font-bold text-slate-700 hover:text-blue-600"
                >
                  Open Inspect Studio →
                </Link>
                <button
                  type="button"
                  onClick={() => setShowNotificationsDrawer(false)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AuditorPortalShell(props: AuditorPortalShellProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center text-xs font-bold text-slate-600">
          Loading Course Auditor Studio...
        </div>
      }
    >
      <AuditorPortalShellInner {...props} />
    </Suspense>
  );
}

export default AuditorPortalShell;

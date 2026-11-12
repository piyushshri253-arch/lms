'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard,
  User,
  BookOpen,
  PlusCircle,
  Users,
  DollarSign,
  Landmark,
  Wallet,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Megaphone,
  GitBranch,
  Globe,
  LifeBuoy,
  ChevronDown
} from 'lucide-react';

interface InstructorPortalShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  profile?: {
    name?: string;
    email?: string;
    role?: string;
    status?: string;
    emailVerified?: boolean;
    bankStatus?: string;
    avatar?: string | null;
  };
}

function InstructorPortalShellInner({
  children,
  title,
  subtitle,
  actions,
  profile
}: InstructorPortalShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser, logout } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [cachedUser, setCachedUser] = useState<{
    name?: string;
    avatar?: string | null;
    emailVerified?: boolean;
  } | null>(null);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mt_instructor_cached_profile');
      if (stored) setCachedUser(JSON.parse(stored));
    } catch {}

    if (profile?.name && profile?.avatar !== undefined) return;
    if (currentUser?.name && currentUser?.avatar !== undefined) return;

    fetch('/api/instructor/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data?.profile) {
          const prof = {
            name: data.profile.name,
            avatar: data.profile.avatar || null,
            emailVerified: Boolean(data.profile.emailVerified)
          };
          setCachedUser(prof);
          try {
            localStorage.setItem('mt_instructor_cached_profile', JSON.stringify(prof));
          } catch {}
        }
      })
      .catch(() => {});
  }, [profile?.name, profile?.avatar, currentUser?.name, currentUser?.avatar]);

  const effectiveName = profile?.name || currentUser?.name || cachedUser?.name || 'Instructor';
  const effectiveAvatar = profile?.avatar || currentUser?.avatar || cachedUser?.avatar || null;
  const effectiveEmailVerified =
    profile?.emailVerified !== undefined
      ? profile.emailVerified
      : (currentUser as any)?.emailVerified !== undefined
      ? (currentUser as any).emailVerified
      : cachedUser?.emailVerified !== undefined
      ? cachedUser.emailVerified
      : true;
  const initialLetter = (effectiveName && effectiveName !== 'Instructor' ? effectiveName[0] : 'I').toUpperCase();

  useEffect(() => {
    const saved = (localStorage.getItem('mt_theme') || localStorage.getItem('mt_instructor_theme_light_v2')) as 'light' | 'dark' | null;
    if (saved === 'dark') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mt_theme', 'light');
      localStorage.setItem('mt_instructor_theme_light_v2', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('mt_theme', next);
    localStorage.setItem('mt_instructor_theme_light_v2', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    window.dispatchEvent(
      new CustomEvent('mt-theme-change', { detail: { theme: next } })
    );
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('mt_instructor_cached_profile');
    } catch {}
    try {
      await fetch('/api/auth/logout?portal=INSTRUCTOR', { method: 'POST' });
    } catch {}
    try {
      await logout({ silent: true });
    } catch {}
    router.replace('/instructor/login');
  };

  const currentTab = searchParams?.get('tab') || '';
  const isCreate = searchParams?.get('create') === '1';

  const navItems = [
    {
      label: 'Dashboard',
      href: '/instructor/dashboard',
      icon: LayoutDashboard,
      isActive: pathname === '/instructor/dashboard'
    },
    {
      label: 'My Profile',
      href: '/instructor/profile',
      icon: User,
      isActive: pathname === '/instructor/profile'
    },
    {
      label: 'My Courses',
      href: '/instructor/courses',
      icon: BookOpen,
      isActive:
        (pathname === '/instructor' || pathname === '/instructor/courses') &&
        !isCreate &&
        currentTab !== 'students' &&
        currentTab !== 'notifications'
    },
    {
      label: 'Create Course',
      href: '/instructor/courses/builder?new=true',
      icon: PlusCircle,
      isActive:
        pathname === '/instructor/courses/builder' &&
        !searchParams?.get('courseId') &&
        !searchParams?.get('id') &&
        !searchParams?.get('slug')
    },
    {
      label: 'Course Versions',
      href: '/instructor/course-versions',
      icon: GitBranch,
      isActive: pathname?.startsWith('/instructor/course-versions') || false
    },
    {
      label: 'Courses SEO & Ads',
      href: '/instructor/course-seo',
      icon: Globe,
      isActive:
        pathname?.startsWith('/instructor/course-seo') ||
        pathname?.startsWith('/instructor/seo-ads') ||
        false
    },
    {
      label: 'Student Q&A',
      href: '/instructor/questions',
      icon: MessageSquare,
      isActive: pathname?.startsWith('/instructor/questions') || false
    },
    {
      label: 'Announcements',
      href: '/instructor/announcements',
      icon: Megaphone,
      isActive: pathname?.startsWith('/instructor/announcements') || false
    },
    {
      label: 'Students',
      href: '/instructor?tab=students',
      icon: Users,
      isActive: pathname === '/instructor' && currentTab === 'students'
    },
    {
      label: 'Bank Details',
      href: '/instructor/bank-details',
      icon: Landmark,
      isActive: pathname === '/instructor/bank-details'
    },
    {
      label: 'Earnings',
      href: '/instructor/earnings',
      icon: DollarSign,
      isActive: pathname === '/instructor/earnings' || pathname === '/instructor/transactions'
    },
    {
      label: 'Payouts',
      href: '/instructor/payouts',
      icon: Wallet,
      isActive: pathname === '/instructor/payouts'
    },
    {
      label: 'Notifications',
      href: '/instructor?tab=notifications',
      icon: Bell,
      isActive: pathname === '/instructor' && currentTab === 'notifications'
    },
    {
      label: 'Support & Help',
      href: '/instructor/support',
      icon: LifeBuoy,
      isActive: pathname?.startsWith('/instructor/support') || false
    },
    {
      label: 'Settings',
      href: '/instructor/profile#settings',
      icon: Settings,
      isActive: false
    }
  ];

  const isLight = theme === 'light';

  return (
    <div
      className={`min-h-screen flex font-sans ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#07090e] text-slate-100'
      }`}
    >
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* Unified Left Sidebar (Sticky + Scrollable Middle Navigation) */}
      <aside
        className={`fixed lg:sticky top-0 inset-y-0 left-0 z-50 w-64 shrink-0 h-screen flex flex-col border-r transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800 shadow-xs'
            : 'bg-[#0c1018] border-slate-800/80 text-slate-200'
        }`}
      >
        <div
          className={`shrink-0 h-16 px-5 flex items-center justify-between border-b ${
            isLight ? 'border-slate-200' : 'border-slate-800/40'
          }`}
        >
          <Link
            href="/"
            title="Go to Homepage"
            className="flex items-center gap-2.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 p-1 flex items-center justify-center shadow-2xs shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Morena Teach Logo"
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            <div>
              <div
                className={`font-black text-sm tracking-tight leading-none ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                MORENA TEACH
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-violet-600 mt-0.5">
                Instructor Studio
              </div>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain sidebar-scrollbar py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  item.isActive
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25'
                    : isLight
                    ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div
          className={`shrink-0 p-3 border-t ${
            isLight ? 'border-slate-200' : 'border-slate-800/40'
          }`}
        >
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-600 transition-all cursor-pointer ${
              isLight ? 'hover:bg-red-50' : 'hover:bg-red-950/30'
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header
          className={`h-16 px-4 sm:px-8 border-b flex items-center justify-between sticky top-0 z-30 backdrop-blur-md ${
            isLight
              ? 'bg-white/95 border-slate-200'
              : 'bg-[#0c1018]/90 border-slate-800/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`lg:hidden p-2 rounded-xl border ${
                isLight ? 'border-slate-200 text-slate-700' : 'border-slate-700/60'
              }`}
            >
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <h1
                className={`text-base sm:text-lg font-extrabold tracking-tight ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-slate-500 hidden sm:block">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {actions}
            {/* Account & Bank Status Badges */}
            {effectiveEmailVerified !== undefined && (
              <span
                className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                  effectiveEmailVerified
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {effectiveEmailVerified ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Email Verified
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Unverified
                  </>
                )}
              </span>
            )}

            <button
              onClick={toggleTheme}
              title="Toggle Light / Dark Mode"
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isLight
                  ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-800/80 border-slate-700 text-amber-400 hover:bg-slate-700'
              }`}
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  profileMenuOpen
                    ? isLight
                      ? 'bg-violet-50 border-violet-300 text-violet-900 shadow-xs'
                      : 'bg-slate-800 border-violet-500/50 text-white shadow-xs'
                    : isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                }`}
              >
                {effectiveAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={effectiveAvatar}
                    alt={effectiveName}
                    className="w-6 h-6 rounded-full object-cover border border-violet-300 shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                    {initialLetter}
                  </div>
                )}
                <span className="hidden sm:inline truncate max-w-[130px] capitalize">
                  {effectiveName}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ease-out ${
                    profileMenuOpen
                      ? 'rotate-180 text-violet-600'
                      : 'rotate-0 text-slate-400'
                  }`}
                />
              </button>

              {/* Smooth Animated Instructor Profile Dropdown */}
              <div
                role="menu"
                className={`absolute right-0 mt-2 w-56 rounded-2xl border shadow-xl origin-top-right transition-all duration-200 ease-out z-50 overflow-hidden ${
                  profileMenuOpen
                    ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                } ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-800 shadow-slate-200/70'
                    : 'bg-[#101622] border-slate-800 text-slate-200 shadow-black/50'
                }`}
              >
                <div
                  className={`px-4 py-3 border-b ${
                    isLight ? 'border-slate-100 bg-slate-50/70' : 'border-slate-800/80 bg-slate-900/50'
                  }`}
                >
                  <div className="text-xs font-bold truncate capitalize">
                    {effectiveName}
                  </div>
                  <div className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider mt-0.5">
                    Instructor Studio
                  </div>
                </div>

                <div className="p-1.5 space-y-0.5">
                  <Link
                    href="/instructor/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    role="menuitem"
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      isLight
                        ? 'text-slate-700 hover:bg-violet-50 hover:text-violet-700'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <User className="w-4 h-4 shrink-0 text-violet-600" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    href="/instructor/profile#settings"
                    onClick={() => setProfileMenuOpen(false)}
                    role="menuitem"
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      isLight
                        ? 'text-slate-700 hover:bg-violet-50 hover:text-violet-700'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Settings className="w-4 h-4 shrink-0 text-indigo-500" />
                    <span>Settings</span>
                  </Link>

                  <div className={`my-1 border-t ${isLight ? 'border-slate-100' : 'border-slate-800/80'}`} />

                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      handleLogout();
                    }}
                    role="menuitem"
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 transition-colors cursor-pointer ${
                      isLight ? 'hover:bg-red-50' : 'hover:bg-red-950/30'
                    }`}
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

export function InstructorPortalShell(props: InstructorPortalShellProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center text-xs font-semibold">
          Loading Instructor Studio...
        </div>
      }
    >
      <InstructorPortalShellInner {...props} />
    </Suspense>
  );
}

export default InstructorPortalShell;

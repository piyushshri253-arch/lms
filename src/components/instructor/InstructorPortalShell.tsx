'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  User,
  BookOpen,
  PlusCircle,
  FolderKanban,
  Users,
  DollarSign,
  Receipt,
  Landmark,
  Wallet,
  Bell,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  FileQuestion,
  Database,
  ClipboardList,
  MessageSquare,
  Megaphone
} from 'lucide-react';

interface InstructorPortalShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  profile?: {
    name?: string;
    email?: string;
    role?: string;
    status?: string;
    emailVerified?: boolean;
    bankStatus?: string;
  };
}

function InstructorPortalShellInner({
  children,
  title,
  subtitle,
  profile
}: InstructorPortalShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('mt_instructor_theme_light_v2') as 'light' | 'dark' | null;
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
    } else {
      setTheme('light');
      localStorage.setItem('mt_instructor_theme_light_v2', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('mt_instructor_theme_light_v2', next);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout?portal=INSTRUCTOR', { method: 'POST' });
    } catch {}
    router.push('/instructor/login');
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
      href: '/instructor',
      icon: BookOpen,
      isActive:
        pathname === '/instructor' &&
        !isCreate &&
        currentTab !== 'manage' &&
        currentTab !== 'students' &&
        currentTab !== 'notifications'
    },
    {
      label: 'Create Course',
      href: '/instructor/courses/builder',
      icon: PlusCircle,
      isActive: pathname === '/instructor/courses/builder'
    },
    {
      label: 'Course Management',
      href: '/instructor?tab=manage',
      icon: FolderKanban,
      isActive: pathname === '/instructor' && currentTab === 'manage'
    },
    {
      label: 'Quizzes',
      href: '/instructor/quizzes',
      icon: FileQuestion,
      isActive: pathname?.startsWith('/instructor/quizzes') || false
    },
    {
      label: 'Question Bank',
      href: '/instructor/question-bank',
      icon: Database,
      isActive: pathname?.startsWith('/instructor/question-bank') || false
    },
    {
      label: 'Assignments',
      href: '/instructor/assignments',
      icon: ClipboardList,
      isActive: pathname?.startsWith('/instructor/assignments') || false
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
      label: 'Earnings',
      href: '/instructor/earnings',
      icon: DollarSign,
      isActive: pathname === '/instructor/earnings'
    },
    {
      label: 'Transactions',
      href: '/instructor/transactions',
      icon: Receipt,
      isActive: pathname === '/instructor/transactions'
    },
    {
      label: 'Bank Details',
      href: '/instructor/bank-details',
      icon: Landmark,
      isActive: pathname === '/instructor/bank-details'
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
      label: 'Settings',
      href: '/instructor/profile#settings',
      icon: Settings,
      isActive: false
    },
    {
      label: 'Security',
      href: '/instructor/profile#security',
      icon: Shield,
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

      {/* Unified Left Sidebar (Matches First Screenshot) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 shrink-0 flex flex-col border-r transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800 shadow-xs'
            : 'bg-[#0c1018] border-slate-800/80 text-slate-200'
        }`}
      >
        <div
          className={`h-16 px-5 flex items-center justify-between border-b ${
            isLight ? 'border-slate-200' : 'border-slate-800/40'
          }`}
        >
          <Link href="/instructor/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-600/25">
              <Sparkles className="w-4 h-4" />
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

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
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
          className={`p-3 border-t ${
            isLight ? 'border-slate-200' : 'border-slate-800/40'
          }`}
        >
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all cursor-pointer"
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
            {/* Account & Bank Status Badges */}
            {profile?.emailVerified !== undefined && (
              <span
                className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                  profile.emailVerified
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {profile.emailVerified ? (
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

            <Link
              href="/instructor/profile"
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                  : 'bg-slate-900 border-slate-800 text-slate-200'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-[11px]">
                {(profile?.name || 'I')[0]?.toUpperCase()}
              </div>
              <span className="hidden sm:inline truncate max-w-[130px]">
                {profile?.name || 'Instructor'}
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

export default function InstructorPortalShell(props: InstructorPortalShellProps) {
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

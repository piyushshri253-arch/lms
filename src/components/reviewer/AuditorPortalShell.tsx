'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardCheck,
  GitCompare,
  RotateCcw,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  History,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';

interface AuditorPortalShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  profile?: {
    name?: string;
    email?: string;
    role?: string;
  };
}

function AuditorPortalShellInner({
  children,
  title,
  subtitle,
  actions,
  profile
}: AuditorPortalShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('mt_auditor_theme_v1') as 'light' | 'dark' | null;
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('mt_auditor_theme_v1', next);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout?portal=REVIEWER', { method: 'POST' });
    } catch {}
    router.push('/auditor/login');
  };

  const currentFilter = searchParams?.get('filter') || 'ALL';

  const navItems = [
    {
      label: 'Auditor Dashboard',
      href: '/reviewer',
      icon: LayoutDashboard,
      isActive: pathname === '/reviewer' && (!searchParams?.get('filter') || currentFilter === 'ALL')
    },
    {
      label: 'Pending Review Queue',
      href: '/reviewer?filter=IN_REVIEW',
      icon: ClipboardCheck,
      isActive: pathname === '/reviewer' && currentFilter === 'IN_REVIEW'
    },
    {
      label: 'New Courses (v1.0)',
      href: '/reviewer?filter=NEW',
      icon: Sparkles,
      isActive: pathname === '/reviewer' && currentFilter === 'NEW'
    },
    {
      label: 'Major Updates (v2.0)',
      href: '/reviewer?filter=MAJOR_UPDATE',
      icon: GitCompare,
      isActive: pathname === '/reviewer' && currentFilter === 'MAJOR_UPDATE'
    },
    {
      label: 'Resubmissions',
      href: '/reviewer?filter=RESUBMISSION',
      icon: RotateCcw,
      isActive: pathname === '/reviewer' && currentFilter === 'RESUBMISSION'
    },
    {
      label: 'Changes Requested',
      href: '/reviewer?filter=CHANGES_REQUESTED',
      icon: AlertOctagon,
      isActive: pathname === '/reviewer' && currentFilter === 'CHANGES_REQUESTED'
    },
    {
      label: 'Approved Courses',
      href: '/reviewer?filter=APPROVED',
      icon: CheckCircle2,
      isActive: pathname === '/reviewer' && currentFilter === 'APPROVED'
    },
    {
      label: 'Rejected Courses',
      href: '/reviewer?filter=REJECTED',
      icon: XCircle,
      isActive: pathname === '/reviewer' && currentFilter === 'REJECTED'
    },
    {
      label: 'Audit & Review Logs',
      href: '/reviewer?filter=HISTORY',
      icon: History,
      isActive: pathname === '/reviewer' && currentFilter === 'HISTORY'
    }
  ];

  const isLight = theme === 'light';

  return (
    <div
      className={`min-h-screen flex ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#070b14] text-slate-100'
      }`}
    >
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-68 shrink-0 flex flex-col border-r transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          isLight
            ? 'bg-white border-slate-200'
            : 'bg-[#0b1120] border-slate-800/80'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`h-16 px-5 flex items-center justify-between border-b ${
            isLight ? 'border-slate-200' : 'border-slate-800'
          }`}
        >
          <Link href="/reviewer" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span
                className={`text-sm font-black tracking-tight block leading-none ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                Morena Audit
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600">
                Course Reviewer Studio
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Course Governance & QA
          </div>
          {navItems.map((item) => {
            const IconComp = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  item.isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <IconComp className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Strict RBAC Governance Notice */}
          <div
            className={`mt-6 mx-2 p-3.5 rounded-xl border text-[11px] space-y-1.5 ${
              isLight
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
            }`}
          >
            <div className="font-extrabold flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Auditor RBAC Scope</span>
            </div>
            <p className="text-[10px] leading-relaxed opacity-85">
              Read-only curriculum, video DRM, PDF, quiz &amp; version diff verification. Direct course editing &amp; instructor banking data are strictly isolated.
            </p>
          </div>
        </nav>

        {/* Bottom Logout Footer */}
        <div
          className={`p-3 border-t ${
            isLight ? 'border-slate-200 bg-slate-50/60' : 'border-slate-800 bg-slate-900/40'
          }`}
        >
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Auditor Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header
          className={`sticky top-0 z-30 h-16 px-4 sm:px-8 border-b flex items-center justify-between gap-4 backdrop-blur-md ${
            isLight
              ? 'bg-white/90 border-slate-200'
              : 'bg-[#0b1120]/90 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1
                className={`text-sm sm:text-base font-black truncate ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                {title}
              </h1>
              {subtitle && (
                <p className="text-[11px] text-slate-500 hidden sm:block truncate">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {actions}
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Certified Auditor</span>
            </span>
            <button
              onClick={toggleTheme}
              title="Toggle Light / Dark Theme"
              className={`p-2 rounded-xl border cursor-pointer ${
                isLight
                  ? 'bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-slate-800 border-slate-700 text-amber-400'
              }`}
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

export function AuditorPortalShell(props: AuditorPortalShellProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center text-xs font-bold">
          Loading Course Auditor Studio...
        </div>
      }
    >
      <AuditorPortalShellInner {...props} />
    </Suspense>
  );
}

export default AuditorPortalShell;

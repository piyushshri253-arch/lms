'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';
import { LMS_ROUTES } from '@/lib/lms-routes';
import { ProductSwitcherModal } from '@/components/common/ProductSwitcherModal';

export default function LmsAdminDashboardPage() {
  const router = useRouter();
  const { currentUser, showToast } = useApp();
  const [isProductSwitcherOpen, setIsProductSwitcherOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState('30D');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // LMS Mock & Live Data State
  const [stats, setStats] = useState({
    totalStudents: 1420,
    activeCourses: 18,
    activeInstructors: 7,
    completionRate: 78.4,
    certificatesIssued: 312,
    avgQuizScore: 86.5
  });

  const [recentEnrollments, setRecentEnrollments] = useState([
    {
      id: 'enr-1',
      studentName: 'Aarav Sharma',
      email: 'aarav@example.com',
      courseTitle: 'Full-Stack Next.js 15 & Turbopack Masterclass',
      enrolledAt: '12 mins ago',
      progress: 35,
      status: 'IN_PROGRESS'
    },
    {
      id: 'enr-2',
      studentName: 'Priya Patel',
      email: 'priya@example.com',
      courseTitle: 'Production AI Agents with LangChain & LangGraph',
      enrolledAt: '1 hour ago',
      progress: 88,
      status: 'IN_PROGRESS'
    },
    {
      id: 'enr-3',
      studentName: 'Vikram Singh',
      email: 'vikram@example.com',
      courseTitle: 'Modern Distributed Systems with Go & gRPC',
      enrolledAt: '3 hours ago',
      progress: 100,
      status: 'COMPLETED'
    },
    {
      id: 'enr-4',
      studentName: 'Ananya Roy',
      email: 'ananya@example.com',
      courseTitle: 'Advanced Cloud Architecture on AWS & GCP',
      enrolledAt: '5 hours ago',
      progress: 15,
      status: 'IN_PROGRESS'
    },
    {
      id: 'enr-5',
      studentName: 'Rohan Mehta',
      email: 'rohan@example.com',
      courseTitle: 'Enterprise PostgreSQL Optimization & Indexing',
      enrolledAt: '1 day ago',
      progress: 100,
      status: 'COMPLETED'
    }
  ]);

  const [topCourses, setTopCourses] = useState([
    {
      id: 'c-1',
      title: 'Full-Stack Next.js 15 & Turbopack Masterclass',
      instructor: 'Dr. Sameer Verma',
      students: 540,
      rating: 4.9,
      completionRate: 84
    },
    {
      id: 'c-2',
      title: 'Production AI Agents with LangChain & LangGraph',
      instructor: 'Elena Rostova',
      students: 420,
      rating: 4.95,
      completionRate: 79
    },
    {
      id: 'c-3',
      title: 'Modern Distributed Systems with Go & gRPC',
      instructor: 'Alex Thorne',
      students: 260,
      rating: 4.85,
      completionRate: 72
    },
    {
      id: 'c-4',
      title: 'Enterprise PostgreSQL Optimization & Indexing',
      instructor: 'Devendra Joshi',
      students: 200,
      rating: 4.88,
      completionRate: 88
    }
  ]);

  useEffect(() => {
    // Simulate real data fetch
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/lms/auth/logout', { method: 'POST' });
    } catch {}
    window.location.href = '/lms/login';
  };

  const navLinks = [
    { label: 'Academy Overview', href: LMS_ROUTES.ADMIN, icon: 'dashboard', active: true },
    { label: 'Course Studio', href: '/admin/courses/builder', icon: 'menu_book' },
    { label: 'AI Curriculum', href: '/admin/ai', icon: 'auto_awesome' },
    { label: 'Student Directory', href: '/super-admin/students', icon: 'school' },
    { label: 'Faculty / Instructors', href: '/super-admin/instructors', icon: 'badge' },
    { label: 'Certificates', href: LMS_ROUTES.CERTIFICATES, icon: 'workspace_premium' },
    { label: 'Quizzes & Tests', href: LMS_ROUTES.QUIZZES, icon: 'quiz' },
    { label: 'Assignments', href: LMS_ROUTES.ASSIGNMENTS, icon: 'assignment' },
    { label: 'Academy Settings', href: '/admin/settings', icon: 'settings' }
  ];

  return (
    <div className="min-h-screen bg-[#060814] text-white flex select-none antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* 1. Left LMS Admin Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 w-64 bg-[#090d1f] border-r border-white/10 flex flex-col justify-between hidden lg:flex">
        <div className="p-5 space-y-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between">
            <Link href={LMS_ROUTES.ADMIN} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-600/30 border border-white/20 group-hover:scale-105 transition-transform">
                🎓
              </div>
              <div>
                <span className="font-black text-base text-white tracking-tight block">
                  MORENA TEACH
                </span>
                <span className="text-[10px] text-emerald-400 font-mono uppercase font-bold tracking-wider">
                  LMS Admin Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Product Switcher Quick Link */}
          <button
            onClick={() => setIsProductSwitcherOpen(true)}
            className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs">
                📚
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Learning Platform</p>
                <p className="text-[10px] text-slate-400">Academy Operations</p>
              </div>
            </div>
            <Icon name="swap_horiz" size={16} className="text-slate-400 group-hover:text-white transition-colors" />
          </button>

          {/* Nav Items */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1">
              Management
            </p>
            {navLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  item.active
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Icon
                  name={item.icon}
                  size={18}
                  className={item.active ? 'text-white' : 'text-slate-400'}
                />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-white/10 space-y-3 bg-black/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-300 text-xs shrink-0">
                {currentUser?.name ? currentUser.name[0] : 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate max-w-[120px]">
                  {currentUser?.name || 'Academy Admin'}
                </p>
                <p className="text-[10px] text-emerald-400 font-mono">LMS Administrator</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out of LMS"
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
            >
              <Icon name="logout" size={16} />
            </button>
          </div>

          <Link
            href={LMS_ROUTES.DASHBOARD}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white text-xs font-bold transition-all border border-white/10"
          >
            <span>Switch to Learner View</span>
            <Icon name="visibility" size={14} />
          </Link>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 min-w-0 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 h-16 bg-[#060814]/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-base sm:text-lg font-black text-white">
                LMS Academy Command Center
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Range Selector */}
            <div className="hidden sm:flex items-center rounded-xl bg-white/[0.04] border border-white/10 p-1">
              {['7D', '30D', '90D', 'ALL'].map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRange(r)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedRange === r
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <Link
              href="/admin/courses/create"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Icon name="add" size={16} />
              <span className="hidden sm:inline">New Masterclass</span>
            </Link>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-4 sm:p-8 space-y-8 flex-1 max-w-7xl w-full mx-auto">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-[#0c1024] p-6 sm:p-8 border border-emerald-500/20 shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                  <span>🎓 Academy Administrator</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  Welcome to MORENA TEACH Learning Admin
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Manage courses, lecture videos, enrolled students, quizzes, accredited certificates, and faculty members with total platform isolation.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 shrink-0">
                <Link
                  href="/admin/courses/builder"
                  className="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold border border-white/10 transition-all flex items-center gap-2"
                >
                  <Icon name="video_settings" size={16} className="text-emerald-400" />
                  <span>Course Studio</span>
                </Link>
                <Link
                  href="/admin/ai"
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2"
                >
                  <Icon name="auto_awesome" size={16} />
                  <span>AI Curriculum</span>
                </Link>
              </div>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Enrolled Students</span>
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs">👥</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.totalStudents.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-400 font-bold mt-1">↑ +14% this month</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Active Courses</span>
                <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 text-xs">📚</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.activeCourses}</p>
              <p className="text-[10px] text-teal-400 font-bold mt-1">100% Published</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Faculty / Instructors</span>
                <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 text-xs">👨‍🏫</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.activeInstructors}</p>
              <p className="text-[10px] text-cyan-400 font-bold mt-1">Active educators</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Completion Rate</span>
                <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 text-xs">📈</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.completionRate}%</p>
              <p className="text-[10px] text-indigo-400 font-bold mt-1">Above benchmark</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Certificates</span>
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 text-xs">🏆</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.certificatesIssued}</p>
              <p className="text-[10px] text-amber-400 font-bold mt-1">Accredited</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Avg Quiz Score</span>
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs">🎯</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.avgQuizScore}%</p>
              <p className="text-[10px] text-emerald-400 font-bold mt-1">Passing standard</p>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link
              href="/admin/courses/create"
              className="p-4 rounded-2xl bg-white/[0.02] hover:bg-emerald-600/10 border border-white/10 hover:border-emerald-500/40 transition-all flex items-center gap-3.5 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                +
              </div>
              <div>
                <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">Create Masterclass</p>
                <p className="text-[10px] text-slate-400">Launch a new course syllabus</p>
              </div>
            </Link>

            <Link
              href="/admin/ai"
              className="p-4 rounded-2xl bg-white/[0.02] hover:bg-purple-600/10 border border-white/10 hover:border-purple-500/40 transition-all flex items-center gap-3.5 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                ✨
              </div>
              <div>
                <p className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">AI Course Generator</p>
                <p className="text-[10px] text-slate-400">Create full syllabus in seconds</p>
              </div>
            </Link>

            <Link
              href="/super-admin/students"
              className="p-4 rounded-2xl bg-white/[0.02] hover:bg-teal-600/10 border border-white/10 hover:border-teal-500/40 transition-all flex items-center gap-3.5 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                👥
              </div>
              <div>
                <p className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors">Manage Students</p>
                <p className="text-[10px] text-slate-400">View roster &amp; troubleshoot</p>
              </div>
            </Link>

            <Link
              href="/admin/settings"
              className="p-4 rounded-2xl bg-white/[0.02] hover:bg-amber-600/10 border border-white/10 hover:border-amber-500/40 transition-all flex items-center gap-3.5 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                📜
              </div>
              <div>
                <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">Certificates &amp; Branding</p>
                <p className="text-[10px] text-slate-400">Configure credentials &amp; passing marks</p>
              </div>
            </Link>
          </div>

          {/* Two Columns: Recent Enrollments & Top Courses */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Recent Enrollments */}
            <div className="lg:col-span-7 rounded-3xl bg-white/[0.02] border border-white/10 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Recent Student Activity</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Real-time enrollment &amp; study progress</p>
                </div>
                <Link
                  href="/super-admin/students"
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  View All →
                </Link>
              </div>

              <div className="divide-y divide-white/5">
                {recentEnrollments.map((enr) => (
                  <div key={enr.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {enr.studentName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{enr.studentName}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[240px]">{enr.courseTitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="hidden sm:block text-right">
                        <p className="text-xs font-bold text-white">{enr.progress}%</p>
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${
                              enr.progress === 100 ? 'bg-emerald-500' : 'bg-teal-500'
                            }`}
                            style={{ width: `${enr.progress}%` }}
                          />
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          enr.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        }`}
                      >
                        {enr.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Masterclasses Performance */}
            <div className="lg:col-span-5 rounded-3xl bg-white/[0.02] border border-white/10 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Top Active Masterclasses</h3>
                  <p className="text-[11px] text-slate-400">Enrollment &amp; completion breakdown</p>
                </div>
                <Link
                  href="/admin/courses/builder"
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Manage →
                </Link>
              </div>

              <div className="space-y-3">
                {topCourses.map((c) => (
                  <div key={c.id} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-white leading-snug line-clamp-1">{c.title}</p>
                      <span className="text-xs text-amber-400 font-bold shrink-0">★ {c.rating}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Instructor: {c.instructor}</span>
                      <span className="font-bold text-slate-300">{c.students} students</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${c.completionRate}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Product Switcher Modal */}
      <ProductSwitcherModal
        isOpen={isProductSwitcherOpen}
        onClose={() => setIsProductSwitcherOpen(false)}
        currentProduct="LEARNING"
      />
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';
import { LMS_ROUTES } from '@/lib/lms-routes';
import { ProductSwitcherModal } from '@/components/common/ProductSwitcherModal';

export default function LmsDashboardPage() {
  const { currentUser } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProductSwitcherOpen, setIsProductSwitcherOpen] = useState(false);
  const [isTutorModalOpen, setIsTutorModalOpen] = useState(false);
  const [tutorPrompt, setTutorPrompt] = useState('');
  const [tutorResponse, setTutorResponse] = useState<string | null>(null);
  const [isTutorThinking, setIsTutorThinking] = useState(false);

  // Mock LMS state & enrolled curricula
  const [enrolledCourses] = useState([
    {
      id: 'c-1',
      title: 'Full-Stack Next.js 16 Masterclass',
      instructor: 'Dr. Sarah Jenkins',
      progress: 68,
      completedLessons: 22,
      totalLessons: 32,
      lastWatched: 'Server Actions & Mutations',
      thumbnail: '⚡'
    },
    {
      id: 'c-2',
      title: 'Advanced UI/UX Design System with Figma',
      instructor: 'Alex Rivera',
      progress: 42,
      completedLessons: 10,
      totalLessons: 24,
      lastWatched: 'Token Variables & Typography',
      thumbnail: '🎨'
    },
    {
      id: 'c-3',
      title: 'Enterprise AI Agents & LLM Integration',
      instructor: 'Vikram Mehta',
      progress: 85,
      completedLessons: 34,
      totalLessons: 40,
      lastWatched: 'RAG Embeddings & Vector DBs',
      thumbnail: '🤖'
    }
  ]);

  const [upcomingAssessments] = useState([
    {
      id: 'a-1',
      title: 'React Server Actions Architecture Review',
      course: 'Full-Stack Next.js 16',
      due: 'Tomorrow, 11:59 PM',
      type: 'ASSIGNMENT'
    },
    {
      id: 'a-2',
      title: 'Design Tokens & Atomic Components Quiz',
      course: 'Advanced UI/UX Design System',
      due: 'Aug 30, 2026',
      type: 'QUIZ'
    }
  ]);

  const [certificates] = useState([
    {
      id: 'cert-1',
      title: 'Full-Stack Next.js 16 Specialist',
      certNo: 'AAD-LMS-9824',
      issueDate: 'Aug 2026',
      grade: 'Distinction'
    }
  ]);

  const handleLogout = async () => {
    try {
      await fetch('/api/lms/auth/logout', { method: 'POST' });
    } catch {}
    window.location.href = LMS_ROUTES.LOGIN;
  };

  const handleAskTutor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorPrompt.trim()) return;

    setIsTutorThinking(true);
    setTutorResponse(null);

    setTimeout(() => {
      setIsTutorThinking(false);
      setTutorResponse(
        `Great question regarding "${tutorPrompt}"! In Next.js App Router, Server Components render on the server without sending JavaScript to the client. When you need interactive hooks like useState or useEffect, declare 'use client' at the top of your file.`
      );
    }, 600);
  };

  const navSections = [
    {
      section: 'LEARNING',
      items: [
        { label: 'Dashboard', icon: 'dashboard', href: LMS_ROUTES.DASHBOARD, active: true },
        { label: 'My Courses', icon: 'auto_stories', href: LMS_ROUTES.MY_COURSES },
        { label: 'Explore Courses', icon: 'explore', href: LMS_ROUTES.COURSES },
        { label: 'Learning Progress', icon: 'trending_up', href: LMS_ROUTES.PROGRESS },
        { label: 'Certificates', icon: 'military_tech', href: LMS_ROUTES.CERTIFICATES },
        { label: 'Assignments', icon: 'assignment', href: LMS_ROUTES.ASSIGNMENTS },
        { label: 'Quizzes', icon: 'quiz', href: LMS_ROUTES.QUIZZES }
      ]
    },
    {
      section: 'ACCOUNT & PREFERENCES',
      items: [
        { label: 'My Profile', icon: 'person', href: LMS_ROUTES.PROFILE },
        { label: 'Notifications', icon: 'notifications', href: LMS_ROUTES.NOTIFICATIONS },
        { label: 'Orders & Receipts', icon: 'receipt_long', href: LMS_ROUTES.ORDERS },
        { label: 'Wishlist', icon: 'favorite', href: LMS_ROUTES.WISHLIST },
        { label: 'Settings', icon: 'settings', href: LMS_ROUTES.SETTINGS }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#060814] text-white flex select-none antialiased">
      {/* 1. Left Persistent LMS Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#060a1a] border-r border-emerald-500/15 flex flex-col justify-between transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-emerald-500/15 space-y-3">
          <div className="flex items-center justify-between">
            <Link href={LMS_ROUTES.DASHBOARD} className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center font-black text-sm text-white shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-all">
                🎓
              </div>
              <div className="flex flex-col">
                <span className="font-black text-sm text-white tracking-tight">MORENA TEACH</span>
                <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider -mt-1">
                  Learning Platform
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setIsProductSwitcherOpen(true)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1 font-mono"
              title="Switch Product"
            >
              <Icon name="swap_horiz" size={16} />
            </button>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="truncate">
                <div className="font-bold text-white truncate">
                  {currentUser?.name ? `${currentUser.name.split(' ')[0]}'s Learning Hub` : 'Student Hub'}
                </div>
                <div className="text-[10px] font-mono text-emerald-300/80 truncate">
                  Status: Active Learner
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 shrink-0">
              LMS
            </span>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
          {navSections.map((sec) => (
            <div key={sec.section} className="space-y-1">
              <div className="px-3 text-[10px] font-mono font-bold text-emerald-400/70 tracking-wider uppercase">
                {sec.section}
              </div>
              <div className="space-y-0.5 pt-1">
                {sec.items.map((item: any) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all group ${
                      item.active
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        name={item.icon}
                        size={18}
                        className={item.active ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'}
                      />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Sidebar Controls */}
        <div className="p-3 border-t border-emerald-500/15 space-y-2 bg-[#040712]">
          <button
            type="button"
            onClick={() => setIsProductSwitcherOpen(true)}
            className="w-full px-3 py-2 rounded-xl bg-indigo-950/40 hover:bg-indigo-950/60 border border-indigo-500/30 text-xs font-bold text-indigo-300 flex items-center justify-between transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <span>🚀</span>
              <span>Switch to MORENA TEACH Sales</span>
            </div>
            <Icon name="arrow_forward" size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Icon name="logout" size={16} />
            <span>Sign Out of LMS</span>
          </button>
        </div>
      </aside>

      {/* 2. Main LMS Dashboard View */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Topbar */}
        <header className="h-16 px-4 sm:px-8 border-b border-emerald-500/15 bg-[#060a1a]/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/5 text-slate-300 hover:text-white"
            >
              <Icon name="menu" size={20} />
            </button>
            <span className="text-xs font-mono font-bold text-slate-400">
              MORENA TEACH Learning &gt; Learner Workspace
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsTutorModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-bold text-emerald-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <span>✨</span>
              <span>Ask AI Tutor</span>
            </button>

            <Link
              href={LMS_ROUTES.COURSES}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30"
            >
              Explore Courses
            </Link>
          </div>
        </header>

        {/* Dashboard Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#072418] via-[#091b26] to-[#0a1128] border border-emerald-500/30 p-6 sm:p-8 shadow-2xl">
            <div className="relative z-10 space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                <span>🔥 14-Day Study Streak Active</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Welcome back, {currentUser?.name?.split(' ')[0] || 'Learner'}! 🚀
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                You have made solid progress this week. Pick up right where you left off in your enrolled curricula.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  href={LMS_ROUTES.MY_COURSES}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5"
                >
                  <Icon name="play_circle" size={16} />
                  <span>Resume Current Course</span>
                </Link>
                <Link
                  href={LMS_ROUTES.PROGRESS}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl border border-white/15 transition-all flex items-center gap-1.5"
                >
                  <Icon name="insights" size={16} />
                  <span>View Study Analytics</span>
                </Link>
              </div>
            </div>

            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Active Curricula', value: '3 Courses', icon: 'auto_stories', color: 'emerald' },
              { label: 'Completed Lessons', value: '66 Lessons', icon: 'task_alt', color: 'teal' },
              { label: 'Average Quiz Score', value: '94%', icon: 'quiz', color: 'cyan' },
              { label: 'Verified Certificates', value: '1 Earned', icon: 'military_tech', color: 'amber' }
            ].map((stat, i) => (
              <div
                key={i}
                className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between hover:border-emerald-500/30 transition-all shadow-lg"
              >
                <div>
                  <div className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                    {stat.label}
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white mt-1">
                    {stat.value}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Icon name={stat.icon} size={20} />
                </div>
              </div>
            ))}
          </div>

          {/* AI Tutor Card CTA */}
          <div
            onClick={() => setIsTutorModalOpen(true)}
            className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-[#071b1e] to-black border border-emerald-500/30 hover:border-emerald-500/60 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group shadow-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                ✨
              </div>
              <div>
                <div className="text-sm font-black text-white flex items-center gap-2">
                  <span>MORENA TEACH AI Study Assistant</span>
                  <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
                    24/7 COPILOT
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Instant conceptual explanations, code snippet breakdowns, and interactive quiz guidance.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-400 font-bold font-mono">
              <span>Open Tutor</span>
              <Icon name="arrow_forward" size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* In-Progress Masterclasses Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>In-Progress Masterclasses</span>
                <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {enrolledCourses.length} Active
                </span>
              </h2>
              <Link href={LMS_ROUTES.MY_COURSES} className="text-xs text-emerald-400 hover:underline font-bold">
                View All Enrolled &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {enrolledCourses.map((c) => (
                <div
                  key={c.id}
                  className="p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-emerald-500/30 transition-all group flex flex-col justify-between shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl p-2 rounded-xl bg-white/[0.04] border border-white/10 group-hover:scale-105 transition-transform inline-block">
                        {c.thumbnail}
                      </span>
                      <span className="text-xs font-mono font-extrabold text-emerald-400">
                        {c.progress}%
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors leading-snug">
                        {c.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1">Instructor: {c.instructor}</p>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                          style={{ width: `${c.progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>{c.completedLessons} of {c.totalLessons} lessons</span>
                        <span className="text-slate-300 truncate max-w-[120px]">{c.lastWatched}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/10">
                    <Link
                      href={LMS_ROUTES.LEARN(c.id)}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                    >
                      <Icon name="play_arrow" size={16} />
                      <span>Resume Lesson</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Assessments & Accredited Certificates */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Upcoming Quizzes / Assignments */}
            <div className="lg:col-span-6 p-6 rounded-3xl bg-white/[0.03] border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Icon name="assignment" size={18} className="text-emerald-400" />
                  <span>Upcoming Quizzes &amp; Assignments</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">2 Pending</span>
              </div>

              <div className="space-y-3">
                {upcomingAssessments.map((a) => (
                  <div
                    key={a.id}
                    className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{a.title}</span>
                        <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30">
                          {a.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        {a.course} • Due: <strong className="text-slate-200">{a.due}</strong>
                      </div>
                    </div>
                    <Link
                      href={LMS_ROUTES.ASSIGNMENTS}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-emerald-300 hover:text-white transition-all shrink-0"
                    >
                      Start &rarr;
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Certificates */}
            <div className="lg:col-span-6 p-6 rounded-3xl bg-white/[0.03] border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Icon name="military_tech" size={18} className="text-amber-400" />
                  <span>Accredited Certificates</span>
                </h3>
                <Link href={LMS_ROUTES.CERTIFICATES} className="text-xs text-emerald-400 hover:underline">
                  View All
                </Link>
              </div>

              <div className="space-y-3">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/20 to-black border border-amber-500/30 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🏆</span>
                      <div>
                        <div className="text-xs font-bold text-white">{cert.title}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          Cert #: <strong className="text-amber-300">{cert.certNo}</strong> • {cert.grade}
                        </div>
                      </div>
                    </div>
                    <Link
                      href={LMS_ROUTES.CERTIFICATES}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 transition-all shrink-0"
                    >
                      Download
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* AI Tutor Modal */}
      {isTutorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl bg-[#090e22] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <h3 className="text-base font-black text-white">MORENA TEACH AI Learning Tutor</h3>
              </div>
              <button
                onClick={() => setIsTutorModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleAskTutor} className="space-y-3">
              <textarea
                rows={3}
                value={tutorPrompt}
                onChange={(e) => setTutorPrompt(e.target.value)}
                placeholder="Ask any question about your lessons, concepts, or homework assignments..."
                className="w-full bg-white/[0.04] border border-white/15 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all resize-none"
              />
              <button
                type="submit"
                disabled={isTutorThinking || !tutorPrompt.trim()}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Icon name={isTutorThinking ? 'sync' : 'psychology'} size={16} className={isTutorThinking ? 'animate-spin' : ''} />
                <span>{isTutorThinking ? 'Consulting Knowledge Base...' : 'Ask Tutor'}</span>
              </button>
            </form>

            {tutorResponse && (
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200 space-y-2 leading-relaxed">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>💡 Tutor Answer:</span>
                </div>
                <p>{tutorResponse}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Switcher Modal */}
      <ProductSwitcherModal
        isOpen={isProductSwitcherOpen}
        onClose={() => setIsProductSwitcherOpen(false)}
        currentProduct="LEARNING"
      />
    </div>
  );
}

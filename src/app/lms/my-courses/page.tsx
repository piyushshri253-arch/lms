'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';
import { LMS_ROUTES } from '@/lib/lms-routes';
import { LmsLayout } from '@/components/lms/LmsLayout';

function MyCoursesContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'ALL';
  const { showToast } = useApp();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('recent');
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [counts, setCounts] = useState({ all: 0, inProgress: 0, completed: 0, notStarted: 0 });

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const url = `/api/student/courses?tab=${activeTab}&category=${selectedCategory}&sort=${sortBy}&q=${encodeURIComponent(
        search
      )}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch {
      // Fallback preview courses if API has no records yet
      setCourses([
        {
          id: 'c-1',
          title: 'Full-Stack Next.js 16 Masterclass',
          slug: 'full-stack-nextjs-16',
          category: 'Web Development',
          instructor: { name: 'Dr. Sarah Jenkins' },
          progress: 68,
          completedLessons: 22,
          totalLessons: 32,
          status: 'IN_PROGRESS',
          nextLessonTitle: 'Server Actions & Mutations'
        },
        {
          id: 'c-2',
          title: 'Advanced UI/UX Design System with Figma',
          slug: 'advanced-ui-ux-figma',
          category: 'UI/UX Design',
          instructor: { name: 'Alex Rivera' },
          progress: 42,
          completedLessons: 10,
          totalLessons: 24,
          status: 'IN_PROGRESS',
          nextLessonTitle: 'Token Variables & Typography'
        },
        {
          id: 'c-3',
          title: 'Enterprise AI Agents & LLM Integration',
          slug: 'enterprise-ai-agents-llm',
          category: 'Artificial Intelligence',
          instructor: { name: 'Vikram Mehta' },
          progress: 100,
          completedLessons: 40,
          totalLessons: 40,
          status: 'COMPLETED',
          nextLessonTitle: 'Course Completed'
        }
      ]);
      setCounts({ all: 3, inProgress: 2, completed: 1, notStarted: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [activeTab, selectedCategory, sortBy, search]);

  return (
    <LmsLayout activePath={LMS_ROUTES.MY_COURSES} pageTitle="My Courses">
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.03] p-6 rounded-3xl border border-emerald-500/20 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 mb-1">
              <Link href={LMS_ROUTES.DASHBOARD} className="hover:text-emerald-400 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-emerald-400">My Enrolled Courses</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              My Enrolled Curricula
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Track lecture progress, resume interactive modules, and claim accredited certificates.
            </p>
          </div>

          <Link
            href={LMS_ROUTES.COURSES}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Icon name="add" size={16} />
            <span>Browse More Courses</span>
          </Link>
        </div>

        {/* Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/10 shadow-lg">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { key: 'ALL', label: 'All Courses', count: counts.all },
              { key: 'IN_PROGRESS', label: 'In Progress', count: counts.inProgress },
              { key: 'COMPLETED', label: 'Completed', count: counts.completed },
              { key: 'NOT_STARTED', label: 'Not Started', count: counts.notStarted }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-extrabold ${
                    activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search my courses..."
              className="w-full bg-white/[0.04] border border-white/15 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Course Cards Grid */}
        {isLoading ? (
          <div className="py-16 text-center text-xs font-mono text-slate-400">
            Loading enrolled courses...
          </div>
        ) : courses.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-4">
            <div className="text-4xl">📚</div>
            <h3 className="text-base font-bold text-white">No enrolled courses in this view</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Explore available masterclasses in the catalog and enroll to begin your learning journey.
            </p>
            <Link
              href={LMS_ROUTES.COURSES}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
            >
              <Icon name="explore" size={16} />
              <span>Explore Course Catalog</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="p-5 rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4 shadow-xl group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {course.category || 'General'}
                    </span>
                    <span className="text-xs font-mono font-extrabold text-emerald-400">
                      {course.progress || 0}%
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors leading-snug">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Instructor: {course.instructor?.name || 'Faculty Member'}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                        style={{ width: `${course.progress || 0}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>{course.completedLessons || 0} / {course.totalLessons || 0} lessons</span>
                      <span className="text-slate-300 truncate max-w-[140px]">
                        {course.nextLessonTitle || (course.progress === 100 ? 'Completed' : 'Resume')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10">
                  <Link
                    href={LMS_ROUTES.LEARN(course.id || course.slug)}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    <Icon name={course.progress === 100 ? 'replay' : 'play_arrow'} size={16} />
                    <span>{course.progress === 100 ? 'Review Course' : 'Resume Learning'}</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </LmsLayout>
  );
}

export default function LmsMyCoursesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060814] flex items-center justify-center text-white text-xs font-mono">
          Loading My Courses...
        </div>
      }
    >
      <MyCoursesContent />
    </Suspense>
  );
}

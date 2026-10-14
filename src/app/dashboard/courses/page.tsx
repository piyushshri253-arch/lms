'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [activeTab, selectedCategory, sortBy, search]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/dashboard" className="hover:text-primary">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">My Courses</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            My Enrolled Curricula
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Track your lecture progress, resume modules, and claim verified certificates
          </p>
        </div>

        <Link
          href="/dashboard/explore"
          className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Icon name="add" size={16} />
          <span>Browse More Courses</span>
        </Link>
      </div>

      {/* Tabs & Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/80 shadow-xs">
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
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-extrabold ${
                  activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-surface-container text-outline'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search, Category, Sorting */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1 md:flex-none">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter courses..."
              className="w-full bg-surface border border-outline-variant/80 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-surface border border-outline-variant/80 rounded-xl px-3 py-1.5 text-xs font-semibold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="recent">Recently Enrolled</option>
            <option value="progress_desc">Highest Progress</option>
            <option value="progress_asc">Lowest Progress</option>
            <option value="title">Course Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Courses Cards Grid */}
      {courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((c) => (
            <div
              key={c.id}
              className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden hover:border-primary/40 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Thumbnail */}
                <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primary/10 via-surface-container to-surface-container-high flex items-center justify-center">
                  {typeof c.thumbnail === 'string' && c.thumbnail.trim().length > 0 ? (
                    <img
                      src={c.thumbnail.trim()}
                      alt={c.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-primary/60 group-hover:scale-105 transition-transform duration-300">
                      <Icon name="school" size={32} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-outline">{c.category || 'Course'}</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                    {c.category}
                  </div>
                  <div className="absolute top-3 right-3">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full backdrop-blur-md ${
                        c.status === 'COMPLETED'
                          ? 'bg-emerald-500/90 text-white'
                          : c.status === 'IN_PROGRESS'
                          ? 'bg-amber-500/90 text-white'
                          : 'bg-slate-700/90 text-white'
                      }`}
                    >
                      {c.status === 'COMPLETED' ? 'Completed' : c.status === 'IN_PROGRESS' ? 'In Progress' : 'Not Started'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  <h3 className="font-extrabold text-base text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                    {c.title}
                  </h3>
                  <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
                    <span>Instructor:</span>
                    <span className="font-bold text-on-surface">{c.instructor?.name}</span>
                  </p>

                  {/* Version Update Notice if newer version is live */}
                  {c.versionInfo?.hasUpdateAvailable && (
                    <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                      <span className="font-extrabold flex items-center gap-1">
                        <span>✨</span>
                        <span>{c.versionInfo.liveVersionLabel} Available</span>
                      </span>
                      <span className="text-[10px] text-amber-700 font-semibold">(You own {c.versionInfo.enrolledVersionLabel})</span>
                    </div>
                  )}

                  {/* Progress Info */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-xs font-mono font-bold">
                      <span className="text-on-surface-variant">
                        {c.completedLessons} / {c.totalLessons} Lessons
                      </span>
                      <span className="text-primary">{c.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${c.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Next Lesson Info */}
                  {c.nextLesson && (
                    <div className="p-2.5 bg-surface-container-low rounded-xl text-xs space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-outline block">
                        {c.progressPercent === 100 ? 'Final Review:' : 'Next Up:'}
                      </span>
                      <p className="font-bold text-on-surface truncate">{c.nextLesson.title}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-5 pt-0 flex gap-2">
                <Link
                  href={`/learn/${c.slug || c.id}`}
                  className="flex-1 py-2.5 bg-primary text-on-primary hover:bg-primary-container rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Icon name="play_arrow" size={16} />
                  <span>{c.progressPercent === 100 ? 'Review Lectures' : 'Continue Course'}</span>
                </Link>

                {c.versionInfo?.hasUpdateAvailable && (
                  <Link
                    href={`/courses/${c.slug || c.id}`}
                    className="py-2.5 px-3 bg-gradient-to-r from-amber-500 to-purple-600 hover:opacity-90 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1 transition-opacity shrink-0"
                    title={`Upgrade to ${c.versionInfo.liveVersionLabel}`}
                  >
                    <Icon name="bolt" size={14} />
                    <span>Upgrade</span>
                  </Link>
                )}

                {c.certificateNumber && (
                  <Link
                    href={`/certificate/${c.certificateNumber}`}
                    target="_blank"
                    className="p-2.5 bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 rounded-xl transition-all"
                    title="View Certificate"
                  >
                    <Icon name="workspace_premium" fill size={18} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface-container-lowest p-12 rounded-3xl border border-outline-variant/80 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto font-bold">
            <Icon name="school" size={24} />
          </div>
          <h3 className="font-bold text-base text-on-surface">No courses found</h3>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
            {search ? 'Try adjusting your search filters' : 'You do not have any courses in this tab.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default function MyCoursesPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-sm font-bold text-outline">Loading courses...</div>}>
      <MyCoursesContent />
    </React.Suspense>
  );
}

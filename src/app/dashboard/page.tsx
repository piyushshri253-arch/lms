'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useApp } from '@/context/AppContext';

export default function StudentDashboardPage() {
  const router = useRouter();
  const { currentUser, showToast } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [isRefreshingAnnouncements, setIsRefreshingAnnouncements] = useState(false);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyLicense = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchDashboardData = async (showRefreshToast = false) => {
    if (!showRefreshToast) setIsLoading(true);
    else setIsRefreshingAnnouncements(true);

    try {
      const [resDash, resLic, resDown, resBook] = await Promise.all([
        fetch('/api/student/dashboard', { cache: 'no-store' }),
        fetch('/api/customer/licenses'),
        fetch('/api/customer/downloads'),
        fetch('/api/customer/bookings')
      ]);

      if (resDash.ok) {
        const d = await resDash.json();
        setData(d);
      }
      if (resLic.ok) {
        const l = await resLic.json();
        setLicenses(l.licenses || []);
      }
      if (resDown.ok) {
        const dn = await resDown.json();
        setDownloads(dn.downloads || []);
      }
      if (resBook.ok) {
        const b = await resBook.json();
        setBookings(b.bookings || []);
      }

      if (showRefreshToast) {
        showToast({ title: 'Dashboard Refreshed 🔄', description: 'Loaded latest stats, licenses, and downloads.', type: 'info' });
      }
    } catch {
    } finally {
      setIsLoading(false);
      setIsRefreshingAnnouncements(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Retrieve dismissed announcement IDs for current browser session
    try {
      const stored = sessionStorage.getItem('dismissed_announcements');
      if (stored) setDismissedIds(JSON.parse(stored));
    } catch {}
  }, []);

  const handleDismissBanner = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      sessionStorage.setItem('dismissed_announcements', JSON.stringify(updated));
    } catch {}
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const stats = data?.stats || {
    totalEnrolled: 0,
    inProgress: 0,
    completed: 0,
    certificates: 0,
    learningHours: 0,
    learningStreak: 1
  };

  const continueCourses = data?.continueLearning || [];
  const recentActivities = data?.recentActivity || [];
  const recommendedCourses = data?.recommendedCourses || [];
  const announcements: any[] = data?.announcements || [];
  const student = data?.user || currentUser;

  // Active top announcement for top banner (if not dismissed)
  const activeTopAnnouncement = announcements.find((a) => !dismissedIds.includes(a.id));

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* 0. Top Alert Banner for Active Platform Announcements */}
      {activeTopAnnouncement && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/15 via-primary/10 to-surface-container-lowest border border-amber-500/30 rounded-3xl p-4 sm:p-5 shadow-xs flex items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-3 duration-300">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-black shrink-0 shadow-xs">
              <Icon name="campaign" size={22} className="text-amber-800 animate-bounce" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 border border-amber-500/30">
                  📢 Platform Announcement
                </span>
                <span className="text-[10px] text-outline font-mono">
                  {new Date(activeTopAnnouncement.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <h4 className="font-black text-sm text-on-surface truncate">
                {activeTopAnnouncement.title}
              </h4>
              <p className="text-xs text-on-surface-variant leading-snug line-clamp-2">
                {activeTopAnnouncement.message}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleDismissBanner(activeTopAnnouncement.id)}
            className="p-1.5 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container/60 shrink-0 cursor-pointer transition-colors"
            title="Dismiss Announcement Banner"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      {/* 1. Welcome Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-primary/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <UserAvatar
            avatar={student?.avatar}
            name={student?.name || 'Learner'}
            size="2xl"
            shape="rounded"
            className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-primary/30 shadow-md shrink-0"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-primary font-mono">
                Student Learning Dashboard
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full uppercase">
                Active Student
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
              Welcome back, {student?.name?.split(' ')[0] || 'Learner'} 👋
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant font-medium">
              You're making great progress! Continue where you left off or explore new deep-tech curricula.
            </p>
          </div>
        </div>

        {/* Learning Streak Pill */}
        <div className="flex items-center gap-3 bg-surface-container-lowest/80 backdrop-blur-sm p-4 rounded-2xl border border-outline-variant/60 shadow-xs shrink-0 self-start md:self-auto">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-2xl">
            🔥
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-black text-lg text-on-surface">
              <span>{stats.learningStreak}</span>
              <span className="text-xs font-semibold text-on-surface-variant">Days</span>
            </div>
            <p className="text-[11px] text-amber-700 font-extrabold uppercase tracking-wider">
              Learning Streak
            </p>
          </div>
        </div>
      </div>

      {/* Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search across all enrolled courses, lectures, or explore new topics..."
          className="w-full bg-surface-container-lowest border border-outline-variant/80 rounded-2xl pl-12 pr-28 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-xs transition-all"
        />
        <button
          type="submit"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary-container shadow-xs cursor-pointer transition-all"
        >
          Search
        </button>
      </form>

      {/* 2. Real Database Statistics KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Enrolled */}
        <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-3xl border border-outline-variant/80 shadow-xs hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-outline">Enrolled</span>
            <Icon name="school" size={18} className="text-primary" />
          </div>
          <div className="text-2xl font-black text-on-surface font-mono">{stats.totalEnrolled}</div>
          <p className="text-[10px] text-on-surface-variant mt-1 font-medium">Courses total</p>
        </div>

        {/* In Progress */}
        <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-3xl border border-outline-variant/80 shadow-xs hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-outline">In Progress</span>
            <Icon name="play_circle" size={18} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-on-surface font-mono">{stats.inProgress}</div>
          <p className="text-[10px] text-indigo-700 mt-1 font-medium">Active learning</p>
        </div>

        {/* Completed */}
        <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-3xl border border-outline-variant/80 shadow-xs hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-outline">Completed</span>
            <Icon name="task_alt" size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-on-surface font-mono">{stats.completed}</div>
          <p className="text-[10px] text-emerald-700 mt-1 font-medium">100% finished</p>
        </div>

        {/* Certificates */}
        <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-3xl border border-outline-variant/80 shadow-xs hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-outline">Certificates</span>
            <Icon name="workspace_premium" size={18} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-on-surface font-mono">{stats.certificates}</div>
          <p className="text-[10px] text-amber-700 mt-1 font-medium">Verified diplomas</p>
        </div>

        {/* Learning Hours */}
        <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-3xl border border-outline-variant/80 shadow-xs hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-outline">Hours</span>
            <Icon name="schedule" size={18} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-on-surface font-mono">{stats.learningHours}h</div>
          <p className="text-[10px] text-blue-700 mt-1 font-medium">Total time spent</p>
        </div>

        {/* Streak */}
        <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-3xl border border-outline-variant/80 shadow-xs hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-outline">Streak</span>
            <span className="text-base">🔥</span>
          </div>
          <div className="text-2xl font-black text-on-surface font-mono">{stats.learningStreak} d</div>
          <p className="text-[10px] text-amber-700 mt-1 font-medium">Active consistency</p>
        </div>
      </div>

      {/* 3. Continue Learning Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-on-surface flex items-center gap-2">
              <Icon name="play_arrow" size={22} className="text-primary" />
              <span>Continue Learning</span>
            </h2>
            <p className="text-xs text-on-surface-variant">Resume your active lecture where you last stopped</p>
          </div>
          <Link
            href="/dashboard/courses"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>View All Courses</span>
            <Icon name="arrow_forward" size={14} />
          </Link>
        </div>

        {continueCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {continueCourses.map((course: any) => (
              <div
                key={course.id}
                className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden hover:border-primary/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Thumbnail & Category Badge */}
                  <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primary/10 via-surface-container to-surface-container-high flex items-center justify-center">
                    {typeof course.thumbnail === 'string' && course.thumbnail.trim().length > 0 ? (
                      <img
                        src={course.thumbnail.trim()}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1 text-primary/60 group-hover:scale-105 transition-transform duration-300">
                        <Icon name="school" size={32} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-outline">{course.category || 'Course'}</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                      {course.category}
                    </div>
                    <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Icon name="schedule" size={12} />
                      <span>{course.durationHours}h</span>
                    </div>
                  </div>

                  {/* Course Details */}
                  <div className="p-5 space-y-3">
                    <h3 className="font-extrabold text-base text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
                      <span>Instructor:</span>
                      <span className="font-bold text-on-surface">{course.instructor?.name}</span>
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-xs font-bold font-mono">
                        <span className="text-on-surface-variant">
                          {course.completedLessons} / {course.totalLessons} Lessons
                        </span>
                        <span className="text-primary">{course.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-500"
                          style={{ width: `${course.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Next Lesson Title */}
                    {course.nextLesson && (
                      <div className="p-2.5 bg-surface-container-low rounded-xl text-xs space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-outline block">Next Lecture:</span>
                        <p className="font-bold text-on-surface truncate">{course.nextLesson.title}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Continue Learning Action Button */}
                <div className="p-5 pt-0">
                  <Link
                    href={`/learn/${course.slug || course.id}`}
                    className="w-full py-2.5 bg-primary text-on-primary hover:bg-primary-container rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Icon name="play_arrow" size={16} />
                    <span>{course.progressPercent === 100 ? 'Review Course' : 'Continue Learning'}</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto font-bold">
              <Icon name="school" size={24} />
            </div>
            <h3 className="font-bold text-base text-on-surface">No active courses yet</h3>
            <p className="text-xs text-on-surface-variant max-w-md mx-auto">
              Explore our master courses in Cloud Architecture, UI/UX Design, and AI to start learning!
            </p>
            <Link
              href="/dashboard/explore"
              className="inline-block px-5 py-2 bg-primary text-on-primary rounded-xl font-bold text-xs shadow-xs"
            >
              Browse Course Catalog
            </Link>
          </div>
        )}
      </div>

      {/* 4. Grid: Recent Activity & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Activity (Span 7) */}
        <div className="lg:col-span-7 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
            <h3 className="font-extrabold text-base text-on-surface flex items-center gap-2">
              <Icon name="history" size={18} className="text-primary" />
              <span>Recent Learning Activity</span>
            </h3>
            <span className="text-[11px] text-outline font-mono">Live DB Stream</span>
          </div>

          <div className="space-y-3">
            {recentActivities.length > 0 ? (
              recentActivities.map((act: any) => (
                <div
                  key={act.id}
                  className="p-3.5 bg-surface rounded-2xl border border-outline-variant/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        act.type === 'CERTIFICATE_EARNED'
                          ? 'bg-amber-100 text-amber-700'
                          : act.type === 'LESSON_COMPLETED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      <Icon
                        name={
                          act.type === 'CERTIFICATE_EARNED'
                            ? 'workspace_premium'
                            : act.type === 'LESSON_COMPLETED'
                            ? 'check_circle'
                            : 'school'
                        }
                        size={18}
                      />
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">{act.title}</p>
                      <p className="text-[11px] text-on-surface-variant leading-snug">{act.description}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-outline font-mono shrink-0">
                    {new Date(act.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-outline py-4 text-center">No recent activities recorded yet.</p>
            )}
          </div>
        </div>

        {/* Platform Announcements (Span 5) */}
        <div className="lg:col-span-5 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
            <h3 className="font-extrabold text-base text-on-surface flex items-center gap-2">
              <Icon name="campaign" size={18} className="text-primary" />
              <span>Announcements</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchDashboardData(true)}
                disabled={isRefreshingAnnouncements}
                className="text-[10px] font-bold text-outline hover:text-primary flex items-center gap-1 cursor-pointer"
                title="Refresh Live Announcements"
              >
                <Icon name="refresh" size={14} className={isRefreshingAnnouncements ? 'animate-spin' : ''} />
                <span>Sync</span>
              </button>
              <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full uppercase">
                {announcements.length} Live
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {announcements.length > 0 ? (
              announcements.map((ann: any) => (
                <div
                  key={ann.id}
                  className="p-4 bg-surface rounded-2xl border border-outline-variant/60 space-y-2 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-xs text-primary line-clamp-1">{ann.title}</span>
                    <span className="text-[10px] text-outline font-mono shrink-0">
                      {new Date(ann.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-line">
                    {ann.message}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-outline space-y-1">
                <Icon name="campaign" size={24} className="mx-auto text-outline/40" />
                <p className="font-bold text-on-surface">No active announcements</p>
                <p>You're all caught up with campus and curriculum notices.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Active Software Licenses Section */}
      {licenses.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-on-surface flex items-center gap-2">
                <Icon name="key" size={22} className="text-purple-600" />
                <span>My Software Licenses & Code Systems</span>
              </h2>
              <p className="text-xs text-on-surface-variant">Active license keys and machine activations</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {licenses.map((l) => (
              <div key={l.id} className="p-5 rounded-3xl bg-surface-container-lowest border border-outline-variant/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-mono text-[10px] uppercase font-bold text-purple-700 bg-purple-500/10 px-2 py-0.5 rounded-md">
                      v{l.product?.version || '1.0.0'}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700">✓ {l.status}</span>
                  </div>
                  <h4 className="font-black text-sm text-on-surface mb-1">{l.product?.name || 'Software Product'}</h4>
                  <div className="mt-3 p-2.5 rounded-xl bg-surface border border-outline-variant/60 flex items-center justify-between font-mono text-xs text-purple-700 font-bold">
                    <span>{l.licenseKey}</span>
                    <button
                      onClick={() => copyLicense(l.licenseKey)}
                      className="text-outline hover:text-on-surface text-[10px] uppercase font-bold"
                    >
                      {copiedKey === l.licenseKey ? 'COPIED ✓' : 'COPY'}
                    </button>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-outline-variant/40 text-[11px] text-outline flex items-center justify-between">
                  <span>Devices: {l.activations?.length || 0} / {l.maxActivations}</span>
                  <span>{l.organization?.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4.5 Digital Downloads Section */}
      {downloads.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-on-surface flex items-center gap-2">
                <Icon name="download" size={22} className="text-indigo-600" />
                <span>My Digital Downloads & Assets</span>
              </h2>
              <p className="text-xs text-on-surface-variant">Secure files, templates, and UI assets</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {downloads.map((dn, idx) => (
              <div key={idx} className="p-5 rounded-3xl bg-surface-container-lowest border border-outline-variant/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-mono text-[10px] uppercase font-bold text-indigo-700 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                      {dn.fileType}
                    </span>
                    <span className="text-[10px] text-outline font-mono">#{dn.orderNumber}</span>
                  </div>
                  <h4 className="font-black text-sm text-on-surface mb-1">{dn.fileName}</h4>
                  <p className="text-xs text-on-surface-variant">{dn.productName}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-outline-variant/40 flex items-center justify-between">
                  <span className="text-[11px] text-outline">{dn.organization?.name}</span>
                  <a
                    href={dn.fileUrl || '#'}
                    download
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                  >
                    <Icon name="download" size={14} />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4.6 Booked Services Section */}
      {bookings.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-on-surface flex items-center gap-2">
                <Icon name="work" size={22} className="text-pink-600" />
                <span>My Booked Services</span>
              </h2>
              <p className="text-xs text-on-surface-variant">Track project delivery and deliverables</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bookings.map((b) => (
              <div key={b.id} className="p-5 rounded-3xl bg-surface-container-lowest border border-outline-variant/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-mono text-[10px] uppercase font-bold text-pink-700 bg-pink-500/10 px-2 py-0.5 rounded-md">
                      {b.service?.category}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700">✓ {b.status}</span>
                  </div>
                  <h4 className="font-black text-sm text-on-surface mb-1">{b.service?.name}</h4>
                  <p className="text-xs text-on-surface-variant">Turnaround: {b.service?.deliveryDays} Days</p>
                </div>
                <div className="mt-4 pt-3 border-t border-outline-variant/40 text-[11px] text-outline flex items-center justify-between">
                  <span>Studio: {b.organization?.name}</span>
                  <span className="font-bold text-on-surface">₹{b.amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Recommended Courses Section */}
      {recommendedCourses.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-on-surface flex items-center gap-2">
                <Icon name="recommend" size={22} className="text-primary" />
                <span>Recommended For You</span>
              </h2>
              <p className="text-xs text-on-surface-variant">Master specialized skills tailored to your technical track</p>
            </div>
            <Link
              href="/dashboard/explore"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>Explore All</span>
              <Icon name="arrow_forward" size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recommendedCourses.map((c: any) => (
              <div
                key={c.id}
                className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden hover:border-primary/40 transition-all flex flex-col justify-between group"
              >
                <div>
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
                        <Icon name="school" size={28} />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-outline">{c.category || 'Course'}</span>
                      </div>
                    )}
                    <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                      {c.category}
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="font-extrabold text-sm text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                      {c.title}
                    </h3>
                    <p className="text-[11px] text-on-surface-variant">By {c.instructor?.name}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono font-black text-sm text-on-surface">
                        ${c.price}
                      </span>
                      <span className="text-[10px] font-mono text-outline uppercase">{c.level}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <Link
                    href={`/courses/${c.slug || c.id}`}
                    className="w-full py-2 bg-surface text-on-surface border border-outline-variant hover:border-primary rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>View Curriculum</span>
                    <Icon name="arrow_forward" size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

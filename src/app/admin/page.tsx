'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';
import { useAdmin } from '@/context/AdminContext';

export default function AdminDashboardPage() {
  const { currentUser } = useApp();
  const { hasPermission, hasAnyPermission, isSuperAdmin } = useAdmin();

  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D' | '1Y'>('30D');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<{
    stats: any;
    pendingActions: any;
    topCourses?: any[];
    recentActivity: any[];
  }>({
    stats: {
      totalStudents: 0,
      activeThisMonth: 0,
      newStudentsToday: 0,
      studentGrowth: 0,
      totalCourses: 0,
      publishedCourses: 0,
      inReviewCourses: 0,
      draftCourses: 0,
      totalInstructors: 0,
      totalEnrollments: 0,
      totalRevenue: 0,
      thisMonthRevenue: 0,
      todayCollection: 0,
      pendingPaymentsAmount: 0,
      totalCertificates: 0,
      completionRate: 0,
      avgQuizScore: 0
    },
    pendingActions: {
      coursesInReview: 0,
      pendingPayments: 0,
      refundRequests: 0,
      incompleteStudents: 0,
      pendingCertificates: 0
    },
    topCourses: [],
    recentActivity: []
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const url = `/api/admin/dashboard`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const adminFirstName = currentUser?.name?.split(' ')[0] || 'Administrator';
  const { stats, pendingActions, topCourses = [], recentActivity = [] } = data;

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* 1. Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                AADHYARA Platform Operations
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {getGreeting()}, {adminFirstName} 👋
            </h1>
            <p className="text-indigo-200 text-xs sm:text-sm font-medium max-w-xl">
              Welcome back to your central command center for <strong className="text-white">AADHYARA</strong>.
            </p>

            {/* Quick Summary Pill Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-white/90">
              {hasPermission('student.view') && (
                <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl">
                  <Icon name="people" size={16} className="text-indigo-300" />
                  <span>{(stats.totalStudents ?? 0).toLocaleString()} Students</span>
                </div>
              )}
              {hasPermission('course.view') && (
                <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl">
                  <Icon name="menu_book" size={16} className="text-purple-300" />
                  <span>{stats.totalCourses ?? 0} Courses</span>
                </div>
              )}
              {hasPermission('payment.view') && (
                <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl">
                  <Icon name="payments" size={16} className="text-emerald-300" />
                  <span>₹{(stats.totalRevenue ?? 0).toLocaleString('en-IN')} Revenue</span>
                </div>
              )}
            </div>
          </div>

          {/* Time range selector */}
          <div className="flex items-center gap-1 bg-black/30 p-1.5 rounded-2xl backdrop-blur-md self-start md:self-auto shrink-0 border border-white/10">
            {(['7D', '30D', '90D', '1Y'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  timeRange === range
                    ? 'bg-white text-indigo-900 shadow-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Permission-Driven Quick Actions */}
      <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon name="bolt" size={18} className="text-primary" />
            <h2 className="text-xs font-black uppercase tracking-wider text-on-surface">Quick Actions</h2>
          </div>
          <span className="text-[10px] font-mono text-outline">RBAC Enabled</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Add Student Button (student.create) */}
          {hasPermission('student.create') && (
            <Link
              href="/admin/students?action=create"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
            >
              <Icon name="person_add" size={16} />
              <span>+ Add Student</span>
            </Link>
          )}

          {/* Create Course Button (course.create) */}
          {hasPermission('course.create') && (
            <Link
              href="/admin/courses?action=create"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100 transition-all cursor-pointer"
            >
              <Icon name="add_circle" size={16} />
              <span>+ Create Course</span>
            </Link>
          )}

          {/* Upload Content Button (content.create or content.upload) */}
          {(hasPermission('content.create') || hasPermission('content.upload')) && (
            <Link
              href="/admin/courses"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold hover:bg-purple-100 transition-all cursor-pointer"
            >
              <Icon name="upload_file" size={16} />
              <span>Manage Courses</span>
            </Link>
          )}

          {/* View Payments Button (payment.view) */}
          {hasPermission('payment.view') && (
            <Link
              href="/admin/payments"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-all cursor-pointer"
            >
              <Icon name="receipt_long" size={16} />
              <span>View Payments</span>
            </Link>
          )}

          {/* Issue Certificate Button (certificate.issue) */}
          {hasPermission('certificate.issue') && (
            <Link
              href="/admin/certificates?action=issue"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold hover:bg-amber-100 transition-all cursor-pointer"
            >
              <Icon name="workspace_premium" size={16} />
              <span>Issue Certificate</span>
            </Link>
          )}

          {/* Fallback info when minimal permissions granted */}
          {!hasPermission('student.create') &&
            !hasPermission('course.create') &&
            !hasPermission('payment.view') && (
              <p className="text-xs text-outline italic py-1">
                You have read-only view access in this facility. Additional actions require higher RBAC credentials.
              </p>
            )}
        </div>
      </div>

      {/* 3. Permission-Driven KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Students KPI */}
        <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
              <Icon name="school" size={18} />
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">
              Live
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-outline">Total Students</p>
            <h3 className="text-xl font-black text-on-surface mt-0.5">
              {(stats.totalStudents ?? 0).toLocaleString()}
            </h3>
          </div>
          <div className="pt-2 border-t border-outline-variant/40 text-[10px] text-outline font-mono flex justify-between">
            <span>Active: {stats.activeThisMonth ?? 0}</span>
            <span className="text-emerald-600 font-bold">+{stats.newStudentsToday ?? 0} today</span>
          </div>
        </div>

        {/* Card 2: Courses KPI */}
        <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
              <Icon name="menu_book" size={18} />
            </div>
            <span className="text-[10px] font-mono font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-full">
              {stats.publishedCourses ?? 0} Live
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-outline">Total Courses</p>
            <h3 className="text-xl font-black text-on-surface mt-0.5">
              {stats.totalCourses ?? 0}
            </h3>
          </div>
          <div className="pt-2 border-t border-outline-variant/40 text-[10px] text-outline font-mono flex justify-between">
            <span className="text-amber-600">{stats.draftCourses ?? 0} Drafts</span>
            <span>{stats.publishedCourses ?? 0} Published</span>
          </div>
        </div>

        {/* Card 3: Instructors KPI */}
        <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
              <Icon name="groups" size={18} />
            </div>
            <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full">
              Faculty
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-outline">Total Instructors</p>
            <h3 className="text-xl font-black text-on-surface mt-0.5">
              {stats.totalInstructors ?? 0} Faculty
            </h3>
          </div>
          <div className="pt-2 border-t border-outline-variant/40 text-[10px] text-outline font-mono flex justify-between">
            <span>Verified</span>
            <span className="text-emerald-600 font-bold">Active</span>
          </div>
        </div>

        {/* Card 4: Enrollments KPI */}
        <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 flex items-center justify-center">
              <Icon name="how_to_reg" size={18} />
            </div>
            <span className="text-[10px] font-mono font-bold text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30 px-1.5 py-0.5 rounded-full">
              Cohort
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-outline">Total Enrollments</p>
            <h3 className="text-xl font-black text-on-surface mt-0.5">
              {(stats.totalEnrollments ?? 0).toLocaleString()}
            </h3>
          </div>
          <div className="pt-2 border-t border-outline-variant/40 text-[10px] text-outline font-mono flex justify-between">
            <span>Enrolled: {stats.totalEnrollments ?? 0}</span>
            <span className="text-emerald-600 font-bold">Verified</span>
          </div>
        </div>

        {/* Card 5: Revenue & Payments KPI */}
        <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
              <Icon name="payments" size={18} />
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">
              Gross
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-outline">Revenue / Payments</p>
            <h3 className="text-xl font-black text-on-surface mt-0.5 truncate">
              ₹{(stats.totalRevenue ?? 0).toLocaleString('en-IN')}
            </h3>
          </div>
          <div className="pt-2 border-t border-outline-variant/40 text-[10px] text-outline font-mono flex justify-between">
            <span>Month: ₹{(stats.thisMonthRevenue ?? 0).toLocaleString('en-IN')}</span>
            <span className="text-emerald-600 font-bold">Today: ₹{(stats.todayCollection ?? 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Card 6: Certificates & Completion KPI */}
        <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
              <Icon name="workspace_premium" size={18} />
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">
              Accredited
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-outline">Certificates Issued</p>
            <h3 className="text-xl font-black text-on-surface mt-0.5">
              {stats.totalCertificates ?? 0}
            </h3>
          </div>
          <div className="pt-2 border-t border-outline-variant/40 text-[10px] text-outline font-mono flex justify-between">
            <span>Verified Credentials</span>
            <span className="text-emerald-600 font-bold">Official</span>
          </div>
        </div>
      </div>

      {/* 4. Pending Actions & Operational Alerts */}
      <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon name="notification_important" size={20} className="text-amber-500" />
            <h2 className="text-sm font-black text-on-surface">Pending Actions & Alerts</h2>
          </div>
          <span className="text-xs font-mono text-outline">Action items requiring attention</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Courses in Draft / Review */}
          {hasPermission('course.view') && (
            <Link
              href="/admin/courses?status=DRAFT"
              className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/60 transition-all group block"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-900 dark:text-amber-200">Draft Courses</span>
                <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center">
                  {pendingActions.coursesInReview ?? 0}
                </span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                Courses awaiting publishing
              </p>
            </Link>
          )}

          {/* Payments Pending */}
          {hasPermission('payment.view') && (
            <Link
              href="/admin/payments?status=PENDING"
              className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/60 transition-all group block"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-blue-900 dark:text-blue-200">Pending Orders</span>
                <span className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold text-xs flex items-center justify-center">
                  {pendingActions.pendingPayments ?? 0}
                </span>
              </div>
              <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-1">
                Pending payment gateway clearance
              </p>
            </Link>
          )}

          {/* Refund Requests */}
          {(hasPermission('payment.refund') || hasPermission('payment.view')) && (
            <Link
              href="/admin/payments"
              className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/60 transition-all group block"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-rose-900 dark:text-rose-200">Refund Requests</span>
                <span className="w-6 h-6 rounded-full bg-rose-500 text-white font-bold text-xs flex items-center justify-center">
                  {pendingActions.refundRequests ?? 0}
                </span>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-1">
                Student dispute / refund ticket
              </p>
            </Link>
          )}

          {/* Incomplete Students */}
          {hasPermission('student.view') && (
            <Link
              href="/admin/students"
              className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/60 transition-all group block"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-indigo-900 dark:text-indigo-200">Incomplete Profiles</span>
                <span className="w-6 h-6 rounded-full bg-indigo-500 text-white font-bold text-xs flex items-center justify-center">
                  {pendingActions.incompleteStudents ?? 0}
                </span>
              </div>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-1">
                Missing contact or phone info
              </p>
            </Link>
          )}
        </div>
      </div>

      {/* 5. Two-Column Analytics & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Performance Analytics & Top Courses */}
        <div className="lg:col-span-2 space-y-6">
          {/* Real Courses List */}
          {hasPermission('course.view') && (
            <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-6 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-extrabold text-sm text-on-surface">Institutional Courses</h3>
                  <p className="text-xs text-outline font-mono">Real catalog records from database</p>
                </div>
                <Link
                  href="/admin/courses"
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <span>View All ({stats.totalCourses ?? 0})</span>
                  <Icon name="arrow_forward" size={14} />
                </Link>
              </div>

              {topCourses && topCourses.length > 0 ? (
                <div className="divide-y divide-outline-variant/30">
                  {topCourses.map((course: any) => (
                    <div key={course.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-on-surface truncate">{course.title}</p>
                        <p className="text-[11px] text-outline font-mono mt-0.5">
                          {course.category} • <span className={course.status === 'PUBLISHED' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>{course.status}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-on-surface">{course.students} Enrolled</p>
                        {hasPermission('payment.view') && (
                          <p className="text-[11px] font-mono font-bold text-emerald-600">
                            {course.price > 0 ? `₹${course.price.toLocaleString('en-IN')}` : 'Free'}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-outline space-y-2">
                  <p>No courses registered yet in this facility.</p>
                  {hasPermission('course.create') && (
                    <Link
                      href="/admin/courses?action=create"
                      className="inline-block px-3.5 py-1.5 bg-primary text-on-primary rounded-xl font-bold text-xs hover:bg-primary/90 transition-all"
                    >
                      + Create First Course
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Facility Scoped Activity Stream */}
        <div className="space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Icon name="history" size={18} className="text-primary" />
                <h3 className="font-extrabold text-sm text-on-surface">Recent Activity</h3>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live stream" />
            </div>

            {recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((act: any) => (
                  <div key={act.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${act.color}`}>
                      <Icon name={act.icon} size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-on-surface leading-tight">{act.title}</p>
                      <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">{act.description}</p>
                      <span className="text-[10px] text-outline font-mono">{act.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-outline space-y-1">
                <Icon name="history" size={24} className="mx-auto mb-1 opacity-40" />
                <p>No recent activity recorded yet.</p>
                <p className="text-[10px]">New student sign-ups, enrollments, and payments will appear here.</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-outline-variant/40 text-center">
              <Link
                href="/admin/students"
                className="text-xs font-bold text-primary hover:underline"
              >
                View Students Directory →
              </Link>
            </div>
          </div>

          {/* Platform Status Card */}
          <div className="bg-gradient-to-br from-surface-container-low to-surface-container rounded-2xl p-5 border border-outline-variant/60 space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="business" size={18} className="text-primary" />
              <h4 className="text-xs font-black text-on-surface uppercase tracking-wider">Platform Details</h4>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-outline">Organization:</span>
                <span className="font-bold text-on-surface">AADHYARA LMS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Architecture:</span>
                <span className="font-mono text-[11px] text-on-surface">Single Company LMS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">Operational Mode:</span>
                <span className="font-mono text-[11px] text-emerald-600 font-bold">ACTIVE / RBAC</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

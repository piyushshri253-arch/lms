'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useApp } from '@/context/AppContext';

export default function SuperAdminDashboardPage() {
  const { currentUser, showToast } = useApp();
  const [overview, setOverview] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [grantCourseId, setGrantCourseId] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [range, setRange] = useState('30D');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchOverviewAndAnalytics = async (r: string) => {
    setIsLoading(true);
    try {
      const [ovRes, anRes, stRes] = await Promise.all([
        fetch('/api/super-admin/overview'),
        fetch(`/api/super-admin/analytics?range=${r}`),
        fetch('/api/super-admin/students')
      ]);

      if (ovRes.ok) {
        const ovData = await ovRes.json();
        setOverview(ovData);
      }
      if (anRes.ok) {
        const anData = await anRes.json();
        setAnalytics(anData);
      }
      if (stRes.ok) {
        const stData = await stRes.json();
        setStudents(stData.students || []);
        if (stData.courses) setCourses(stData.courses);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewAndAnalytics(range);
  }, [range]);

  const handleBankDecision = async (userId: string, actionType: 'VERIFY_BANK' | 'REJECT_BANK') => {
    let reason = '';
    if (actionType === 'REJECT_BANK') {
      const input = window.prompt('Enter reason for rejecting this bank account:');
      if (!input || !input.trim()) return;
      reason = input.trim();
    }
    setActionLoadingId(userId);
    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          userId,
          reason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      showToast({
        title: actionType === 'VERIFY_BANK' ? 'Bank Account Verified! ✅' : 'Bank Account Rejected',
        description: data.message,
        type: actionType === 'VERIFY_BANK' ? 'success' : 'info'
      });
      await fetchOverviewAndAnalytics(range);
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const openStudentInspector = async (studentId: string) => {
    try {
      const res = await fetch(`/api/super-admin/students?id=${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedStudent(data.student);
        setIsInspectorOpen(true);
      }
    } catch {
      showToast({ title: 'Error', description: 'Could not load student profile', type: 'error' });
    }
  };

  const handleImpersonate = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to enter Support Mode for ${studentName}?`)) return;

    try {
      const res = await fetch('/api/super-admin/students/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: studentId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start support mode');

      showToast({
        title: 'Support Mode Active',
        description: `Now viewing as ${studentName}.`,
        type: 'success'
      });

      window.location.href = data.redirectUrl || '/student/learning';
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleRemoveCourseAccess = async (studentId: string, courseId: string, courseTitle?: string) => {
    if (
      !confirm(
        `Are you sure you want to remove access to "${courseTitle || 'this course'}" for ${selectedStudent?.name}?\n\nThis will revoke their course enrollment immediately. The student account remains safe.`
      )
    ) {
      return;
    }

    setIsProcessingAction(true);
    try {
      const res = await fetch('/api/super-admin/students/troubleshoot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REVOKE_COURSE_ACCESS',
          studentId,
          courseId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove course');

      showToast({
        title: 'Course Access Removed',
        description: data.message || `Revoked access to "${courseTitle}".`,
        type: 'success'
      });
      await openStudentInspector(studentId);
      await fetchOverviewAndAnalytics(range);
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleQuickGrantCourse = async (studentId: string) => {
    if (!grantCourseId) {
      showToast({ title: 'Select Course', description: 'Please select a course to grant access.', type: 'info' });
      return;
    }

    setIsProcessingAction(true);
    try {
      const res = await fetch('/api/super-admin/students/troubleshoot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GRANT_COURSE_ACCESS',
          studentId,
          courseId: grantCourseId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to grant course access');

      showToast({
        title: 'Course Access Granted',
        description: data.message || 'Course access granted to student.',
        type: 'success'
      });
      setGrantCourseId('');
      await openStudentInspector(studentId);
      await fetchOverviewAndAnalytics(range);
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const pendingBanks: any[] = overview?.pendingBankAccounts || [];
  const pendingPayouts: any[] = overview?.pendingPayouts || [];

  const saas = overview?.saas || {
    totalOrganizations: 0,
    activeOrganizations: 0,
    trialOrganizations: 0,
    paidOrganizations: 0,
    freeOrganizations: 0,
    suspendedOrganizations: 0,
    mrr: 0,
    arr: 0
  };

  const companies: any[] = overview?.companies || [];

  const platform = {
    totalStudents: 0,
    totalAdmins: 0,
    totalInstructors: 0,
    totalCourses: 0,
    publishedCourses: 0,
    draftCourses: 0,
    archivedCourses: 0,
    ...(overview?.platform || {})
  };

  const commerce = {
    totalRevenue: 0,
    todayRevenue: 0,
    monthRevenue: 0,
    totalOrders: 0,
    successfulPayments: 0,
    failedPayments: 0,
    refunds: 0,
    ...(overview?.commerce || {})
  };

  const learning = {
    totalEnrollments: 0,
    activeLearners: 0,
    completedCourses: 0,
    certificatesIssued: 0,
    avgCompletionRate: 0,
    ...(overview?.learning || {})
  };

  const chartData = analytics?.chartData || [];
  const maxRevenue = Math.max(...chartData.map((d: any) => d.revenue), 100);

  const filteredStudents = students.filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.organizationName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SUPER ADMINISTRATOR COMMAND CENTER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">
            Welcome, {currentUser?.name || 'Chief Administrator'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Multi-tenant governance across {saas.totalOrganizations} registered companies, {platform.totalStudents} total students, and platform infrastructure.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <Link
            href="/super-admin/instructors"
            className="px-4 py-2.5 bg-amber-500 text-slate-950 hover:bg-amber-400 font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
          >
            <Icon name="account_balance" size={16} />
            <span>
              Faculty &amp; Bank Approvals
              {pendingBanks.length > 0 ? ` (${pendingBanks.length} Pending)` : ''}
            </span>
          </Link>
          <Link
            href="/super-admin/students"
            className="px-4 py-2.5 bg-primary text-on-primary hover:bg-primary-container font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
          >
            <Icon name="person_search" size={16} />
            <span>Students Registry</span>
          </Link>
          <Link
            href="/super-admin/organizations"
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <Icon name="domain" size={16} />
            <span>All Companies ({saas.totalOrganizations})</span>
          </Link>
        </div>
      </div>

      {/* PENDING INSTRUCTOR BANK VERIFICATIONS ALERT QUEUE */}
      {pendingBanks.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <Icon name="account_balance" size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-900">
                    Pending Instructor Bank Account Approvals ({pendingBanks.length})
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-200 text-amber-900">
                    Action Required
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Instructors have verified their IFSC &amp; PAN and are awaiting Super Admin / Admin approval for payouts.
                </p>
              </div>
            </div>
            <Link
              href="/super-admin/instructors"
              className="text-xs font-extrabold text-amber-900 hover:underline flex items-center gap-1"
            >
              <span>Manage All in Faculty &amp; Bank Approvals</span>
              <Icon name="arrow_forward" size={15} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingBanks.map((b: any) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-amber-200 p-4 shadow-2xs flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-slate-900">{b.instructorName}</p>
                      <p className="text-xs text-slate-500 font-mono">{b.instructorEmail}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                      PENDING VERIFICATION
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Bank Name</span>
                      <span className="font-extrabold text-slate-900">{b.bankName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Account Number</span>
                      <span className="font-mono font-extrabold text-slate-900">
                        {b.accountNumber || b.accountNumberMasked}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">IFSC &amp; Branch</span>
                      <span className="font-mono font-bold text-indigo-700">
                        {b.ifscCode} {b.branchName ? `• ${b.branchName}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Account Holder &amp; PAN</span>
                      <span className="font-bold text-slate-800">
                        {b.accountHolderName} {b.panNumber ? `(${b.panNumber})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={actionLoadingId === b.userId}
                    onClick={() => handleBankDecision(b.userId, 'REJECT_BANK')}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold transition-all cursor-pointer disabled:opacity-50"
                  >
                    ✕ Reject Bank
                  </button>
                  <button
                    type="button"
                    disabled={actionLoadingId === b.userId}
                    onClick={() => handleBankDecision(b.userId, 'VERIFY_BANK')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Icon name="verified" size={15} />
                    <span>
                      {actionLoadingId === b.userId
                        ? 'Approving...'
                        : 'Approve & Verify Bank Account'}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 Pillars Overview KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Companies / Tenants */}
        <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center font-bold">
              <Icon name="domain" fill size={22} />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
              Tenants
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-outline uppercase font-mono">Registered Companies</span>
            <p className="text-2xl font-black text-on-surface tracking-tight mt-0.5">
              {saas.totalOrganizations}
            </p>
          </div>
          <div className="text-[11px] text-on-surface-variant space-y-1 font-mono pt-2 border-t border-outline-variant/40">
            <div className="flex justify-between">
              <span>Active:</span>
              <span className="font-bold text-emerald-600">{saas.activeOrganizations}</span>
            </div>
            <div className="flex justify-between">
              <span>Trial / Free:</span>
              <span className="font-bold text-on-surface">{saas.trialOrganizations} / {saas.freeOrganizations}</span>
            </div>
          </div>
        </div>

        {/* Students */}
        <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-700 flex items-center justify-center font-bold">
              <Icon name="groups" fill size={22} />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
              Students
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-outline uppercase font-mono">Total Students Registered</span>
            <p className="text-2xl font-black text-on-surface tracking-tight mt-0.5 font-mono">
              {platform.totalStudents}
            </p>
          </div>
          <div className="text-[11px] text-on-surface-variant space-y-1 font-mono pt-2 border-t border-outline-variant/40">
            <div className="flex justify-between">
              <span>Active Learners:</span>
              <span className="font-bold text-on-surface">{learning.activeLearners}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Enrollments:</span>
              <span className="font-bold text-teal-600">{learning.totalEnrollments}</span>
            </div>
          </div>
        </div>

        {/* Gross Revenue */}
        <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
              <Icon name="payments" fill size={22} />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              Gross Inflow
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-outline uppercase font-mono">Total Sales Inflow</span>
            <p className="text-2xl font-black text-emerald-800 tracking-tight mt-0.5 font-mono">
              ₹{commerce.totalRevenue.toLocaleString()}
            </p>
          </div>
          <div className="text-[11px] text-on-surface-variant space-y-1 font-mono pt-2 border-t border-outline-variant/40">
            <div className="flex justify-between">
              <span>Paid Orders:</span>
              <span className="font-bold text-on-surface">{commerce.successfulPayments}</span>
            </div>
            <div className="flex justify-between">
              <span>SaaS MRR:</span>
              <span className="font-bold text-indigo-600">${saas.mrr}/mo</span>
            </div>
          </div>
        </div>

        {/* Academic Output */}
        <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <Icon name="school" fill size={22} />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
              Curricula
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-outline uppercase font-mono">Total Courses</span>
            <p className="text-2xl font-black text-on-surface tracking-tight mt-0.5 font-mono">
              {platform.totalCourses}
            </p>
          </div>
          <div className="text-[11px] text-on-surface-variant space-y-1 font-mono pt-2 border-t border-outline-variant/40">
            <div className="flex justify-between">
              <span>Published:</span>
              <span className="font-bold text-emerald-600">{platform.publishedCourses}</span>
            </div>
            <div className="flex justify-between">
              <span>Certificates:</span>
              <span className="font-bold text-amber-700">{learning.certificatesIssued}</span>
            </div>
          </div>
        </div>
      </div>

      {/* REGISTERED STUDENTS & COURSE PURCHASES CONTROL CENTER */}
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-primary mb-1">
              <Icon name="person_search" size={16} />
              <span>STUDENT REGISTRY &amp; COURSE PURCHASES GOVERNANCE</span>
            </div>
            <h2 className="text-xl font-extrabold text-on-surface tracking-tight">
              Registered Students &amp; Purchased Courses ({filteredStudents.length})
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Monitor registered students, view purchased courses, revoke/delete individual course access, grant new courses, and enter live student portal in Support Mode.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Icon
                name="search"
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline"
              />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search student or email..."
                className="w-full bg-surface-container-low border border-outline-variant/80 rounded-2xl pl-10 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
              />
            </div>

            <Link
              href="/super-admin/students"
              className="px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary border border-primary/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
            >
              <span>Full Students Registry →</span>
            </Link>
          </div>
        </div>

        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/70 border-b border-outline-variant/60 text-outline uppercase font-extrabold tracking-wider text-[10px]">
                <tr>
                  <th className="p-3 pl-4">Student Profile</th>
                  <th className="p-3">Company / Org</th>
                  <th className="p-3">Purchased / Enrolled Courses</th>
                  <th className="p-3">Total Spent</th>
                  <th className="p-3">Registered Date</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-medium">
                {filteredStudents.slice(0, 10).map((s) => (
                  <tr key={s.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="p-3 pl-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={s.name}
                          avatar={s.avatar}
                          size="sm"
                          shape="rounded"
                          className="w-8 h-8 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-on-surface text-xs leading-tight">{s.name}</p>
                          <p className="font-mono text-[10px] text-outline mt-0.5">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[11px]">
                        <Icon name="business" size={12} />
                        <span>{s.organizationName}</span>
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-primary">
                          <Icon name="school" size={14} />
                          <span>{s.enrollmentCount} {s.enrollmentCount === 1 ? 'Course' : 'Courses'}</span>
                        </div>
                        {s.enrolledCourses && s.enrolledCourses.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {s.enrolledCourses.slice(0, 2).map((c: any, cIdx: number) => (
                              <span
                                key={cIdx}
                                className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-md text-[10px] truncate max-w-[140px]"
                                title={c.title}
                              >
                                {c.title}
                              </span>
                            ))}
                            {s.enrolledCourses.length > 2 && (
                              <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] font-bold">
                                +{s.enrolledCourses.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-outline italic">No courses yet</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-800">
                      ₹{s.totalSpent}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-outline">
                      {s.createdAt}
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Manage Courses (Inspector) */}
                        <button
                          type="button"
                          onClick={() => openStudentInspector(s.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-on-primary border border-primary/20 font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Manage, delete, or grant courses for this student"
                        >
                          <Icon name="school" size={14} />
                          <span>Manage Courses</span>
                        </button>

                        {/* Support Mode */}
                        <button
                          type="button"
                          onClick={() => handleImpersonate(s.id, s.name)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-700 hover:text-slate-950 border border-amber-500/30 font-mono font-extrabold text-[11px] transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Open student learning portal in support mode"
                        >
                          <Icon name="visibility" size={14} />
                          <span>Support Mode</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStudents.length > 10 && (
              <div className="p-3 border-t border-outline-variant/40 text-center">
                <Link
                  href="/super-admin/students"
                  className="text-xs font-bold text-primary hover:underline"
                >
                  View all {filteredStudents.length} registered students in registry →
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-outline italic border border-dashed border-outline-variant rounded-2xl">
            No registered students found matching search.
          </div>
        )}
      </div>

      {/* REGISTERED COMPANIES ROSTER & STUDENT DISTRIBUTION */}
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-primary mb-1">
              <Icon name="domain" size={16} />
              <span>REGISTERED COMPANIES &amp; STUDENT MAPPINGS</span>
            </div>
            <h2 className="text-xl font-extrabold text-on-surface tracking-tight">
              Companies Roster ({companies.length} Registered)
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Live breakdown of every registered company, their white-label domain, plan status, registered students count, and gross sales.
            </p>
          </div>

          <Link
            href="/super-admin/students"
            className="px-4 py-2 bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Icon name="person_search" size={16} />
            <span>Filter Students by Company →</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low/70 border-b border-outline-variant/60 text-outline uppercase font-extrabold tracking-wider text-[10px]">
              <tr>
                <th className="p-3 pl-4">Company Name</th>
                <th className="p-3">Storefront Slug</th>
                <th className="p-3">Plan / Status</th>
                <th className="p-3">Registered Students</th>
                <th className="p-3">Courses</th>
                <th className="p-3">Total Sales</th>
                <th className="p-3">Joined Date</th>
                <th className="p-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {companies.map((comp) => (
                <tr key={comp.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="p-3 pl-4 font-bold text-on-surface">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                        {comp.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-extrabold text-sm">{comp.name}</p>
                        <p className="text-[10px] text-outline font-mono">{comp.contactEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-indigo-600 font-bold">
                    /org/{comp.slug}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 font-mono font-bold text-[10px]">
                      {comp.plan} • {comp.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 font-mono font-black text-sm text-teal-700">
                      <Icon name="people" size={16} />
                      <span>{comp.studentsCount} Students</span>
                    </div>
                  </td>
                  <td className="p-3 font-mono font-bold text-on-surface">
                    {comp.coursesCount}
                  </td>
                  <td className="p-3 font-mono font-bold text-emerald-800">
                    ₹{comp.revenue.toLocaleString()}
                  </td>
                  <td className="p-3 font-mono text-outline">{comp.createdAt}</td>
                  <td className="p-3 pr-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/super-admin/students?orgId=${comp.id}`}
                        className="px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-on-primary font-bold text-[11px] transition-all"
                        title="View students in this company"
                      >
                        View Students
                      </Link>
                      <Link
                        href={`/org/${comp.slug}`}
                        target="_blank"
                        className="p-1 rounded-lg border border-outline-variant hover:border-primary text-outline hover:text-primary transition-colors"
                        title="Open Public LMS Website"
                      >
                        <Icon name="open_in_new" size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Period Revenue & Growth Chart Section */}
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-black text-lg text-on-surface tracking-tight">
              Platform Transactional Flow
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Aggregate revenue across all organization storefronts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/40">
            {['TODAY', '7D', '30D', 'ALL'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  range === r
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="h-48 flex items-end gap-3 sm:gap-6 pt-4 pb-2 px-2 border-b border-outline-variant/60">
          {chartData.map((point: any, idx: number) => {
            const heightPercent = Math.max(8, Math.round((point.revenue / maxRevenue) * 100));

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div
                  className="w-full bg-gradient-to-t from-primary to-primary-container rounded-t-xl group-hover:brightness-110 transition-all cursor-pointer shadow-xs min-w-[14px]"
                  style={{ height: `${heightPercent}%` }}
                  title={`Date: ${point.date} • Revenue: $${point.revenue}`}
                />
                <span className="text-[10px] font-mono text-outline font-bold truncate max-w-[40px]">
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Student Inspector / Course Management Modal */}
      <Modal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        maxWidth="lg"
        title="Student Profile & Course Access Manager"
      >
        {selectedStudent && (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
            {/* Student Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/60">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={selectedStudent.name}
                  avatar={selectedStudent.avatar}
                  size="md"
                  shape="rounded"
                  className="w-12 h-12"
                />
                <div>
                  <h3 className="font-extrabold text-base text-on-surface flex items-center gap-2">
                    <span>{selectedStudent.name}</span>
                    <span
                      className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full ${
                        selectedStudent.isSuspended ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {selectedStudent.isSuspended ? 'Suspended' : 'Active'}
                    </span>
                  </h3>
                  <p className="text-xs font-mono text-outline">{selectedStudent.email}</p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Company: <strong className="text-primary">{selectedStudent.organization?.name || 'Platform (Direct)'}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleImpersonate(selectedStudent.id, selectedStudent.name)}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                >
                  <Icon name="visibility" size={16} />
                  <span>Enter Support Mode</span>
                </button>
              </div>
            </div>

            {/* Enrolled Courses & Progress Grid */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
                  <Icon name="school" size={16} className="text-primary" />
                  <span>Enrolled Curricula ({selectedStudent.enrollments?.length || 0})</span>
                </h4>
                <span className="text-[11px] text-outline font-medium">
                  Deleting only removes this specific course from the student's portal.
                </span>
              </div>

              {/* Quick Course Grant / Assign Widget */}
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-200/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                  <Icon name="add_circle" size={18} className="text-indigo-600" />
                  <span>Grant Course Access (कोर्स जोड़ें):</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={grantCourseId}
                    onChange={(e) => setGrantCourseId(e.target.value)}
                    className="bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600 flex-1 sm:w-64 shadow-2xs cursor-pointer"
                  >
                    <option value="">-- Select Platform Course --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} {c.price ? `(₹${c.price})` : '(Free)'}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!grantCourseId || isProcessingAction}
                    onClick={() => handleQuickGrantCourse(selectedStudent.id)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
                  >
                    <Icon name="check" size={14} />
                    <span>Grant Access</span>
                  </button>
                </div>
              </div>

              {selectedStudent.enrollments?.length > 0 ? (
                <div className="space-y-2">
                  {selectedStudent.enrollments.map((e: any) => {
                    const lessons = e.course?.sections?.flatMap((s: any) => s.lessons) || [];
                    const completedInCourse = selectedStudent.lessonProgress?.filter(
                      (p: any) =>
                        p.completed &&
                        p.lesson?.section?.courseId === e.courseId
                    ).length || 0;
                    const percent = lessons.length > 0 ? Math.round((completedInCourse / lessons.length) * 100) : 0;

                    return (
                      <div
                        key={e.id}
                        className="p-4 bg-surface-container-lowest border border-outline-variant/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:border-outline-variant transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-xs text-on-surface truncate">{e.course?.title}</p>
                          <p className="text-[11px] text-outline font-mono mt-0.5">
                            Status: <span className="font-bold text-primary">{e.status}</span> • Instructor: {e.course?.instructor?.name || 'Platform'} • Price: ₹{e.course?.price || 0}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-xs font-mono font-bold text-primary">{percent}%</span>
                              <p className="text-[10px] text-outline font-mono">
                                {completedInCourse}/{lessons.length} Lectures
                              </p>
                            </div>
                            <div className="w-20 h-2 bg-surface-container rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                            </div>
                          </div>

                          {/* Direct Delete / Revoke Course Access Button */}
                          <button
                            type="button"
                            disabled={isProcessingAction}
                            onClick={() => handleRemoveCourseAccess(selectedStudent.id, e.courseId, e.course?.title)}
                            className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                            title={`Remove ${e.course?.title} from this student`}
                          >
                            <Icon name="delete" size={14} className="text-rose-600" />
                            <span>Remove Course Access</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-outline-variant/80 rounded-2xl text-xs text-outline italic">
                  No active course enrollments. Select a course above to grant access.
                </div>
              )}
            </div>

            {/* Orders Ledger */}
            {selectedStudent.orders?.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-outline-variant/40">
                <h4 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
                  <Icon name="receipt_long" size={16} className="text-primary" />
                  <span>Purchased Orders ({selectedStudent.orders.length})</span>
                </h4>
                <div className="divide-y divide-outline-variant/40 border border-outline-variant/80 rounded-2xl overflow-hidden bg-surface-container-lowest text-xs">
                  {selectedStudent.orders.map((o: any) => (
                    <div key={o.id} className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-primary">#{o.transactionId}</span>
                        <p className="text-[11px] text-on-surface mt-0.5">{o.course?.title}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-emerald-800">₹{o.amount}</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                          {o.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

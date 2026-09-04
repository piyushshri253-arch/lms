'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

export default function SuperAdminDashboardPage() {
  const { currentUser } = useApp();
  const [overview, setOverview] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [range, setRange] = useState('30D');
  const [isLoading, setIsLoading] = useState(true);

  const fetchOverviewAndAnalytics = async (r: string) => {
    setIsLoading(true);
    try {
      const [ovRes, anRes] = await Promise.all([
        fetch('/api/super-admin/overview'),
        fetch(`/api/super-admin/analytics?range=${r}`)
      ]);

      if (ovRes.ok) {
        const ovData = await ovRes.json();
        setOverview(ovData);
      }
      if (anRes.ok) {
        const anData = await anRes.json();
        setAnalytics(anData);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewAndAnalytics(range);
  }, [range]);

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
    </div>
  );
}

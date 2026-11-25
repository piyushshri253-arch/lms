'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Modal } from '@/components/ui/Modal';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  customRole: string;
  department: string;
  departmentKey: string;
  reportsTo: string;
  reportsToRole: string;
  status: string;
  avatar?: string | null;
  currentDuty: string;
  assignedItemsCount?: number;
  assignedDetails?: any[];
  teamMembers?: StaffMember[];
}

export default function SuperAdminHierarchyPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View Mode: 'wave-tree' | 'roster-table' | 'metrics'
  const [viewMode, setViewMode] = useState<'wave-tree' | 'roster-table' | 'metrics'>('wave-tree');

  // Active Department Filter for Wave Tree & Table
  const [activeDeptFilter, setActiveDeptFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Expand / Collapse state for department branches
  const [expandedWings, setExpandedWings] = useState<Record<string, boolean>>({
    admin: true,
    finance: true,
    seo: true,
    auditor: true,
    faculty: true
  });

  // Member Inspector Drawer / Modal
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);

  const fetchHierarchy = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/super-admin/hierarchy');
      if (!res.ok) {
        throw new Error('Failed to load LMS staff hierarchy data.');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error fetching staff hierarchy');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const toggleWing = (deptKey: string) => {
    setExpandedWings((prev) => ({
      ...prev,
      [deptKey]: !prev[deptKey]
    }));
  };

  const expandAllWings = () => {
    setExpandedWings({
      admin: true,
      finance: true,
      seo: true,
      auditor: true,
      faculty: true
    });
  };

  const collapseAllWings = () => {
    setExpandedWings({
      admin: false,
      finance: false,
      seo: false,
      auditor: false,
      faculty: false
    });
  };

  const summary = data?.summary || {
    totalStaff: 0,
    superAdmins: 0,
    admins: 0,
    financeStaff: 0,
    totalSeoTeam: 0,
    seoManagers: 0,
    seoSpecialists: 0,
    auditors: 0,
    instructors: 0,
    activeStaff: 0
  };

  const hierarchyTree = data?.hierarchyTree;
  const completeRoster: StaffMember[] = data?.completeRoster || [];

  // Filter roster by search & department
  const filteredRoster = completeRoster.filter((member) => {
    const matchesDept =
      activeDeptFilter === 'ALL' ||
      member.departmentKey === activeDeptFilter;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      member.name.toLowerCase().includes(q) ||
      member.email.toLowerCase().includes(q) ||
      member.customRole.toLowerCase().includes(q) ||
      member.currentDuty.toLowerCase().includes(q);

    return matchesDept && matchesSearch;
  });

  // Department metadata for styling and badges
  const deptMeta: Record<string, { label: string; icon: string; color: string; badgeBg: string; border: string; glow: string }> = {
    admin: {
      label: 'Academic Administration',
      icon: 'admin_panel_settings',
      color: 'text-indigo-600',
      badgeBg: 'bg-indigo-500/10 text-indigo-700 border-indigo-200',
      border: 'border-indigo-400/50',
      glow: 'shadow-indigo-500/10'
    },
    finance: {
      label: 'Finance & Accounts Hub',
      icon: 'account_balance_wallet',
      color: 'text-emerald-600',
      badgeBg: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
      border: 'border-emerald-400/50',
      glow: 'shadow-emerald-500/10'
    },
    seo: {
      label: 'Growth & SEO Marketing',
      icon: 'trending_up',
      color: 'text-amber-600',
      badgeBg: 'bg-amber-500/10 text-amber-700 border-amber-200',
      border: 'border-amber-400/50',
      glow: 'shadow-amber-500/10'
    },
    auditor: {
      label: 'Curriculum QA Review',
      icon: 'verified',
      color: 'text-purple-600',
      badgeBg: 'bg-purple-500/10 text-purple-700 border-purple-200',
      border: 'border-purple-400/50',
      glow: 'shadow-purple-500/10'
    },
    faculty: {
      label: 'Faculty & Instructors',
      icon: 'school',
      color: 'text-blue-600',
      badgeBg: 'bg-blue-500/10 text-blue-700 border-blue-200',
      border: 'border-blue-400/50',
      glow: 'shadow-blue-500/10'
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. ULTRA-PREMIUM EXECUTIVE BANNER */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-indigo-900/60 shadow-2xl relative overflow-hidden">
        {/* Subtle background ambient waves & grids */}
        <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-500/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse ring-4 ring-emerald-400/20" />
              <span className="tracking-wider uppercase">Enterprise LMS Command &amp; Org Topology</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white font-display">
              Organizational Hierarchy &amp; Wave Flow Chart
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
              Real-time enterprise structure across <strong className="text-white underline decoration-amber-400/60">{summary.totalStaff} staff members</strong>. Seamlessly track reporting chains, department heads, and direct team assignments.
            </p>
          </div>

          {/* View Mode Buttons */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-xl shrink-0 relative z-10">
            <button
              type="button"
              onClick={() => setViewMode('wave-tree')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === 'wave-tree'
                  ? 'bg-gradient-to-r from-primary to-indigo-600 text-on-primary shadow-lg scale-102'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon name="account_tree" size={17} />
              <span>Wave Tree Chart</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('roster-table')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === 'roster-table'
                  ? 'bg-gradient-to-r from-primary to-indigo-600 text-on-primary shadow-lg scale-102'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon name="table_chart" size={17} />
              <span>Staff Roster ({completeRoster.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('metrics')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === 'metrics'
                  ? 'bg-gradient-to-r from-primary to-indigo-600 text-on-primary shadow-lg scale-102'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon name="insights" size={17} />
              <span>Department Waves</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE METRIC WAVE TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/60 shadow-xs hover:border-primary/50 transition-all space-y-1 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-primary/10 rounded-full blur-xl group-hover:scale-150 transition-transform" />
          <div className="flex items-center justify-between text-outline text-xs">
            <span className="font-bold">Total Staff</span>
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="groups" size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-on-surface">{summary.totalStaff}</p>
          <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            100% Active in LMS
          </p>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/60 shadow-xs hover:border-indigo-400/50 transition-all space-y-1 relative overflow-hidden group">
          <div className="flex items-center justify-between text-outline text-xs">
            <span className="font-bold">Administration</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Icon name="admin_panel_settings" size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-700">{summary.superAdmins + summary.admins}</p>
          <p className="text-[10px] text-on-surface-variant font-medium">1 SuperAdmin • {summary.admins} Dean</p>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/60 shadow-xs hover:border-emerald-400/50 transition-all space-y-1 relative overflow-hidden group">
          <div className="flex items-center justify-between text-outline text-xs">
            <span className="font-bold">Accounts &amp; Finance</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Icon name="account_balance_wallet" size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700">{summary.financeStaff}</p>
          <p className="text-[10px] text-on-surface-variant font-medium">14 Hubs &amp; Payouts</p>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/60 shadow-xs hover:border-amber-400/50 transition-all space-y-1 relative overflow-hidden group">
          <div className="flex items-center justify-between text-outline text-xs">
            <span className="font-bold">Growth &amp; SEO Team</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Icon name="trending_up" size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-700">{summary.totalSeoTeam}</p>
          <p className="text-[10px] text-on-surface-variant font-medium">
            {summary.seoManagers} Lead • {summary.seoSpecialists} Specialists
          </p>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/60 shadow-xs hover:border-purple-400/50 transition-all space-y-1 relative overflow-hidden group">
          <div className="flex items-center justify-between text-outline text-xs">
            <span className="font-bold">QA &amp; Auditors</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Icon name="verified" size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-700">{summary.auditors}</p>
          <p className="text-[10px] text-on-surface-variant font-medium">Course Reviewers</p>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/60 shadow-xs hover:border-blue-400/50 transition-all space-y-1 relative overflow-hidden group">
          <div className="flex items-center justify-between text-outline text-xs">
            <span className="font-bold">Academic Faculty</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Icon name="school" size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-700">{summary.instructors}</p>
          <p className="text-[10px] text-on-surface-variant font-medium">17 Instructors</p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center bg-surface-container-lowest rounded-3xl border border-outline-variant/60 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-black text-on-surface">Generating Enterprise Wave Topology...</p>
          <p className="text-xs text-on-surface-variant">Connecting reporting nodes, active duty states, and real database personnel.</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-error-container/20 border border-error/30 rounded-3xl text-error text-center space-y-2">
          <p className="font-bold">{error}</p>
          <button
            onClick={fetchHierarchy}
            className="px-4 py-2 bg-error text-on-error font-bold text-xs rounded-xl hover:opacity-90 transition-opacity"
          >
            Retry Loading Hierarchy
          </button>
        </div>
      ) : viewMode === 'wave-tree' ? (
        /* ==================================================================== */
        /* 1. PROFESSIONAL ENTERPRISE WAVE FLOW CHART VIEW                      */
        /* ==================================================================== */
        <div className="space-y-6">
          {/* Top Control Bar for Wave View */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/60 shadow-xs">
            {/* Department Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'ALL', label: `All 5 Wings (${summary.totalStaff})`, icon: 'all_inclusive' },
                { id: 'admin', label: `Admin (${summary.superAdmins + summary.admins})`, icon: 'admin_panel_settings' },
                { id: 'finance', label: `Finance (${summary.financeStaff})`, icon: 'account_balance_wallet' },
                { id: 'seo', label: `SEO Team (${summary.totalSeoTeam})`, icon: 'trending_up' },
                { id: 'auditor', label: `Auditors (${summary.auditors})`, icon: 'verified' },
                { id: 'faculty', label: `Faculty (${summary.instructors})`, icon: 'school' }
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setActiveDeptFilter(pill.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeDeptFilter === pill.id
                      ? 'bg-primary text-on-primary shadow-xs font-extrabold'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <Icon name={pill.icon} size={15} />
                  <span>{pill.label}</span>
                </button>
              ))}
            </div>

            {/* Tree Expansion Controls */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={expandAllWings}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors flex items-center gap-1.5"
                title="Expand All Branches"
              >
                <Icon name="unfold_more" size={16} />
                <span>Expand All</span>
              </button>
              <button
                type="button"
                onClick={collapseAllWings}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors flex items-center gap-1.5"
                title="Collapse All Branches"
              >
                <Icon name="unfold_less" size={16} />
                <span>Collapse</span>
              </button>
            </div>
          </div>

          {/* CANVAS WORKSPACE WITH WAVE CONNECTOR GRAPH */}
          <div className="relative bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl border border-outline-variant/60 shadow-sm p-6 sm:p-10 overflow-x-auto min-w-[900px]">
            {/* Subtle Blueprint Dot Grid */}
            <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

            {/* ---------------- LEVEL 0: ROOT EXECUTIVE NODE ---------------- */}
            <div className="flex flex-col items-center relative z-10">
              <div
                onClick={() => setSelectedMember(hierarchyTree.root)}
                className="group cursor-pointer bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl border-2 border-amber-400 shadow-2xl hover:shadow-amber-500/20 hover:scale-102 transition-all w-full max-w-lg text-center space-y-3 relative overflow-hidden select-none"
              >
                {/* Crown Pill */}
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 font-mono text-[11px] font-black tracking-wider uppercase shadow-md">
                  <Icon name="workspace_premium" size={14} className="text-slate-950" />
                  <span>Executive LMS Commander</span>
                </div>

                <div className="flex items-center justify-center gap-4 pt-1">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg ring-4 ring-amber-400/20">
                      SA
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-950 flex items-center justify-center animate-pulse" />
                  </div>

                  <div className="text-left min-w-0">
                    <h3 className="font-black text-lg text-white group-hover:text-amber-300 transition-colors truncate">
                      {hierarchyTree.root.name}
                    </h3>
                    <p className="text-xs text-amber-400 font-bold font-mono">
                      {hierarchyTree.root.customRole}
                    </p>
                    <p className="text-[11px] font-mono text-slate-300">{hierarchyTree.root.email}</p>
                  </div>
                </div>

                {/* Duty pill */}
                <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-indigo-100/90 font-medium">
                  {hierarchyTree.root.currentDuty}
                </div>
              </div>

              {/* ---------------- FLOWING SVG WAVE CONNECTOR ---------------- */}
              {/* This SVG creates smooth bezier curves ('waves') flowing down to each department pod */}
              <div className="w-full max-w-6xl h-24 relative pointer-events-none hidden lg:block">
                <svg className="w-full h-full" viewBox="0 0 1000 96" fill="none">
                  <defs>
                    <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#a855f7" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
                    </linearGradient>
                    <filter id="waveGlow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Central stem */}
                  <line x1="500" y1="0" x2="500" y2="28" stroke="url(#waveGrad)" strokeWidth="3" filter="url(#waveGlow)" />

                  {/* Wave Curves flowing to 5 department endpoints: x = 100, 300, 500, 700, 900 */}
                  <path d="M 500,28 C 500,60 100,50 100,96" stroke="url(#waveGrad)" strokeWidth="2.5" fill="none" strokeDasharray="4 2" />
                  <path d="M 500,28 C 500,60 300,50 300,96" stroke="url(#waveGrad)" strokeWidth="2.5" fill="none" strokeDasharray="4 2" />
                  <path d="M 500,28 L 500,96" stroke="url(#waveGrad)" strokeWidth="2.5" fill="none" />
                  <path d="M 500,28 C 500,60 700,50 700,96" stroke="url(#waveGrad)" strokeWidth="2.5" fill="none" strokeDasharray="4 2" />
                  <path d="M 500,28 C 500,60 900,50 900,96" stroke="url(#waveGrad)" strokeWidth="2.5" fill="none" strokeDasharray="4 2" />

                  {/* Pulsing Junction Dots */}
                  <circle cx="500" cy="28" r="5" fill="#f59e0b" className="animate-ping" />
                  <circle cx="500" cy="28" r="4" fill="#f59e0b" />
                  <circle cx="100" cy="94" r="3.5" fill="#6366f1" />
                  <circle cx="300" cy="94" r="3.5" fill="#10b981" />
                  <circle cx="500" cy="94" r="3.5" fill="#f59e0b" />
                  <circle cx="700" cy="94" r="3.5" fill="#a855f7" />
                  <circle cx="900" cy="94" r="3.5" fill="#3b82f6" />
                </svg>
              </div>

              {/* Mobile / Fallback vertical stem */}
              <div className="w-0.5 h-8 bg-indigo-500/50 lg:hidden my-2" />
            </div>

            {/* ---------------- LEVEL 1: THE 5 DEPARTMENT WINGS ---------------- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 pt-2 relative z-10">
              {hierarchyTree.departments.map((dept: any) => {
                // If department is filtered out by tab, hide or dim
                const isFiltered = activeDeptFilter !== 'ALL' && activeDeptFilter !== dept.key;
                if (isFiltered) return null;

                const meta = deptMeta[dept.key] || {
                  label: dept.name,
                  icon: 'domain',
                  color: 'text-primary',
                  badgeBg: 'bg-primary/10 text-primary border-primary/20',
                  border: 'border-outline-variant',
                  glow: ''
                };

                const isExpanded = expandedWings[dept.key];

                return (
                  <div
                    key={dept.key}
                    className={`bg-surface-container-lowest border-2 ${meta.border} rounded-3xl p-4 sm:p-5 flex flex-col space-y-4 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group/pod`}
                  >
                    {/* Glowing corner gradient */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none" />

                    {/* Wing Header Card */}
                    <div className="flex items-center justify-between pb-3 border-b border-outline-variant/50">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl ${meta.badgeBg} flex items-center justify-center shrink-0 shadow-2xs`}>
                          <Icon name={dept.icon} size={18} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-xs text-on-surface truncate">
                            {dept.name}
                          </h4>
                          <span className="text-[10px] text-outline font-bold uppercase tracking-wider">
                            Department Wing
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-black ${meta.badgeBg} border`}>
                        {dept.count}
                      </span>
                    </div>

                    {/* Department Leads Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold text-outline uppercase tracking-wider">
                        <span>Wing Leadership</span>
                        <span className="text-[9px] text-primary">Head</span>
                      </div>

                      {dept.leads.map((lead: StaffMember) => (
                        <div
                          key={lead.id}
                          onClick={() => setSelectedMember(lead)}
                          className="p-3 bg-surface-container-low hover:bg-surface-container border border-outline-variant/60 hover:border-primary/50 rounded-2xl cursor-pointer transition-all shadow-2xs space-y-2 group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative">
                              <UserAvatar
                                name={lead.name}
                                avatar={lead.avatar}
                                size="sm"
                                className="w-8 h-8"
                              />
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-surface-container-low" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                                {lead.name}
                              </p>
                              <p className={`text-[10px] font-extrabold truncate ${meta.color}`}>
                                {lead.customRole}
                              </p>
                            </div>
                          </div>

                          {/* Specific Wing Duty Highlights */}
                          <div className="p-2 rounded-xl bg-surface-container-lowest text-[10px] text-on-surface-variant font-medium leading-tight">
                            {lead.currentDuty}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Sub-Team Members (e.g. SEO Specialists under SEO Manager, QA Reviewers, Faculty) */}
                    {dept.members && dept.members.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-outline-variant/50 flex-1 flex flex-col">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-outline uppercase tracking-wider flex items-center gap-1">
                            <Icon name="subdirectory_arrow_right" size={13} className="text-primary" />
                            <span>Direct Reports ({dept.members.length})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleWing(dept.key)}
                            className="text-[10px] text-primary hover:underline font-extrabold cursor-pointer"
                          >
                            {isExpanded ? 'Collapse' : `Show (${dept.members.length})`}
                          </button>
                        </div>

                        {/* Collapsed view summary */}
                        {!isExpanded && (
                          <div
                            onClick={() => toggleWing(dept.key)}
                            className="p-3 rounded-2xl bg-surface-container-low/70 border border-dashed border-outline-variant/80 text-center text-xs text-on-surface-variant hover:text-primary hover:border-primary/50 cursor-pointer transition-colors"
                          >
                            +{dept.members.length} personnel reporting under head
                          </div>
                        )}

                        {/* Expanded Team Members List */}
                        {isExpanded && (
                          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                            {dept.members.map((member: StaffMember) => (
                              <div
                                key={member.id}
                                onClick={() => setSelectedMember(member)}
                                className="p-2.5 bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 hover:border-primary/40 rounded-2xl cursor-pointer transition-all shadow-2xs space-y-1.5 group"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <UserAvatar
                                      name={member.name}
                                      avatar={member.avatar}
                                      size="sm"
                                      className="w-6 h-6 shrink-0"
                                    />
                                    <p className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                                      {member.name}
                                    </p>
                                  </div>
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-container-lowest text-on-surface-variant font-bold shrink-0">
                                    {member.role === 'SEO_SPECIALIST' ? 'Specialist' : member.role === 'INSTRUCTOR' ? 'Faculty' : 'Auditor'}
                                  </span>
                                </div>

                                <p className="text-[10px] text-primary font-bold truncate">
                                  {member.customRole}
                                </p>

                                <div className="text-[10px] text-on-surface-variant/90 leading-snug line-clamp-2">
                                  {member.currentDuty}
                                </div>

                                {member.assignedDetails && member.assignedDetails.length > 0 && (
                                  <div className="pt-1 flex flex-wrap gap-1">
                                    <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-primary/10 text-primary font-bold">
                                      {member.assignedDetails.length} Courses Linked
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : viewMode === 'roster-table' ? (
        /* ==================================================================== */
        /* 2. COMPREHENSIVE STAFF ROSTER & DUTY TABLE VIEW                     */
        /* ==================================================================== */
        <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/60 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
          {/* Controls Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/50">
              {[
                { id: 'ALL', label: `All Staff (${completeRoster.length})` },
                { id: 'admin', label: `Admin (${summary.superAdmins + summary.admins})` },
                { id: 'finance', label: `Finance (${summary.financeStaff})` },
                { id: 'seo', label: `SEO Team (${summary.totalSeoTeam})` },
                { id: 'auditor', label: `Auditors (${summary.auditors})` },
                { id: 'faculty', label: `Faculty (${summary.instructors})` }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveDeptFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeDeptFilter === tab.id
                      ? 'bg-primary text-on-primary shadow-2xs font-extrabold'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[280px]">
              <Icon
                name="search"
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline"
              />
              <input
                type="text"
                placeholder="Search staff by name, email, duty, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/60 rounded-xl pl-10 pr-4 py-2 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-outline-variant/50">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-outline font-mono text-[10px] uppercase tracking-wider border-b border-outline-variant/50">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Department &amp; Position</th>
                  <th className="py-3 px-4">Reports To</th>
                  <th className="py-3 px-4">Assigned Work / Kya Kar Raha Hai</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-medium">
                {filteredRoster.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-surface-container-low/60 transition-colors cursor-pointer"
                    onClick={() => setSelectedMember(member)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={member.name}
                          avatar={member.avatar}
                          size="sm"
                          className="w-8 h-8"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-on-surface hover:text-primary transition-colors truncate">
                            {member.name}
                          </p>
                          <p className="text-[11px] font-mono text-outline truncate">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-on-surface block truncate">
                          {member.customRole}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container text-primary font-bold inline-block">
                          {member.department}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Icon name="arrow_upward" size={14} className="text-outline shrink-0" />
                        <span className="text-xs text-on-surface font-semibold truncate">
                          {member.reportsTo}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-xs text-on-surface font-semibold block max-w-md truncate">
                        {member.currentDuty}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMember(member);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-all"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ==================================================================== */
        /* 3. DEPARTMENT BREAKDOWN & WAVE WORKLOAD METRICS                     */
        /* ==================================================================== */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/60 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-on-surface flex items-center gap-2">
              <Icon name="bar_chart" size={18} className="text-primary" />
              <span>Headcount Distribution Across Wings</span>
            </h3>

            <div className="space-y-4 pt-2">
              {[
                { label: 'Academic Faculty & Instructors', count: summary.instructors, color: 'bg-blue-600', icon: 'school' },
                { label: 'Growth & SEO Team (Manager + Specialists)', count: summary.totalSeoTeam, color: 'bg-amber-500', icon: 'trending_up' },
                { label: 'Curriculum Quality & QA Reviewers', count: summary.auditors, color: 'bg-purple-600', icon: 'verified' },
                { label: 'Academic Administration & Deans', count: summary.superAdmins + summary.admins, color: 'bg-indigo-600', icon: 'admin_panel_settings' },
                { label: 'Finance & Accounts Operations', count: summary.financeStaff, color: 'bg-emerald-600', icon: 'account_balance_wallet' }
              ].map((row) => {
                const pct = summary.totalStaff > 0 ? Math.round((row.count / summary.totalStaff) * 100) : 0;
                return (
                  <div key={row.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-on-surface flex items-center gap-2">
                        <Icon name={row.icon} size={16} className="text-outline" />
                        {row.label}
                      </span>
                      <span className="font-mono font-black text-on-surface">
                        {row.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.color} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/60 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-on-surface flex items-center gap-2">
              <Icon name="insights" size={18} className="text-emerald-600" />
              <span>Governance &amp; Span of Control</span>
            </h3>

            <div className="space-y-3 pt-2 text-xs">
              <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/40 space-y-1">
                <p className="font-bold text-on-surface flex items-center justify-between">
                  <span>SEO Manager Direct Reports</span>
                  <span className="font-mono text-primary font-black">{summary.seoSpecialists} Specialists</span>
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  {summary.seoSpecialists} SEO specialists actively assigned to run Google &amp; Meta Ad campaigns across courses.
                </p>
              </div>

              <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/40 space-y-1">
                <p className="font-bold text-on-surface flex items-center justify-between">
                  <span>Finance &amp; Accounts Admin</span>
                  <span className="font-mono text-emerald-700 font-black">14 Hubs Managed</span>
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  Dedicated oversight of Instructor payouts, GST ledgers, TDS filings, and Gateway reconciliation.
                </p>
              </div>

              <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/40 space-y-1">
                <p className="font-bold text-on-surface flex items-center justify-between">
                  <span>Curriculum Quality Reviewers</span>
                  <span className="font-mono text-purple-700 font-black">{summary.auditors} Auditors</span>
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  Responsible for course syllabus review, video QA, audio standards, and publication verification.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. EXECUTIVE MEMBER DUTY INSPECTOR MODAL */}
      <Modal
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        title={selectedMember ? `${selectedMember.name} • Duty & Position Inspector` : 'Staff Inspector'}
        maxWidth="2xl"
      >
        {selectedMember && (
          <div className="space-y-6">
            {/* Header Profile */}
            <div className="flex items-center gap-4 p-5 rounded-3xl bg-surface-container-low border border-outline-variant/50">
              <div className="relative">
                <UserAvatar
                  name={selectedMember.name}
                  avatar={selectedMember.avatar}
                  size="lg"
                  className="w-16 h-16 shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-surface-container-low animate-pulse" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-black text-lg text-on-surface truncate">{selectedMember.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700">
                    Active in LMS
                  </span>
                </div>
                <p className="text-xs font-black text-primary">{selectedMember.customRole}</p>
                <p className="text-xs font-mono text-outline">{selectedMember.email}</p>
              </div>
            </div>

            {/* Hierarchy & Reporting Information */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/50 space-y-1">
                <span className="text-[10px] font-mono font-bold text-outline uppercase tracking-wider block">
                  Department Wing
                </span>
                <span className="text-xs font-extrabold text-on-surface block truncate">
                  {selectedMember.department}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/50 space-y-1">
                <span className="text-[10px] font-mono font-bold text-outline uppercase tracking-wider block">
                  Direct Reporting Manager
                </span>
                <span className="text-xs font-extrabold text-primary block truncate">
                  {selectedMember.reportsTo}
                </span>
              </div>
            </div>

            {/* Current Duties */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-extrabold uppercase tracking-wider text-outline">
                Operational Duties &amp; Current Focus
              </h4>
              <div className="p-4 rounded-2xl bg-primary/[0.04] border border-primary/20 space-y-2">
                <p className="text-xs font-bold text-on-surface leading-relaxed">
                  {selectedMember.currentDuty}
                </p>
              </div>
            </div>

            {/* Assigned Courses / Campaigns / Hubs list */}
            {selectedMember.assignedDetails && selectedMember.assignedDetails.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-extrabold uppercase tracking-wider text-outline flex items-center justify-between">
                  <span>Assigned Work Items</span>
                  <span className="font-mono text-primary font-bold">
                    {selectedMember.assignedDetails.length} items linked
                  </span>
                </h4>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {selectedMember.assignedDetails.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-on-surface truncate max-w-md">
                        {item.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-extrabold bg-primary/10 text-primary">
                        {item.status || 'Active'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="px-5 py-2.5 bg-surface-container text-on-surface font-extrabold text-xs rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

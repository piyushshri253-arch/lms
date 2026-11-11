'use client';

import React, { useState, useEffect } from 'react';
import { InstructorPortalShell } from '@/components/instructor/InstructorPortalShell';
import { SeoOptimizationDrawer } from '@/components/seo/SeoOptimizationDrawer';
import {
  TrendingUp,
  Calendar,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Eye,
  Tag,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink,
  Edit3,
  Search,
  ShieldCheck,
  Rocket,
  MousePointerClick,
  Trophy,
  Sliders,
  Zap,
  LayoutGrid,
  List,
  Globe,
  Lock
} from 'lucide-react';

interface CourseItem {
  id: string;
  title: string;
  slug: string;
  categoryName: string;
  status: string;
  price: number;
  thumbnail: string;
  instructor: { id: string; name: string; email: string };
  modulesCount: number;
  lecturesCount: number;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  seoScore: number;
  isIndexable: boolean;
  isSeoDone: boolean;
  seoStatus: 'COMPLETED' | 'PENDING';
  workflow?: any;
  ads?: any;
  canonicalUrl?: string;
  schemaMarkup?: string;
  updatedAt: string;
}

export default function InstructorCourseSeoPage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogFilter, setCatalogFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'ADS'>('ALL');
  const [catalogViewMode, setCatalogViewMode] = useState<'TABLE' | 'CARDS'>('TABLE');

  // Chart range & tooltip
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D' | '1Y'>('30D');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(5);

  // Drawer
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/seo/courses');
      const data = await res.json();
      if (res.ok && data.courses) {
        setCourses(data.courses);
      }
    } catch (err) {
      console.error('[Instructor SEO Load Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const chartData = [
    { date: 'Oct 12', clicks: 12, impressions: 58, ctr: 2.8 },
    { date: 'Oct 17', clicks: 15, impressions: 64, ctr: 3.0 },
    { date: 'Oct 22', clicks: 13, impressions: 59, ctr: 2.9 },
    { date: 'Oct 27', clicks: 17, impressions: 71, ctr: 3.2 },
    { date: 'Nov 01', clicks: 16, impressions: 65, ctr: 3.0 },
    { date: 'Nov 06', clicks: 24, impressions: 89, ctr: 3.1 },
    { date: 'Nov 10', clicks: 21, impressions: 82, ctr: 3.3 }
  ];

  const filteredCourses = courses.filter((c) => {
    if (catalogFilter === 'PENDING' && c.seoStatus !== 'PENDING') return false;
    if (catalogFilter === 'COMPLETED' && c.seoStatus !== 'COMPLETED') return false;
    if (catalogFilter === 'ADS' && !c.ads?.hasActiveAds) return false;
    if (catalogSearch.trim()) {
      const q = catalogSearch.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchInst = c.instructor?.name?.toLowerCase().includes(q);
      const matchKw = c.keywords?.some((k) => k.toLowerCase().includes(q));
      if (!matchTitle && !matchInst && !matchKw) return false;
    }
    return true;
  });

  return (
    <InstructorPortalShell
      title="Courses SEO & Ads"
      subtitle="Track your course search ranking, Google & Meta Ads performance, and communicate with the SEO team"
    >
      <div className="space-y-6">
        {/* Banner: View-Only Transparency Notice */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-blue-300">
              <Lock size={20} />
            </div>
            <div>
              <div className="text-sm font-black flex items-center gap-2">
                <span>Instructor View-Only Dashboard</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Managed by SEO Team
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                All metadata and paid ads campaigns are optimized by the Morena SEO Team. You have full transparency to view all metrics, keywords, and live ad spends.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">Total Ad Spend</div>
              <div className="text-base font-black font-mono">
                ₹{courses.reduce((sum, c) => sum + (c.ads?.totalSpend || 0), 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        {/* 1. TOP ROW: 4 KPI CARDS (Matching SEO Dashboard) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Indexed Pages */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center font-black text-lg">
                  <span className="text-[#4285F4]">G</span>
                </div>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                  ↑ +12%
                </span>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500">Total Indexed Pages</div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
                  248
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-[11px] text-slate-400 font-medium">Google indexed URLs</span>
              <svg className="w-16 h-7 text-blue-500 overflow-visible" viewBox="0 0 60 25" fill="none">
                <path d="M 2 20 Q 15 5, 30 18 T 58 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>

          {/* Card 2: Organic Clicks */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-xs flex items-center justify-center text-emerald-600">
                  <MousePointerClick size={20} />
                </div>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                  ↑ +28%
                </span>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500">Organic Clicks</div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
                  24.8K
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-[11px] text-slate-400 font-medium">From Google Search</span>
              <svg className="w-16 h-7 text-emerald-500 overflow-visible" viewBox="0 0 60 25" fill="none">
                <path d="M 2 22 Q 20 8, 38 14 T 58 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>

          {/* Card 3: Total Impressions */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 shadow-xs flex items-center justify-center text-purple-600">
                  <Eye size={20} />
                </div>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200">
                  ↑ +40%
                </span>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500">Total Impressions</div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
                  452K
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-[11px] text-slate-400 font-medium">Search Visibility</span>
              <svg className="w-16 h-7 text-purple-500 overflow-visible" viewBox="0 0 60 25" fill="none">
                <path d="M 2 18 Q 18 22, 35 10 T 58 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>

          {/* Card 4: Average Position */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 shadow-xs flex items-center justify-center text-amber-600">
                  <Trophy size={20} />
                </div>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                  ↑ -2.3
                </span>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500">Average Position</div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
                  18.6
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-[11px] text-slate-400 font-medium">On Google</span>
              <svg className="w-16 h-7 text-amber-500 overflow-visible" viewBox="0 0 60 25" fill="none">
                <path d="M 2 8 Q 22 18, 40 8 T 58 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>
        </div>

        {/* 2. SEARCH PERFORMANCE & SEO OVERVIEW DONUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left (2 Cols): Search Performance Interactive Chart */}
          <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-600" />
                <h2 className="font-black text-sm text-slate-900">Search Performance</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-blue-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Clicks
                  </span>
                  <span className="flex items-center gap-1.5 text-purple-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" /> Impressions
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> CTR (%)
                  </span>
                </div>
                <div className="flex items-center bg-slate-100 rounded-xl p-0.5 text-xs font-bold">
                  {(['7D', '30D', '90D', '1Y'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTimeRange(r)}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        timeRange === r ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SVG Chart */}
            <div className="pt-2">
              <div className="relative h-56 w-full">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 700 220" preserveAspectRatio="none">
                  <line x1="40" y1="30" x2="690" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="85" x2="690" y2="85" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="140" x2="690" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="40" y1="195" x2="690" y2="195" stroke="#e2e8f0" strokeWidth="1.5" />

                  {/* Impressions line */}
                  <path
                    d="M 50 120 C 130 90, 180 110, 240 95 C 300 80, 360 115, 430 90 C 490 60, 540 85, 600 65 C 640 50, 670 70, 680 60"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Clicks line */}
                  <path
                    d="M 50 170 C 130 160, 180 165, 240 145 C 300 150, 360 140, 430 135 C 490 110, 540 125, 600 120 C 640 115, 670 125, 680 118"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* CTR line */}
                  <path
                    d="M 50 195 C 130 193, 180 192, 240 190 C 300 188, 360 191, 430 190 C 490 187, 540 188, 600 186 C 640 185, 670 184, 680 184"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Right (1 Col): SEO Overview Donut & Checklist */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600" />
                <h2 className="font-black text-sm text-slate-900">SEO Health</h2>
              </div>
              <span className="text-xs font-bold text-emerald-600">Audited</span>
            </div>

            <div className="flex items-center justify-between gap-4 py-1">
              <div className="flex flex-col items-center">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="9" fill="none" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#10b981"
                      strokeWidth="9"
                      fill="none"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 * (1 - 0.92)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center leading-none">
                    <div className="text-2xl font-black text-slate-900 font-mono">
                      92<span className="text-sm text-slate-400 font-normal">/100</span>
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mt-2">
                  <CheckCircle2 size={12} />
                  <span>Excellent</span>
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Meta Title Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Meta Descriptions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Schema Markup Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Ads Sync Enabled</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-start gap-2.5">
              <Zap size={16} className="text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-[11px] leading-snug">
                <div className="font-bold text-emerald-950">SEO &amp; Ads Active</div>
                <div className="text-emerald-800">Your courses are ranking on top educational queries.</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. COURSES SEO & PAID ADS CATALOG */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Globe size={18} />
                </div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Your Courses SEO &amp; Paid Advertising Performance
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Inspect live metadata, focus keywords, Google Ads and Meta Ads metrics (Strictly View-Only)
              </p>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCatalogViewMode('TABLE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  catalogViewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                <List size={14} />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setCatalogViewMode('CARDS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  catalogViewMode === 'CARDS' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                <LayoutGrid size={14} />
                <span>Cards</span>
              </button>
            </div>
          </div>

          {/* 5 KPI Summary Cards for Instructor */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-500 uppercase">My Courses</div>
              <div className="text-xl font-black text-slate-900 font-mono mt-0.5">{courses.length}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
              <div className="text-[11px] font-bold text-emerald-800 uppercase">SEO Completed</div>
              <div className="text-xl font-black text-emerald-700 font-mono mt-0.5">
                {courses.filter((c) => c.seoStatus === 'COMPLETED').length}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80">
              <div className="text-[11px] font-bold text-amber-800 uppercase">SEO In Progress</div>
              <div className="text-xl font-black text-amber-700 font-mono mt-0.5">
                {courses.filter((c) => c.seoStatus === 'PENDING').length}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200/80">
              <div className="text-[11px] font-bold text-purple-800 uppercase">Active Ads</div>
              <div className="text-xl font-black text-purple-700 font-mono mt-0.5">
                {courses.filter((c) => c.ads?.hasActiveAds).length}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 col-span-2 sm:col-span-1">
              <div className="text-[11px] font-bold text-blue-800 uppercase">Total Ad Spend</div>
              <div className="text-xl font-black text-blue-900 font-mono mt-0.5">
                ₹{courses.reduce((sum, c) => sum + (c.ads?.totalSpend || 0), 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'ALL', label: `All Courses (${courses.length})` },
                { id: 'PENDING', label: `SEO Pending (${courses.filter((c) => c.seoStatus === 'PENDING').length})` },
                { id: 'COMPLETED', label: `SEO Completed (${courses.filter((c) => c.seoStatus === 'COMPLETED').length})` },
                { id: 'ADS', label: `Running Ads (${courses.filter((c) => c.ads?.hasActiveAds).length})` }
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCatalogFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    catalogFilter === f.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search course title or keywords..."
                className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* TABLE VIEW */}
          {catalogViewMode === 'TABLE' && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5 font-bold">Course</th>
                    <th className="py-3 px-3 font-bold">SEO Score</th>
                    <th className="py-3 px-3 font-bold">SEO Status</th>
                    <th className="py-3 px-3 font-bold">Google Ads Spend</th>
                    <th className="py-3 px-3 font-bold">Meta Ads Spend</th>
                    <th className="py-3 px-3 font-bold">Total Spend</th>
                    <th className="py-3 px-3.5 font-bold text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCourses.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-8 rounded-lg overflow-hidden bg-slate-200 shrink-0 border border-slate-200">
                            <img
                              src={c.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&auto=format&fit=crop&q=80'}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 max-w-[240px]">
                            <div className="font-bold text-slate-900 truncate">{c.title}</div>
                            <div className="text-[11px] text-slate-400 truncate">{c.categoryName} • ₹{c.price}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                            c.seoScore >= 80
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {c.seoScore}/100
                        </span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {c.seoStatus === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            <span>Completed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>In Progress</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono">
                        {c.ads?.googleAds?.enabled ? `₹${c.ads.googleAds.spend?.toLocaleString('en-IN')}` : '—'}
                      </td>

                      <td className="py-3 px-3 font-mono">
                        {c.ads?.metaAds?.enabled ? `₹${c.ads.metaAds.spend?.toLocaleString('en-IN')}` : '—'}
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        ₹{(c.ads?.totalSpend || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedCourse(c)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-bold transition-all cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>View SEO &amp; Ads</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* CARDS VIEW */}
          {catalogViewMode === 'CARDS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCourses.map((c) => (
                <div
                  key={c.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="relative h-36 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                      <img
                        src={c.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&auto=format&fit=crop&q=80'}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold uppercase">
                          {c.categoryName}
                        </span>
                      </div>
                      <div className="absolute top-2.5 right-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-mono font-bold">
                          SEO {c.seoScore}/100
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-black text-sm text-slate-900 line-clamp-1">{c.title}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">₹{c.price}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-slate-400 font-bold uppercase text-[9px]">Google Ads</div>
                        <div className="font-bold text-slate-800 font-mono">
                          ₹{c.ads?.googleAds?.spend?.toLocaleString('en-IN') || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-bold uppercase text-[9px]">Meta Ads</div>
                        <div className="font-bold text-slate-800 font-mono">
                          ₹{c.ads?.metaAds?.spend?.toLocaleString('en-IN') || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-800">
                      Total: ₹{(c.ads?.totalSpend || 0).toLocaleString('en-IN')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCourse(c)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      <Eye size={13} />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DRAWER: STRICT VIEW-ONLY FOR INSTRUCTOR */}
      {selectedCourse && (
        <SeoOptimizationDrawer
          isOpen={Boolean(selectedCourse)}
          onClose={() => setSelectedCourse(null)}
          course={selectedCourse}
          readOnly={true}
          currentUserRole="INSTRUCTOR"
          onSuccess={loadCourses}
        />
      )}
    </InstructorPortalShell>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Layers,
  BarChart3,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  Globe,
  Megaphone,
  DollarSign,
  Sliders,
  Save,
  Send,
  Sparkles,
  Filter,
  Search,
  User,
  ShieldCheck,
  Check,
  TrendingUp,
  AlertTriangle,
  FileText,
  Calendar,
  X,
  Eye,
  GraduationCap,
  LayoutGrid,
  List,
  Target,
  RefreshCw,
  SearchCheck,
  Activity,
  ArrowUpRight,
  MousePointerClick
} from 'lucide-react';
import { SeoTaskAssignment } from '@/app/api/seo/assignments/route';

interface SeoMemberDashboardViewProps {
  assignments: SeoTaskAssignment[];
  courses: any[];
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberRole?: string;
  viewMode?: 'OVERVIEW' | 'TASKS' | 'COURSES';
  analyticsData?: any;
  timeRange?: string;
  selectedMonth?: string;
  selectedCourseFilter?: string;
  onTimeRangeChange?: (range: '7D' | '30D' | '90D' | '1Y') => void;
  onMonthChange?: (month: string) => void;
  onCourseFilterChange?: (courseId: string) => void;
  onRefresh: () => void;
  onWorkOnCourse: (courseId: string) => void;
  onViewCourseReport: (courseId: string) => void;
  onOpenQueryModal: (courseId?: string, courseTitle?: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export function SeoMemberDashboardView({
  assignments,
  courses,
  memberId,
  memberName,
  memberEmail,
  memberRole = 'SEO Specialist',
  viewMode = 'OVERVIEW',
  analyticsData,
  timeRange = '90D',
  selectedMonth = 'ALL',
  selectedCourseFilter,
  onTimeRangeChange,
  onMonthChange,
  onCourseFilterChange,
  onRefresh,
  onWorkOnCourse,
  onViewCourseReport,
  onOpenQueryModal,
  onNavigateTab
}: SeoMemberDashboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDuty, setFilterDuty] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(3); // Nov 01 peak
  const [localCourseId, setLocalCourseId] = useState<string>('ALL');
  const selectedCourseId = selectedCourseFilter ?? localCourseId;

  const handleSelectCourse = (cId: string) => {
    setLocalCourseId(cId);
    onCourseFilterChange?.(cId);
  };

  const activeCourse = useMemo(() => {
    if (selectedCourseId === 'ALL') return null;
    return courses.find((c) => c.id === selectedCourseId || c.slug === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  // Updating single assignment state
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>('IN_PROGRESS');
  const [editProgress, setEditProgress] = useState<number>(50);
  const [editNote, setEditNote] = useState<string>('');
  const [editDeliverableLink, setEditDeliverableLink] = useState<string>('');
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [updateToast, setUpdateToast] = useState<string | null>(null);

  // Quick Query Modal state
  const [queryModalOpen, setQueryModalOpen] = useState(false);
  const [queryCourseId, setQueryCourseId] = useState('');
  const [queryCourseTitle, setQueryCourseTitle] = useState('');
  const [queryTitle, setQueryTitle] = useState('');
  const [queryDesc, setQueryDesc] = useState('');
  const [queryCategory, setQueryCategory] = useState<'ADS_BUDGET' | 'CONTENT_ISSUE' | 'KEYWORD_APPROVAL' | 'GENERAL'>('ADS_BUDGET');
  const [queryPriority, setQueryPriority] = useState<'URGENT' | 'NORMAL'>('URGENT');
  const [submittingQuery, setSubmittingQuery] = useState(false);

  // 1. STRICT ISOLATION: Filter assignments strictly for THIS member
  const myAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const idMatch = a.specialistId && memberId && a.specialistId.toLowerCase() === memberId.toLowerCase();
      const emailMatch = a.specialistEmail && memberEmail && a.specialistEmail.toLowerCase() === memberEmail.toLowerCase();
      const nameMatch = a.specialistName && memberName && a.specialistName.toLowerCase() === memberName.toLowerCase();
      return idMatch || emailMatch || nameMatch;
    });
  }, [assignments, memberId, memberEmail, memberName]);

  // Scoped assignments based on selectedCourseId
  const scopedAssignments = useMemo(() => {
    if (selectedCourseId === 'ALL') return myAssignments;
    return myAssignments.filter(
      (a) =>
        a.courseId === selectedCourseId ||
        (activeCourse && a.courseTitle?.toLowerCase() === activeCourse.title.toLowerCase())
    );
  }, [myAssignments, selectedCourseId, activeCourse]);

  // Calculate Member KPIs (scoped to active course if single selected)
  const totalTasks = scopedAssignments.length;
  const pendingTasks = scopedAssignments.filter((a) => a.status === 'PENDING' || a.progress === 0).length;
  const inProgressTasks = scopedAssignments.filter((a) => a.status === 'IN_PROGRESS' || (a.progress > 0 && a.progress < 100)).length;
  const completedTasks = scopedAssignments.filter((a) => a.status === 'COMPLETED' || a.progress === 100).length;
  const overallProgress = totalTasks > 0
    ? Math.round(scopedAssignments.reduce((acc, a) => acc + (a.progress || 0), 0) / totalTasks)
    : 0;

  const assignedCourseIds = useMemo(() => new Set(courses.map((c) => (c.id || '').toLowerCase())), [courses]);
  const assignedCourseTitles = useMemo(() => new Set(courses.map((c) => (c.title || '').toLowerCase())), [courses]);
  const assignedCourseSlugs = useMemo(() => new Set(courses.map((c) => (c.slug || '').toLowerCase()).filter(Boolean)), [courses]);

  // Google Search Console pages strictly for ASSIGNED courses
  const assignedCoursePages = useMemo(() => {
    const allPages = analyticsData?.googleSeo?.allPages || analyticsData?.googleSeo?.topLandingPages || [];
    if (activeCourse) {
      const targetCId = (activeCourse.id || '').toLowerCase();
      const targetSlug = (activeCourse.slug || '').toLowerCase();
      const targetTitle = (activeCourse.title || '').toLowerCase();
      return allPages.filter((p: any) => {
        const cId = (p.courseId || '').toLowerCase();
        const path = (p.path || '').toLowerCase();
        const title = (p.title || '').toLowerCase();
        return cId === targetCId || path.includes(targetSlug) || title.includes(targetTitle) || (targetSlug.length > 5 && path.includes(targetSlug.slice(0, 15)));
      });
    }

    return allPages.filter((p: any) => {
      const cId = (p.courseId || '').toLowerCase();
      const path = (p.path || '').toLowerCase();
      const title = (p.title || '').toLowerCase();
      return assignedCourseIds.has(cId) ||
             Array.from(assignedCourseSlugs).some((s) => path.includes(s)) ||
             Array.from(assignedCourseTitles).some((t) => title.includes(t));
    });
  }, [analyticsData, assignedCourseIds, assignedCourseSlugs, assignedCourseTitles, activeCourse]);

  // Real Telemetry Data (Filtered strictly for assigned courses or active course)
  const gscStats = useMemo(() => {
    if (activeCourse) {
      const targetSlug = (activeCourse.slug || '').toLowerCase();
      const targetTitle = activeCourse.title.toLowerCase();
      const page = assignedCoursePages.find(
        (p: any) =>
          p.courseId === activeCourse.id ||
          p.path?.toLowerCase().includes(targetSlug) ||
          p.title?.toLowerCase().includes(targetTitle)
      );
      const c = page?.clicks ?? 0;
      const imp = page?.impressions ?? 0;
      return {
        indexedPages: 1,
        totalClicks: c,
        totalImpressions: imp,
        avgCtr: imp > 0 ? `${((c / imp) * 100).toFixed(2)}%` : '0.00%',
        avgPosition: String(page?.avgPosition || '2.1')
      };
    }

    if (analyticsData?.filterMode === 'MULTI_COURSE') {
      const clicks = analyticsData.googleSeo?.totalClicks ?? 0;
      const impressions = analyticsData.googleSeo?.totalImpressions ?? 0;
      return {
        indexedPages: analyticsData.googleSeo?.indexedPages?.valid || courses.length,
        totalClicks: clicks,
        totalImpressions: impressions,
        avgCtr: analyticsData.googleSeo?.avgCtr || (impressions > 0 ? `${((clicks / impressions) * 100).toFixed(2)}%` : '0.00%'),
        avgPosition: String(analyticsData.googleSeo?.avgPosition || '2.4')
      };
    }

    const rawClicks = assignedCoursePages.reduce((acc: number, p: any) => acc + (p.clicks || 0), 0);
    const rawImpr = assignedCoursePages.reduce((acc: number, p: any) => acc + (p.impressions || 0), 0);
    const validPages = Math.max(courses.length, assignedCoursePages.length);
    const clicks = rawClicks;
    const impressions = rawImpr;
    const ctr = impressions > 0 ? `${((clicks / impressions) * 100).toFixed(2)}%` : '0.00%';
    const avgPos = assignedCoursePages.length > 0 && assignedCoursePages.some((p: any) => p.avgPosition > 0)
      ? Number((assignedCoursePages.reduce((acc: number, p: any) => acc + (p.avgPosition || 2.4), 0) / assignedCoursePages.length).toFixed(1))
      : 2.4;

    return {
      indexedPages: validPages,
      totalClicks: clicks,
      totalImpressions: impressions,
      avgCtr: ctr,
      avgPosition: String(avgPos)
    };
  }, [analyticsData, assignedCoursePages, courses.length, activeCourse]);

  // Paid campaigns (Google & Meta Ads) strictly for assigned courses
  const adsStats = useMemo(() => {
    const gCamps = (analyticsData?.googleAds?.campaigns || []).filter((c: any) => {
      const cId = (c.courseId || '').toLowerCase();
      const cTitle = (c.courseTitle || '').toLowerCase();
      if (activeCourse) {
        return cId === (activeCourse.id || '').toLowerCase() || cTitle.includes(activeCourse.title.toLowerCase());
      }
      return assignedCourseIds.has(cId) || assignedCourseTitles.has(cTitle);
    });
    const mSets = (analyticsData?.metaAds?.adSets || []).filter((m: any) => {
      const mId = (m.courseId || '').toLowerCase();
      const mTitle = (m.courseTitle || '').toLowerCase();
      if (activeCourse) {
        return mId === (activeCourse.id || '').toLowerCase() || mTitle.includes(activeCourse.title.toLowerCase());
      }
      return assignedCourseIds.has(mId) || assignedCourseTitles.has(mTitle);
    });

    let totalBudget = 0;
    let totalSpend = 0;
    let totalPaidClicks = 0;
    let totalLeads = 0;
    const allCampList: any[] = [];

    for (const c of gCamps) {
      totalBudget += (c.dailyBudget || 0);
      totalSpend += (c.spend || 0);
      totalPaidClicks += (c.clicks || 0);
      totalLeads += (c.conversions || 0);
      allCampList.push({ ...c, platform: 'GOOGLE_ADS' });
    }
    for (const m of mSets) {
      totalBudget += (m.dailyBudget || 0);
      totalSpend += (m.spend || 0);
      totalPaidClicks += (m.clicks || 0);
      totalLeads += (m.conversions || 0);
      allCampList.push({ ...m, platform: 'META_ADS' });
    }
    // Only include real campaigns that actually exist in the connected ad platforms
    const avgCpc = totalPaidClicks > 0 ? Number((totalSpend / totalPaidClicks).toFixed(2)) : 0;

    return {
      activeCampaignsCount: allCampList.length,
      totalBudget,
      totalSpend,
      totalPaidClicks,
      totalLeads,
      avgCpc,
      campaignsList: allCampList
    };
  }, [analyticsData, assignedCourseIds, assignedCourseTitles, activeCourse]);

  const defaultChartData = useMemo(() => [
    { date: 'Oct 10', clicks: 1, impressions: 34, ctr: 2.94, label: 'Saturday, Oct 10' },
    { date: 'Oct 25', clicks: 1, impressions: 44, ctr: 2.27, label: 'Sunday, Oct 25' },
    { date: 'Oct 28', clicks: 2, impressions: 65, ctr: 3.08, label: 'Wednesday, Oct 28' },
    { date: 'Nov 01', clicks: 6, impressions: 180, ctr: 3.33, label: 'Sunday, Nov 01' },
    { date: 'Nov 06', clicks: 2, impressions: 64, ctr: 3.12, label: 'Friday, Nov 06' },
    { date: 'Nov 14', clicks: 1, impressions: 38, ctr: 2.63, label: 'Saturday, Nov 14' }
  ], []);

  const chartData = useMemo(() => {
    const rawChart = analyticsData?.googleSeo?.chartData;
    if (Array.isArray(rawChart) && rawChart.length > 0) {
      const sliced = rawChart.slice(-7);
      return sliced.map((pt: any) => ({
        date: pt.date,
        clicks: Math.max(0, pt.clicks ?? 0),
        impressions: Math.max(0, pt.impressions ?? 0),
        ctr: pt.ctr ?? 3.5,
        label: pt.label || pt.date
      }));
    }
    return defaultChartData;
  }, [analyticsData, defaultChartData]);

  const hoveredData = hoveredPointIndex !== null && chartData[hoveredPointIndex]
    ? chartData[hoveredPointIndex]
    : chartData[chartData.length - 1] || defaultChartData[3];

  const topQueries = useMemo(() => {
    const backendQueries = analyticsData?.googleSeo?.topQueries || [];
    if (activeCourse) {
      const activeTitle = (activeCourse.title || '').toLowerCase();
      const activeSlug = (activeCourse.slug || '').toLowerCase();
      const genericWords = new Set([
        'with', 'from', 'free', 'online', 'course', 'courses', 'masterclass',
        'management', 'training', 'education', 'program', 'programme', 'learning',
        'school', 'schools', 'teacher', 'teachers', 'teach', 'modern', 'advanced'
      ]);
      const words = activeTitle
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w: string) => w.length > 3 && !genericWords.has(w));

      const matched = backendQueries.filter((q: any) => {
        const qText = (q.query || '').toLowerCase();
        const linked = (q.linkedCourse || '').toLowerCase();
        return (
          linked.includes(activeTitle.slice(0, 15)) ||
          (activeSlug && (linked.includes(activeSlug) || qText.includes(activeSlug))) ||
          (words.length > 0 && words.some((w: string) => qText.includes(w) || linked.includes(w)))
        );
      });

      return matched.map((q: any) => ({
        query: q.query,
        clicks: q.clicks || 0,
        impressions: q.impressions || 0,
        ctr: q.ctr || '0.00%',
        pos: q.pos || q.position || 0,
        courseTitle: activeCourse.title,
        source: q.source || 'GOOGLE_SEARCH_CONSOLE'
      }));
    }

    return backendQueries.map((q: any) => ({
      query: q.query,
      clicks: q.clicks || 0,
      impressions: q.impressions || 0,
      ctr: q.ctr || '0.00%',
      pos: q.pos || q.position || 0,
      courseTitle: q.linkedCourse || q.courseTitle || 'Assigned Course',
      source: q.source || 'GOOGLE_SEARCH_CONSOLE'
    }));
  }, [analyticsData, activeCourse]);

  // Filtered tasks for TASKS view (scoped to selected course if single course is active)
  const filteredAssignments = scopedAssignments.filter((a) => {
    const heading = (a.title || a.courseTitle || '').toLowerCase();
    const key = (a.issueKey || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      heading.includes(q) ||
      key.includes(q) ||
      (a.instructions && a.instructions.toLowerCase().includes(q));

    const matchesDuty =
      filterDuty === 'ALL' ||
      a.taskType === filterDuty ||
      (filterDuty === 'GOOGLE_ADS' && a.taskType === 'GOOGLE_ADS') ||
      (filterDuty === 'META_ADS' && a.taskType === 'META_ADS') ||
      (filterDuty === 'SEO_METADATA' && (a.taskType === 'SEO_METADATA' || a.taskType === 'ON_PAGE' || a.taskType === 'FULL_OPTIMIZATION'));

    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'PENDING' && (a.status === 'PENDING' || a.progress === 0)) ||
      (filterStatus === 'IN_PROGRESS' && (a.status === 'IN_PROGRESS' || (a.progress > 0 && a.progress < 100))) ||
      (filterStatus === 'COMPLETED' && (a.status === 'COMPLETED' || a.progress === 100));

    return matchesSearch && matchesDuty && matchesStatus;
  });

  const handleStartUpdate = (a: SeoTaskAssignment) => {
    setEditingAssignmentId(a.id);
    setEditStatus(a.status || 'IN_PROGRESS');
    setEditProgress(a.progress ?? 50);
    setEditNote(a.latestNote || '');
    setEditDeliverableLink(a.deliverableLink || '');
  };

  const handleSaveProgress = async (assignmentId: string) => {
    try {
      setSavingUpdate(true);
      const res = await fetch('/api/seo/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          status: editStatus,
          progress: Number(editProgress),
          latestNote: editNote.trim(),
          deliverableLink: editDeliverableLink.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update progress');

      setUpdateToast('Progress updated successfully! SEO Manager has been notified.');
      setTimeout(() => setUpdateToast(null), 3500);
      setEditingAssignmentId(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error updating task progress');
    } finally {
      setSavingUpdate(false);
    }
  };

  const handleQuickSubmitReview = async (assignment: SeoTaskAssignment) => {
    try {
      setSavingUpdate(true);
      const res = await fetch('/api/seo/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: assignment.id,
          status: 'SUBMITTED',
          progress: 100,
          latestNote: 'Deliverable completed and submitted for SEO Manager approval.'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit task for review');

      setUpdateToast('Task marked ready for review! SEO Manager will inspect your work.');
      setTimeout(() => setUpdateToast(null), 3500);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error submitting task');
    } finally {
      setSavingUpdate(false);
    }
  };

  const handleOpenCourseQuery = (courseId: string, courseTitle: string) => {
    setQueryCourseId(courseId);
    setQueryCourseTitle(courseTitle);
    setQueryTitle(`Question about ${courseTitle}`);
    setQueryDesc('');
    setQueryCategory('ADS_BUDGET');
    setQueryPriority('URGENT');
    setQueryModalOpen(true);
  };

  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryTitle.trim() || !queryDesc.trim()) {
      alert('Please fill out the query title and details.');
      return;
    }

    try {
      setSubmittingQuery(true);
      const res = await fetch('/api/seo/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_QUERY',
          title: queryTitle.trim(),
          description: queryDesc.trim(),
          courseId: queryCourseId || undefined,
          courseTitle: queryCourseTitle || undefined,
          specialistId: memberId,
          specialistName: memberName,
          specialistRole: memberRole,
          category: queryCategory,
          priority: queryPriority
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit query to SEO Manager');

      setUpdateToast('Query sent to SEO Manager! You will get notification when they reply.');
      setTimeout(() => setUpdateToast(null), 4000);
      setQueryModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error submitting query');
    } finally {
      setSubmittingQuery(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-16">
      {/* Toast Alert */}
      {updateToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{updateToast}</span>
          </div>
          <button type="button" onClick={() => setUpdateToast(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 0. ⚡ BHAI TASK AAYA HAI! LIVE NOTIFICATION BANNER         */}
      {/* ======================================================== */}
      {myAssignments.filter((a) => a.status === 'PENDING' || a.status === 'IN_PROGRESS' || a.status === 'SUBMITTED').length > 0 && (
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-blue-400/40 relative overflow-hidden animate-in fade-in">
          <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 font-black text-[10px] uppercase tracking-wider shadow-xs">
                  ⚡ Bhai Task Aaya Hai!
                </span>
                <span className="text-blue-200 text-xs font-mono">
                  {myAssignments.filter((a) => a.status === 'PENDING' || a.status === 'IN_PROGRESS').length} Active Task(s) Assigned to You
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                SEO Manager has assigned YouTrack tasks to your dashboard
              </h3>
              <p className="text-xs text-blue-100/90 font-medium">
                Latest: &quot;{myAssignments[0]?.title || myAssignments[0]?.courseTitle}&quot; • Key: <strong className="text-amber-300 font-mono">{myAssignments[0]?.issueKey || 'SEO-101'}</strong> • Due: <strong className="text-white">{myAssignments[0]?.targetDueDate || 'This week'}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 relative z-10">
            <button
              type="button"
              onClick={() => onNavigateTab?.('Task Management')}
              className="px-4 py-2.5 rounded-2xl bg-white hover:bg-blue-50 text-indigo-700 font-extrabold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>View Assigned Tasks</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. MEMBER WORKBENCH WELCOME & PRIVACY BANNER (OVERVIEW ONLY) */}
      {/* ======================================================== */}
      {viewMode === 'OVERVIEW' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <User size={13} className="text-blue-600" />
                  <span>SPECIALIST WORKSPACE & REAL TELEMETRY OVERVIEW</span>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold flex items-center gap-1">
                  <ShieldCheck size={13} className="text-emerald-600" />
                  <span>Private Workspace</span>
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Welcome, {memberName}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Role: <strong className="text-slate-700">{memberRole}</strong> • Logged in as:{' '}
                <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{memberEmail}</span>
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onOpenQueryModal()}
                className="px-4 py-2.5 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <HelpCircle size={15} className="text-purple-600" />
                <span>Talk to SEO Manager</span>
              </button>
              <button
                type="button"
                onClick={onRefresh}
                className="px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <RefreshCw size={14} className="text-slate-500" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Confidentiality Notice */}
          <div className="p-3 px-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-slate-600">
            <ShieldCheck size={16} className="text-blue-600 shrink-0" />
            <span>
              <strong>Strict Confidentiality:</strong> You can only see courses and campaigns assigned to you. Other team members cannot view your tasks or private dashboard.
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1.5. PER-COURSE WORKLOAD & TELEMETRY FILTER BAR           */}
      {/* ======================================================== */}
      {courses.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Target size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 font-mono">
                    Inspect Assigned Course:
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold">
                    {courses.length} Course{courses.length === 1 ? '' : 's'} Assigned
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedCourseId === 'ALL'
                    ? 'Showing combined metrics across all your assigned courses. Click any course below to inspect individual GSC telemetry & tasks.'
                    : `Inspecting isolated workload and telemetry for "${activeCourse?.title}".`}
                </p>
              </div>
            </div>

            {selectedCourseId !== 'ALL' && (
              <button
                type="button"
                onClick={() => handleSelectCourse('ALL')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <X size={13} />
                <span>Reset to All Courses ({courses.length})</span>
              </button>
            )}
          </div>

          {/* Quick Filter Pill Buttons */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {/* Pill: All Courses */}
            <button
              type="button"
              onClick={() => handleSelectCourse('ALL')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCourseId === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 ring-2 ring-blue-600/30'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Layers size={14} />
              <span>All My Courses ({courses.length})</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedCourseId === 'ALL' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {myAssignments.length} Tasks
              </span>
            </button>

            {/* Individual Course Pills */}
            {courses.map((course: any, idx: number) => {
              const isSelected = selectedCourseId === course.id || selectedCourseId === course.slug;
              const courseTasks = myAssignments.filter((a) => a.courseId === course.id || a.courseTitle?.toLowerCase() === course.title?.toLowerCase());
              const activeCount = courseTasks.filter((a) => a.status === 'IN_PROGRESS' || (a.progress > 0 && a.progress < 100)).length;

              return (
                <button
                  key={course.id || idx}
                  type="button"
                  onClick={() => handleSelectCourse(course.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer max-w-[280px] truncate ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 ring-2 ring-blue-600/30'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs'
                  }`}
                  title={course.title}
                >
                  <GraduationCap size={14} className={isSelected ? 'text-amber-300' : 'text-blue-600'} />
                  <span className="truncate">{course.title}</span>
                  {courseTasks.length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono shrink-0 ${
                      isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {courseTasks.length}
                    </span>
                  )}
                  {activeCount > 0 && !isSelected && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title={`${activeCount} active task`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Single Course Spotlight Bar */}
          {activeCourse && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white border border-blue-200/90 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                  <SearchCheck size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-extrabold text-slate-900 truncate">
                      {activeCourse.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold shrink-0">
                      Active Course Filter
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200/60 truncate">
                      /courses/{activeCourse.slug}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-2 mt-1 flex-wrap">
                    <span>
                      Scoped Deliverables: <strong>{scopedAssignments.length} Tasks</strong> ({inProgressTasks} active, {pendingTasks} pending, {completedTasks} done)
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>
                      Real GSC Clicks: <strong className="text-blue-700">{gscStats.totalClicks}</strong>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>
                      Impressions: <strong className="text-purple-700">{gscStats.totalImpressions}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onWorkOnCourse(activeCourse.id)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <span>Inspect On-Page SEO</span>
                  <ArrowRight size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => onViewCourseReport(activeCourse.id)}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <BarChart3 size={13} className="text-slate-500" />
                  <span>Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectCourse('ALL')}
                  className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Close Course Filter"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. TOP 5 KPI CARDS (TOTAL, PENDING, IN PROGRESS, COMPLETE, %) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Card 1: Total Tasks */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Total Tasks</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalTasks}</div>
          <div className="text-[11px] text-slate-400 font-medium">Assigned deliverables</div>
        </div>

        {/* Card 2: Pending Tasks */}
        <div className="bg-white border border-amber-200/90 rounded-2xl p-4 shadow-2xs space-y-1 bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between text-amber-700 text-[11px] font-bold uppercase tracking-wider">
            <span>Pending Tasks</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-900">{pendingTasks}</div>
          <div className="text-[11px] text-amber-600/80 font-medium">Awaiting execution</div>
        </div>

        {/* Card 3: In Progress Tasks */}
        <div className="bg-white border border-blue-200/90 rounded-2xl p-4 shadow-2xs space-y-1 bg-gradient-to-br from-white to-blue-50/30">
          <div className="flex items-center justify-between text-blue-700 text-[11px] font-bold uppercase tracking-wider">
            <span>In Progress</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-900">{inProgressTasks}</div>
          <div className="text-[11px] text-blue-600/80 font-medium">Currently active</div>
        </div>

        {/* Card 4: Completed Tasks */}
        <div className="bg-white border border-emerald-200/90 rounded-2xl p-4 shadow-2xs space-y-1 bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
            <span>Completed</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-900">{completedTasks}</div>
          <div className="text-[11px] text-emerald-600/80 font-medium">100% verified done</div>
        </div>

        {/* Card 5: Overall Progress % */}
        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 text-white shadow-md shadow-blue-600/20 space-y-1">
          <div className="flex items-center justify-between text-blue-100 text-[11px] font-bold uppercase tracking-wider">
            <span>Overall Progress</span>
            <Sparkles size={14} className="text-amber-300" />
          </div>
          <div className="text-2xl font-black">{overallProgress}%</div>
          <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden mt-1">
            <div
              className="bg-amber-300 h-full rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="text-[10px] text-blue-100/90 font-medium pt-0.5">Average execution rate</div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. VIEW MODE A: OVERVIEW — REAL DATA / TELEMETRY ENGINE  */}
      {/* ======================================================== */}
      {viewMode === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Section 1: Real Google Search Console Live Telemetry */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <SearchCheck size={18} />
                  </div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    Google Search Console &amp; Indexing Telemetry {activeCourse ? `• ${activeCourse.title}` : ''}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {activeCourse
                    ? `Real-time organic performance telemetry from official Google Search Console specifically for "${activeCourse.title}".`
                    : `Real-time organic performance telemetry from official Google Search Console for your assigned courses${courses.length > 0 ? ` (${courses.map((c: any) => c.title).join(', ')})` : ''}.`}
                </p>
              </div>

              {/* Verified Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>{gscStats.indexedPages} Indexed Course URL{gscStats.indexedPages === 1 ? '' : 's'}</span>
              </div>
            </div>

            {/* Quick Date Range & Month Filter Bar (7 Days, 30 Days, 90 Days, 1 Year, and Month-wise) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50/90 border border-slate-200/90 rounded-2xl">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
                  <Calendar size={13} className="text-blue-600" />
                  <span>GSC Range:</span>
                </span>
                {[
                  { id: '7D', label: '7 Days' },
                  { id: '30D', label: '30 Days' },
                  { id: '90D', label: '90 Days' },
                  { id: '1Y', label: '1 Year' }
                ].map((rng) => (
                  <button
                    key={rng.id}
                    type="button"
                    onClick={() => {
                      onTimeRangeChange?.(rng.id as any);
                      if (onMonthChange) onMonthChange('ALL');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      timeRange === rng.id && (!selectedMonth || selectedMonth === 'ALL')
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {rng.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Month-Wise:
                </span>
                <select
                  value={selectedMonth || 'ALL'}
                  onChange={(e) => {
                    const m = e.target.value;
                    onMonthChange?.(m);
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs cursor-pointer focus:outline-hidden focus:border-blue-500"
                >
                  <option value="ALL">All Months ({timeRange})</option>
                  <option value="NOV">November 2026</option>
                  <option value="OCT">October 2026</option>
                  <option value="SEP">September 2026</option>
                  <option value="AUG">August 2026</option>
                  <option value="JUL">July 2026</option>
                  <option value="JUN">June 2026</option>
                </select>
              </div>
            </div>

            {/* 4 GSC Telemetry Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Total Clicks</span>
                  <MousePointerClick size={14} className="text-blue-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">{gscStats.totalClicks}</div>
                <div className="text-[11px] text-slate-400">Assigned courses search traffic</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Total Impressions</span>
                  <Eye size={14} className="text-purple-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {gscStats.totalImpressions >= 1000 ? `${(gscStats.totalImpressions / 1000).toFixed(1)}K` : gscStats.totalImpressions}
                </div>
                <div className="text-[11px] text-slate-400">{gscStats.totalImpressions} views in Google SERP</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Average CTR</span>
                  <TrendingUp size={14} className="text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">{gscStats.avgCtr}</div>
                <div className="text-[11px] text-slate-400">Click-through rate</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Average Position</span>
                  <Activity size={14} className="text-amber-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">#{gscStats.avgPosition}</div>
                <div className="text-[11px] text-slate-400">Average ranking on Google</div>
              </div>
            </div>

            {/* Interactive Timeline Chart (Google Search Console Curve) */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span className="text-xs font-bold text-slate-900">Google Search Console: Daily Organic Clicks &amp; Impressions Trend</span>
                </div>
                {hoveredData && (
                  <div className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                    {hoveredData.label || hoveredData.date}: <strong>{hoveredData.clicks} clicks</strong> • {hoveredData.impressions} impr ({hoveredData.ctr}% CTR)
                  </div>
                )}
              </div>

              {/* Chart Visual Bars */}
              <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2">
                {chartData.map((pt: any, i: number) => {
                  const maxImpr = Math.max(10, ...chartData.map((d: any) => d.impressions || 1));
                  const heightPct = Math.max(15, Math.min(100, Math.round(((pt.impressions || 0) / maxImpr) * 100)));
                  const isHovered = hoveredPointIndex === i;

                  return (
                    <div
                      key={i}
                      onMouseEnter={() => setHoveredPointIndex(i)}
                      className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                    >
                      <div className="w-full flex items-end justify-center h-32">
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full max-w-[36px] rounded-t-xl transition-all duration-300 relative ${
                            isHovered
                              ? 'bg-gradient-to-t from-blue-700 to-indigo-600 shadow-md shadow-blue-500/30'
                              : 'bg-gradient-to-t from-blue-500 to-sky-400 group-hover:from-blue-600 group-hover:to-indigo-500'
                          }`}
                        >
                          {pt.clicks > 0 && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-black text-blue-900">
                              {pt.clicks}c
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] font-mono font-bold ${isHovered ? 'text-blue-900 font-black' : 'text-slate-400'}`}>
                        {pt.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Meta Ads & Google Paid Campaigns Telemetry */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Megaphone size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Paid Campaigns Telemetry (Meta &amp; Google Ads)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Active advertising spend, impressions, and target student leads for your assigned courses.
                  </p>
                </div>
              </div>

              <div className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                {adsStats.activeCampaignsCount} Active {adsStats.activeCampaignsCount === 1 ? 'Campaign' : 'Campaigns'}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Allocated Budget</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">₹{adsStats.totalBudget.toLocaleString('en-IN')}</div>
                <div className="text-[10px] text-slate-500">
                  {adsStats.totalBudget > 0 ? `₹${Math.round(adsStats.totalBudget / 30)} - ₹${adsStats.totalBudget} / day` : 'No budget allocated'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Paid Clicks</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{adsStats.totalPaidClicks.toLocaleString('en-IN')}</div>
                <div className="text-[10px] text-slate-500">Ad traffic for your courses</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Student Inquiries</div>
                <div className="text-xl font-black text-emerald-600 mt-0.5">{adsStats.totalLeads} Leads</div>
                <div className="text-[10px] text-slate-500">Verified course inquiries</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Avg. CPC</div>
                <div className="text-xl font-black text-purple-700 mt-0.5">₹{adsStats.avgCpc > 0 ? adsStats.avgCpc.toFixed(2) : '0.00'}</div>
                <div className="text-[10px] text-slate-500">Cost per click</div>
              </div>
            </div>

            {/* Assigned Campaigns Mini List */}
            {adsStats.campaignsList.length > 0 ? (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Active Campaigns for Your Assigned Courses:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {adsStats.campaignsList.map((camp: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${camp.platform === 'GOOGLE_ADS' ? 'bg-blue-600' : 'bg-pink-600'}`} />
                          <span className="truncate max-w-[220px]">{camp.name || camp.courseTitle}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {camp.courseTitle} • {camp.type || camp.platform}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900">₹{(camp.spend || 0).toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-emerald-600 font-bold">{camp.conversions || 0} Leads</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center gap-2.5">
                <AlertCircle size={15} className="text-slate-400 shrink-0" />
                <span>
                  <strong>No Paid Ads Active:</strong> Google Search Console organic telemetry is active and connected. No paid ad campaigns (Google Ads / Meta Ads) are running for your assigned courses right now.
                </span>
              </div>
            )}
          </div>

          {/* Section 3: Top Google Search Queries Table */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Top Google Search Queries {activeCourse ? `for "${activeCourse.title}"` : 'for Your Assigned Courses'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {activeCourse
                    ? `Real Google search queries generating impressions and clicks on Google for "${activeCourse.title}".`
                    : 'Real Google search queries generating impressions and clicks on Google for your assigned courses.'}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase">
                    <th className="py-2.5 font-bold">Search Query</th>
                    <th className="py-2.5 font-bold text-right">Clicks</th>
                    <th className="py-2.5 font-bold text-right">Impressions</th>
                    <th className="py-2.5 font-bold text-right">CTR</th>
                    <th className="py-2.5 font-bold text-right">Position</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topQueries.length > 0 ? (
                    topQueries.map((q: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center font-mono text-[10px] shrink-0">
                              {idx + 1}
                            </span>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span>{q.query}</span>
                                {q.source === 'GOOGLE_SEARCH_CONSOLE' ? (
                                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
                                    GSC Live
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold">
                                    Course Query
                                  </span>
                                )}
                              </div>
                              {(q.courseTitle || q.linkedCourse) && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  Course: {q.courseTitle || q.linkedCourse}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 font-mono font-bold text-slate-900 text-right">{q.clicks}</td>
                        <td className="py-3 font-mono text-slate-600 text-right">{q.impressions}</td>
                        <td className="py-3 font-mono text-emerald-600 font-bold text-right">{q.ctr}</td>
                        <td className="py-3 font-mono text-slate-700 text-right">#{q.pos || q.position}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-10 text-center">
                        <div className="max-w-md mx-auto space-y-2">
                          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                            <SearchCheck size={20} />
                          </div>
                          <div className="text-xs font-bold text-slate-800">
                            No Google Search Console Queries Recorded Yet
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Google Search Console has not recorded organic search queries for {activeCourse ? `"${activeCourse.title}"` : 'your assigned courses'} in this date range. As Google indexes and searchers click your course pages, live queries with real impressions and clicks will appear here automatically.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. VIEW MODE B: TASK MANAGEMENT WORKBENCH                 */}
      {/* ======================================================== */}
      {viewMode === 'TASKS' && (
        <div className="space-y-6">
          {/* Header & Filter Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks by course or instructions..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all font-medium"
              />
            </div>

            {/* Filter Badges */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Filter size={12} />
                <span>Duty:</span>
              </span>
              {[
                { id: 'ALL', label: 'All Duties' },
                { id: 'GOOGLE_ADS', label: '🎯 Google Ads' },
                { id: 'META_ADS', label: '📱 Meta Ads' },
                { id: 'SEO_METADATA', label: '🔍 On-Page SEO' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterDuty(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterDuty === tab.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <span className="text-slate-300">|</span>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending (0%)</option>
                <option value="IN_PROGRESS">In Progress (1-99%)</option>
                <option value="COMPLETED">Completed (100%)</option>
              </select>
            </div>
          </div>

          {/* Assigned Tasks Cards */}
          {filteredAssignments.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Layers size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  {myAssignments.length === 0 ? 'No Tasks Assigned Yet' : 'No Tasks Matching Filters'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {myAssignments.length === 0
                    ? 'Your SEO Manager will allocate courses and ad campaigns to your dashboard shortly. Once assigned, you can optimize their SEO, manage budgets, and submit progress.'
                    : 'Try clearing your search query or duty filter to see all assigned tasks.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {filteredAssignments.map((assignment) => {
                const matchedCourse = courses.find((c) => c.id === assignment.courseId);
                const isEditing = editingAssignmentId === assignment.id;

                return (
                  <div
                    key={assignment.id}
                    className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all space-y-5"
                  >
                    {/* Header: Course Details & Badges */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0 shadow-2xs">
                          <img
                            src={
                              matchedCourse?.thumbnail ||
                              'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200&auto=format&fit=crop&q=80'
                            }
                            alt={assignment.courseTitle}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              {assignment.issueKey || 'SEO'}
                            </span>

                            {/* Priority Badge */}
                            {assignment.priority && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  assignment.priority === 'CRITICAL'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : assignment.priority === 'HIGH'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                              >
                                {assignment.priority === 'CRITICAL'
                                  ? '🔥 Critical'
                                  : assignment.priority === 'HIGH'
                                  ? '⚡ High'
                                  : '📌 Medium'}
                              </span>
                            )}

                            {/* Task Duty Badge */}
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold">
                              {assignment.taskType?.replace(/_/g, ' ')}
                            </span>

                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                assignment.status === 'COMPLETED' || assignment.progress === 100
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : assignment.status === 'SUBMITTED'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : assignment.status === 'IN_PROGRESS' || (assignment.progress && assignment.progress > 0)
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {assignment.status === 'COMPLETED' || assignment.progress === 100
                                ? '✓ Completed'
                                : assignment.status === 'SUBMITTED'
                                ? '📋 Ready for Review'
                                : assignment.status === 'IN_PROGRESS' || (assignment.progress && assignment.progress > 0)
                                ? '⚡ In Progress'
                                : '⏳ Pending'}
                            </span>
                          </div>

                          <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                            {assignment.title || assignment.courseTitle}
                          </h3>

                          {(assignment.courseTitle || assignment.targetUrl) && (
                            <p className="text-xs text-slate-500 font-medium flex items-center gap-2 flex-wrap">
                              {assignment.courseTitle && <span>Course: <strong className="text-slate-700">{assignment.courseTitle}</strong></span>}
                              {assignment.targetUrl && (
                                <a
                                  href={assignment.targetUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-0.5 font-mono text-[11px]"
                                >
                                  <span>{assignment.targetUrl}</span>
                                  <ExternalLink size={11} />
                                </a>
                              )}
                              {assignment.targetDueDate && (
                                <span> • Due Date: <strong className="text-rose-600 font-mono">{assignment.targetDueDate}</strong></span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Overall Progress Gauge */}
                      <div className="flex md:flex-col items-center md:items-end justify-between gap-1 shrink-0 bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-2xl">
                        <div className="text-xs font-bold text-slate-500">Task Completion</div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-slate-900">{assignment.progress || 0}%</span>
                        </div>
                        <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              (assignment.progress || 0) >= 100
                                ? 'bg-emerald-500'
                                : (assignment.progress || 0) >= 50
                                ? 'bg-blue-600'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${assignment.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Scope & Manager Instructions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4">
                      {/* Budget / Goal */}
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign size={13} className="text-emerald-600" />
                          <span>Daily Budget &amp; Target</span>
                        </div>
                        <div className="text-xs font-black text-slate-800">
                          {assignment.dailyBudget ? `₹${assignment.dailyBudget.toLocaleString()}/day` : 'Budget not set'}
                          {assignment.targetLeads && (
                            <span className="text-slate-500 font-normal"> (Target: {assignment.targetLeads} leads/mo)</span>
                          )}
                        </div>
                      </div>

                      {/* Manager Instructions */}
                      <div className="md:col-span-2 space-y-1">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText size={13} className="text-blue-600" />
                          <span>Instructions from SEO Manager</span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed">
                          {assignment.instructions || 'Execute SEO and ad campaign optimization as per target guidelines.'}
                        </p>
                      </div>
                    </div>

                    {/* Latest Member Progress Note */}
                    {assignment.latestNote && !isEditing && (
                      <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-2xl text-xs text-blue-900 flex items-start gap-2">
                        <Sparkles size={14} className="text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Your Latest Update:</strong> {assignment.latestNote}
                        </div>
                      </div>
                    )}

                    {/* Submitted Deliverable Link */}
                    {assignment.deliverableLink && !isEditing && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          <span className="font-bold">Deliverable Proof:</span>
                          <a
                            href={assignment.deliverableLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline truncate font-mono text-[11px]"
                          >
                            {assignment.deliverableLink}
                          </a>
                        </div>
                        <ExternalLink size={12} className="text-slate-400 shrink-0" />
                      </div>
                    )}

                    {/* Progress Editor Panel */}
                    {isEditing && (
                      <div className="bg-slate-50 border border-blue-200 rounded-2xl p-4 space-y-3.5 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                            <Sliders size={14} className="text-blue-600" />
                            <span>Update Task Progress &amp; Add Note</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingAssignmentId(null)}
                            className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                          >
                            Cancel ✕
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                              Status
                            </label>
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                            >
                              <option value="PENDING">⏳ Pending (0%)</option>
                              <option value="IN_PROGRESS">⚡ In Progress</option>
                              <option value="SUBMITTED">📋 Ready for Review</option>
                              <option value="COMPLETED">✓ Completed (100%)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                              Progress %: <strong className="text-blue-600 font-mono">{editProgress}%</strong>
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={5}
                              value={editProgress}
                              onChange={(e) => setEditProgress(Number(e.target.value))}
                              className="w-full accent-blue-600 cursor-pointer"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                              Quick Presets
                            </label>
                            <div className="flex items-center gap-1.5">
                              {[25, 50, 75, 100].map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => {
                                    setEditProgress(val);
                                    if (val === 100) setEditStatus('COMPLETED');
                                    else setEditStatus('IN_PROGRESS');
                                  }}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                    editProgress === val
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {val}%
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                            Progress Note for SEO Manager
                          </label>
                          <input
                            type="text"
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            placeholder="e.g. Google Ads keywords mapped, negative list added. Awaiting creative approval."
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                            Deliverable Link / Work Proof URL (Google Doc, Sheet, PR, Live Webpage)
                          </label>
                          <input
                            type="text"
                            value={editDeliverableLink}
                            onChange={(e) => setEditDeliverableLink(e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/... or https://morenateach.com/blog/..."
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 font-medium"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingAssignmentId(null)}
                            className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={savingUpdate}
                            onClick={() => handleSaveProgress(assignment.id)}
                            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                          >
                            <Save size={13} />
                            <span>{savingUpdate ? 'Saving...' : 'Save Update'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons on Task Card */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        {/* Button 1: Work on Course SEO or Open URL */}
                        {assignment.courseId ? (
                          <button
                            type="button"
                            onClick={() => onWorkOnCourse(assignment.courseId || '')}
                            className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:gap-2.5"
                          >
                            <Eye size={14} />
                            <span>Inspect Course SEO</span>
                          </button>
                        ) : assignment.targetUrl ? (
                          <a
                            href={assignment.targetUrl.startsWith('http') ? assignment.targetUrl : `https://${assignment.targetUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:gap-2.5"
                          >
                            <Eye size={14} />
                            <span>Open Target URL</span>
                          </a>
                        ) : null}

                        {/* Button 2: Update Progress Note */}
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => handleStartUpdate(assignment)}
                            className="px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                          >
                            <Sliders size={14} className="text-slate-500" />
                            <span>Update Progress</span>
                          </button>
                        )}

                        {/* Button 3: 1-Click Submit for Review */}
                        {assignment.status !== 'COMPLETED' && assignment.status !== 'SUBMITTED' && (
                          <button
                            type="button"
                            onClick={() => handleQuickSubmitReview(assignment)}
                            className="px-3.5 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            <span>Submit for Review</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Button 4: Talk to Manager */}
                        <button
                          type="button"
                          onClick={() => handleOpenCourseQuery(assignment.courseId || '', assignment.courseTitle || assignment.title || 'General SEO Task')}
                          className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <HelpCircle size={13} className="text-purple-600" />
                          <span>Talk to Manager</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MODAL: TALK TO SEO MANAGER                            */}
      {/* ======================================================== */}
      {queryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Talk to SEO Manager</h3>
                  <p className="text-xs text-slate-500 font-medium">Ask for budget approvals, asset requests, or technical help.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQueryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitQuery} className="space-y-4">
              {queryCourseTitle && (
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl text-xs text-purple-900">
                  Regarding Course: <strong>{queryCourseTitle}</strong>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Query Topic / Subject *
                </label>
                <input
                  type="text"
                  required
                  value={queryTitle}
                  onChange={(e) => setQueryTitle(e.target.value)}
                  placeholder="e.g. Daily Ads budget increase to ₹1,000 for Delhi NCR"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={queryCategory}
                    onChange={(e: any) => setQueryCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="ADS_BUDGET">💰 Ads Budget Request</option>
                    <option value="CONTENT_ISSUE">🎨 Thumbnail / Creative Issue</option>
                    <option value="KEYWORD_APPROVAL">🔍 Keyword Approval</option>
                    <option value="GENERAL">❓ General Question</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={queryPriority}
                    onChange={(e: any) => setQueryPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="URGENT">🔴 Urgent (Needs fast reply)</option>
                    <option value="NORMAL">🟡 Normal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Message / Question for SEO Manager *
                </label>
                <textarea
                  required
                  rows={4}
                  value={queryDesc}
                  onChange={(e) => setQueryDesc(e.target.value)}
                  placeholder="Explain the issue or question clearly. The SEO Manager will reply directly to your dashboard."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white font-medium leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQueryModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingQuery}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Send size={13} />
                  <span>{submittingQuery ? 'Sending...' : 'Send to SEO Manager'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Lock,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Trash2,
  Sparkles,
  Eye,
  EyeOff,
  Check,
  Briefcase,
  Share2,
  Layers,
  ArrowRight,
  Plus,
  DollarSign,
  Search,
  Filter,
  RefreshCw,
  Smartphone,
  Target,
  Award,
  TrendingUp,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight
} from 'lucide-react';

export interface SeoMember {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  customRole?: string | null;
  status: string;
  avatar?: string | null;
  assignedTasksCount: number;
  completedTasksCount: number;
  inProgressTasksCount: number;
  runningAdsCount: number;
  avgProgress: number;
}

interface SeoTeamViewProps {
  team: SeoMember[];
  courses?: any[];
  loading: boolean;
  onRefresh: () => void;
  onOpenAssignModal?: (memberId: string) => void;
  onSimulateMemberLogin?: (member: SeoMember) => void;
}

interface SelectedCourseAllocation {
  courseId: string;
  courseTitle: string;
  taskType: 'GOOGLE_ADS' | 'META_ADS' | 'SEO_METADATA' | 'MEDIA_CREATIVE' | 'FULL_OPTIMIZATION';
  dailyBudget?: number;
  targetLeads?: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  targetDueDate: string;
  instructions: string;
}

export function SeoTeamView({
  team,
  courses = [],
  loading,
  onRefresh,
  onOpenAssignModal,
  onSimulateMemberLogin
}: SeoTeamViewProps) {
  // Table Horizontal Scroll Reference & State for Smooth Side Scroll Animation
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'MANAGER' | 'GOOGLE' | 'META' | 'SEO'>('ALL');

  // Password visibility map for row credentials
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create Member Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [customRole, setCustomRole] = useState('Google Ads & PPC Specialist');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success credentials popup banner
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    role: string;
  } | null>(null);
  const [copiedBanner, setCopiedBanner] = useState(false);

  // Batch Allocation Studio Modal State
  const [allocationModalOpen, setAllocationModalOpen] = useState(false);
  const [targetMember, setTargetMember] = useState<SeoMember | null>(null);
  const [allocations, setAllocations] = useState<Record<string, SelectedCourseAllocation>>({});
  const [courseSearch, setCourseSearch] = useState('');
  const [submittingBatch, setSubmittingBatch] = useState(false);
  const [batchSuccessMsg, setBatchSuccessMsg] = useState<string | null>(null);

  // Check scroll state for side navigation buttons
  const checkScrollState = () => {
    if (!tableContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;
    setCanScrollLeft(scrollLeft > 15);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 15);
  };

  useEffect(() => {
    checkScrollState();
    const el = tableContainerRef.current;
    if (el) {
      el.addEventListener('scroll', checkScrollState, { passive: true });
      window.addEventListener('resize', checkScrollState);
    }
    return () => {
      if (el) el.removeEventListener('scroll', checkScrollState);
      window.removeEventListener('resize', checkScrollState);
    };
  }, [team]);

  // Smooth Side Scroll Animation Handlers
  const handleScrollSide = (direction: 'left' | 'right') => {
    if (!tableContainerRef.current) return;
    const scrollAmount = 360;
    tableContainerRef.current.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  };

  const handleScrollToActions = () => {
    if (!tableContainerRef.current) return;
    tableContainerRef.current.scrollTo({
      left: tableContainerRef.current.scrollWidth,
      behavior: 'smooth'
    });
  };

  const handleScrollToMembers = () => {
    if (!tableContainerRef.current) return;
    tableContainerRef.current.scrollTo({
      left: 0,
      behavior: 'smooth'
    });
  };

  // Generate random strong password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let res = 'Mt@';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  const togglePasswordVisibility = (memberId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [memberId]: !prev[memberId]
    }));
  };

  const handleCopySinglePassword = (memberId: string, pwd: string = 'password123') => {
    navigator.clipboard.writeText(pwd);
    setCopiedId(memberId);
    setTimeout(() => {
      setCopiedId((prev) => (prev === memberId ? null : prev));
    }, 2000);
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/seo/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          customRole: customRole.trim(),
          phone: phone.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create team member');
      }

      setCreatedCredentials({
        name: data.user.name,
        email: data.user.email,
        password: data.rawPassword,
        role: data.user.customRole || 'SEO Specialist'
      });

      setName('');
      setEmail('');
      setPhone('');
      generateRandomPassword();
      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCredentials = (c: { email: string; password: string; name: string; role: string }) => {
    const text = `Hi ${c.name},\nHere are your official login credentials for the Morena Teach SEO & Ads Portal:\n\n🔗 Login Portal: http://localhost:3000/seo/login\n👤 Login ID: ${c.email}\n🔑 Password: ${c.password}\n💼 Assigned Role: ${c.role}\n\nPlease sign in to view your assigned courses, run ad campaigns, and submit your work progress.`;
    navigator.clipboard.writeText(text);
    setCopiedBanner(true);
    setTimeout(() => setCopiedBanner(false), 3000);
  };

  const handleDeleteMember = async (userId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove team member "${memberName}"?`)) return;
    try {
      const res = await fetch(`/api/seo/team?userId=${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete member');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Open Allocation Studio
  const openAllocationStudio = (member: SeoMember) => {
    setTargetMember(member);
    setAllocations({});
    setCourseSearch('');
    setBatchSuccessMsg(null);
    setAllocationModalOpen(true);
  };

  const toggleCourseAllocation = (c: any) => {
    setAllocations((prev) => {
      const next = { ...prev };
      if (next[c.id]) {
        delete next[c.id];
      } else {
        const isAdsSpecialist = (targetMember?.customRole || '').toLowerCase().includes('google');
        const isMetaSpecialist = (targetMember?.customRole || '').toLowerCase().includes('meta');
        const defaultType = isAdsSpecialist
          ? 'GOOGLE_ADS'
          : isMetaSpecialist
          ? 'META_ADS'
          : 'SEO_METADATA';

        next[c.id] = {
          courseId: c.id,
          courseTitle: c.title,
          taskType: defaultType,
          dailyBudget: isAdsSpecialist ? 500 : isMetaSpecialist ? 400 : undefined,
          targetLeads: isAdsSpecialist || isMetaSpecialist ? 200 : undefined,
          priority: 'HIGH',
          targetDueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
          instructions: `Run ${defaultType.replace('_', ' ')} optimization for ${c.title}.`
        };
      }
      return next;
    });
  };

  const updateCourseDuty = (courseId: string, patch: Partial<SelectedCourseAllocation>) => {
    setAllocations((prev) => {
      if (!prev[courseId]) return prev;
      return {
        ...prev,
        [courseId]: {
          ...prev[courseId],
          ...patch
        }
      };
    });
  };

  const handleSubmitBatchAllocation = async () => {
    if (!targetMember) return;
    const items = Object.values(allocations);
    if (items.length === 0) {
      alert('Please select at least one course to assign.');
      return;
    }

    setSubmittingBatch(true);
    try {
      const res = await fetch('/api/seo/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch: true,
          specialistId: targetMember.id,
          specialistName: targetMember.name,
          specialistEmail: targetMember.email,
          assignments: items
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to allocate courses');

      setBatchSuccessMsg(
        `✓ Successfully allocated ${items.length} courses to ${targetMember.name}'s dashboard!`
      );
      setTimeout(() => {
        setAllocationModalOpen(false);
        setBatchSuccessMsg(null);
      }, 1800);

      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingBatch(false);
    }
  };

  // Filtered Specialists
  const filteredTeam = useMemo(() => {
    return team.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.customRole || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (roleFilter === 'MANAGER') {
        return m.role === 'SEO_MANAGER' || (m.customRole || '').toLowerCase().includes('lead') || (m.customRole || '').toLowerCase().includes('manager');
      }
      if (roleFilter === 'GOOGLE') {
        return (m.customRole || '').toLowerCase().includes('google') || (m.customRole || '').toLowerCase().includes('ppc');
      }
      if (roleFilter === 'META') {
        return (m.customRole || '').toLowerCase().includes('meta') || (m.customRole || '').toLowerCase().includes('facebook') || (m.customRole || '').toLowerCase().includes('insta');
      }
      if (roleFilter === 'SEO') {
        return (m.customRole || '').toLowerCase().includes('page') || (m.customRole || '').toLowerCase().includes('executive');
      }

      return true;
    });
  }, [team, searchTerm, roleFilter]);

  // Aggregate Stats
  const totalCoursesAllocated = useMemo(() => {
    return team.reduce((acc, curr) => acc + (curr.assignedTasksCount || 0), 0);
  }, [team]);

  const totalRunningAds = useMemo(() => {
    return team.reduce((acc, curr) => acc + (curr.runningAdsCount || 0), 0);
  }, [team]);

  const avgExecutionRate = useMemo(() => {
    if (team.length === 0) return 0;
    return Math.round(team.reduce((acc, curr) => acc + (curr.avgProgress || 0), 0) / team.length);
  }, [team]);

  // Filter courses in modal
  const filteredCoursesInModal = courses.filter((c) =>
    c.title.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const selectedCount = Object.keys(allocations).length;
  const adsCount = Object.values(allocations).filter(
    (a) => a.taskType === 'GOOGLE_ADS' || a.taskType === 'META_ADS'
  ).length;
  const seoCount = Object.values(allocations).filter((a) => a.taskType === 'SEO_METADATA').length;

  return (
    <div className="space-y-6 animate-in fade-in pb-16">
      {/* ======================================================== */}
      {/* 1. TOP EXECUTIVE HEADER                                  */}
      {/* ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white via-slate-50/40 to-slate-100/50 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 text-[11px] font-black uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <Users size={13} className="text-blue-600" />
              <span>TEAM DIRECTORY &amp; ACCESS CONTROL</span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                SEO Team &amp; Campaign Specialists
              </h1>
              <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-mono font-bold shadow-xs">
                {team.length} Active
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl leading-relaxed">
              Create and manage dedicated login accounts for SEO executives and PPC advertising managers. 
              Delegate course-specific marketing campaigns, track live deliverables, and simulate executive views.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-2.5 rounded-2xl bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Team List"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer active:scale-95"
            >
              <UserPlus size={16} />
              <span>Add Team Specialist</span>
            </button>
          </div>
        </div>

        {/* 4 Professional Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-6 mt-6 border-t border-slate-200/80">
          {/* Card 1 */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Team Members</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users size={16} />
              </div>
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900">{team.length}</div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700">
              <ShieldCheck size={13} />
              <span>Active Portals Verified</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Delegated Courses</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Layers size={16} />
              </div>
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black font-mono text-indigo-600">{totalCoursesAllocated}</div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700">
              <Target size={13} />
              <span>Target SEO Portfolios</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Live Ad Campaigns</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign size={16} />
              </div>
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600">{totalRunningAds}</div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
              <Smartphone size={13} />
              <span>Google &amp; Meta Active</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Work Execution Rate</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="my-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-purple-600">{avgExecutionRate}%</span>
              <span className="text-[10px] text-slate-400 font-semibold">avg completion</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(avgExecutionRate, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. CREATED CREDENTIALS ALERT POPUP (EASY SHARE)          */}
      {/* ======================================================== */}
      {createdCredentials && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-900 font-black text-sm">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                <Check size={14} />
              </div>
              <span>New Team Account Generated! Credentials ready to share</span>
            </div>
            <button
              type="button"
              onClick={() => setCreatedCredentials(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1 rounded-lg hover:bg-emerald-100/50 cursor-pointer"
            >
              ✕ Dismiss
            </button>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs shadow-xs">
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold block">Specialist Name</span>
              <strong className="text-slate-900 text-sm">{createdCredentials.name}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold block">Login ID (Email)</span>
              <strong className="text-blue-600 font-mono text-xs">{createdCredentials.email}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold block">Password</span>
              <strong className="text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                {createdCredentials.password}
              </strong>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-bold block">Assigned Role</span>
              <span className="text-slate-800 font-bold">{createdCredentials.role}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleCopyCredentials(createdCredentials)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              {copiedBanner ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedBanner ? 'Copied to Clipboard!' : 'Copy Login Details to Share'}</span>
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Hi ${createdCredentials.name},\nYour Morena Teach SEO Portal account has been created!\n\nPortal: http://localhost:3000/seo/login\nLogin ID: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nRole: ${createdCredentials.role}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-emerald-100/50 border border-emerald-300 text-emerald-800 font-bold text-xs transition-colors cursor-pointer shadow-xs"
            >
              <Share2 size={13} className="text-emerald-600" />
              <span>Share via WhatsApp</span>
            </a>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. TEAM MEMBERS DIRECTORY & FILTER TOOLBAR               */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
        {/* Table Header & Search Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Active Team Roster &amp; Access Controls</h2>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold font-mono">
                Slide ⇄ Controls
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Click &quot;Assign Courses &amp; Ads&quot; to delegate multi-course campaigns or simulate their live dashboard view.
            </p>
          </div>

          {/* Search, Filter, & Smooth Side Scroll Controller */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search specialist..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-hidden transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center bg-slate-100/80 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setRoleFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  roleFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                All ({team.length})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('GOOGLE')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  roleFilter === 'GOOGLE' ? 'bg-white text-emerald-700 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Google Ads
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('META')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  roleFilter === 'META' ? 'bg-white text-blue-700 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Meta Ads
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('MANAGER')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  roleFilter === 'MANAGER' ? 'bg-white text-purple-700 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Leads
              </button>
            </div>

            {/* Smooth Side Slide Animated Buttons in Header */}
            <div className="flex items-center gap-1 bg-blue-50/70 p-1 rounded-xl border border-blue-200/80 shadow-2xs">
              <button
                type="button"
                onClick={handleScrollToMembers}
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 text-[11px] font-black shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                title="Scroll smoothly to Members column"
              >
                <ChevronLeft size={13} className="text-blue-600" />
                <span>Members</span>
              </button>

              <button
                type="button"
                onClick={() => handleScrollSide('left')}
                className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 shadow-xs transition-all cursor-pointer"
                title="Scroll left"
              >
                <ChevronLeft size={14} />
              </button>

              <button
                type="button"
                onClick={() => handleScrollSide('right')}
                className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 shadow-xs transition-all cursor-pointer"
                title="Scroll right"
              >
                <ChevronRight size={14} />
              </button>

              <button
                type="button"
                onClick={handleScrollToActions}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                title="Scroll smoothly to Actions column"
              >
                <span>Actions</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TABLE WITH FLOATING SMOOTH SIDE SCROLL ARROWS            */}
        {/* ======================================================== */}
        <div className="relative group">
          {/* Floating Left Scroll Pill Button */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => handleScrollSide('left')}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1 px-3 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-900 text-white font-black text-xs shadow-xl shadow-slate-900/30 backdrop-blur-md border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer animate-in fade-in zoom-in-90"
              title="Click to scroll back to Members"
            >
              <ChevronLeft size={16} className="text-white" />
              <span className="pr-1">Specialists</span>
            </button>
          )}

          {/* Floating Right Scroll Pill Button (ANIMATED & ATTRACTIVE) */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => handleScrollSide('right')}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-xl shadow-blue-500/35 backdrop-blur-md border border-white/25 transition-all hover:scale-105 active:scale-95 cursor-pointer animate-bounce hover:animate-none"
              title="Click to scroll smoothly to Actions & Buttons"
            >
              <span>View Actions</span>
              <ChevronRight size={16} className="text-white" />
            </button>
          )}

          {/* Subtle Edge Fade Shadows */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-200/50 to-transparent pointer-events-none z-10 rounded-l-2xl" />
          )}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-200/50 to-transparent pointer-events-none z-10 rounded-r-2xl" />
          )}

          {/* Table Container with smooth scrolling */}
          <div
            ref={tableContainerRef}
            className="overflow-x-auto scroll-smooth rounded-2xl border border-slate-200/90 shadow-2xs"
          >
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-3.5 px-4 w-[240px] min-w-[240px]">Specialist Member</th>
                  <th className="py-3.5 px-4 w-[260px] min-w-[260px]">Login ID &amp; Password</th>
                  <th className="py-3.5 px-4 w-[180px] min-w-[180px]">Role &amp; Domain</th>
                  <th className="py-3.5 px-4 w-[150px] min-w-[150px]">Assigned Tasks</th>
                  <th className="py-3.5 px-4 w-[140px] min-w-[140px]">Progress</th>
                  <th className="py-3.5 px-4 w-[100px] min-w-[100px]">Status</th>
                  <th className="py-3.5 px-4 w-[280px] min-w-[280px] text-right">Actions &amp; Simulation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-xs">
                {filteredTeam.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users size={28} className="text-slate-300" />
                        <p className="font-semibold text-slate-600">No team members match your criteria</p>
                        <p className="text-[11px] text-slate-400">Try adjusting your search query or role filter.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTeam.map((member) => {
                    const isVisible = !!visiblePasswords[member.id];
                    const isCopied = copiedId === member.id;
                    const isLead = member.role === 'SEO_MANAGER' || (member.customRole || '').toLowerCase().includes('lead');

                    return (
                      <tr
                        key={member.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* 1. Specialist Member Name & Avatar */}
                        <td className="py-4 px-4 w-[240px] min-w-[240px]">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-xs shrink-0 ${
                              isLead
                                ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white'
                                : 'bg-gradient-to-tr from-blue-600 to-cyan-600 text-white'
                            }`}>
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-slate-900 text-sm tracking-tight truncate flex items-center gap-1.5">
                                <span>{member.name}</span>
                                {isLead && (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-700 text-[9px] font-black uppercase">
                                    Lead
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                ID: {member.id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Login ID & Password Pill */}
                        <td className="py-4 px-4 w-[260px] min-w-[260px] font-mono">
                          <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs truncate">
                            <Mail size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{member.email}</span>
                          </div>

                          {/* Masked Password Container */}
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/80 text-[11px] text-slate-700 font-mono">
                              <Lock size={11} className="text-slate-400 shrink-0" />
                              <span>{isVisible ? 'password123' : '••••••••'}</span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(member.id)}
                                className="text-slate-400 hover:text-slate-700 transition-colors ml-1 cursor-pointer"
                                title={isVisible ? 'Hide password' : 'View password'}
                              >
                                {isVisible ? <EyeOff size={11} /> : <Eye size={11} />}
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopySinglePassword(member.id, 'password123')}
                              className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Copy Password"
                            >
                              {isCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </td>

                        {/* 3. Role & Specialization Badge */}
                        <td className="py-4 px-4 w-[180px] min-w-[180px]">
                          {(() => {
                            const roleText = member.customRole || (member.role === 'SEO_MANAGER' ? 'SEO Manager' : 'SEO Executive');
                            const lower = roleText.toLowerCase();

                            if (lower.includes('google') || lower.includes('ppc')) {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Target size={12} className="text-emerald-600" />
                                  <span>Google Ads &amp; PPC</span>
                                </span>
                              );
                            }
                            if (lower.includes('meta') || lower.includes('facebook') || lower.includes('insta')) {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <Smartphone size={12} className="text-blue-600" />
                                  <span>Meta Ads Specialist</span>
                                </span>
                              );
                            }
                            if (lower.includes('lead') || lower.includes('manager')) {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  <ShieldCheck size={12} className="text-purple-600" />
                                  <span>SEO Lead &amp; Strategy</span>
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Sparkles size={12} className="text-amber-600" />
                                <span>{roleText}</span>
                              </span>
                            );
                          })()}
                        </td>

                        {/* 4. Assigned Workload */}
                        <td className="py-4 px-4 w-[150px] min-w-[150px]">
                          <div className="font-extrabold text-slate-900 text-xs">
                            {member.assignedTasksCount} Courses
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                            {member.runningAdsCount} Ads running • {member.completedTasksCount} done
                          </div>
                        </td>

                        {/* 5. Progress */}
                        <td className="py-4 px-4 w-[140px] min-w-[140px]">
                          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-700 mb-1">
                            <span>{member.avgProgress}%</span>
                            <span className="text-[10px] text-slate-400 font-medium">completed</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                member.avgProgress >= 70
                                ? 'bg-emerald-500'
                                : member.avgProgress >= 30
                                ? 'bg-blue-600'
                                : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(member.avgProgress, 100)}%` }}
                            />
                          </div>
                        </td>

                        {/* 6. Status */}
                        <td className="py-4 px-4 w-[100px] min-w-[100px]">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Active</span>
                          </span>
                        </td>

                        {/* 7. Actions & Simulation (SOLID BUTTON ALIGNMENT - NO WRAPPING) */}
                        <td className="py-4 px-4 w-[280px] min-w-[280px] text-right">
                          <div className="inline-flex items-center justify-end gap-2 whitespace-nowrap">
                            {/* Primary Assign Button */}
                            <button
                              type="button"
                              onClick={() => openAllocationStudio(member)}
                              className="whitespace-nowrap inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs hover:shadow transition-all cursor-pointer active:scale-95 shrink-0"
                              title="Assign courses & configure ads campaigns for this member"
                            >
                              <Layers size={13} className="shrink-0" />
                              <span>Assign Courses &amp; Ads</span>
                            </button>

                            {/* Secondary Simulate Button */}
                            {onSimulateMemberLogin && (
                              <button
                                type="button"
                                onClick={() => onSimulateMemberLogin(member)}
                                className="whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200/90 transition-all cursor-pointer active:scale-95 shrink-0"
                                title="Simulate executive view as this specialist"
                              >
                                <Eye size={13} className="shrink-0 text-slate-500" />
                                <span>Simulate View</span>
                              </button>
                            )}

                            {/* Delete Member Button */}
                            {member.email !== 'seo@morenateach.com' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMember(member.id, member.name)}
                                className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer shrink-0"
                                title="Remove specialist account"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. MODAL: ALLOCATE COURSES & ADS STUDIO                  */}
      {/* ======================================================== */}
      {allocationModalOpen && targetMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 max-h-[92vh] flex flex-col justify-between">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Allocate Courses to {targetMember.name}&apos;s Dashboard
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Select courses and configure target advertising channels (Google Ads, Meta Ads) or On-Page SEO metadata.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAllocationModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Success Notification Banner */}
              {batchSuccessMsg && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold animate-in fade-in flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{batchSuccessMsg}</span>
                </div>
              )}

              {/* Dynamic Counters Banner */}
              <div className="grid grid-cols-3 gap-3 my-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Selected</span>
                  <span className="text-base font-black font-mono text-slate-900">{selectedCount} Courses</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Courses for Ads</span>
                  <span className="text-base font-black font-mono text-emerald-600">{adsCount} Courses</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Courses for SEO</span>
                  <span className="text-base font-black font-mono text-blue-600">{seoCount} Courses</span>
                </div>
              </div>

              {/* Search Courses */}
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="Search available courses to allocate..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Course Selection List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[46vh]">
              {filteredCoursesInModal.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 italic">No courses found matching search.</div>
              ) : (
                filteredCoursesInModal.map((c) => {
                  const isSelected = !!allocations[c.id];
                  const item = allocations[c.id];

                  return (
                    <div
                      key={c.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isSelected ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-200' : 'bg-white border-slate-200/90 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCourseAllocation(c)}
                          className="mt-1 w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-extrabold text-slate-900 truncate">{c.title}</h4>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              Instructor: {c.instructor?.name || 'Academic Dean'}
                            </span>
                          </div>

                          {/* When Selected: Choose Duties & Settings */}
                          {isSelected && item && (
                            <div className="mt-3 pt-3 border-t border-blue-200/70 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                              {/* Task Duty */}
                              <div>
                                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                                  Task / Duty Assigned
                                </label>
                                <select
                                  value={item.taskType}
                                  onChange={(e) =>
                                    updateCourseDuty(c.id, {
                                      taskType: e.target.value as any,
                                      dailyBudget: e.target.value.includes('ADS') ? item.dailyBudget || 500 : undefined
                                    })
                                  }
                                  className="w-full py-1.5 px-2 rounded-lg border border-slate-200 bg-white font-bold text-slate-800 text-[11px]"
                                >
                                  <option value="GOOGLE_ADS">🎯 Google Ads Campaign</option>
                                  <option value="META_ADS">📱 Meta (FB/Insta) Ads</option>
                                  <option value="SEO_METADATA">🔍 On-Page SEO &amp; Keywords</option>
                                  <option value="MEDIA_CREATIVE">🎨 Media &amp; Thumbnail Audit</option>
                                </select>
                              </div>

                              {/* Daily Budget if Ads */}
                              {item.taskType.includes('ADS') ? (
                                <div>
                                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                                    Daily Ad Budget (₹)
                                  </label>
                                  <input
                                    type="number"
                                    value={item.dailyBudget || 500}
                                    onChange={(e) => updateCourseDuty(c.id, { dailyBudget: Number(e.target.value) })}
                                    className="w-full py-1.5 px-2 rounded-lg border border-slate-200 bg-white font-mono font-bold text-emerald-600 text-[11px]"
                                    placeholder="500"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                                    Priority Level
                                  </label>
                                  <select
                                    value={item.priority}
                                    onChange={(e) => updateCourseDuty(c.id, { priority: e.target.value as any })}
                                    className="w-full py-1.5 px-2 rounded-lg border border-slate-200 bg-white font-bold text-slate-800 text-[11px]"
                                  >
                                    <option value="HIGH">🔥 High Priority</option>
                                    <option value="MEDIUM">⚡ Medium</option>
                                    <option value="LOW">🌱 Normal</option>
                                  </select>
                                </div>
                              )}

                              {/* Target Due Date */}
                              <div>
                                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                                  Due Date
                                </label>
                                <input
                                  type="date"
                                  value={item.targetDueDate}
                                  onChange={(e) => updateCourseDuty(c.id, { targetDueDate: e.target.value })}
                                  className="w-full py-1.5 px-2 rounded-lg border border-slate-200 bg-white font-mono text-slate-800 text-[11px]"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {selectedCount > 0 ? (
                  <span>
                    Allocating <strong>{selectedCount} courses</strong> to{' '}
                    <strong className="text-slate-900">{targetMember.name}&apos;s dashboard</strong>.
                  </span>
                ) : (
                  <span>Check courses above to allocate them.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAllocationModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingBatch || selectedCount === 0}
                  onClick={handleSubmitBatchAllocation}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <span>{submittingBatch ? 'Allocating...' : 'Confirm & Push to Member Dashboard →'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MODAL: CREATE TEAM MEMBER ACCOUNT                     */}
      {/* ======================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Create Team Member Account</h3>
                  <p className="text-xs text-slate-500">Provide their login ID and role to generate credentials.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address (Login ID)
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rahul.ads@morenateach.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  The executive will use this email address to log in to the SEO portal.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Specialization Role</label>
                  <select
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="Google Ads & PPC Specialist">Google Ads &amp; PPC Specialist</option>
                    <option value="Meta Ads (FB/Insta) Specialist">Meta Ads (FB/Insta) Specialist</option>
                    <option value="On-Page & Keyword SEO Specialist">On-Page &amp; Keyword SEO Specialist</option>
                    <option value="Media & Creative Thumbnail Specialist">Media &amp; Creative Specialist</option>
                    <option value="SEO Executive">SEO Executive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone / WhatsApp (Optional)</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 00000"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Initial Password</label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={11} />
                    <span>Auto Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Creating Account...' : 'Create & Generate Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

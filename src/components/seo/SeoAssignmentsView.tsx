'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Megaphone,
  Sparkles,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Calendar,
  User,
  Sliders,
  ExternalLink,
  Trash2,
  Check,
  Edit3,
  UserCheck,
  Flame,
  Hourglass,
  CheckSquare,
  Target,
  Smartphone,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  X,
  Eye,
  RefreshCw,
  Users
} from 'lucide-react';
import { SeoTaskAssignment } from '@/app/api/seo/assignments/route';

interface SeoAssignmentsViewProps {
  assignments: SeoTaskAssignment[];
  courses: any[];
  team: any[];
  loading: boolean;
  onRefresh: () => void;
  onOpenAuditCourse?: (courseId: string) => void;
  onOpenQueryModal?: (courseId: string, courseTitle: string) => void;
  preselectedSpecialistId?: string | null;
  onSimulateMemberLogin?: (member: any) => void;
}

export function SeoAssignmentsView({
  assignments,
  courses,
  team,
  loading,
  onRefresh,
  onOpenAuditCourse,
  onOpenQueryModal,
  preselectedSpecialistId,
  onSimulateMemberLogin
}: SeoAssignmentsViewProps) {
  // Member Selector State: 'ALL' or a specific member ID
  const [selectedMemberId, setSelectedMemberId] = useState<string>(preselectedSpecialistId || 'ALL');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const memberDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target as Node)) {
        setIsMemberDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Workload Status Tab Filter: 'ALL' | 'IN_PROGRESS' | 'PENDING' | 'COMPLETED'
  const [statusTab, setStatusTab] = useState<'ALL' | 'IN_PROGRESS' | 'PENDING' | 'COMPLETED'>('ALL');

  // Modals
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedAssignmentForUpdate, setSelectedAssignmentForUpdate] = useState<SeoTaskAssignment | null>(null);

  // General Filter States
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state for creating assignment
  const [formCourseId, setFormCourseId] = useState('');
  const [formSpecialistId, setFormSpecialistId] = useState(preselectedSpecialistId || '');
  const [formTaskType, setFormTaskType] = useState<SeoTaskAssignment['taskType']>('GOOGLE_ADS');
  const [formPriority, setFormPriority] = useState<SeoTaskAssignment['priority']>('HIGH');
  const [formDueDate, setFormDueDate] = useState('');
  const [formDailyBudget, setFormDailyBudget] = useState('500');
  const [formTargetLeads, setFormTargetLeads] = useState('250');
  const [formInstructions, setFormInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state for updating progress
  const [updateProgress, setUpdateProgress] = useState(50);
  const [updateStatus, setUpdateStatus] = useState<SeoTaskAssignment['status']>('IN_PROGRESS');
  const [updateNote, setUpdateNote] = useState('');
  const [updating, setUpdating] = useState(false);

  // Initialize defaults on modal open
  const openNewAssignModal = (defaultSpecialistId?: string) => {
    setFormCourseId(courses[0]?.id || '');
    setFormSpecialistId(defaultSpecialistId || (selectedMemberId !== 'ALL' ? selectedMemberId : team[0]?.id) || '');
    setFormTaskType('GOOGLE_ADS');
    setFormPriority('HIGH');
    setFormDueDate(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0]);
    setFormDailyBudget('500');
    setFormTargetLeads('200');
    setFormInstructions('Execute high-intent search ads with localized keywords and daily bid optimization.');
    setFormError(null);
    setAssignModalOpen(true);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const selectedCourse = courses.find((c) => c.id === formCourseId);
      const selectedSpecialist = team.find((t) => t.id === formSpecialistId);

      const res = await fetch('/api/seo/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: formCourseId,
          courseTitle: selectedCourse?.title || 'Selected Course',
          specialistId: formSpecialistId,
          specialistName: selectedSpecialist?.name || 'Specialist',
          specialistEmail: selectedSpecialist?.email || '',
          taskType: formTaskType,
          priority: formPriority,
          targetDueDate: formDueDate,
          dailyBudget: formDailyBudget ? Number(formDailyBudget) : undefined,
          targetLeads: formTargetLeads ? Number(formTargetLeads) : undefined,
          instructions: formInstructions
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create assignment');

      setAssignModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentForUpdate) return;
    setUpdating(true);

    try {
      const res = await fetch('/api/seo/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: selectedAssignmentForUpdate.id,
          status: updateStatus,
          progress: Number(updateProgress),
          latestNote: updateNote.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update progress');

      setUpdateModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleQuickApprove = async (assignment: SeoTaskAssignment) => {
    try {
      const res = await fetch('/api/seo/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: assignment.id,
          status: 'COMPLETED',
          progress: 100,
          latestNote: 'Deliverable approved & verified by SEO Manager.'
        })
      });
      if (!res.ok) throw new Error('Failed to approve task');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await fetch(`/api/seo/assignments?assignmentId=${assignmentId}`, { method: 'DELETE' });
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Currently Selected Member Object
  const currentMember = useMemo(() => {
    if (selectedMemberId === 'ALL') return null;
    return team.find((m) => m.id === selectedMemberId) || null;
  }, [team, selectedMemberId]);

  // Team filtered for dropdown search
  const filteredTeamForDropdown = useMemo(() => {
    if (!dropdownSearch.trim()) return team;
    const q = dropdownSearch.toLowerCase();
    return team.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (m.customRole || '').toLowerCase().includes(q)
    );
  }, [team, dropdownSearch]);

  // Tasks belonging to selected member (or all)
  const memberScopedAssignments = useMemo(() => {
    if (selectedMemberId === 'ALL') return assignments;
    return assignments.filter((a) => a.specialistId === selectedMemberId);
  }, [assignments, selectedMemberId]);

  // Member-specific Workload Metrics
  const memberMetrics = useMemo(() => {
    const list = memberScopedAssignments;
    const inProgress = list.filter((a) => a.status === 'IN_PROGRESS' && a.progress < 100);
    const pending = list.filter((a) => a.status === 'PENDING' || a.status === 'SUBMITTED' || a.status === 'BLOCKED');
    const completed = list.filter((a) => a.status === 'COMPLETED' || a.progress === 100);
    const avgProg = list.length > 0 ? Math.round(list.reduce((acc, curr) => acc + (curr.progress || 0), 0) / list.length) : 0;

    return {
      total: list.length,
      inProgressCount: inProgress.length,
      pendingCount: pending.length,
      completedCount: completed.length,
      avgProgress: avgProg
    };
  }, [memberScopedAssignments]);

  // Filtered Task List for Display
  const displayedAssignments = useMemo(() => {
    return memberScopedAssignments.filter((a) => {
      // Status Tab filter:
      if (statusTab === 'IN_PROGRESS') {
        if (a.status !== 'IN_PROGRESS' || a.progress >= 100) return false;
      } else if (statusTab === 'PENDING') {
        if (a.status !== 'PENDING' && a.status !== 'SUBMITTED' && a.status !== 'BLOCKED') return false;
      } else if (statusTab === 'COMPLETED') {
        if (a.status !== 'COMPLETED' && a.progress < 100) return false;
      }

      // Task Type filter
      if (filterType !== 'ALL' && a.taskType !== filterType) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          a.courseTitle.toLowerCase().includes(q) ||
          a.specialistName.toLowerCase().includes(q) ||
          a.instructions.toLowerCase().includes(q) ||
          (a.latestNote || '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [memberScopedAssignments, statusTab, filterType, searchQuery]);

  const getTaskTypeBadge = (type: SeoTaskAssignment['taskType']) => {
    switch (type) {
      case 'GOOGLE_ADS':
        return { label: '🎯 Google Ads Campaign', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'META_ADS':
        return { label: '📱 Meta (FB/Insta) Ads', color: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'SEO_METADATA':
        return { label: '🔍 On-Page SEO & Keywords', color: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'MEDIA_CREATIVE':
        return { label: '🎨 Thumbnail & Video Audit', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      default:
        return { label: '🚀 Full SEO & Paid Ads', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
    }
  };

  const getStatusBadge = (status: SeoTaskAssignment['status'], progress: number) => {
    if (status === 'COMPLETED' || progress === 100) {
      return {
        label: 'Completed & Verified',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500'
      };
    }
    if (status === 'SUBMITTED') {
      return {
        label: 'Submitted for Review',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500'
      };
    }
    if (status === 'BLOCKED') {
      return {
        label: 'Blocked / Issue Reported',
        color: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500'
      };
    }
    if (status === 'IN_PROGRESS') {
      return {
        label: 'In Progress (Active)',
        color: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500 animate-pulse'
      };
    }
    return {
      label: 'Pending / Queued',
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-400'
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-16">
      {/* ======================================================== */}
      {/* 1. TOP HEADER & QUICK STATS                              */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold uppercase tracking-wider mb-2">
              <Layers size={13} className="text-blue-600" />
              <span>TEAM WORKLOAD &amp; TASK MANAGEMENT</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Task Management &amp; Specialist Workload
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 font-mono">
                {assignments.length} Tasks Total
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Select any team specialist below to inspect what they are currently working on, what is pending, and their real-time execution progress.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs cursor-pointer transition-colors"
              title="Refresh Tasks"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-blue-600' : ''} />
            </button>

            <button
              type="button"
              onClick={() => openNewAssignModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus size={15} />
              <span>Assign Course to Member</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. TEAM SPECIALIST SELECTOR DROPDOWN                      */}
        {/* ======================================================== */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 font-mono">
                Select Specialist to Inspect Workload:
              </span>
              {selectedMemberId !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedMemberId('ALL')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <X size={13} />
                  <span>Reset to All Specialists</span>
                </button>
              )}
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {team.length} Specialists in Team
            </span>
          </div>

          {/* Member Dropdown Container */}
          <div className="relative max-w-xl" ref={memberDropdownRef}>
            {/* Trigger Button */}
            <button
              type="button"
              onClick={() => setIsMemberDropdownOpen((prev) => !prev)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 bg-white hover:bg-slate-50 border rounded-2xl transition-all cursor-pointer shadow-xs text-left group ${
                isMemberDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {currentMember ? (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {currentMember.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900 truncate">
                          {currentMember.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold shrink-0">
                          {currentMember.customRole || 'Specialist'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="truncate">{currentMember.email}</span>
                        <span className="text-slate-300">•</span>
                        {memberMetrics.inProgressCount > 0 ? (
                          <span className="text-amber-600 font-bold shrink-0">{memberMetrics.inProgressCount} active tasks</span>
                        ) : memberMetrics.pendingCount > 0 ? (
                          <span className="text-slate-600 font-medium shrink-0">{memberMetrics.pendingCount} pending</span>
                        ) : (
                          <span className="text-emerald-600 font-medium shrink-0">All tasks completed</span>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-950 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                      <Users size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900">
                          All Specialists
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold">
                          {team.length} Members • {assignments.length} Tasks
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        Viewing aggregated workload &amp; status across entire SEO team
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-blue-600 group-hover:text-blue-700 hidden sm:inline-block">
                  Change Specialist
                </span>
                <div className={`p-1.5 rounded-lg bg-slate-100 group-hover:bg-blue-50 text-slate-500 group-hover:text-blue-600 transition-transform ${isMemberDropdownOpen ? 'rotate-180' : ''}`}>
                  <ChevronDown size={16} />
                </div>
              </div>
            </button>

            {/* Floating Dropdown Menu */}
            {isMemberDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Search Bar inside Dropdown */}
                <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={dropdownSearch}
                      onChange={(e) => setDropdownSearch(e.target.value)}
                      placeholder="Search specialist by name or role..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
                  {/* Option 1: ALL SPECIALISTS */}
                  {(!dropdownSearch.trim() || 'all specialists entire team'.includes(dropdownSearch.toLowerCase())) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMemberId('ALL');
                        setIsMemberDropdownOpen(false);
                        setDropdownSearch('');
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                        selectedMemberId === 'ALL'
                          ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          selectedMemberId === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          <Users size={15} />
                        </div>
                        <div>
                          <div className="text-xs font-bold flex items-center gap-2">
                            <span>All Specialists</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
                              {assignments.length} Tasks
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Entire team combined workload
                          </div>
                        </div>
                      </div>
                      {selectedMemberId === 'ALL' && <Check size={16} className="text-blue-600 shrink-0" />}
                    </button>
                  )}

                  {/* Group Label */}
                  <div className="px-2.5 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                    Team Specialists ({filteredTeamForDropdown.length})
                  </div>

                  {/* Team Members */}
                  {filteredTeamForDropdown.map((member) => {
                    const isSelected = selectedMemberId === member.id;
                    const memberTasks = assignments.filter((a) => a.specialistId === member.id);
                    const inProgress = memberTasks.filter((a) => a.status === 'IN_PROGRESS' && a.progress < 100).length;
                    const pending = memberTasks.filter((a) => a.status === 'PENDING' || a.status === 'SUBMITTED' || a.status === 'BLOCKED').length;

                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setSelectedMemberId(member.id);
                          setIsMemberDropdownOpen(false);
                          setDropdownSearch('');
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white'
                          }`}>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate flex items-center gap-1.5">
                              <span className="truncate">{member.name}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-normal shrink-0">
                                {member.customRole || 'Specialist'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate flex items-center gap-2 mt-0.5">
                              <span>{member.email}</span>
                              <span className="text-slate-300">•</span>
                              {inProgress > 0 ? (
                                <span className="text-amber-600 font-semibold">{inProgress} active</span>
                              ) : pending > 0 ? (
                                <span className="text-slate-500">{pending} pending</span>
                              ) : (
                                <span className="text-slate-400">0 active</span>
                              )}
                              <span className="text-slate-300">•</span>
                              <span>{memberTasks.length} tasks</span>
                            </div>
                          </div>
                        </div>

                        {isSelected && <Check size={16} className="text-blue-600 shrink-0 ml-2" />}
                      </button>
                    );
                  })}

                  {filteredTeamForDropdown.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No specialist matching &quot;{dropdownSearch}&quot;
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. MEMBER DOSSIER CARD (WHAT THEY'RE WORKING ON / STATUS) */}
      {/* ======================================================== */}
      {currentMember ? (
        <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 animate-in fade-in">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Specialist Profile Details */}
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-lg font-black flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                {currentMember.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">{currentMember.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                    {currentMember.customRole || 'SEO Specialist'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Active</span>
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                  <span>{currentMember.email}</span>
                  {currentMember.phone && <span>• {currentMember.phone}</span>}
                </div>
              </div>
            </div>

            {/* Manager Quick Actions for this Member */}
            <div className="flex items-center gap-2">
              {onSimulateMemberLogin && (
                <button
                  type="button"
                  onClick={() => onSimulateMemberLogin(currentMember)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs transition-all cursor-pointer"
                  title="Simulate view as this specialist"
                >
                  <Eye size={14} className="text-slate-500" />
                  <span>Simulate Dashboard</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => openNewAssignModal(currentMember.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>Assign Course to {currentMember.name.split(' ')[0]}</span>
              </button>
            </div>
          </div>

          {/* 4 Workload Metric Cards for this Member */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {/* Box 1: In Progress */}
            <div
              onClick={() => setStatusTab('IN_PROGRESS')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                statusTab === 'IN_PROGRESS'
                  ? 'bg-amber-100/70 border-amber-300 ring-2 ring-amber-400'
                  : 'bg-white hover:bg-amber-50/50 border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between text-amber-700 font-bold text-[10px] uppercase">
                <span>Working On (Active)</span>
                <Flame size={14} className="text-amber-500" />
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                {memberMetrics.inProgressCount}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Tasks actively in progress</div>
            </div>

            {/* Box 2: Pending Deliverables */}
            <div
              onClick={() => setStatusTab('PENDING')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                statusTab === 'PENDING'
                  ? 'bg-blue-100/70 border-blue-300 ring-2 ring-blue-400'
                  : 'bg-white hover:bg-blue-50/50 border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between text-blue-700 font-bold text-[10px] uppercase">
                <span>Pending / Review</span>
                <Hourglass size={14} className="text-blue-500" />
              </div>
              <div className="text-2xl font-black font-mono text-blue-600 mt-1">
                {memberMetrics.pendingCount}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Submitted / In queue</div>
            </div>

            {/* Box 3: Completed */}
            <div
              onClick={() => setStatusTab('COMPLETED')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                statusTab === 'COMPLETED'
                  ? 'bg-emerald-100/70 border-emerald-300 ring-2 ring-emerald-400'
                  : 'bg-white hover:bg-emerald-50/50 border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between text-emerald-700 font-bold text-[10px] uppercase">
                <span>Completed Tasks</span>
                <CheckCircle2 size={14} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
                {memberMetrics.completedCount}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Approved &amp; verified</div>
            </div>

            {/* Box 4: Execution Rate */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80">
              <div className="flex items-center justify-between text-purple-700 font-bold text-[10px] uppercase">
                <span>Execution Rate</span>
                <TrendingUp size={14} className="text-purple-500" />
              </div>
              <div className="text-2xl font-black font-mono text-purple-600 mt-1">
                {memberMetrics.avgProgress}%
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(memberMetrics.avgProgress, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Team Wide Summary Banner (When 'All Specialists' is chosen) */
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="p-3 bg-slate-50 rounded-2xl">
            <span className="text-[10px] uppercase font-black text-slate-400 block">Total Delegated Tasks</span>
            <span className="text-2xl font-black font-mono text-slate-900">{assignments.length}</span>
            <span className="text-[10px] text-slate-500 block">Across {team.length} specialists</span>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
            <span className="text-[10px] uppercase font-black text-amber-700 block">Active In Progress</span>
            <span className="text-2xl font-black font-mono text-amber-600">
              {assignments.filter((a) => a.status === 'IN_PROGRESS' && a.progress < 100).length}
            </span>
            <span className="text-[10px] text-slate-500 block">Currently working</span>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100">
            <span className="text-[10px] uppercase font-black text-blue-700 block">Pending Deliverables</span>
            <span className="text-2xl font-black font-mono text-blue-600">
              {assignments.filter((a) => a.status === 'PENDING' || a.status === 'SUBMITTED').length}
            </span>
            <span className="text-[10px] text-slate-500 block">Review queue</span>
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100">
            <span className="text-[10px] uppercase font-black text-emerald-700 block">Completed &amp; Done</span>
            <span className="text-2xl font-black font-mono text-emerald-600">
              {assignments.filter((a) => a.status === 'COMPLETED' || a.progress === 100).length}
            </span>
            <span className="text-[10px] text-slate-500 block">Verified live</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. WORKLOAD STATUS TABS & SEARCH CONTROLS                 */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Status Tabs: What are they working on? What is pending? */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setStatusTab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusTab === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              All Tasks ({memberScopedAssignments.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('IN_PROGRESS')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusTab === 'IN_PROGRESS'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Flame size={13} />
              <span>Currently Working On ({memberMetrics.inProgressCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('PENDING')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusTab === 'PENDING'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
              }`}
            >
              <Hourglass size={13} />
              <span>Pending Deliverables ({memberMetrics.pendingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('COMPLETED')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusTab === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 size={13} />
              <span>Completed ({memberMetrics.completedCount})</span>
            </button>
          </div>

          {/* Right: Task Type Filter & Search Box */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">All Categories</option>
              <option value="GOOGLE_ADS">Google Ads</option>
              <option value="META_ADS">Meta Ads</option>
              <option value="SEO_METADATA">SEO Metadata</option>
            </select>

            <div className="relative w-full sm:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search course or task..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 5. STRUCTURED TASK CARDS / DELIVERABLES GRID             */}
        {/* ======================================================== */}
        {displayedAssignments.length === 0 ? (
          <div className="py-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <CheckSquare size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {statusTab === 'IN_PROGRESS'
                ? 'No Active Work In Progress'
                : statusTab === 'PENDING'
                ? 'No Pending Tasks'
                : 'No Assignments Found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {currentMember
                ? `${currentMember.name} has no tasks matching this filter.`
                : 'No course assignments match the current filter criteria.'}
            </p>
            {currentMember && (
              <button
                type="button"
                onClick={() => openNewAssignModal(currentMember.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                <span>Assign Course to {currentMember.name}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayedAssignments.map((task) => {
              const typeBadge = getTaskTypeBadge(task.taskType);
              const statusBadge = getStatusBadge(task.status, task.progress);
              const isDone = task.status === 'COMPLETED' || task.progress === 100;

              return (
                <div
                  key={task.id}
                  className={`border rounded-3xl p-5 sm:p-6 shadow-xs transition-all space-y-4 flex flex-col justify-between ${
                    isDone
                      ? 'bg-slate-50/50 border-slate-200/90'
                      : task.status === 'IN_PROGRESS'
                      ? 'bg-white border-blue-200/90 ring-1 ring-blue-100 hover:border-blue-300'
                      : 'bg-white border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Row: Task Type & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${typeBadge.color}`}>
                        {typeBadge.label}
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                          {task.priority === 'HIGH' ? '🔥 High' : task.priority === 'MEDIUM' ? '⚡ Med' : '🌱 Normal'}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                          <span>{statusBadge.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Course Title */}
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                        {task.courseTitle}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                        {task.instructions}
                      </p>
                    </div>

                    {/* Specialist & Budget Metadata */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned To</span>
                        <span className="font-extrabold text-slate-800 truncate block mt-0.5">
                          {task.specialistName}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Due Date</span>
                        <div className="flex items-center gap-1 text-slate-700 font-mono mt-0.5 font-bold">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{task.targetDueDate}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          {task.dailyBudget ? 'Daily Budget' : 'Delivery Target'}
                        </span>
                        <span className="font-bold text-emerald-600 font-mono mt-0.5 block">
                          {task.dailyBudget ? `₹${task.dailyBudget}/day` : 'Meta & Schema'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Leads</span>
                        <span className="font-bold text-blue-600 font-mono mt-0.5 block">
                          {task.targetLeads ? `${task.targetLeads} Leads` : '100% Index'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-1">
                          <span>Execution Status:</span>
                          <span className="font-mono text-slate-900">
                            {task.progress >= 100
                              ? 'Delivered & Completed'
                              : task.progress > 0
                              ? 'Active in Progress'
                              : 'Not Started'}
                          </span>
                        </span>
                        <span className="font-mono text-blue-600 font-black">{task.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            task.progress >= 100
                              ? 'bg-emerald-500'
                              : task.progress >= 40
                              ? 'bg-blue-600'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(task.progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Latest Member Submission Note */}
                    {task.latestNote && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 font-medium">
                        <div className="flex items-center justify-between font-bold text-slate-800 mb-0.5">
                          <span>Latest Specialist Update:</span>
                          <span className="text-[10px] text-slate-400 font-mono font-normal">Logged note</span>
                        </div>
                        {task.latestNote}
                      </div>
                    )}
                  </div>

                  {/* Manager Controls / Actions */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {onOpenAuditCourse && (
                        <button
                          type="button"
                          onClick={() => onOpenAuditCourse(task.courseId)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                          title="Inspect Course SEO & Schema"
                        >
                          Audit Course →
                        </button>
                      )}

                      {onOpenQueryModal && (
                        <button
                          type="button"
                          onClick={() => onOpenQueryModal(task.courseId, task.courseTitle)}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors cursor-pointer"
                          title="Send a message or query about this task"
                        >
                          Message
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* 1-Click Quick Approve for Manager */}
                      {!isDone && (
                        <button
                          type="button"
                          onClick={() => handleQuickApprove(task)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Approve deliverable and mark as completed"
                        >
                          <Check size={13} className="text-emerald-600" />
                          <span>Approve Work</span>
                        </button>
                      )}

                      {/* Update Progress & Notes Modal */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAssignmentForUpdate(task);
                          setUpdateProgress(task.progress);
                          setUpdateStatus(task.status);
                          setUpdateNote(task.latestNote || '');
                          setUpdateModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        Update Progress
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteAssignment(task.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete assignment"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 6. MODAL: ASSIGN COURSE TO TEAM MEMBER                   */}
      {/* ======================================================== */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Assign Course to SEO Member</h3>
                  <p className="text-xs text-slate-500">Delegate On-Page SEO, Google Ads, or Meta Ads campaigns.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              {/* Select Course */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Course to Assign</label>
                <select
                  required
                  value={formCourseId}
                  onChange={(e) => setFormCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      🎓 {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Team Member */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assign to Team Member</label>
                <select
                  required
                  value={formSpecialistId}
                  onChange={(e) => setFormSpecialistId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                >
                  {team.map((m) => (
                    <option key={m.id} value={m.id}>
                      👤 {m.name} ({m.customRole || m.role}) — {m.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Type & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Task Assignment Type</label>
                  <select
                    value={formTaskType}
                    onChange={(e) => setFormTaskType(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="GOOGLE_ADS">🎯 Google Ads (PPC &amp; Search)</option>
                    <option value="META_ADS">📱 Meta Ads (Facebook &amp; Instagram)</option>
                    <option value="SEO_METADATA">🔍 On-Page SEO &amp; Keywords</option>
                    <option value="MEDIA_CREATIVE">🎨 Media &amp; Thumbnail Audit</option>
                    <option value="FULL_OPTIMIZATION">🚀 Full 360° SEO &amp; Ads</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="HIGH">🔥 High Priority</option>
                    <option value="MEDIUM">⚡ Medium Priority</option>
                    <option value="LOW">🌱 Low Priority</option>
                  </select>
                </div>
              </div>

              {/* Due Date & Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Due Date</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Daily Ad Budget (₹)</label>
                  <input
                    type="number"
                    value={formDailyBudget}
                    onChange={(e) => setFormDailyBudget(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Leads</label>
                  <input
                    type="number"
                    value={formTargetLeads}
                    onChange={(e) => setFormTargetLeads(e.target.value)}
                    placeholder="e.g. 250"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Specific Instructions / Target Goals</label>
                <textarea
                  rows={3}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="e.g. Setup negative keywords for teacher training, target Delhi/NCR students, optimize CTR above 4%."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Assigning...' : 'Assign Task to Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. MODAL: UPDATE TASK PROGRESS                           */}
      {/* ======================================================== */}
      {updateModalOpen && selectedAssignmentForUpdate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Update Task Progress</h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">
                  {selectedAssignmentForUpdate.courseTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUpdateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateAssignment} className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>Progress Completion</span>
                  <span className="font-mono text-blue-600 text-sm">{updateProgress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={updateProgress}
                  onChange={(e) => setUpdateProgress(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Current Status</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="IN_PROGRESS">⚡ In Progress (Working)</option>
                  <option value="SUBMITTED">📨 Submitted for Review</option>
                  <option value="COMPLETED">✅ Completed &amp; Verified</option>
                  <option value="BLOCKED">🚫 Blocked (Issue / Needs Help)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Work Progress Note (Visible to SEO Manager)
                </label>
                <textarea
                  rows={3}
                  required
                  value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)}
                  placeholder="e.g. Google Ads keywords set up with ₹500 daily budget. Quality score is 8/10."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUpdateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save Progress'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

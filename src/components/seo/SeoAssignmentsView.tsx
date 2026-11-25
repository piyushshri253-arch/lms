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
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  X,
  Eye,
  RefreshCw,
  Users,
  LayoutGrid,
  List,
  FileText,
  Globe,
  Link2,
  Tag,
  AlertTriangle,
  Send
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
  // View Switcher: 'KANBAN' or 'TABLE'
  const [viewLayout, setViewLayout] = useState<'KANBAN' | 'TABLE'>('KANBAN');

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

  // Filter States
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<SeoTaskAssignment | null>(null);

  // Form State for Manual YouTrack Task Creation
  const [formTitle, setFormTitle] = useState('');
  const [formIssueKey, setFormIssueKey] = useState('');
  const [formSpecialistId, setFormSpecialistId] = useState('');
  const [formTaskType, setFormTaskType] = useState<string>('ON_PAGE');
  const [formPriority, setFormPriority] = useState<SeoTaskAssignment['priority']>('HIGH');
  const [formStatus, setFormStatus] = useState<SeoTaskAssignment['status']>('PENDING');
  const [formDueDate, setFormDueDate] = useState('');
  const [formCourseId, setFormCourseId] = useState('');
  const [formTargetUrl, setFormTargetUrl] = useState('');
  const [formDailyBudget, setFormDailyBudget] = useState('');
  const [formTargetLeads, setFormTargetLeads] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State for Progress & Notes Update
  const [updateStatus, setUpdateStatus] = useState<SeoTaskAssignment['status']>('IN_PROGRESS');
  const [updateProgress, setUpdateProgress] = useState(50);
  const [updateNote, setUpdateNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Open Create Modal with smart defaults
  const openCreateTaskModal = (defaultSpecialistId?: string) => {
    const nextNum = assignments.length + 101;
    setFormIssueKey(`SEO-${nextNum}`);
    setFormTitle('');
    setFormSpecialistId(defaultSpecialistId || (selectedMemberId !== 'ALL' ? selectedMemberId : team[0]?.id) || '');
    setFormTaskType('ON_PAGE');
    setFormPriority('HIGH');
    setFormStatus('PENDING');
    setFormDueDate(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0]);
    setFormCourseId('');
    setFormTargetUrl('https://morenateach.com/courses');
    setFormDailyBudget('500');
    setFormTargetLeads('200');
    setFormInstructions('');
    setFormError(null);
    setCreateModalOpen(true);
  };

  // Handle Manual Task Creation (YouTrack Issue)
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError('Please enter a task title / issue summary.');
      return;
    }
    if (!formSpecialistId) {
      setFormError('Please select a team member to assign this task.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedSpecialist = team.find((t) => t.id === formSpecialistId);
      const selectedCourse = courses.find((c) => c.id === formCourseId);

      const res = await fetch('/api/seo/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          issueKey: formIssueKey.trim() || `SEO-${assignments.length + 101}`,
          specialistId: formSpecialistId,
          specialistName: selectedSpecialist?.name || 'Specialist',
          specialistEmail: selectedSpecialist?.email || '',
          specialistAvatar: selectedSpecialist?.avatar,
          taskType: formTaskType,
          priority: formPriority,
          status: formStatus,
          targetDueDate: formDueDate,
          courseId: formCourseId || undefined,
          courseTitle: selectedCourse?.title || undefined,
          targetUrl: formTargetUrl.trim() || undefined,
          dailyBudget: formDailyBudget ? Number(formDailyBudget) : undefined,
          targetLeads: formTargetLeads ? Number(formTargetLeads) : undefined,
          instructions: formInstructions.trim() || `Execute task "${formTitle.trim()}" as per target guidelines.`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create task');

      setCreateModalOpen(false);
      showToast(`Task [${data.assignment?.issueKey || 'SEO'}] assigned to ${selectedSpecialist?.name || 'Member'}! 🚀`);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Error creating task');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick 1-Click Move Status (e.g. Move from To Do to In Progress)
  const handleQuickStatusMove = async (task: SeoTaskAssignment, newStatus: SeoTaskAssignment['status']) => {
    try {
      const newProgress =
        newStatus === 'COMPLETED' ? 100 : newStatus === 'IN_PROGRESS' && task.progress === 0 ? 25 : task.progress;
      const res = await fetch('/api/seo/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: task.id,
          status: newStatus,
          progress: newProgress,
          latestNote: `Status updated to ${newStatus} by SEO Manager.`
        })
      });
      if (!res.ok) throw new Error('Failed to update status');
      showToast(`Moved ${task.issueKey || 'Task'} to ${newStatus.replace('_', ' ')}! ✓`);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Open Update Progress Modal
  const openUpdateModal = (task: SeoTaskAssignment) => {
    setSelectedTask(task);
    setUpdateStatus(task.status);
    setUpdateProgress(task.progress);
    setUpdateNote(task.latestNote || '');
    setUpdateModalOpen(true);
  };

  // Submit Progress Update
  const handleSaveProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setUpdating(true);
    try {
      const res = await fetch('/api/seo/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: selectedTask.id,
          status: updateStatus,
          progress: Number(updateProgress),
          latestNote: updateNote.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update progress');

      setUpdateModalOpen(false);
      showToast('Task progress saved! Specialist has been updated.');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await fetch(`/api/seo/assignments?assignmentId=${taskId}`, { method: 'DELETE' });
      showToast('Task deleted successfully.');
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

  // Tasks belonging to selected member (or all)
  const memberScopedTasks = useMemo(() => {
    if (selectedMemberId === 'ALL') return assignments;
    return assignments.filter(
      (a) =>
        a.specialistId === selectedMemberId ||
        (currentMember && a.specialistEmail?.toLowerCase() === currentMember.email?.toLowerCase())
    );
  }, [assignments, selectedMemberId, currentMember]);

  // High-Level Metrics
  const metrics = useMemo(() => {
    const list = memberScopedTasks;
    const todo = list.filter((a) => a.status === 'PENDING' || a.progress === 0);
    const inProgress = list.filter((a) => a.status === 'IN_PROGRESS' || (a.progress > 0 && a.progress < 100));
    const inReview = list.filter((a) => a.status === 'SUBMITTED');
    const done = list.filter((a) => a.status === 'COMPLETED' || a.progress === 100);
    const critical = list.filter((a) => a.priority === 'CRITICAL' || a.priority === 'HIGH');
    const avgProg =
      list.length > 0 ? Math.round(list.reduce((acc, curr) => acc + (curr.progress || 0), 0) / list.length) : 0;

    return {
      total: list.length,
      todoCount: todo.length,
      inProgressCount: inProgress.length,
      inReviewCount: inReview.length,
      doneCount: done.length,
      criticalCount: critical.length,
      avgProgress: avgProg
    };
  }, [memberScopedTasks]);

  // Filtered Task List
  const displayedTasks = useMemo(() => {
    return memberScopedTasks.filter((a) => {
      // Status Filter
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;

      // Category Filter
      if (categoryFilter !== 'ALL' && a.taskType !== categoryFilter) return false;

      // Priority Filter
      if (priorityFilter !== 'ALL' && a.priority !== priorityFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (a.title || a.courseTitle || '').toLowerCase();
        const key = (a.issueKey || '').toLowerCase();
        const member = (a.specialistName || '').toLowerCase();
        const instructions = (a.instructions || '').toLowerCase();
        const note = (a.latestNote || '').toLowerCase();

        return (
          title.includes(q) ||
          key.includes(q) ||
          member.includes(q) ||
          instructions.includes(q) ||
          note.includes(q)
        );
      }

      return true;
    });
  }, [memberScopedTasks, statusFilter, categoryFilter, priorityFilter, searchQuery]);

  // Group into Kanban Columns
  const kanbanColumns = useMemo(() => {
    return {
      TODO: displayedTasks.filter((t) => t.status === 'PENDING' || t.progress === 0),
      IN_PROGRESS: displayedTasks.filter((t) => t.status === 'IN_PROGRESS' && t.progress < 100),
      SUBMITTED: displayedTasks.filter((t) => t.status === 'SUBMITTED'),
      COMPLETED: displayedTasks.filter((t) => t.status === 'COMPLETED' || t.progress === 100)
    };
  }, [displayedTasks]);

  // Badge helpers
  const getCategoryBadge = (type: string) => {
    switch (type) {
      case 'TECHNICAL_SEO':
        return { label: '🔧 Technical SEO', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'ON_PAGE':
      case 'SEO_METADATA':
        return { label: '🔍 On-Page SEO', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'OFF_PAGE_BACKLINKS':
        return { label: '🔗 Backlinks', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
      case 'KEYWORD_RESEARCH':
        return { label: '🎯 Keyword Research', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'CONTENT_WRITING':
        return { label: '✍️ Content Writing', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'GOOGLE_ADS':
        return { label: '📈 Google Ads', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'META_ADS':
        return { label: '📱 Meta Ads', bg: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'SCHEMA_MARKUP':
        return { label: '🏷️ Schema Markup', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'SPEED_VITALS':
        return { label: '⚡ Core Web Vitals', bg: 'bg-orange-50 text-orange-700 border-orange-200' };
      default:
        return { label: '📌 SEO Task', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const getPriorityBadge = (priority: SeoTaskAssignment['priority']) => {
    switch (priority) {
      case 'CRITICAL':
        return { label: 'Critical 🔥', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'HIGH':
        return { label: 'High ⚡', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'MEDIUM':
        return { label: 'Medium 📌', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'LOW':
        return { label: 'Low 💤', bg: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
  };

  const getStatusBadge = (status: SeoTaskAssignment['status'], progress: number) => {
    if (status === 'COMPLETED' || progress === 100) {
      return { label: 'Completed', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
    }
    if (status === 'SUBMITTED') {
      return { label: 'In Review', bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' };
    }
    if (status === 'IN_PROGRESS') {
      return { label: 'In Progress', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500 animate-pulse' };
    }
    if (status === 'BLOCKED') {
      return { label: 'Blocked', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
    }
    return { label: 'To Do', bg: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-slate-700 animate-in slide-in-from-bottom-3">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. TOP YOUTRACK HEADER & DISPATCH CONTROLS               */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold uppercase tracking-wider mb-2">
              <CheckSquare size={13} className="text-blue-600" />
              <span>YOUTRACK SEO TASK WORKBENCH</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                SEO Task Management &amp; Team Dispatch
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 font-mono">
                {assignments.length} Issues
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Create manual SEO tasks (like YouTrack/Jira), assign them to team members, and track real-time delivery on their dashboards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Switcher: Kanban vs Table */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewLayout('KANBAN')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewLayout === 'KANBAN' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid size={14} />
                <span>Kanban Board</span>
              </button>
              <button
                type="button"
                onClick={() => setViewLayout('TABLE')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewLayout === 'TABLE' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List size={14} />
                <span>Issue Table</span>
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs cursor-pointer transition-colors"
              title="Refresh All Tasks"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-blue-600' : ''} />
            </button>

            {/* + Create New Task Button */}
            <button
              type="button"
              onClick={() => openCreateTaskModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus size={16} />
              <span>+ Create Task (YouTrack Issue)</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. TEAM SPECIALIST WORKLOAD SELECTOR                     */}
        {/* ======================================================== */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 font-mono">
              Filter by Assigned Team Member:
            </span>
            {selectedMemberId !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedMemberId('ALL')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <X size={13} />
                <span>Clear Member Filter</span>
              </button>
            )}
          </div>

          {/* Quick Member Avatar Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              type="button"
              onClick={() => setSelectedMemberId('ALL')}
              className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-2 border ${
                selectedMemberId === 'ALL'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Users size={14} />
              <span>All Specialists ({assignments.length})</span>
            </button>

            {team.map((member) => {
              const count = assignments.filter((a) => a.specialistId === member.id).length;
              const isSelected = selectedMemberId === member.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedMemberId(member.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <span>{member.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. METRIC KPI CARDS                                      */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] uppercase font-bold text-slate-400 font-mono">Total Issues</p>
            <h4 className="text-xl font-black text-slate-900 mt-0.5">{metrics.total}</h4>
            <span className="text-[10px] text-slate-500">In this view</span>
          </div>

          <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100">
            <p className="text-[10px] uppercase font-bold text-blue-700 font-mono">📝 To Do</p>
            <h4 className="text-xl font-black text-blue-900 mt-0.5">{metrics.todoCount}</h4>
            <span className="text-[10px] text-blue-600">Pending start</span>
          </div>

          <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-100">
            <p className="text-[10px] uppercase font-bold text-amber-800 font-mono">🚀 In Progress</p>
            <h4 className="text-xl font-black text-amber-900 mt-0.5">{metrics.inProgressCount}</h4>
            <span className="text-[10px] text-amber-700">Currently active</span>
          </div>

          <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100">
            <p className="text-[10px] uppercase font-bold text-purple-700 font-mono">👀 In Review</p>
            <h4 className="text-xl font-black text-purple-900 mt-0.5">{metrics.inReviewCount}</h4>
            <span className="text-[10px] text-purple-600">Awaiting approval</span>
          </div>

          <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100">
            <p className="text-[10px] uppercase font-bold text-emerald-700 font-mono">✅ Done</p>
            <h4 className="text-xl font-black text-emerald-900 mt-0.5">{metrics.doneCount}</h4>
            <span className="text-[10px] text-emerald-600">Verified &amp; live</span>
          </div>

          <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-100">
            <p className="text-[10px] uppercase font-bold text-rose-700 font-mono">🔥 Critical / High</p>
            <h4 className="text-xl font-black text-rose-900 mt-0.5">{metrics.criticalCount}</h4>
            <span className="text-[10px] text-rose-600">Top priority tasks</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. SEARCH & CATEGORY FILTER BAR                          */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by task title, issue key (SEO-101), member, description..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Category & Priority Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-hidden"
          >
            <option value="ALL">All Categories</option>
            <option value="ON_PAGE">🔍 On-Page SEO</option>
            <option value="TECHNICAL_SEO">🔧 Technical SEO</option>
            <option value="OFF_PAGE_BACKLINKS">🔗 Backlinks &amp; Outreach</option>
            <option value="KEYWORD_RESEARCH">🎯 Keyword Research</option>
            <option value="CONTENT_WRITING">✍️ Content &amp; Blog</option>
            <option value="GOOGLE_ADS">📈 Google Ads &amp; PPC</option>
            <option value="META_ADS">📱 Meta Ads (FB/IG)</option>
            <option value="SCHEMA_MARKUP">🏷️ Schema &amp; Snippets</option>
            <option value="SPEED_VITALS">⚡ Core Web Vitals</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-hidden"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">🔥 Critical</option>
            <option value="HIGH">⚡ High</option>
            <option value="MEDIUM">📌 Medium</option>
            <option value="LOW">💤 Low</option>
          </select>

          {/* Quick Action: Add task for current member */}
          {currentMember && (
            <button
              type="button"
              onClick={() => openCreateTaskModal(currentMember.id)}
              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus size={13} />
              <span>Add for {currentMember.name.split(' ')[0]}</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5A. KANBAN BOARD VIEW (YOUTRACK / JIRA STYLE)            */}
      {/* ======================================================== */}
      {viewLayout === 'KANBAN' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {/* Column 1: To Do / Backlog */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-3xl p-4 space-y-3 min-h-[500px]">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-700">To Do / Backlog</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-xs font-mono font-bold text-slate-600">
                {kanbanColumns.TODO.length}
              </span>
            </div>

            <div className="space-y-3">
              {kanbanColumns.TODO.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic">No tasks in backlog</div>
              ) : (
                kanbanColumns.TODO.map((task) => (
                  <KanbanTaskCard
                    key={task.id}
                    task={task}
                    onMoveStatus={handleQuickStatusMove}
                    onUpdateProgress={openUpdateModal}
                    onDelete={handleDeleteTask}
                    getCategoryBadge={getCategoryBadge}
                    getPriorityBadge={getPriorityBadge}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div className="bg-blue-50/40 border border-blue-200/80 rounded-3xl p-4 space-y-3 min-h-[500px]">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                <h3 className="font-black text-xs uppercase tracking-wider text-blue-900">In Progress</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white border border-blue-200 text-xs font-mono font-bold text-blue-700">
                {kanbanColumns.IN_PROGRESS.length}
              </span>
            </div>

            <div className="space-y-3">
              {kanbanColumns.IN_PROGRESS.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic">No tasks currently in progress</div>
              ) : (
                kanbanColumns.IN_PROGRESS.map((task) => (
                  <KanbanTaskCard
                    key={task.id}
                    task={task}
                    onMoveStatus={handleQuickStatusMove}
                    onUpdateProgress={openUpdateModal}
                    onDelete={handleDeleteTask}
                    getCategoryBadge={getCategoryBadge}
                    getPriorityBadge={getPriorityBadge}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 3: In Review */}
          <div className="bg-purple-50/40 border border-purple-200/80 rounded-3xl p-4 space-y-3 min-h-[500px]">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <h3 className="font-black text-xs uppercase tracking-wider text-purple-900">In Review</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white border border-purple-200 text-xs font-mono font-bold text-purple-700">
                {kanbanColumns.SUBMITTED.length}
              </span>
            </div>

            <div className="space-y-3">
              {kanbanColumns.SUBMITTED.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic">No tasks awaiting review</div>
              ) : (
                kanbanColumns.SUBMITTED.map((task) => (
                  <KanbanTaskCard
                    key={task.id}
                    task={task}
                    onMoveStatus={handleQuickStatusMove}
                    onUpdateProgress={openUpdateModal}
                    onDelete={handleDeleteTask}
                    getCategoryBadge={getCategoryBadge}
                    getPriorityBadge={getPriorityBadge}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 4: Done / Completed */}
          <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-3xl p-4 space-y-3 min-h-[500px]">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="font-black text-xs uppercase tracking-wider text-emerald-900">Completed</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-xs font-mono font-bold text-emerald-700">
                {kanbanColumns.COMPLETED.length}
              </span>
            </div>

            <div className="space-y-3">
              {kanbanColumns.COMPLETED.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic">No tasks completed yet</div>
              ) : (
                kanbanColumns.COMPLETED.map((task) => (
                  <KanbanTaskCard
                    key={task.id}
                    task={task}
                    onMoveStatus={handleQuickStatusMove}
                    onUpdateProgress={openUpdateModal}
                    onDelete={handleDeleteTask}
                    getCategoryBadge={getCategoryBadge}
                    getPriorityBadge={getPriorityBadge}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5B. ISSUE TABLE VIEW (YOUTRACK LIST STYLE)               */}
      {/* ======================================================== */}
      {viewLayout === 'TABLE' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-4">Key</th>
                  <th className="p-4">Summary / Task Title</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Assignee</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Progress</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                      No tasks found matching current filters.
                    </td>
                  </tr>
                ) : (
                  displayedTasks.map((t) => {
                    const cat = getCategoryBadge(t.taskType);
                    const pri = getPriorityBadge(t.priority);
                    const sta = getStatusBadge(t.status, t.progress);
                    const heading = t.title || t.courseTitle || 'SEO Task';

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-mono font-bold text-blue-600">{t.issueKey || 'SEO'}</td>
                        <td className="p-4 max-w-xs">
                          <p className="font-extrabold text-slate-900 line-clamp-1">{heading}</p>
                          {t.instructions && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{t.instructions}</p>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${cat.bg}`}>
                            {cat.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${pri.bg}`}>
                            {pri.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                              {t.specialistName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-900 truncate">{t.specialistName}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${sta.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sta.dot}`} />
                            {sta.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="w-24 space-y-1">
                            <div className="flex justify-between text-[10px] font-mono font-bold text-slate-600">
                              <span>{t.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  t.progress === 100
                                    ? 'bg-emerald-500'
                                    : t.progress > 50
                                    ? 'bg-blue-600'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${t.progress}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-slate-600 whitespace-nowrap">{t.targetDueDate || 'Flexible'}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openUpdateModal(t)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-[11px] cursor-pointer"
                            >
                              Update
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(t.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Delete Task"
                            >
                              <Trash2 size={14} />
                            </button>
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
      )}

      {/* ======================================================== */}
      {/* 6. MODAL: CREATE MANUAL YOUTRACK TASK                    */}
      {/* ======================================================== */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <CheckSquare size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Create Task (YouTrack Issue)</h3>
                  <p className="text-xs text-slate-500">
                    Manually type the task and assign it to a team member. It will appear on their dashboard.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
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

            <form onSubmit={handleCreateTask} className="space-y-4">
              {/* Manual Task Title Input */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Task Title / Issue Summary *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Write 10 meta descriptions for Hindi courses / Fix 404 crawl errors on blog"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden"
                  autoFocus
                />
              </div>

              {/* Assignee & Issue Key */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assign to Team Member *</label>
                  <select
                    required
                    value={formSpecialistId}
                    onChange={(e) => setFormSpecialistId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="">Select a Specialist...</option>
                    {team.map((m) => (
                      <option key={m.id} value={m.id}>
                        👤 {m.name} ({m.customRole || m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Issue Key (Auto-Generated)</label>
                  <input
                    type="text"
                    value={formIssueKey}
                    onChange={(e) => setFormIssueKey(e.target.value)}
                    placeholder="e.g. SEO-104"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold text-blue-600 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Task Category / Duty</label>
                  <select
                    value={formTaskType}
                    onChange={(e) => setFormTaskType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="ON_PAGE">🔍 On-Page SEO (Meta tags, H1, Keywords)</option>
                    <option value="TECHNICAL_SEO">🔧 Technical SEO (Crawl, Sitemaps, Vitals)</option>
                    <option value="OFF_PAGE_BACKLINKS">🔗 Backlinks &amp; Off-Page Outreach</option>
                    <option value="KEYWORD_RESEARCH">🎯 Keyword Research &amp; Intent</option>
                    <option value="CONTENT_WRITING">✍️ Content Writing &amp; Blog Optimization</option>
                    <option value="SCHEMA_MARKUP">🏷️ Schema &amp; Rich Snippets</option>
                    <option value="GOOGLE_ADS">📈 Google Ads &amp; PPC Campaigns</option>
                    <option value="META_ADS">📱 Meta Ads (Facebook &amp; Instagram)</option>
                    <option value="SPEED_VITALS">⚡ Core Web Vitals &amp; Page Speed</option>
                    <option value="GENERAL">📌 General SEO / Marketing Duty</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="CRITICAL">🔥 Critical (Do immediately)</option>
                    <option value="HIGH">⚡ High Priority</option>
                    <option value="MEDIUM">📌 Medium Priority</option>
                    <option value="LOW">💤 Low Priority</option>
                  </select>
                </div>
              </div>

              {/* Target Due Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Due Date</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="PENDING">📝 To Do (Backlog)</option>
                    <option value="IN_PROGRESS">🚀 In Progress</option>
                    <option value="SUBMITTED">👀 Under Review</option>
                  </select>
                </div>
              </div>

              {/* Target Course or URL (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Link to Course (Optional)</label>
                  <select
                    value={formCourseId}
                    onChange={(e) => setFormCourseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="">None / Custom URL</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        🎓 {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target URL / Webpage (Optional)</label>
                  <input
                    type="text"
                    value={formTargetUrl}
                    onChange={(e) => setFormTargetUrl(e.target.value)}
                    placeholder="https://morenateach.com/blog/..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Detailed Description / Acceptance Criteria */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Task Description &amp; Acceptance Criteria
                </label>
                <textarea
                  rows={3}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="Detail exact deliverables, target keywords, URLs, format, or acceptance tests..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send size={14} />
                  <span>{submitting ? 'Dispatching...' : 'Dispatch Task to Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. MODAL: UPDATE TASK PROGRESS & WORK REVIEW             */}
      {/* ======================================================== */}
      {updateModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-600 uppercase">
                  {selectedTask.issueKey || 'SEO'}
                </span>
                <h3 className="text-base font-black text-slate-900 line-clamp-1">
                  {selectedTask.title || selectedTask.courseTitle}
                </h3>
                <p className="text-xs text-slate-500">Assigned to: {selectedTask.specialistName}</p>
              </div>
              <button
                type="button"
                onClick={() => setUpdateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProgress} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="PENDING">📝 To Do / Backlog</option>
                  <option value="IN_PROGRESS">🚀 In Progress</option>
                  <option value="SUBMITTED">👀 In Review / Testing</option>
                  <option value="COMPLETED">✅ Completed &amp; Verified</option>
                  <option value="BLOCKED">⚠️ Blocked</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Progress Percentage</label>
                  <span className="text-xs font-mono font-black text-blue-600">{updateProgress}%</span>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Manager Note / Review Feedback</label>
                <textarea
                  rows={3}
                  value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)}
                  placeholder="Add feedback, verified deliverables, or next steps..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden resize-none"
                />
              </div>

              {selectedTask.deliverableLink && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block mb-1">
                    Deliverable Submitted by Specialist:
                  </span>
                  <a
                    href={selectedTask.deliverableLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 truncate"
                  >
                    <span>{selectedTask.deliverableLink}</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUpdateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// KANBAN TASK CARD COMPONENT (YouTrack Style Card)
// -------------------------------------------------------------
interface KanbanCardProps {
  task: SeoTaskAssignment;
  onMoveStatus: (task: SeoTaskAssignment, status: SeoTaskAssignment['status']) => void;
  onUpdateProgress: (task: SeoTaskAssignment) => void;
  onDelete: (id: string) => void;
  getCategoryBadge: (type: string) => { label: string; bg: string };
  getPriorityBadge: (p: SeoTaskAssignment['priority']) => { label: string; bg: string };
}

function KanbanTaskCard({
  task,
  onMoveStatus,
  onUpdateProgress,
  onDelete,
  getCategoryBadge,
  getPriorityBadge
}: KanbanCardProps) {
  const cat = getCategoryBadge(task.taskType);
  const pri = getPriorityBadge(task.priority);
  const heading = task.title || task.courseTitle || 'SEO Task';

  const isOverdue =
    task.targetDueDate &&
    new Date(task.targetDueDate).getTime() < Date.now() &&
    task.status !== 'COMPLETED';

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-3 group">
      {/* Top Meta: Issue Key & Priority */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
            {task.issueKey || 'SEO'}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${pri.bg}`}>
            {pri.label}
          </span>
        </div>

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border truncate max-w-[120px] ${cat.bg}`}>
          {cat.label}
        </span>
      </div>

      {/* Task Heading */}
      <div>
        <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
          {heading}
        </h4>
        {task.instructions && (
          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
            {task.instructions}
          </p>
        )}
      </div>

      {/* Linked Course or URL */}
      {(task.courseTitle || task.targetUrl) && (
        <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg truncate">
          <Link2 size={11} className="text-slate-400 shrink-0" />
          <span className="truncate">{task.courseTitle || task.targetUrl}</span>
        </div>
      )}

      {/* Assignee & Progress */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-[9px] flex items-center justify-center shrink-0">
              {task.specialistName.charAt(0).toUpperCase()}
            </div>
            <span className="text-[11px] font-bold text-slate-700 truncate">{task.specialistName}</span>
          </div>

          <span
            className={`text-[10px] font-mono font-bold flex items-center gap-1 shrink-0 ${
              isOverdue ? 'text-rose-600' : 'text-slate-400'
            }`}
          >
            <Clock size={11} />
            <span>{task.targetDueDate ? task.targetDueDate.slice(5) : 'Flexible'}</span>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono font-bold text-slate-500">
            <span>Progress</span>
            <span className="text-slate-900">{task.progress}%</span>
          </div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                task.progress === 100 ? 'bg-emerald-500' : task.progress > 50 ? 'bg-blue-600' : 'bg-amber-500'
              }`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Status Movement & Actions */}
      <div className="pt-1 flex items-center justify-between gap-1 text-[10px]">
        {/* Quick Transition Pills */}
        <div className="flex items-center gap-1">
          {task.status !== 'IN_PROGRESS' && task.status !== 'COMPLETED' && (
            <button
              type="button"
              onClick={() => onMoveStatus(task, 'IN_PROGRESS')}
              className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 cursor-pointer transition-colors"
            >
              Start
            </button>
          )}

          {task.status === 'IN_PROGRESS' && (
            <button
              type="button"
              onClick={() => onMoveStatus(task, 'SUBMITTED')}
              className="px-2 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold border border-purple-200 cursor-pointer transition-colors"
            >
              Review
            </button>
          )}

          {task.status !== 'COMPLETED' && (
            <button
              type="button"
              onClick={() => onMoveStatus(task, 'COMPLETED')}
              className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 cursor-pointer transition-colors"
            >
              Done ✓
            </button>
          )}
        </div>

        {/* Edit & Delete Action Buttons */}
        <div className="flex items-center gap-1 text-slate-400">
          <button
            type="button"
            onClick={() => onUpdateProgress(task)}
            className="p-1 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer"
            title="Inspect & Update Task"
          >
            <Sliders size={13} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
            title="Delete Task"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

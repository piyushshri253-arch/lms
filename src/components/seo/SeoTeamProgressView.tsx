'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ExternalLink,
  DollarSign,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Calendar,
  Briefcase
} from 'lucide-react';
import { SeoTaskAssignment } from '@/app/api/seo/assignments/route';

interface SeoTeamProgressViewProps {
  assignments: SeoTaskAssignment[];
  team: any[];
  onRefresh: () => void;
  onOpenAuditCourse?: (courseId: string) => void;
}

export function SeoTeamProgressView({
  assignments,
  team,
  onRefresh,
  onOpenAuditCourse
}: SeoTeamProgressViewProps) {
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('ALL');

  // Summary Metrics
  const totalTasks = assignments.length;
  const completedTasks = assignments.filter((a) => a.status === 'COMPLETED').length;
  const inProgressTasks = assignments.filter((a) => a.status === 'IN_PROGRESS' || a.status === 'SUBMITTED').length;
  const runningAds = assignments.filter((a) => a.taskType === 'GOOGLE_ADS' || a.taskType === 'META_ADS').length;
  const avgTeamProgress =
    totalTasks > 0 ? Math.round(assignments.reduce((acc, curr) => acc + curr.progress, 0) / totalTasks) : 0;

  // Filtered members
  const displayedMembers =
    selectedMemberFilter === 'ALL'
      ? team
      : team.filter((m) => m.id === selectedMemberFilter || m.email === selectedMemberFilter);

  return (
    <div className="space-y-6 animate-in fade-in pb-16">
      {/* ======================================================== */}
      {/* 1. TOP EXECUTIVE PROGRESS SUMMARY                        */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold uppercase tracking-wider mb-2">
              <TrendingUp size={13} className="text-blue-600" />
              <span>TEAM PERFORMANCE &amp; WORK PROGRESS OVERSIGHT</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Team Progress Reports</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Live tracking of what your SEO executives and ads specialists are working on, task completion rates, and status notes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedMemberFilter}
              onChange={(e) => setSelectedMemberFilter(e.target.value)}
              className="py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
            >
              <option value="ALL">All Team Members ({team.length})</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  👤 {m.name} ({m.customRole || m.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Delegated Tasks</div>
            <div className="text-3xl font-black font-mono text-slate-900">{totalTasks}</div>
            <div className="text-[10px] text-slate-500 font-medium">Across all courses &amp; ads</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">Average Execution Rate</div>
            <div className="text-3xl font-black font-mono text-blue-600">{avgTeamProgress}%</div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mt-2">
              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${avgTeamProgress}%` }} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">Completed &amp; Live</div>
            <div className="text-3xl font-black font-mono text-emerald-600">{completedTasks}</div>
            <div className="text-[10px] text-slate-500 font-medium">Audit approved / live campaigns</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">In Progress / Review</div>
            <div className="text-3xl font-black font-mono text-amber-600">{inProgressTasks}</div>
            <div className="text-[10px] text-slate-500 font-medium">Active ongoing work</div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MEMBER-BY-MEMBER WORK PROGRESS CARDS                  */}
      {/* ======================================================== */}
      <div className="space-y-4">
        {displayedMembers.map((member) => {
          const memberTasks = assignments.filter(
            (a) => a.specialistId === member.id || a.specialistEmail === member.email
          );
          const memberAvg =
            memberTasks.length > 0
              ? Math.round(memberTasks.reduce((acc, curr) => acc + curr.progress, 0) / memberTasks.length)
              : 0;

          return (
            <div
              key={member.id}
              className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5"
            >
              {/* Member Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-500/20">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">{member.name}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                        {member.customRole || (member.role === 'SEO_MANAGER' ? 'Team Lead' : 'Specialist')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Login ID: <strong className="text-blue-600 font-medium">{member.email}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Tasks</span>
                    <span className="text-lg font-black font-mono text-slate-900">{memberTasks.length}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Overall Progress</span>
                    <span className="text-lg font-black font-mono text-blue-600">{memberAvg}%</span>
                  </div>
                </div>
              </div>

              {/* Assigned Tasks List for this Member */}
              {memberTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">
                  No courses currently assigned to {member.name}. Go to &quot;Course Assignments&quot; to assign tasks.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {memberTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            {t.taskType.replace('_', ' ')}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : t.status === 'SUBMITTED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                          {t.issueKey ? <span className="font-mono text-blue-600 mr-1.5">[{t.issueKey}]</span> : null}
                          {t.title || t.courseTitle}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{t.instructions}</p>

                        {/* Progress Bar */}
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 font-mono">
                            <span>Progress</span>
                            <span>{t.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                t.progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                              }`}
                              style={{ width: `${t.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Latest work note */}
                        {t.latestNote && (
                          <div className="text-[10px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100">
                            <strong className="text-slate-800 block mb-0.5">Work Update:</strong>
                            {t.latestNote}
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono">Due: {t.targetDueDate}</span>
                        {onOpenAuditCourse && (t.courseId ? (
                          <button
                            type="button"
                            onClick={() => onOpenAuditCourse(t.courseId || '')}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Inspect Course SEO</span>
                            <ArrowRight size={12} />
                          </button>
                        ) : t.targetUrl ? (
                          <a
                            href={t.targetUrl.startsWith('http') ? t.targetUrl : `https://${t.targetUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Open URL</span>
                            <ArrowRight size={12} />
                          </a>
                        ) : null)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

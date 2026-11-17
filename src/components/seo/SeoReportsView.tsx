'use client';

import React, { useState } from 'react';
import {
  FileText,
  Printer,
  FileSpreadsheet,
  Download,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Search
} from 'lucide-react';

export interface SeoReportsViewProps {
  team?: any[];
  courses?: any[];
  analyticsData?: any;
}

export function SeoReportsView({
  team = [],
  courses = [],
  analyticsData
}: SeoReportsViewProps) {
  const [activeReportTab, setActiveReportTab] = useState<'MANAGER' | 'INDIVIDUAL'>('MANAGER');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  const [reportDateRange, setReportDateRange] = useState('Last 30 Days');
  const [toast, setToast] = useState<string | null>(null);

  const memberReports = [
    {
      id: 'm-1',
      name: 'Priya Sharma',
      role: 'Senior SEO Specialist',
      assigned: 12,
      completed: 10,
      approved: 9,
      rejected: 0,
      revisions: 1,
      overdue: 0,
      completionRate: 83,
      avgCompletionDays: 2.1,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80'
    },
    {
      id: 'm-2',
      name: 'Amit Kumar',
      role: 'On-Page SEO Specialist',
      assigned: 10,
      completed: 7,
      approved: 6,
      rejected: 0,
      revisions: 1,
      overdue: 1,
      completionRate: 70,
      avgCompletionDays: 2.8,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
    },
    {
      id: 'm-3',
      name: 'Sneha Patel',
      role: 'Technical SEO & Meta Ads',
      assigned: 8,
      completed: 6,
      approved: 5,
      rejected: 0,
      revisions: 0,
      overdue: 0,
      completionRate: 75,
      avgCompletionDays: 1.9,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
    }
  ];

  const handleExport = (type: 'PDF' | 'CSV' | 'EXCEL') => {
    if (type === 'PDF') {
      window.print();
    } else {
      setToast(`Exporting SEO Performance Report as ${type}... Check downloads folder! ✓`);
      setTimeout(() => setToast(null), 3500);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in">
      {/* Toast */}
      {toast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{toast}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold uppercase tracking-wider mb-2">
            <FileText size={13} className="text-blue-600" />
            <span>EXECUTIVE INTELLIGENCE &amp; AUDIT</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            SEO Reports &amp; Performance
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Generate team productivity, individual member velocity, and course ranking reports.
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleExport('PDF')}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer size={13} className="text-blue-600" />
            <span>Download PDF</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport('CSV')}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet size={13} className="text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport('EXCEL')}
            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={13} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Report Tabs & Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveReportTab('MANAGER')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeReportTab === 'MANAGER'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👔 SEO Manager Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveReportTab('INDIVIDUAL')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeReportTab === 'INDIVIDUAL'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👥 Individual Member Reports
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">Date Range:</span>
          <select
            value={reportDateRange}
            onChange={(e) => setReportDateRange(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer focus:outline-hidden"
          >
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Last 90 Days">Last 90 Days</option>
            <option value="Last 1 Year">Last 1 Year</option>
          </select>
        </div>
      </div>

      {/* Tab 1: SEO Manager Team-wide Report */}
      {activeReportTab === 'MANAGER' ? (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Team Task Velocity</div>
              <div className="text-3xl font-black font-mono text-blue-600 mt-1">78 / 95</div>
              <div className="text-xs text-slate-500 font-medium mt-1">82% Completed on schedule</div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Approved Submissions</div>
              <div className="text-3xl font-black font-mono text-emerald-600 mt-1">20 Tasks</div>
              <div className="text-xs text-slate-500 font-medium mt-1">91% Quality Approval Rate</div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Revision Requests</div>
              <div className="text-3xl font-black font-mono text-amber-600 mt-1">2 Tasks</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Meta description refinements</div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/90 rounded-3xl shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Overdue Tasks</div>
              <div className="text-3xl font-black font-mono text-rose-600 mt-1">1 Task</div>
              <div className="text-xs text-slate-500 font-medium mt-1">Flagged for manager follow-up</div>
            </div>
          </div>

          {/* Member Productivity Breakdown Table */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="font-black text-sm text-slate-900">
              Team Productivity &amp; Velocity Matrix
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase font-bold">
                    <th className="py-3 px-4">Team Member</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-center">Assigned</th>
                    <th className="py-3 px-4 text-center">Completed</th>
                    <th className="py-3 px-4 text-center">Approved</th>
                    <th className="py-3 px-4 text-center">Revisions</th>
                    <th className="py-3 px-4 text-center">Overdue</th>
                    <th className="py-3 px-4 text-center">Avg Time</th>
                    <th className="py-3 px-4 text-right">Completion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memberReports.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                        <img src={m.avatar} alt={m.name} className="w-8 h-8 rounded-full object-cover" />
                        <span>{m.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{m.role}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">{m.assigned}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-blue-600">{m.completed}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600">{m.approved}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-600">{m.revisions}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-600">{m.overdue}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-500">{m.avgCompletionDays} days</td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono font-black text-emerald-600 text-sm">
                          {m.completionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Individual Member Detailed Report */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {memberReports.map((member) => (
              <div
                key={member.id}
                className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500/20"
                  />
                  <div>
                    <h3 className="font-black text-sm text-slate-900">{member.name}</h3>
                    <p className="text-[11px] text-slate-500">{member.role}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50">
                    <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Assigned</span>
                    <div className="text-lg font-black font-mono text-slate-900 mt-0.5">{member.assigned} Tasks</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50">
                    <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Completed</span>
                    <div className="text-lg font-black font-mono text-blue-600 mt-0.5">{member.completed} Tasks</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50">
                    <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Approved</span>
                    <div className="text-lg font-black font-mono text-emerald-600 mt-0.5">{member.approved} Tasks</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50">
                    <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Completion %</span>
                    <div className="text-lg font-black font-mono text-emerald-700 mt-0.5">{member.completionRate}%</div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>Avg turnaround: <strong>{member.avgCompletionDays} days</strong></span>
                  <span className="text-emerald-600 font-bold">● High Performer</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

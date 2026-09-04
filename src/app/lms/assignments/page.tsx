'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LMS_ROUTES } from '@/lib/lms-routes';
import { LmsLayout } from '@/components/lms/LmsLayout';

export default function LmsAssignmentsPage() {
  const [assignments] = useState([
    {
      id: 'asg-1',
      title: 'Architecting a Multi-Tenant SaaS App Router Repository',
      courseTitle: 'Full-Stack Next.js 16 Masterclass',
      dueDate: 'September 5, 2026',
      status: 'PENDING_SUBMISSION',
      points: 100
    },
    {
      id: 'asg-2',
      title: 'Distributed Consensus with Raft in Go',
      courseTitle: 'Modern Distributed Systems with Go & gRPC',
      dueDate: 'August 30, 2026',
      status: 'GRADED',
      grade: '96 / 100',
      feedback: 'Excellent test coverage and boundary edge case handling!'
    }
  ]);

  return (
    <LmsLayout activePath={LMS_ROUTES.ASSIGNMENTS} pageTitle="Assignments">
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.03] p-6 rounded-3xl border border-emerald-500/20 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 mb-1">
              <Link href={LMS_ROUTES.DASHBOARD} className="hover:text-emerald-400 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-emerald-400">Course Projects</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Hands-On Projects & Assignments
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Submit real-world deliverables, code repositories, and receive instructor reviews.
            </p>
          </div>

          <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-300 flex items-center gap-2 self-start sm:self-auto">
            <span>📝</span>
            <span>Faculty feedback in &lt; 48 hours</span>
          </div>
        </div>

        {/* Assignments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assignments.map((asg) => (
            <div
              key={asg.id}
              className="p-6 rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-5 shadow-xl group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                      asg.status === 'GRADED'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    }`}
                  >
                    {asg.status === 'GRADED' ? `GRADED: ${asg.grade}` : 'SUBMISSION OPEN'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">Due: {asg.dueDate}</span>
                </div>

                <div>
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors leading-snug">
                    {asg.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Course: {asg.courseTitle}</p>
                </div>

                {asg.feedback && (
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300">
                    <strong>Feedback:</strong> {asg.feedback}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Icon name={asg.status === 'GRADED' ? 'check_circle' : 'upload_file'} size={16} />
                <span>{asg.status === 'GRADED' ? 'View Review' : 'Submit Project Repository'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </LmsLayout>
  );
}

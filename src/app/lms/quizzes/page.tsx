'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LMS_ROUTES } from '@/lib/lms-routes';
import { LmsLayout } from '@/components/lms/LmsLayout';

export default function LmsQuizzesPage() {
  const [quizzes] = useState([
    {
      id: 'quiz-1',
      title: 'React Server Components & Action Mutations',
      courseTitle: 'Full-Stack Next.js 16 Masterclass',
      duration: '25 mins',
      questionsCount: 15,
      passingScore: '80%',
      status: 'AVAILABLE',
      bestScore: '94%'
    },
    {
      id: 'quiz-2',
      title: 'Microservices & Distributed Transactions Assessment',
      courseTitle: 'Modern Distributed Systems with Go & gRPC',
      duration: '40 mins',
      questionsCount: 25,
      passingScore: '75%',
      status: 'AVAILABLE',
      bestScore: null
    },
    {
      id: 'quiz-3',
      title: 'Enterprise LLM Prompt Orchestration & Guardrails',
      courseTitle: 'Enterprise AI Agents & LLM Integration',
      duration: '30 mins',
      questionsCount: 20,
      passingScore: '85%',
      status: 'PASSED',
      bestScore: '100%'
    }
  ]);

  return (
    <LmsLayout activePath={LMS_ROUTES.QUIZZES} pageTitle="Quizzes & Tests">
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.03] p-6 rounded-3xl border border-emerald-500/20 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 mb-1">
              <Link href={LMS_ROUTES.DASHBOARD} className="hover:text-emerald-400 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-emerald-400">Assessments</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Quizzes & Knowledge Checks
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Test your understanding of concepts and earn evaluation credits toward graduation.
            </p>
          </div>

          <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-300 flex items-center gap-2 self-start sm:self-auto">
            <span>⏱</span>
            <span>Real-time automatic grading</span>
          </div>
        </div>

        {/* Quizzes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quizzes.map((q) => (
            <div
              key={q.id}
              className="p-6 rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-5 shadow-xl group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                      q.status === 'PASSED'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {q.status === 'PASSED' ? 'PASSED (100%)' : 'READY TO ATTEMPT'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">⏱ {q.duration}</span>
                </div>

                <div>
                  <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors leading-snug">
                    {q.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Course: {q.courseTitle}</p>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs font-mono text-slate-400 border-t border-white/10">
                  <span>Questions: {q.questionsCount}</span>
                  <span>Pass Mark: {q.passingScore}</span>
                </div>
              </div>

              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <Icon name="quiz" size={16} />
                <span>{q.status === 'PASSED' ? 'Retake Quiz' : 'Start Assessment'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </LmsLayout>
  );
}

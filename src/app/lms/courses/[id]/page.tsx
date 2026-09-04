'use client';

import React, { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LMS_ROUTES } from '@/lib/lms-routes';
import { LmsLayout } from '@/components/lms/LmsLayout';

export default function LmsCourseDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;

  const [course, setCourse] = useState<any>({
    id: courseId,
    title: 'Full-Stack Next.js 16 Masterclass',
    description: 'Learn Server Actions, Parallel Routes, Edge Rendering, and Enterprise Scalability from scratch.',
    category: 'Web Development',
    level: 'Advanced',
    duration: '24 Hours',
    rating: 4.9,
    enrolledCount: 1420,
    instructor: {
      name: 'Dr. Sarah Jenkins',
      bio: 'Principal Software Architect & Lead Cloud Instructor',
      avatar: null
    },
    curriculum: [
      {
        title: 'Module 1: Architecture & Server Components',
        lessons: [
          { title: '1.1 Deep Dive into React Server Components', duration: '24m' },
          { title: '1.2 Server Actions and Optimistic Updates', duration: '32m' },
          { title: '1.3 Streaming SSR and Suspense Boundaries', duration: '18m' }
        ]
      },
      {
        title: 'Module 2: Multi-Tenant Database Design',
        lessons: [
          { title: '2.1 Prisma Schema Modeling and Compound Unique Indexes', duration: '28m' },
          { title: '2.2 Dynamic Tenant Routing & Subdomain Resolution', duration: '35m' }
        ]
      }
    ]
  });

  return (
    <LmsLayout activePath={LMS_ROUTES.COURSES} pageTitle="Course Overview">
      <div className="space-y-8 animate-in fade-in duration-200">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400">
          <Link href={LMS_ROUTES.DASHBOARD} className="hover:text-emerald-400">
            Dashboard
          </Link>
          <span>/</span>
          <Link href={LMS_ROUTES.COURSES} className="hover:text-emerald-400">
            Courses
          </Link>
          <span>/</span>
          <span className="text-emerald-400 truncate">{course.title}</span>
        </div>

        {/* Hero Section */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-[#0d182e] to-[#0a2022] border border-emerald-500/30 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
              {course.category}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {course.title}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {course.description}
            </p>

            <div className="flex flex-wrap items-center gap-5 pt-2 text-xs font-mono text-slate-400">
              <span>⭐ {course.rating} Rating</span>
              <span>👥 {course.enrolledCount} Learners Enrolled</span>
              <span>⏱ {course.duration} Content</span>
              <span>🎖 Accredited Certificate Included</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/15 space-y-4 shrink-0 w-full md:w-72 text-center shadow-xl">
            <div className="text-2xl font-black text-white">Full Access</div>
            <p className="text-[11px] text-slate-400">Included in your organization membership</p>
            <Link
              href={LMS_ROUTES.LEARN(courseId)}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Icon name="play_arrow" size={18} />
              <span>Launch Course Player</span>
            </Link>
          </div>
        </div>

        {/* Curriculum Outline */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <span>📚</span>
            <span>Curriculum Outline</span>
          </h2>

          <div className="space-y-4">
            {course.curriculum.map((mod: any, idx: number) => (
              <div key={idx} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <h3 className="text-sm font-bold text-emerald-300">{mod.title}</h3>
                <div className="space-y-2">
                  {mod.lessons.map((lesson: any, lIdx: number) => (
                    <div
                      key={lIdx}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs text-slate-300"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon name="play_circle" size={16} className="text-emerald-400" />
                        <span>{lesson.title}</span>
                      </div>
                      <span className="font-mono text-slate-400">{lesson.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LmsLayout>
  );
}

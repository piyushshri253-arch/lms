'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LMS_ROUTES } from '@/lib/lms-routes';
import { LmsLayout } from '@/components/lms/LmsLayout';

export default function LmsCoursesCatalogPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCourses() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/courses?category=${selectedCategory}&search=${encodeURIComponent(search)}`);
        if (res.ok) {
          const data = await res.json();
          setCourses(data.courses || data || []);
        }
      } catch {
        // Fallback default courses for catalog preview
        setCourses([
          {
            id: 'c-101',
            title: 'Modern Distributed Systems with Go & gRPC',
            slug: 'distributed-systems-go-grpc',
            category: 'Backend Engineering',
            description: 'Architect resilient microservices, distributed consensus protocols, and low-latency APIs.',
            instructor: { name: 'Elena Rostova' },
            level: 'Advanced',
            duration: '18h 45m',
            lessonsCount: 36,
            rating: 4.9,
            enrollmentsCount: 1420
          },
          {
            id: 'c-102',
            title: 'Kubernetes Platform Engineering & Cloud Native DevOps',
            slug: 'k8s-cloud-native-devops',
            category: 'DevOps & Cloud',
            description: 'Master multi-cluster Kubernetes deployments, GitOps pipelines, and zero-downtime rollouts.',
            instructor: { name: 'Marcus Chen' },
            level: 'Intermediate',
            duration: '22h 10m',
            lessonsCount: 44,
            rating: 4.8,
            enrollmentsCount: 2180
          },
          {
            id: 'c-103',
            title: 'Applied Generative AI & Fine-Tuning LLMs',
            slug: 'applied-genai-llm-finetuning',
            category: 'Artificial Intelligence',
            description: 'Build production RAG pipelines, LoRA fine-tuning workflows, and autonomous evaluation benchmarks.',
            instructor: { name: 'Dr. Sarah Jenkins' },
            level: 'Advanced',
            duration: '16h 30m',
            lessonsCount: 28,
            rating: 5.0,
            enrollmentsCount: 3890
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCourses();
  }, [selectedCategory, search]);

  return (
    <LmsLayout activePath={LMS_ROUTES.COURSES} pageTitle="Course Catalog">
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.03] p-6 rounded-3xl border border-emerald-500/20 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 mb-1">
              <Link href={LMS_ROUTES.DASHBOARD} className="hover:text-emerald-400 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-emerald-400">Course Catalog</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Explore Masterclasses & Curricula
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Acquire verified competencies taught by industry practitioners and accredited educators.
            </p>
          </div>

          <Link
            href={LMS_ROUTES.MY_COURSES}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl border border-white/15 flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Icon name="auto_stories" size={16} />
            <span>My Enrolled Courses</span>
          </Link>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/10 shadow-lg">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {['ALL', 'Backend Engineering', 'DevOps & Cloud', 'Artificial Intelligence', 'UI/UX Design'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {cat === 'ALL' ? 'All Curricula' : cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search catalog..."
              className="w-full bg-white/[0.04] border border-white/15 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Catalog Grid */}
        {isLoading ? (
          <div className="py-16 text-center text-xs font-mono text-slate-400">
            Loading course catalog...
          </div>
        ) : courses.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white/[0.02] border border-white/10 text-center space-y-3">
            <div className="text-4xl">🔍</div>
            <h3 className="text-base font-bold text-white">No matching courses found</h3>
            <p className="text-xs text-slate-400">Try changing your search query or filter selection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="p-6 rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4 shadow-xl group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      {course.category || 'Curriculum'}
                    </span>
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                      ⭐ {course.rating || '4.9'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white group-hover:text-emerald-300 transition-colors leading-snug">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center gap-4 text-xs font-mono text-slate-400">
                    <span>⏱ {course.duration || '12h'}</span>
                    <span>📖 {course.lessonsCount || 24} lessons</span>
                    <span>👤 {course.instructor?.name || 'Lead Instructor'}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center gap-3">
                  <Link
                    href={LMS_ROUTES.COURSE_DETAILS(course.id || course.slug)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-white/10"
                  >
                    <span>View Syllabus</span>
                  </Link>

                  <Link
                    href={LMS_ROUTES.LEARN(course.id || course.slug)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    <span>Enroll Now</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </LmsLayout>
  );
}

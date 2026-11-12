'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { InstructorPortalShell } from '@/components/instructor/InstructorPortalShell';
import { Icon } from '@/components/ui/Icon';

interface CourseSeoItem {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  categoryName: string;
  status: string;
  price: number;
  discountPrice?: number | null;
  thumbnail: string;
  banner: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  keywords: string[];
  robotsIndex: boolean;
  canonicalUrl: string;
  seoScore: number;
  seoChecks: Array<{ label: string; passed: boolean; hint: string }>;
  updatedAt: string;
}

interface InstructorSeoStats {
  totalCourses: number;
  avgScore: number;
  optimizedCount: number;
  indexedCount: number;
}

export default function InstructorCourseSeoPage() {
  const [courses, setCourses] = useState<CourseSeoItem[]>([]);
  const [stats, setStats] = useState<InstructorSeoStats>({
    totalCourses: 0,
    avgScore: 0,
    optimizedCount: 0,
    indexedCount: 0
  });
  const [instructorInfo, setInstructorInfo] = useState<{ id: string; name: string; email: string } | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ title: string; description?: string; type?: string } | null>(null);

  // Read-only Display State for Selected Course
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [robotsIndex, setRobotsIndex] = useState(true);
  const [previewTab, setPreviewTab] = useState<'GOOGLE_SERP' | 'SOCIAL_OG' | 'LANDING_PAGE'>('GOOGLE_SERP');

  const showToast = (msg: { title: string; description?: string; type?: string }) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const populateViewData = (course: CourseSeoItem) => {
    setSeoTitle(course.seoTitle || course.title || '');
    setSeoDescription(
      course.seoDescription || course.shortDescription || course.description?.slice(0, 155) || ''
    );
    setSlug(course.slug || '');
    setOgImage(course.ogImage || course.banner || course.thumbnail || '');
    setKeywords(Array.isArray(course.keywords) ? course.keywords : []);
    setRobotsIndex(course.robotsIndex !== false);
  };

  const loadSeoData = async (keepCourseId?: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/instructor/course-seo');
      const data = await res.json();
      if (res.ok && Array.isArray(data.courses)) {
        setCourses(data.courses);
        if (data.stats) setStats(data.stats);
        if (data.instructor) setInstructorInfo(data.instructor);

        const targetId = keepCourseId || selectedCourseId || data.courses[0]?.id || '';
        setSelectedCourseId(targetId);
        const found = data.courses.find((c: CourseSeoItem) => c.id === targetId) || data.courses[0];
        if (found) populateViewData(found);
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to load your courses SEO data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeoData();
  }, []);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || null;

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    const found = courses.find((c) => c.id === courseId);
    if (found) populateViewData(found);
  };

  const liveChecks = [
    {
      label: 'SEO Title (30–60 chars)',
      passed: seoTitle.trim().length >= 25 && seoTitle.trim().length <= 65,
      detail: `${seoTitle.trim().length} / 60 chars`
    },
    {
      label: 'Meta Description (100–160 chars)',
      passed: seoDescription.trim().length >= 80 && seoDescription.trim().length <= 165,
      detail: `${seoDescription.trim().length} / 160 chars`
    },
    {
      label: 'Clean Search URL Slug',
      passed: slug.trim().length >= 4 && !slug.includes(' '),
      detail: `/courses/${slug || 'missing'}`
    },
    {
      label: 'OG Social Share Image',
      passed: ogImage.trim().length > 5,
      detail: ogImage ? 'Configured' : 'Missing'
    },
    {
      label: 'Search Keywords (3+ tags)',
      passed: keywords.length >= 3,
      detail: `${keywords.length} keywords`
    }
  ];
  const liveScore = Math.round(
    (liveChecks.filter((c) => c.passed).length / liveChecks.length) * 100
  );

  return (
    <InstructorPortalShell
      title="Courses SEO & Ads"
      subtitle="View search engine rankings, Google SERP snippets, OpenGraph social sharing, and discoverability metrics for your authored courses"
    >
      {toastMsg && (
        <div
          className={`mb-4 p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            toastMsg.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div>
            <span className="font-bold">{toastMsg.title}</span>
            {toastMsg.description && <span className="ml-2 font-normal">{toastMsg.description}</span>}
          </div>
          <button onClick={() => setToastMsg(null)} className="text-slate-500 hover:text-slate-800">
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-slate-500 text-sm space-y-2">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-medium text-xs text-slate-600">Loading your authored courses and SEO data...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-xs max-w-xl mx-auto my-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-2xl font-black">
            <Icon name="travel_explore" size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">No Courses Found for Your Account</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              You haven&apos;t created any courses yet. Once you create courses in the Course Builder, their SEO metadata, Google Search preview, and ads discoverability report will appear here.
            </p>
          </div>
          <Link
            href="/instructor/courses/builder"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <Icon name="add" size={16} />
            <span>Create New Course →</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. TOP STATS CARDS (Aggregated ONLY for this instructor's courses) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                <span>My Authored Courses</span>
                <span className="text-indigo-600 font-mono text-[11px]">Instructor</span>
              </div>
              <div className="text-2xl font-black text-slate-900">{stats.totalCourses}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {instructorInfo?.name ? `Created by ${instructorInfo.name}` : 'Your course catalog'}
              </p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                <span>Average SEO Score</span>
                <span className="text-emerald-600 font-mono text-[11px]">Rank</span>
              </div>
              <div className="text-2xl font-black text-emerald-600">{stats.avgScore}%</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Across all your courses</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                <span>Optimized Courses</span>
                <span className="text-blue-600 font-mono text-[11px]">≥80%</span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {stats.optimizedCount} <span className="text-xs text-slate-400 font-normal">/ {stats.totalCourses}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Search readiness pass</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                <span>Google Indexed</span>
                <span className="text-purple-600 font-mono text-[11px]">Robots</span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {stats.indexedCount} <span className="text-xs text-slate-400 font-normal">/ {stats.totalCourses}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Eligible for search results</p>
            </div>
          </div>

          {/* 2. COURSE SELECTOR & LIVE SCORE HEADER (View Only) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="flex-1 max-w-md">
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                Select Your Course to View SEO &amp; Ads Report
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => handleSelectCourse(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-600 cursor-pointer"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} — (SEO Score: {c.seoScore}%)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold">
                <Icon name="visibility" size={15} />
                <span>View-Only Report</span>
              </span>

              <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-900 text-white shadow-2xs">
                <div>
                  <div className="text-[10px] font-mono uppercase text-slate-400">Course SEO Score</div>
                  <div
                    className={`text-lg font-black leading-none ${
                      liveScore >= 80
                        ? 'text-emerald-400'
                        : liveScore >= 50
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {liveScore} / 100
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. 2-COLUMN READ-ONLY VIEW */}
          {selectedCourse && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 6 Columns: Read-Only SEO Metadata Inspection */}
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-extrabold text-slate-900">
                      Search Engine &amp; Social Metadata
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold">
                      <Icon name="lock" size={11} />
                      View Only
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    Course ID: {selectedCourse.id.slice(-6)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-800 leading-relaxed flex items-start gap-2">
                  <Icon name="info" size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    This dashboard is <strong>read-only</strong> for instructors. SEO titles, meta descriptions, keywords, and ad visibility settings are managed by the SEO &amp; Marketing team.
                  </span>
                </div>

                {/* 1. SEO Title */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      1. SEO Title (<code className="text-indigo-600">&lt;title&gt;</code>)
                    </label>
                    <span
                      className={`text-[11px] font-mono font-bold ${
                        seoTitle.length > 60 ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {seoTitle.length} / 60 chars
                    </span>
                  </div>
                  <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 select-text">
                    {seoTitle || <span className="text-slate-400 italic font-normal">Not configured yet</span>}
                  </div>
                </div>

                {/* 2. Meta Description */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      2. Meta Description (<code className="text-indigo-600">meta[name=&quot;description&quot;]</code>)
                    </label>
                    <span
                      className={`text-[11px] font-mono font-bold ${
                        seoDescription.length > 160 ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {seoDescription.length} / 160 chars
                    </span>
                  </div>
                  <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700 leading-relaxed min-h-[72px] select-text">
                    {seoDescription || <span className="text-slate-400 italic">Not configured yet</span>}
                  </div>
                </div>

                {/* 3. URL Slug */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    3. Public Course URL Slug
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                    <span className="px-3 py-2.5 text-[11px] font-mono text-slate-500 border-r border-slate-200 select-none bg-slate-100/70">
                      https://morena.lms/courses/
                    </span>
                    <span className="flex-1 px-3 py-2.5 text-xs font-mono font-bold text-indigo-700 truncate select-text">
                      {slug || 'not-set'}
                    </span>
                  </div>
                </div>

                {/* 4. OG Image */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    4. OpenGraph (OG) Social Share Image URL
                  </label>
                  <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-700 font-mono truncate select-text">
                    {ogImage || <span className="text-slate-400 italic font-sans">No OG Image URL configured</span>}
                  </div>
                </div>

                {/* 5. Target Keywords */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    5. Search Keywords &amp; Marketplace Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200 min-h-[46px]">
                    {keywords.length > 0 ? (
                      keywords.map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-semibold"
                        >
                          #{kw}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No search keywords assigned yet.</span>
                    )}
                  </div>
                </div>

                {/* 6. Search Engine Indexing Status (Read-Only) */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Search Engine Indexing Status (Google / Bing)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Meta directive:{' '}
                      <code className="text-emerald-700 font-mono">
                        {robotsIndex ? 'robots="index, follow"' : 'robots="noindex, nofollow"'}
                      </code>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
                      robotsIndex
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    {robotsIndex ? '✓ Indexed' : 'No-Index'}
                  </span>
                </div>
              </div>

              {/* Right 6 Columns: Live Google SERP, Social OpenGraph & Landing-Page Previews */}
              <div className="lg:col-span-6 space-y-5">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-extrabold text-slate-900">
                      Live Search, Social &amp; Landing-Page Preview
                    </h2>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setPreviewTab('GOOGLE_SERP')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                          previewTab === 'GOOGLE_SERP'
                            ? 'bg-white text-indigo-700 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Google Search
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTab('SOCIAL_OG')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                          previewTab === 'SOCIAL_OG'
                            ? 'bg-white text-indigo-700 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        OG Social Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTab('LANDING_PAGE')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                          previewTab === 'LANDING_PAGE'
                            ? 'bg-white text-indigo-700 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Landing Card
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: GOOGLE SERP SNIPPET PREVIEW */}
                  {previewTab === 'GOOGLE_SERP' && (
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                        Google Search Result Preview (Desktop &amp; Mobile)
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-[11px]">
                            M
                          </div>
                          <div>
                            <div className="text-[12px] font-semibold text-slate-800 leading-none">
                              Morena Teach LMS
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              https://morena.lms › courses › {slug || 'course-slug'}
                            </div>
                          </div>
                        </div>
                        <h3 className="text-lg font-medium text-[#1a0dab] leading-snug pt-1">
                          {seoTitle || selectedCourse.title}
                        </h3>
                        <p className="text-xs text-[#4d5156] leading-relaxed">
                          {seoDescription ||
                            'Meta description will appear here once configured for Google Search results.'}
                        </p>
                        <div className="pt-1 flex items-center gap-3 text-[11px] text-slate-500">
                          <span className="text-amber-500 font-bold">★★★★★ Rating: 5.0</span>
                          <span>•</span>
                          <span>
                            Price: {selectedCourse.price > 0 ? `₹${selectedCourse.price}` : 'Free'}
                          </span>
                          <span>•</span>
                          <span>{selectedCourse.categoryName}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: SOCIAL OPENGRAPH CARD PREVIEW */}
                  {previewTab === 'SOCIAL_OG' && (
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                        LinkedIn / WhatsApp / X (Twitter) OpenGraph Share Card
                      </div>
                      <div className="rounded-xl overflow-hidden border border-slate-300 bg-white shadow-xs max-w-md mx-auto">
                        <div className="aspect-[1.91/1] bg-slate-900 relative overflow-hidden flex items-center justify-center">
                          {ogImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ogImage}
                              alt="OG Preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-xs text-slate-400 p-6 text-center">
                              No OG Image Configured (1200×630)
                            </div>
                          )}
                        </div>
                        <div className="p-4 bg-slate-100 border-t border-slate-200 space-y-1">
                          <div className="text-[10px] font-mono uppercase text-slate-500">
                            MORENA.LMS
                          </div>
                          <div className="text-sm font-bold text-slate-900 line-clamp-1">
                            {seoTitle || selectedCourse.title}
                          </div>
                          <div className="text-xs text-slate-600 line-clamp-2">
                            {seoDescription}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: COURSE LANDING SUMMARY CARD (View-Only) */}
                  {previewTab === 'LANDING_PAGE' && (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 text-white p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                          {selectedCourse.categoryName}
                        </span>
                        <span className="text-xs font-mono text-emerald-400">
                          /courses/{slug}
                        </span>
                      </div>
                      <h3 className="text-lg font-black leading-snug">
                        {selectedCourse.title}
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {seoDescription}
                      </p>
                      <div className="flex items-center justify-between pt-3 border-t border-white/10">
                        <div>
                          <span className="text-xl font-black text-white">
                            {selectedCourse.price > 0 ? `₹${selectedCourse.price}` : 'Free'}
                          </span>
                          {selectedCourse.discountPrice && (
                            <span className="text-xs text-slate-400 line-through ml-2">
                              ₹{selectedCourse.discountPrice}
                            </span>
                          )}
                        </div>
                        <span className="px-3 py-1 rounded-lg bg-white/10 text-slate-300 text-[11px] font-bold">
                          Status: {selectedCourse.status}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* SEO Readiness Audit Checklist */}
                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-bold text-slate-800">
                      SEO Readiness Checklist
                    </div>
                    <div className="space-y-1.5">
                      {liveChecks.map((chk, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Icon
                              name={chk.passed ? 'check_circle' : 'error'}
                              size={16}
                              className={chk.passed ? 'text-emerald-600' : 'text-amber-500'}
                            />
                            <span className="font-semibold text-slate-800">{chk.label}</span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-500">{chk.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. BOTTOM SECTION: MY COURSES SEO & ADS REPORT TABLE (Strictly This Instructor's Courses Only - View Only) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  My Courses SEO &amp; Ads Catalog ({courses.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Read-only overview of SEO metrics and search readiness across all courses created under your instructor profile.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3">Course Title</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">SEO Score</th>
                    <th className="py-2.5 px-3">Search URL</th>
                    <th className="py-2.5 px-3">Google Index</th>
                    <th className="py-2.5 px-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {courses.map((c) => (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        c.id === selectedCourseId ? 'bg-indigo-50/40 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          {c.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.thumbnail}
                              alt=""
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black shrink-0">
                              📚
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate max-w-[240px]">
                              {c.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Updated {new Date(c.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {c.categoryName}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            c.seoScore >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.seoScore >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {c.seoScore}%
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-indigo-600 truncate max-w-[160px]">
                        /courses/{c.slug}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            c.robotsIndex ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.robotsIndex ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          />
                          {c.robotsIndex ? 'Indexed' : 'No-Index'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectCourse(c.id);
                            window.scrollTo({ top: 120, behavior: 'smooth' });
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            c.id === selectedCourseId
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {c.id === selectedCourseId ? 'Viewing' : 'View SEO'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </InstructorPortalShell>
  );
}

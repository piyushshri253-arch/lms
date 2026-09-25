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

export default function InstructorCourseSeoPage() {
  const [courses, setCourses] = useState<CourseSeoItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ title: string; description?: string; type?: string } | null>(null);

  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [robotsIndex, setRobotsIndex] = useState(true);
  const [previewTab, setPreviewTab] = useState<'GOOGLE_SERP' | 'SOCIAL_OG' | 'LANDING_PAGE'>('GOOGLE_SERP');

  const showToast = (msg: { title: string; description?: string; type?: string }) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const populateForm = (course: CourseSeoItem) => {
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
        const targetId = keepCourseId || selectedCourseId || data.courses[0]?.id || '';
        setSelectedCourseId(targetId);
        const found = data.courses.find((c: CourseSeoItem) => c.id === targetId) || data.courses[0];
        if (found) populateForm(found);
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to load course SEO data.', type: 'error' });
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
    if (found) populateForm(found);
  };

  const handleAddKeyword = () => {
    const cleaned = keywordInput
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k && !keywords.includes(k));
    if (cleaned.length > 0) {
      setKeywords([...keywords, ...cleaned]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const handleAutoGenerateSeo = () => {
    if (!selectedCourse) return;
    const autoTitle = `${selectedCourse.title} | ${selectedCourse.categoryName} Online Course`.slice(
      0,
      60
    );
    const autoDesc = (
      selectedCourse.shortDescription ||
      selectedCourse.description ||
      `Enroll in ${selectedCourse.title}. Master real-world concepts with hands-on projects, quizzes, and verified certification.`
    ).slice(0, 155);
    const autoSlug = selectedCourse.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    setSeoTitle(autoTitle);
    setSeoDescription(autoDesc);
    setSlug(autoSlug);
    if (!ogImage) setOgImage(selectedCourse.banner || selectedCourse.thumbnail || '');
    if (keywords.length === 0) {
      setKeywords([
        selectedCourse.categoryName.toLowerCase(),
        ...selectedCourse.title
          .toLowerCase()
          .split(' ')
          .filter((w) => w.length > 3)
          .slice(0, 4),
        'online course',
        'certificate'
      ]);
    }
    showToast({
      title: 'SEO Auto-Generated',
      description: 'Optimized SEO title, meta description, slug, and keywords filled.',
      type: 'info'
    });
  };

  const handleSaveSeo = async () => {
    if (!selectedCourse) return;
    try {
      setSaving(true);
      const res = await fetch('/api/instructor/course-seo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          seoTitle,
          seoDescription,
          slug,
          ogImage,
          keywords,
          robotsIndex
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save SEO settings');

      showToast({
        title: 'Course SEO Saved ✓',
        description: `SEO score is now ${data.seoScore}% for "${selectedCourse.title}".`,
        type: 'success'
      });
      await loadSeoData(selectedCourse.id);
    } catch (err: any) {
      showToast({ title: 'Save Error', description: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
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
      title="Course SEO, Social OpenGraph & Landing-Page Preview"
      subtitle="Optimize your public courses for Google Search (SERP), social sharing (OG Image), search keywords, and student landing-page conversion."
      actions={
        <div className="flex items-center gap-2.5">
          {selectedCourse && (
            <Link
              href={`/instructor/courses/preview/${encodeURIComponent(selectedCourse.id)}`}
              target="_blank"
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Icon name="visibility" size={16} />
              <span>Preview Course Landing Page</span>
            </Link>
          )}
          <button
            onClick={handleSaveSeo}
            disabled={saving || !selectedCourse}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
          >
            <Icon name="save" size={16} />
            <span>{saving ? 'Saving SEO...' : 'Save SEO Metadata'}</span>
          </button>
        </div>
      }
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
        <div className="p-12 text-center text-slate-500 text-sm">
          Loading courses and SEO configurations...
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
          <Icon name="travel_explore" size={36} className="text-indigo-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Courses Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Create a course first in the Course Builder to configure its SEO title, meta description, URL slug, and OpenGraph image.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Course Selector & Live SEO Score Header */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="flex-1 max-w-md">
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                Select Course to Optimize for Search Engines
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => handleSelectCourse(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-slate-50"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} — (SEO Score: {c.seoScore}%)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleAutoGenerateSeo}
                className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Icon name="auto_awesome" size={16} />
                <span>Smart Auto-Fill SEO</span>
              </button>

              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900 text-white">
                <div>
                  <div className="text-[10px] font-mono uppercase text-slate-400">Live SEO Score</div>
                  <div
                    className={`text-lg font-black ${
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

          {selectedCourse && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 6 Columns: SEO Metadata Form */}
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                <h2 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">
                  Search Engine & Social Metadata Fields
                </h2>

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
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="e.g. Complete System Design Masterclass (2026) | Morena LMS"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-900"
                  />
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
                  <textarea
                    rows={3}
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="Summarize what students will build, key technologies covered, and certification benefits..."
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 leading-relaxed"
                  />
                </div>

                {/* 3. URL Slug */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    3. Public Course URL Slug
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                    <span className="px-3 py-2.5 text-[11px] font-mono text-slate-500 border-r border-slate-200 select-none">
                      https://morena.lms/courses/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) =>
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, '-')
                            .replace(/-+/g, '-')
                        )
                      }
                      className="flex-1 bg-white px-3 py-2.5 text-xs font-mono font-bold text-indigo-700 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 4. OG Image */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      4. OpenGraph (OG) Social Share Image URL (1200×630 recommended)
                    </label>
                    {selectedCourse.thumbnail && (
                      <button
                        type="button"
                        onClick={() => setOgImage(selectedCourse.thumbnail)}
                        className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Use Course Thumbnail
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={ogImage}
                    onChange={(e) => setOgImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800"
                  />
                </div>

                {/* 5. Target Keywords */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    5. Search Keywords & Marketplace Tags
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddKeyword();
                        }
                      }}
                      placeholder="Add keyword (e.g. nextjs, system design, fullstack) and press Enter"
                      className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={handleAddKeyword}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {keywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-semibold"
                      >
                        <span>#{kw}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(kw)}
                          className="text-indigo-400 hover:text-indigo-800 cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Search Engine Indexing Toggle */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Allow Search Engines (Google / Bing) to Index Course
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Sets <code className="text-emerald-700">robots=&quot;index, follow&quot;</code> when published.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={robotsIndex}
                    onChange={(e) => setRobotsIndex(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600"
                  />
                </label>
              </div>

              {/* Right 6 Columns: Live Google SERP, Social OpenGraph & Landing-Page Previews */}
              <div className="lg:col-span-6 space-y-5">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-extrabold text-slate-900">
                      Live Search, Social & Landing-Page Preview
                    </h2>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setPreviewTab('GOOGLE_SERP')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                          previewTab === 'GOOGLE_SERP'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-600'
                        }`}
                      >
                        Google Search
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTab('SOCIAL_OG')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                          previewTab === 'SOCIAL_OG'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-600'
                        }`}
                      >
                        OG Social Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTab('LANDING_PAGE')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                          previewTab === 'LANDING_PAGE'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-600'
                        }`}
                      >
                        Landing Page
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: GOOGLE SERP SNIPPET PREVIEW */}
                  {previewTab === 'GOOGLE_SERP' && (
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                        Google Search Result Preview (Desktop & Mobile)
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
                        <h3 className="text-lg font-medium text-[#1a0dab] hover:underline cursor-pointer leading-snug pt-1">
                          {seoTitle || selectedCourse.title}
                        </h3>
                        <p className="text-xs text-[#4d5156] leading-relaxed">
                          {seoDescription ||
                            'Add a compelling meta description between 100 and 160 characters so students click your course in Google Search results.'}
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
                      <div className="rounded-xl overflow-hidden border border-slate-300 bg-white shadow-sm max-w-md mx-auto">
                        <div className="aspect-[1.91/1] bg-slate-900 relative overflow-hidden flex items-center justify-center">
                          {ogImage ? (
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

                  {/* TAB 3: COURSE LANDING PAGE PREVIEW CARD */}
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
                        <Link
                          href={`/instructor/courses/preview/${encodeURIComponent(selectedCourse.id)}`}
                          target="_blank"
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5"
                        >
                          <Icon name="open_in_new" size={15} />
                          <span>Open Full Student Landing Page</span>
                        </Link>
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
        </div>
      )}
    </InstructorPortalShell>
  );
}

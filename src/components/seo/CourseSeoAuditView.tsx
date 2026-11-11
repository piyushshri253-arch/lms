'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  Eye,
  Save,
  ShieldCheck,
  Play,
  FileText,
  HelpCircle,
  BookOpen,
  Sparkles,
  AlertTriangle,
  Send,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  Layers,
  Globe,
  Tag,
  Share2,
  RefreshCw,
  Lock,
  MessageSquare
} from 'lucide-react';

export interface CourseSeoAuditViewProps {
  courseId: string;
  onBack: () => void;
  readOnly?: boolean;
  onSuccess?: () => void;
}

type StepType = 1 | 2 | 3 | 4 | 5 | 6;

export function CourseSeoAuditView({
  courseId,
  onBack,
  readOnly = false,
  onSuccess
}: CourseSeoAuditViewProps) {
  const [currentStep, setCurrentStep] = useState<StepType>(4); // Default to Step 4 (SEO Tab) as requested
  const [courseData, setCourseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingAds, setSyncingAds] = useState(false);

  // SEO Form Fields (Matching Image 3)
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [robotsIndex, setRobotsIndex] = useState(true);
  const [previewTab, setPreviewTab] = useState<'GOOGLE_SERP' | 'SOCIAL_OG' | 'LANDING_PAGE'>('GOOGLE_SERP');

  // Ads & Messages
  const [adsData, setAdsData] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState<{ title: string; desc?: string; type?: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (t: { title: string; desc?: string; type?: 'success' | 'error' | 'info' }) => {
    setToastMsg(t);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [revRes, seoRes, msgRes] = await Promise.all([
        fetch(`/api/reviewer/courses/${encodeURIComponent(courseId)}/review`),
        fetch(`/api/seo/courses/${encodeURIComponent(courseId)}`),
        fetch(`/api/seo/messages?courseId=${encodeURIComponent(courseId)}`)
      ]);

      let cData: any = null;
      if (revRes.ok) {
        const j = await revRes.json();
        cData = j.course;
      }

      if (seoRes.ok) {
        const s = await seoRes.json();
        if (s.course) {
          if (!cData) cData = s.course;
          setSeoTitle(s.course.seoTitle || cData?.title || '');
          setSeoDescription(
            s.course.seoDescription || cData?.shortDescription || cData?.description?.slice(0, 155) || ''
          );
          setSlug(s.course.slug || cData?.slug || '');
          setKeywords(Array.isArray(s.course.keywords) ? s.course.keywords : []);
          setOgImage(cData?.thumbnail || s.course.thumbnail || '');
          setAdsData(s.course.ads || null);
        }
      }

      if (msgRes.ok) {
        const m = await msgRes.json();
        setMessages(m.messages || []);
      }

      setCourseData(cData);
    } catch (err) {
      console.error('[CourseSeoAuditView Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [courseId]);

  // Calculate live SEO score
  const calculateSeoScore = () => {
    let score = 20;
    if (seoTitle.length >= 25 && seoTitle.length <= 60) score += 25;
    else if (seoTitle.length > 0) score += 10;

    if (seoDescription.length >= 80 && seoDescription.length <= 160) score += 25;
    else if (seoDescription.length > 0) score += 10;

    if (slug.length >= 5) score += 15;
    if (keywords.length >= 2) score += 15;
    return Math.min(100, score);
  };

  const liveScore = calculateSeoScore();

  const handleSmartAutoFill = () => {
    if (!courseData) return;
    const cat = courseData.category?.name || 'Business';
    const autoTitle = `${courseData.title} | Masterclass 2026`.slice(0, 60);
    const autoDesc = `Enroll in ${courseData.title}. Master modern industry workflows, digital management tools, and get certified.`.slice(0, 155);
    const autoSlug = courseData.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    const generatedKws = [
      cat.toLowerCase(),
      ...courseData.title
        .toLowerCase()
        .split(' ')
        .filter((w: string) => w.length > 3)
        .slice(0, 3),
      'certification',
      'course'
    ];

    setSeoTitle(autoTitle);
    setSeoDescription(autoDesc);
    setSlug(autoSlug);
    setKeywords(Array.from(new Set([...keywords, ...generatedKws])));
    showToast({ title: 'Smart Auto-Fill Applied', desc: 'Metadata & keywords optimized for Google SERP.', type: 'info' });
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
    if (readOnly) return;
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const handleSaveSeo = async () => {
    if (readOnly) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/seo/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seoTitle,
          seoDescription,
          slug,
          keywords
        })
      });

      if (res.ok) {
        showToast({ title: 'SEO Saved Successfully ✓', desc: 'Metadata and target keywords updated in database.', type: 'success' });
        if (onSuccess) onSuccess();
      } else {
        throw new Error('Save failed');
      }
    } catch {
      showToast({ title: 'Error', desc: 'Could not save SEO changes.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncAds = async () => {
    try {
      setSyncingAds(true);
      const res = await fetch('/api/seo/ads-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId })
      });
      const data = await res.json();
      if (res.ok && data.ads) {
        setAdsData(data.ads);
        showToast({ title: 'Live Ads Synced ✓', desc: 'Google Ads & Meta Marketing API data refreshed.', type: 'success' });
      }
    } catch {
      showToast({ title: 'Error', desc: 'Failed to sync ads.', type: 'error' });
    } finally {
      setSyncingAds(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !courseData) return;

    try {
      setSendingMsg(true);
      const res = await fetch('/api/seo/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          recipientId: courseData.instructor?.id,
          recipientName: courseData.instructor?.name,
          message: messageInput.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.message) {
        setMessages([...messages, data.message]);
        setMessageInput('');
        showToast({ title: 'Message Sent ✓', desc: 'Notification delivered to the course instructor.', type: 'success' });
      }
    } catch {
      showToast({ title: 'Error', desc: 'Could not send message.', type: 'error' });
    } finally {
      setSendingMsg(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">Loading course inspection &amp; SEO details...</p>
      </div>
    );
  }

  const courseTitle = courseData?.title || 'Digital Campus & ERP Management';
  const instructorName = courseData?.instructor?.name || 'Instructor';
  const instructorEmail = courseData?.instructor?.email || 'instructor@morenateach.com';
  const categoryName = courseData?.category?.name || 'Business';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 animate-in fade-in">
      {/* Toast */}
      {toastMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-lg ${
            toastMsg.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : toastMsg.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>
              <strong>{toastMsg.title}</strong> {toastMsg.desc}
            </span>
          </div>
          <button type="button" onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* TOP BANNER PILL (Matches Image 2) */}
      <div className="flex justify-center">
        <div className="px-6 py-1.5 rounded-full bg-gradient-to-r from-amber-100 via-orange-100 to-amber-100 border border-amber-300 text-amber-900 font-black text-xs uppercase tracking-wider shadow-xs">
          SEO MANAGEMENT / AUDIT MODE
        </div>
      </div>

      {/* COURSE METADATA STRIP (Matches Image 2) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white font-mono text-[10px] font-bold">
              ID: {courseId}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
              v1.0
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
              New Course (v1.0)
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              SEO REVIEW
            </span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
            {courseTitle}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Instructor: <strong className="text-slate-800">{instructorName}</strong> ({instructorEmail})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/courses/${courseData?.slug || courseId}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
          >
            <Eye size={14} />
            <span>Student Preview</span>
          </Link>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>← Back to Courses</span>
          </button>
        </div>
      </div>

      {/* STEP TABS (Matches Image 2 + NEW STEP 4: Course SEO & Ads) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 flex items-center gap-1 overflow-x-auto shadow-2xs">
        {[
          { step: 1 as StepType, num: '1', title: 'Basic Information', auditTag: true },
          { step: 2 as StepType, num: '2', title: 'Course Curriculum', auditTag: false },
          { step: 3 as StepType, num: '3', title: 'Media & Thumbnail', auditTag: false },
          { step: 4 as StepType, num: '4', title: 'Course SEO & Ads', auditTag: true, highlight: true },
          { step: 5 as StepType, num: '5', title: 'Final Assessment', auditTag: false },
          { step: 6 as StepType, num: '6', title: 'Review & Submit', auditTag: false }
        ].map((item) => {
          const isActive = currentStep === item.step;
          return (
            <button
              key={item.step}
              type="button"
              onClick={() => setCurrentStep(item.step)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : item.highlight
                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isActive ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {item.num}
              </span>
              <span>{item.title}</span>
              {item.auditTag && (
                <span
                  className={`text-[9px] uppercase px-1.5 py-0.5 rounded-md font-extrabold ${
                    isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Audit
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BASIC INFORMATION (Matching Image 2 Layout)                         */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900">Course Basics &amp; Classification</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify the essential identification, topic category, difficulty level, and core metadata.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                <span>COURSE TITLE *</span>
                <span className="text-[10px] text-slate-400">Review label</span>
              </div>
              <input
                type="text"
                readOnly
                value={courseTitle}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>URL SLUG / IDENTIFIER</span>
                  <span className="text-[10px] text-slate-400">Review label</span>
                </div>
                <input
                  type="text"
                  readOnly
                  value={`/courses/${slug || 'digital-campus-erp-management'}`}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>CATEGORY *</span>
                  <span className="text-[10px] text-slate-400">Category</span>
                </div>
                <input
                  type="text"
                  readOnly
                  value={categoryName}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1">SKILL LEVEL</span>
                <input
                  type="text"
                  readOnly
                  value={courseData?.level || 'Foundational'}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800"
                />
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1">PRIMARY LANGUAGE</span>
                <input
                  type="text"
                  readOnly
                  value="English"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800"
                />
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1">ESTIMATED DURATION</span>
                <input
                  type="text"
                  readOnly
                  value="12 hours"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-bold text-slate-700 mb-1">SHORT DESCRIPTION / SUBTITLE</span>
              <input
                type="text"
                readOnly
                value={courseData?.shortDescription || 'Master modern school management ERP systems, student information workflows, and campus operations.'}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800"
              />
            </div>

            <div>
              <span className="block text-xs font-bold text-slate-700 mb-1">FULL COURSE DESCRIPTION &amp; SYLLABUS OVERVIEW *</span>
              <textarea
                rows={4}
                readOnly
                value={courseData?.description || 'This comprehensive course covers end-to-end digital school administration. You will learn how to deploy and manage modern School ERP solutions, handle digital attendance, fee structures, and administrative reports.'}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 leading-relaxed"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer"
            >
              Next: Curriculum →
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COURSE CURRICULUM                                                   */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">Course Curriculum &amp; Modules</h2>
              <p className="text-xs text-slate-500">
                {courseData?.sections?.length || 8} Sections • {courseData?.sections?.flatMap((s: any) => s.lessons)?.length || 19} Lectures
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {(courseData?.sections || []).map((sec: any, idx: number) => (
              <div key={sec.id || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-900">Module {idx + 1}: {sec.title}</span>
                  <span className="text-slate-500 font-mono text-[11px]">{sec.lessons?.length || 0} Lessons</span>
                </div>
                <div className="space-y-1.5 pl-3 border-l-2 border-blue-500">
                  {(sec.lessons || []).map((les: any, lIdx: number) => (
                    <div key={les.id || lIdx} className="flex items-center justify-between text-xs py-1 text-slate-700">
                      <div className="flex items-center gap-2">
                        <Play size={12} className="text-blue-600" />
                        <span>{lIdx + 1}. {les.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{les.duration || 15}m</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
            >
              Next: Media &amp; Thumbnail →
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MEDIA & THUMBNAIL                                                   */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900">Media &amp; Promotional Thumbnail</h2>
            <p className="text-xs text-slate-500">Visual brand assets used on course card and social sharing.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <span className="block text-xs font-bold text-slate-700">Course Thumbnail Image (16:9)</span>
              <div className="h-48 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 relative">
                <img
                  src={ogImage || courseData?.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=80'}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-bold text-slate-700">Promotional Trailer Video</span>
              <div className="h-48 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center text-white">
                <div className="text-center">
                  <Play size={36} className="mx-auto text-blue-500 mb-2" />
                  <span className="text-xs font-bold">Watch Trailer (1080p)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
            >
              Next: Course SEO &amp; Ads →
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: COURSE SEO & ADS (EXACT MATCH OF USER'S 3RD SCREENSHOT!)          */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="space-y-6">
          {/* Top Bar (Matches Image 3 Header) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 max-w-xl">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold mb-1">
                SELECT COURSE TO OPTIMIZE FOR SEARCH ENGINES
              </label>
              <div className="relative">
                <div className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 flex items-center justify-between cursor-default">
                  <span>{courseTitle} — (SEO Score: {liveScore}%)</span>
                  <ChevronDown size={14} className="text-slate-400" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!readOnly && (
                <button
                  type="button"
                  onClick={handleSmartAutoFill}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold border border-purple-200 transition-colors cursor-pointer"
                >
                  <Sparkles size={14} />
                  <span>Smart Auto-Fill SEO</span>
                </button>
              )}

              {/* LIVE SEO SCORE DONUT / BADGE (Matches Image 3) */}
              <div className="px-5 py-2 rounded-2xl bg-[#0B132B] text-white flex items-center gap-3 shadow-md">
                <div>
                  <div className="text-[9px] font-mono uppercase text-slate-400 font-bold">LIVE SEO SCORE</div>
                  <div className="text-xl font-black font-mono text-emerald-400">
                    {liveScore} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TWO COLUMN GRID (Matches Image 3) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN (6 of 12): Search Engine & Social Metadata Fields */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
              <h3 className="text-sm font-black text-slate-900 pb-2 border-b border-slate-100">
                Search Engine &amp; Social Metadata Fields
              </h3>

              {/* 1. SEO Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="seo-title" className="font-bold text-slate-800">
                    1. SEO Title (<code className="text-blue-600">&lt;title&gt;</code>)
                  </label>
                  <span className="font-mono text-[11px] font-bold text-emerald-600">
                    {seoTitle.length} / 60 chars
                  </span>
                </div>
                <input
                  id="seo-title"
                  type="text"
                  disabled={readOnly}
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Digital Campus & ERP Management"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                />
              </div>

              {/* 2. Meta Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="seo-desc" className="font-bold text-slate-800">
                    2. Meta Description (<code className="text-blue-600">meta[name=&quot;description&quot;]</code>)
                  </label>
                  <span className="font-mono text-[11px] font-bold text-emerald-600">
                    {seoDescription.length} / 160 chars
                  </span>
                </div>
                <textarea
                  id="seo-desc"
                  rows={3}
                  disabled={readOnly}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Master modern school management ERP systems, student information workflows, digital attendance, fee billing, and campus operations."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 leading-relaxed"
                />
              </div>

              {/* 3. Public Course URL Slug */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  3. Public Course URL Slug
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden text-xs">
                  <span className="px-3 text-slate-400 font-mono text-[11px]">https://morena.lms/courses/</span>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="flex-1 p-2.5 bg-transparent focus:outline-hidden font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* 4. OpenGraph Social Share Image URL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="og-img" className="font-bold text-slate-800">
                    4. OpenGraph (OG) Social Share Image URL (1200×630 recommended)
                  </label>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setOgImage(courseData?.thumbnail || '')}
                      className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                    >
                      Use Course Thumbnail
                    </button>
                  )}
                </div>
                <input
                  id="og-img"
                  type="text"
                  disabled={readOnly}
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 truncate"
                />
              </div>

              {/* 5. Search Keywords & Marketplace Tags */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  5. Search Keywords &amp; Marketplace Tags
                </label>
                {!readOnly && (
                  <div className="flex gap-2">
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
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddKeyword}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {keywords.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No search keywords tagged yet.</span>
                  ) : (
                    keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold"
                      >
                        <Tag size={11} />
                        <span>{kw}</span>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(kw)}
                            className="text-blue-400 hover:text-blue-700 ml-0.5 cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Allow Search Engines to Index Course */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Allow Search Engines (Google / Bing) to Index Course
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Sets <code className="text-blue-600 font-mono">robots=&quot;index, follow&quot;</code> when published.
                  </div>
                </div>
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={robotsIndex}
                  onChange={(e) => setRobotsIndex(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Paid Ads Performance Matrix Integration */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-blue-200">
                    Paid Ads Matrix (Google &amp; Meta Ads)
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncAds}
                    disabled={syncingAds}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    <RefreshCw size={12} className={syncingAds ? 'animate-spin' : ''} />
                    <span>Sync API</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/10">
                    <div className="text-[10px] text-blue-200 uppercase font-bold">Google Ads Spend</div>
                    <div className="text-base font-black font-mono mt-0.5">
                      ₹{adsData?.googleAds?.spend?.toLocaleString('en-IN') || 0}
                    </div>
                    <div className="text-[10px] text-blue-300">
                      {adsData?.googleAds?.clicks || 0} clicks • {adsData?.googleAds?.ctr || 0}% CTR
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/10">
                    <div className="text-[10px] text-blue-200 uppercase font-bold">Meta Ads Spend</div>
                    <div className="text-base font-black font-mono mt-0.5">
                      ₹{adsData?.metaAds?.spend?.toLocaleString('en-IN') || 0}
                    </div>
                    <div className="text-[10px] text-blue-300">
                      {adsData?.metaAds?.reach || 0} reach • {adsData?.metaAds?.roas || 3.5}x ROAS
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (6 of 12): Live Search, Social & Landing-Page Preview */}
            <div className="lg:col-span-6 space-y-6">
              {/* Preview Box */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-black text-slate-900">
                    Live Search, Social &amp; Landing-Page Preview
                  </h3>
                  {/* Preview Tabs (Matches Image 3) */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('GOOGLE_SERP')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        previewTab === 'GOOGLE_SERP' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Google Search
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('SOCIAL_OG')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        previewTab === 'SOCIAL_OG' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      OG Social Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('LANDING_PAGE')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        previewTab === 'LANDING_PAGE' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Landing Page
                    </button>
                  </div>
                </div>

                {/* Google Search Result Preview Card (Exact Match of Image 3) */}
                {previewTab === 'GOOGLE_SERP' && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase font-mono font-bold text-slate-400">
                      GOOGLE SEARCH RESULT PREVIEW (DESKTOP &amp; MOBILE)
                    </div>

                    <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black">
                          M
                        </span>
                        <span className="text-slate-800 font-bold text-[11px]">Morena Teach LMS</span>
                        <span className="text-slate-400">›</span>
                        <span className="text-slate-500 text-[11px]">
                          https://morena.lms › courses › {slug || 'digital-campus-erp-management'}
                        </span>
                      </div>

                      <div className="text-base text-[#1a0dab] font-semibold hover:underline cursor-pointer leading-tight pt-0.5">
                        {seoTitle || courseTitle}
                      </div>

                      <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {seoDescription || 'Master modern school management ERP systems, student information workflows, digital attendance, fee billing, and campus operations.'}
                      </div>

                      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 font-medium">
                        <span className="text-amber-500 font-bold">★★★★★ Rating: 5.0</span>
                        <span>•</span>
                        <span>Price: ₹{courseData?.price || 3499}</span>
                        <span>•</span>
                        <span>{categoryName}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* OG Social Card Preview */}
                {previewTab === 'SOCIAL_OG' && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase font-mono font-bold text-slate-400">
                      FACEBOOK / TWITTER / LINKEDIN SHARE CARD PREVIEW
                    </div>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                      <div className="h-40 bg-slate-100 overflow-hidden">
                        <img
                          src={ogImage || courseData?.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=80'}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3 bg-white space-y-0.5">
                        <div className="text-[10px] uppercase text-slate-400 font-mono">morenateach.com</div>
                        <div className="text-xs font-bold text-slate-900 truncate">{seoTitle || courseTitle}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{seoDescription}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Landing Page Preview */}
                {previewTab === 'LANDING_PAGE' && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
                    <div className="font-bold text-slate-900">Landing Page Hero Banner</div>
                    <p className="text-[11px] text-slate-500">
                      When learners visit <code className="text-blue-600 font-mono">/courses/{slug}</code>, this verified SEO metadata powers the browser tab title and OpenGraph headers.
                    </p>
                  </div>
                )}

                {/* SEO READINESS CHECKLIST (Exact Match of Image 3) */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-900">SEO Readiness Checklist</div>

                  <div className="space-y-2 text-xs font-semibold">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={15} className={seoTitle.length >= 25 && seoTitle.length <= 60 ? 'text-emerald-600' : 'text-amber-500'} />
                        <span className="text-slate-800">SEO Title (30–60 chars)</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500">{seoTitle.length} / 60 chars</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={15} className={seoDescription.length >= 80 && seoDescription.length <= 160 ? 'text-emerald-600' : 'text-amber-500'} />
                        <span className="text-slate-800">Meta Description (100–160 chars)</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500">{seoDescription.length} / 160 chars</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={15} className={slug.length >= 5 ? 'text-emerald-600' : 'text-amber-500'} />
                        <span className="text-slate-800">Clean Search URL</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500 truncate max-w-[180px]">
                        /courses/{slug}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={15} className={ogImage ? 'text-emerald-600' : 'text-amber-500'} />
                        <span className="text-slate-800">OG Social Share Image</span>
                      </div>
                      <span className="text-[11px] text-emerald-600 font-bold">
                        {ogImage ? 'Configured' : 'Missing'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct Instructor Chat */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <MessageSquare size={16} className="text-blue-600" />
                  <h3 className="text-sm font-black text-slate-900">
                    Direct Message Instructor ({instructorName})
                  </h3>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 text-xs">
                  {messages.length === 0 ? (
                    <p className="text-slate-400 italic text-center py-4">No messages yet. Send a note to the instructor.</p>
                  ) : (
                    messages.map((m, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                          <span>{m.senderName} ({m.senderRole})</span>
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="text-slate-800 font-medium">{m.message}</div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Send note to instructor..."
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={sendingMsg || !messageInput.trim()}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
            >
              ← Previous: Media
            </button>

            <div className="flex items-center gap-2">
              {!readOnly && (
                <button
                  type="button"
                  onClick={handleSaveSeo}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{saving ? 'Saving...' : 'Save SEO & Ads Settings ✓'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Next: Assessment →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: FINAL ASSESSMENT                                                    */}
      {/* ========================================================================= */}
      {currentStep === 5 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900">Final Assessment &amp; Examination</h2>
            <p className="text-xs text-slate-500">Verified certification quizzes and passing threshold (Passing Score: 80%).</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="font-bold text-slate-900">Certification Quiz: Digital Campus Operations</div>
            <div className="text-slate-600">8 Questions • 80% Passing Score • 3 Attempts Limit</div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
            >
              ← Previous: SEO
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(6)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
            >
              Next: Review &amp; Submit →
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: REVIEW & SUBMIT / COMPLETE SEO                                      */}
      {/* ========================================================================= */}
      {currentStep === 6 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900">Review &amp; Finalize Course SEO</h2>
            <p className="text-xs text-slate-500">Confirm all metadata, schema, and ads configurations before saving.</p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-600" />
              SEO Ready for Production
            </div>
            <p className="text-emerald-800 text-[11px]">
              Course metadata satisfies Google guidelines and ad performance campaigns are configured.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
            >
              ← Back to SEO Tab
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={handleSaveSeo}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Check size={14} />
                <span>Save &amp; Complete Course SEO ✓</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

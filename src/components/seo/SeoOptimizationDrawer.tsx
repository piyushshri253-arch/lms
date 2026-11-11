'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Globe,
  Tag,
  Code2,
  MessageSquare,
  History,
  Layers,
  ArrowRight,
  UserCheck,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Smartphone,
  Monitor,
  Check,
  Flame,
  DollarSign
} from 'lucide-react';

export interface SeoOptimizationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  course: any;
  readOnly?: boolean;
  currentUserRole?: string;
  onSuccess?: () => void;
}

export function SeoOptimizationDrawer({
  isOpen,
  onClose,
  course,
  readOnly = false,
  currentUserRole = 'SEO_SPECIALIST',
  onSuccess
}: SeoOptimizationDrawerProps) {
  const [activeTab, setActiveTab] = useState<'METADATA' | 'ADS' | 'WORKFLOW' | 'MESSAGES'>('METADATA');
  const [serpDevice, setSerpDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Form inputs
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [schemaMarkup, setSchemaMarkup] = useState('');

  // Workflow state
  const [workflowStatus, setWorkflowStatus] = useState<string>('AUDITOR_APPROVED');
  const [assignment, setAssignment] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [selectedSpecialistId, setSelectedSpecialistId] = useState('');
  const [workflowNotes, setWorkflowNotes] = useState('');

  // Ads state
  const [ads, setAds] = useState<any>(null);
  const [syncingAds, setSyncingAds] = useState(false);

  // Messages state
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Status flags
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ title: string; desc?: string; type?: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (t: { title: string; desc?: string; type?: 'success' | 'error' | 'info' }) => {
    setToastMsg(t);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Populate data when course changes or opens
  useEffect(() => {
    if (!course) return;

    setTitle(course.seoTitle || course.title || '');
    setDescription(course.seoDescription || course.description?.slice(0, 155) || '');
    setSlug(course.slug || '');
    setCanonicalUrl(course.canonicalUrl || `https://morenateach.com/courses/${course.slug || course.id}`);
    setKeywords(Array.isArray(course.keywords) ? course.keywords : []);
    setAds(course.ads || null);

    // Initial default schema markup if not set
    const defaultSchema = JSON.stringify(
      {
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: course.title,
        description: course.seoDescription || course.description?.slice(0, 155) || '',
        provider: {
          '@type': 'Organization',
          name: 'Morena Teach',
          sameAs: 'https://morenateach.com'
        },
        offers: {
          '@type': 'Offer',
          category: 'Paid',
          price: course.price || 0,
          priceCurrency: 'INR'
        }
      },
      null,
      2
    );
    setSchemaMarkup(course.schemaMarkup || defaultSchema);

    // Fetch live workflow and specialists
    loadWorkflowAndSpecialists(course.id);
    loadMessages(course.id);
  }, [course]);

  const loadWorkflowAndSpecialists = async (courseId: string) => {
    try {
      const [wfRes, spRes] = await Promise.all([
        fetch(`/api/seo/workflow?courseId=${courseId}`),
        fetch('/api/seo/specialists')
      ]);

      if (wfRes.ok) {
        const wfData = await wfRes.json();
        if (wfData.workflow) {
          setWorkflowStatus(wfData.workflow.status);
          setAssignment(wfData.workflow.assignment);
          setHistory(wfData.workflow.history || []);
          if (wfData.workflow.assignment?.specialistId) {
            setSelectedSpecialistId(wfData.workflow.assignment.specialistId);
          }
        }
      }

      if (spRes.ok) {
        const spData = await spRes.json();
        setSpecialists(spData.specialists || []);
      }
    } catch (err) {
      console.error('[Drawer Load Error]:', err);
    }
  };

  const loadMessages = async (courseId: string) => {
    try {
      setLoadingMessages(true);
      const res = await fetch(`/api/seo/messages?courseId=${courseId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {}
    finally {
      setLoadingMessages(false);
    }
  };

  const handleAddKeyword = () => {
    const split = keywordInput
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k && !keywords.includes(k));
    if (split.length > 0) {
      setKeywords([...keywords, ...split]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (k: string) => {
    if (readOnly) return;
    setKeywords(keywords.filter((kw) => kw !== k));
  };

  const handleGenerateSlug = () => {
    if (readOnly) return;
    const auto = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    setSlug(auto);
  };

  const handleAutoGenerateMetadata = () => {
    if (readOnly || !course) return;
    const cat = course.categoryName || 'Education';
    const autoTitle = `${course.title} | ${cat} Masterclass 2026`.slice(0, 60);
    const autoDesc = `Enroll in ${course.title}. Master verified industry teaching skills with lessons, quizzes, and official certification.`.slice(0, 155);
    const autoSlug = course.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    const generatedKws = [
      cat.toLowerCase(),
      ...course.title
        .toLowerCase()
        .split(' ')
        .filter((w: string) => w.length > 3)
        .slice(0, 3),
      'certification',
      'course'
    ];

    setTitle(autoTitle);
    setDescription(autoDesc);
    setSlug(autoSlug);
    setKeywords(Array.from(new Set([...keywords, ...generatedKws])));
    showToast({ title: 'AI Generated', desc: 'Optimized meta title, description & keywords populated.', type: 'info' });
  };

  const handleSaveSeo = async () => {
    if (readOnly || !course) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/seo/courses/${course.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seoTitle: title,
          seoDescription: description,
          slug,
          canonicalUrl,
          schemaMarkup,
          keywords
        })
      });

      if (res.ok) {
        showToast({ title: 'SEO Saved ✓', desc: 'Metadata and tags updated successfully.', type: 'success' });
        if (onSuccess) onSuccess();
      } else {
        throw new Error('Failed to save');
      }
    } catch {
      showToast({ title: 'Error', desc: 'Could not save SEO changes.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncAds = async () => {
    if (!course) return;
    try {
      setSyncingAds(true);
      const res = await fetch('/api/seo/ads-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id })
      });
      const data = await res.json();
      if (res.ok && data.ads) {
        setAds(data.ads);
        showToast({ title: 'Ads API Synced ✓', desc: 'Google & Meta metrics refreshed with latest data.', type: 'success' });
      }
    } catch {
      showToast({ title: 'Error', desc: 'Failed to sync ads data.', type: 'error' });
    } finally {
      setSyncingAds(false);
    }
  };

  const handleWorkflowAction = async (action: 'ASSIGN' | 'SUBMIT_FOR_REVIEW' | 'APPROVE' | 'REQUEST_CHANGES') => {
    if (readOnly || !course) return;

    try {
      setSaving(true);
      const res = await fetch('/api/seo/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          courseId: course.id,
          specialistId: selectedSpecialistId,
          notes: workflowNotes
        })
      });

      const data = await res.json();
      if (res.ok && data.workflow) {
        setWorkflowStatus(data.workflow.status);
        setAssignment(data.workflow.assignment);
        setHistory(data.workflow.history || []);
        showToast({ title: 'Workflow Updated ✓', desc: data.message, type: 'success' });
        setWorkflowNotes('');
        if (onSuccess) onSuccess();
      } else {
        showToast({ title: 'Error', desc: data.error || 'Failed to update workflow', type: 'error' });
      }
    } catch (err: any) {
      showToast({ title: 'Error', desc: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !course) return;

    try {
      setSendingMessage(true);
      const res = await fetch('/api/seo/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          recipientId: course.instructor?.id,
          recipientName: course.instructor?.name,
          message: newMessageText.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.message) {
        setMessages([...messages, data.message]);
        setNewMessageText('');
        showToast({ title: 'Message Sent ✓', desc: `Notification sent to ${course.instructor?.name || 'Instructor'}.`, type: 'success' });
      }
    } catch {
      showToast({ title: 'Error', desc: 'Failed to send message.', type: 'error' });
    } finally {
      setSendingMessage(false);
    }
  };

  if (!isOpen || !course) return null;

  const isManager = currentUserRole === 'SEO_MANAGER' || currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div
        className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden border-l border-slate-200 animate-in slide-in-from-right duration-300"
        role="dialog"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0 shadow-2xs">
              <img
                src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&auto=format&fit=crop&q=80'}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                  {course.categoryName || 'Education'}
                </span>

                {/* Workflow Status Badge */}
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    workflowStatus === 'SEO_COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : workflowStatus === 'SEO_SUBMITTED_FOR_APPROVAL'
                      ? 'bg-purple-100 text-purple-800'
                      : workflowStatus === 'ASSIGNED'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {workflowStatus.replace(/_/g, ' ')}
                </span>

                {readOnly && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    👁 View-Only Mode
                  </span>
                )}
              </div>

              <h2 className="text-lg font-black text-slate-900 mt-1 line-clamp-1 leading-snug">
                {course.title}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Instructor: <strong className="text-slate-800">{course.instructor?.name || 'Instructor'}</strong> •{' '}
                {course.lecturesCount || 12} Lessons • ₹{course.price || 0}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 border-b border-slate-200 bg-white flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'METADATA', label: 'SEO Metadata & Schema', icon: Globe },
            { id: 'ADS', label: 'Paid Ads Matrix', icon: TrendingUp },
            { id: 'WORKFLOW', label: 'Workflow & Team', icon: Layers },
            { id: 'MESSAGES', label: `Messages (${messages.length})`, icon: MessageSquare }
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 py-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon size={15} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Toast Alert */}
        {toastMsg && (
          <div
            className={`mx-5 mt-3 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
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

        {/* Drawer Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: SEO METADATA & SCHEMA */}
          {activeTab === 'METADATA' && (
            <div className="space-y-6">
              {/* Google SERP Live Preview */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Globe size={14} className="text-blue-600" />
                    <span>Google Search Preview</span>
                  </div>
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setSerpDevice('desktop')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        serpDevice === 'desktop' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Monitor size={12} /> Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setSerpDevice('mobile')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        serpDevice === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Smartphone size={12} /> Mobile
                    </button>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-normal">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black">
                      M
                    </span>
                    <span className="text-slate-800 font-semibold text-[11px]">Morena Teach</span>
                    <span className="text-slate-400">›</span>
                    <span className="text-slate-500 text-[11px]">courses › {slug || 'course-slug'}</span>
                  </div>
                  <div className="text-base text-[#1a0dab] font-semibold hover:underline cursor-pointer leading-tight">
                    {title || 'Optimized Course Title for Google SERP'}
                  </div>
                  <div className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {description || 'Comprehensive verified teacher training curriculum covering child psychology, syllabus structuring, lesson planning, and interactive activities.'}
                  </div>
                </div>
              </div>

              {!readOnly && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAutoGenerateMetadata}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold border border-purple-200 transition-colors cursor-pointer"
                  >
                    <Sparkles size={14} /> Auto-Generate with AI
                  </button>
                </div>
              )}

              {/* Meta Title Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <label htmlFor="meta-title">Meta Title (SEO Title)</label>
                  <span className={`text-[11px] font-semibold ${title.length > 60 ? 'text-rose-600' : 'text-slate-500'}`}>
                    {title.length} / 60 chars
                  </span>
                </div>
                <input
                  id="meta-title"
                  type="text"
                  disabled={readOnly}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Montessori Teacher Training Certification | Morena Teach"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              {/* Meta Description Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <label htmlFor="meta-desc">Meta Description</label>
                  <span className={`text-[11px] font-semibold ${description.length > 160 ? 'text-rose-600' : 'text-slate-500'}`}>
                    {description.length} / 160 chars
                  </span>
                </div>
                <textarea
                  id="meta-desc"
                  rows={3}
                  disabled={readOnly}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Compelling meta description with target keywords and a clear call to action..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 leading-relaxed"
                />
              </div>

              {/* URL Slug & Canonical URL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <label htmlFor="slug">URL Slug</label>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={handleGenerateSlug}
                        className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                      >
                        Auto-Slug
                      </button>
                    )}
                  </div>
                  <input
                    id="slug"
                    type="text"
                    disabled={readOnly}
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. montessori-teacher-training"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="canonical" className="block text-xs font-bold text-slate-700">
                    Canonical URL
                  </label>
                  <input
                    id="canonical"
                    type="text"
                    disabled={readOnly}
                    value={canonicalUrl}
                    onChange={(e) => setCanonicalUrl(e.target.value)}
                    placeholder="https://morenateach.com/courses/..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
              </div>

              {/* Focus Keywords Tag Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Focus Keywords ({keywords.length})
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
                      placeholder="Add focus keyword and press Enter (or comma)..."
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddKeyword}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {keywords.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No focus keywords assigned yet.</span>
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

              {/* JSON-LD Schema Markup Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Code2 size={14} className="text-indigo-600" />
                    <span>Structured Data Schema Markup (JSON-LD)</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">schema.org/Course</span>
                </div>
                <textarea
                  rows={6}
                  disabled={readOnly}
                  value={schemaMarkup}
                  onChange={(e) => setSchemaMarkup(e.target.value)}
                  className="w-full p-3 font-mono text-[11px] bg-slate-900 text-emerald-400 rounded-xl border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-80"
                />
              </div>
            </div>
          )}

          {/* TAB 2: PAID ADS MATRIX (Google Ads & Meta Ads) */}
          {activeTab === 'ADS' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Campaign Performance & Ads Sync</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Integrated with Google Ads Reporting API & Meta Marketing API (Insights)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncAds}
                  disabled={syncingAds}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold border border-blue-200 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw size={14} className={syncingAds ? 'animate-spin' : ''} />
                  <span>{syncingAds ? 'Syncing...' : 'Sync Live Ads API'}</span>
                </button>
              </div>

              {ads ? (
                <div className="space-y-6">
                  {/* Google Ads Card */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-black text-sm">
                          G
                        </div>
                        <div>
                          <div className="text-sm font-black text-slate-900">Google Ads (Search & PMax)</div>
                          <div className="text-xs text-slate-500">{ads.googleAds?.campaignName || 'Campaign'}</div>
                        </div>
                      </div>
                      <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {ads.googleAds?.status || 'ACTIVE'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[11px] font-bold text-slate-400 uppercase">Total Spend</div>
                        <div className="text-base font-black text-slate-900 mt-0.5">
                          ₹{ads.googleAds?.spend?.toLocaleString('en-IN') || 0}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">₹{ads.googleAds?.dailyBudget}/day budget</div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[11px] font-bold text-slate-400 uppercase">Clicks</div>
                        <div className="text-base font-black text-blue-600 mt-0.5">
                          {ads.googleAds?.clicks?.toLocaleString() || 0}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Avg CPC: ₹{ads.googleAds?.cpc || 0}</div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[11px] font-bold text-slate-400 uppercase">Impressions</div>
                        <div className="text-base font-black text-purple-600 mt-0.5">
                          {ads.googleAds?.impressions?.toLocaleString() || 0}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">CTR: {ads.googleAds?.ctr || 0}%</div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[11px] font-bold text-slate-400 uppercase">Conversions</div>
                        <div className="text-base font-black text-emerald-600 mt-0.5">
                          {ads.googleAds?.conversions?.toLocaleString() || 0}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Verified enrollments</div>
                      </div>
                    </div>
                  </div>

                  {/* Meta Ads Card */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
                          f
                        </div>
                        <div>
                          <div className="text-sm font-black text-slate-900">Meta Ads (Instagram & FB)</div>
                          <div className="text-xs text-slate-500">{ads.metaAds?.campaignName || 'Campaign'}</div>
                        </div>
                      </div>
                      <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {ads.metaAds?.status || 'ACTIVE'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[11px] font-bold text-slate-400 uppercase">Total Spend</div>
                        <div className="text-base font-black text-slate-900 mt-0.5">
                          ₹{ads.metaAds?.spend?.toLocaleString('en-IN') || 0}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">₹{ads.metaAds?.dailyBudget}/day budget</div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[11px] font-bold text-slate-400 uppercase">Reach / Impr.</div>
                        <div className="text-base font-black text-indigo-600 mt-0.5">
                          {ads.metaAds?.reach?.toLocaleString() || 0}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Audience impressions</div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[11px] font-bold text-slate-400 uppercase">Clicks / CTR</div>
                        <div className="text-base font-black text-blue-600 mt-0.5">
                          {ads.metaAds?.clicks?.toLocaleString() || 0}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">CPR: ₹{ads.metaAds?.cpr || 0}</div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[11px] font-bold text-slate-400 uppercase">ROAS & Conv.</div>
                        <div className="text-base font-black text-emerald-600 mt-0.5">
                          {ads.metaAds?.roas || 3.5}x
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{ads.metaAds?.conversions || 0} purchases</div>
                      </div>
                    </div>
                  </div>

                  {/* Combined Summary Banner */}
                  <div className="p-4 rounded-2xl bg-linear-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
                    <div>
                      <div className="text-xs text-blue-200 font-semibold uppercase tracking-wider">
                        Blended Paid Advertising Spend
                      </div>
                      <div className="text-2xl font-black mt-0.5">
                        ₹{(ads.totalSpend || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-blue-200 font-semibold">Total Paid Conversions</div>
                      <div className="text-xl font-black text-emerald-400">
                        {(ads.googleAds?.conversions || 0) + (ads.metaAds?.conversions || 0)} Students
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <TrendingUp size={32} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-600">No active ads campaigns synchronized yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Click &quot;Sync Live Ads API&quot; above to fetch Google and Meta campaign insights.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WORKFLOW & AUDIT LOG */}
          {activeTab === 'WORKFLOW' && (
            <div className="space-y-6">
              {/* Assignment Box */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Task Assignment & Specialist</h3>
                    <p className="text-xs text-slate-500">
                      SEO Manager assigns courses to SEO specialists to execute keyword and meta tags optimization.
                    </p>
                  </div>
                  {assignment && (
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      Assigned to {assignment.specialistName}
                    </span>
                  )}
                </div>

                {isManager && !readOnly && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <label className="block text-xs font-bold text-slate-700">Assign to Team Member:</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedSpecialistId}
                        onChange={(e) => setSelectedSpecialistId(e.target.value)}
                        className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select SEO Specialist...</option>
                        {specialists.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.role}) - {s.email}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleWorkflowAction('ASSIGN')}
                        disabled={!selectedSpecialistId || saving}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Assign Task
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lifecycle Stage Cards */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
                <h3 className="text-sm font-black text-slate-900">Workflow Lifecycle Status</h3>
                <div className="space-y-2">
                  {[
                    { id: 'AUDITOR_REVIEW_PENDING', title: '1. Course Submitted for Audit', desc: 'Awaiting curriculum verification from Course Auditor' },
                    { id: 'AUDITOR_APPROVED', title: '2. Auditor Approved', desc: 'Ready for SEO metadata optimization and keywords' },
                    { id: 'ASSIGNED', title: '3. Assigned to Specialist', desc: 'Specialist working on meta tags, slug and schema markup' },
                    { id: 'SEO_SUBMITTED_FOR_APPROVAL', title: '4. Submitted for Manager Review', desc: 'Submitted by specialist for SEO Lead inspection' },
                    { id: 'SEO_COMPLETED', title: '5. SEO Completed & Live', desc: 'Approved by SEO Manager. Notifications dispatched to Instructor & Admins' }
                  ].map((step, idx) => {
                    const isCurrent = workflowStatus === step.id;
                    return (
                      <div
                        key={step.id}
                        className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                          isCurrent
                            ? 'bg-blue-50 border-blue-200 text-blue-900 font-bold shadow-2xs'
                            : 'bg-slate-50/50 border-slate-200/80 text-slate-500 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                              isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <div className="text-slate-900 font-bold">{step.title}</div>
                            <div className="text-[11px] text-slate-500">{step.desc}</div>
                          </div>
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-600 text-white">
                            Current Stage
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* History Timeline */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
                <h3 className="text-sm font-black text-slate-900">Audit History Timeline</h3>
                {history.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No historical status transitions recorded yet.</p>
                ) : (
                  <div className="space-y-3 pt-2">
                    {history.map((h, i) => (
                      <div key={i} className="flex items-start gap-3 text-xs border-l-2 border-blue-500 pl-3 py-1">
                        <div>
                          <div className="font-bold text-slate-800">
                            {h.action?.replace(/_/g, ' ')} by {h.actorName} ({h.actorRole})
                          </div>
                          {h.notes && <div className="text-slate-600 italic mt-0.5">&quot;{h.notes}&quot;</div>}
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(h.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: DIRECT MESSAGING WITH INSTRUCTOR */}
          {activeTab === 'MESSAGES' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between text-xs">
                <div>
                  <strong className="text-blue-900">Direct Instructor Communication</strong>
                  <p className="text-blue-700 text-[11px] mt-0.5">
                    Messages sent here directly notify <strong>{course.instructor?.name || 'Instructor'}</strong> in their instructor portal.
                  </p>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 h-80 overflow-y-auto space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                    <MessageSquare size={32} className="mb-2 opacity-50" />
                    <span>No messages yet. Send a note to the instructor regarding course keywords or description.</span>
                  </div>
                ) : (
                  messages.map((m, i) => {
                    const isSelf = m.senderRole?.includes('SEO');
                    return (
                      <div key={i} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                        <div className="text-[10px] text-slate-400 font-semibold mb-1">
                          {m.senderName} ({m.senderRole}) • {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div
                          className={`max-w-md p-3 rounded-2xl text-xs font-medium ${
                            isSelf
                              ? 'bg-blue-600 text-white rounded-br-xs'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                          }`}
                        >
                          {m.message}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Composer */}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder={`Send message to ${course.instructor?.name || 'Instructor'}...`}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={sendingMessage || !newMessageText.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Drawer Footer / Action Bar */}
        <div className="p-4 px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          {readOnly ? (
            <div className="text-xs text-slate-500 font-semibold flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-500" />
              <span>Strictly View-Only for Instructor. Contact SEO team via Messages tab.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {/* For SEO Specialist */}
              {currentUserRole === 'SEO_SPECIALIST' && workflowStatus !== 'SEO_COMPLETED' && (
                <button
                  type="button"
                  onClick={() => handleWorkflowAction('SUBMIT_FOR_REVIEW')}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send size={14} /> Submit to Manager
                </button>
              )}

              {/* For SEO Manager */}
              {isManager && (
                <>
                  {workflowStatus !== 'SEO_COMPLETED' && (
                    <button
                      type="button"
                      onClick={() => handleWorkflowAction('APPROVE')}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} /> Approve & Complete
                    </button>
                  )}

                  {workflowStatus === 'SEO_SUBMITTED_FOR_APPROVAL' && (
                    <button
                      type="button"
                      onClick={() => handleWorkflowAction('REQUEST_CHANGES')}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Request Changes
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Close
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={handleSaveSeo}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save size={14} />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { InstructorPortalShell } from '@/components/instructor/InstructorPortalShell';
import { Icon } from '@/components/ui/Icon';

interface SecurityPolicy {
  signedUrlEnabled: boolean;
  signedUrlExpiryMinutes: number;
  allowVideoDownload: boolean;
  allowPdfDownload: boolean;
  allowResourceDownload: boolean;
  dynamicWatermarkEnabled: boolean;
  preventRightClick: boolean;
  disablePictureInPicture: boolean;
  requireActiveEnrollment: boolean;
  allowedDomains: string[];
  updatedAt: string;
}

interface CourseSecurityItem {
  id: string;
  title: string;
  slug: string;
  price: number;
  status: string;
  accessType: 'LIFETIME' | 'LIMITED_DAYS';
  accessDays: number | null;
  enrollmentsCount: number;
  mediaSummary: {
    totalLessons: number;
    videoCount: number;
    pdfCount: number;
    resourceCount: number;
    protectedPaidLessonsCount: number;
    freePreviewLessonsCount: number;
  };
  lessons: Array<{
    id: string;
    title: string;
    type: string;
    isFree: boolean;
    videoUrl?: string | null;
    pdfUrl?: string | null;
    fileUrl?: string | null;
    allowDownload?: boolean;
  }>;
  securityPolicy: SecurityPolicy;
}

export default function InstructorContentSecurityPage() {
  const [toastMsg, setToastMsg] = useState<{ title: string; description?: string; type?: string } | null>(null);
  const showToast = (msg: { title: string; description?: string; type?: string }) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };
  const [courses, setCourses] = useState<CourseSecurityItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [policyForm, setPolicyForm] = useState<SecurityPolicy>({
    signedUrlEnabled: true,
    signedUrlExpiryMinutes: 120,
    allowVideoDownload: false,
    allowPdfDownload: false,
    allowResourceDownload: true,
    dynamicWatermarkEnabled: true,
    preventRightClick: true,
    disablePictureInPicture: true,
    requireActiveEnrollment: true,
    allowedDomains: [],
    updatedAt: new Date().toISOString()
  });

  const [accessType, setAccessType] = useState<'LIFETIME' | 'LIMITED_DAYS'>('LIFETIME');
  const [accessDays, setAccessDays] = useState<number>(365);
  const [domainsInput, setDomainsInput] = useState<string>('');

  const [tokenPreview, setTokenPreview] = useState<{
    lessonTitle: string;
    signedUrl: string;
    signedToken: string;
    expiresAt: number;
    ttlMinutes: number;
    watermarkPreview: string;
  } | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);

  const loadSecurityData = async (keepCourseId?: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/instructor/content-security');
      const data = await res.json();
      if (res.ok && Array.isArray(data.courses)) {
        setCourses(data.courses);
        const targetId = keepCourseId || selectedCourseId || data.courses[0]?.id || '';
        setSelectedCourseId(targetId);
        const found = data.courses.find((c: CourseSecurityItem) => c.id === targetId) || data.courses[0];
        if (found) {
          setPolicyForm(found.securityPolicy);
          setAccessType(found.accessType || 'LIFETIME');
          setAccessDays(found.accessDays || 365);
          setDomainsInput((found.securityPolicy.allowedDomains || []).join(', '));
        }
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to load content security settings.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityData();
  }, []);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || null;

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setTokenPreview(null);
    const found = courses.find((c) => c.id === courseId);
    if (found) {
      setPolicyForm(found.securityPolicy);
      setAccessType(found.accessType || 'LIFETIME');
      setAccessDays(found.accessDays || 365);
      setDomainsInput((found.securityPolicy.allowedDomains || []).join(', '));
    }
  };

  const handleSavePolicy = async (syncAllDownloads?: boolean) => {
    if (!selectedCourse) return;
    try {
      setSaving(true);
      const parsedDomains = domainsInput
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);

      const res = await fetch('/api/instructor/content-security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          accessType,
          accessDays: accessType === 'LIMITED_DAYS' ? accessDays : null,
          syncLessonDownloadFlag: syncAllDownloads,
          policy: {
            ...policyForm,
            allowedDomains: parsedDomains
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save security policy');

      showToast({
        title: 'Content Security Updated',
        description: `DRM, signed URLs, and download permissions saved for "${selectedCourse.title}".`,
        type: 'success'
      });

      await loadSecurityData(selectedCourse.id);
    } catch (err: any) {
      showToast({ title: 'Save Failed', description: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLessonDownload = async (lessonId: string, nextValue: boolean) => {
    if (!selectedCourse) return;
    try {
      const res = await fetch('/api/instructor/content-security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          lessonIdToToggle: lessonId,
          lessonAllowDownload: nextValue,
          policy: policyForm
        })
      });
      if (!res.ok) throw new Error('Failed to update lesson download permission');
      showToast({
        title: nextValue ? 'Lesson Download Enabled' : 'Lesson Locked to View-Only',
        type: 'info'
      });
      await loadSecurityData(selectedCourse.id);
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleGenerateSignedPreview = async (resourceType: 'VIDEO' | 'PDF') => {
    if (!selectedCourse) return;
    try {
      setGeneratingPreview(true);
      const res = await fetch('/api/instructor/content-security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          resourceType
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate token');
      setTokenPreview(data);
      showToast({
        title: `Signed ${resourceType} Token Generated`,
        description: 'Cryptographic HMAC-SHA256 student stream URL ready for inspection.',
        type: 'success'
      });
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setGeneratingPreview(false);
    }
  };

  return (
    <InstructorPortalShell
      title="Course Content Security & DRM Center"
      subtitle="Protect paid videos & PDFs with HMAC-SHA256 signed student URLs, download permissions, enrollment validation, and anti-piracy watermarks."
      actions={
        <div className="flex items-center gap-2.5">
          <Link
            href="/instructor/course-versions"
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Icon name="history" size={16} />
            <span>Version Control</span>
          </Link>
          <button
            onClick={() => handleSavePolicy()}
            disabled={saving || !selectedCourse}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
          >
            <Icon name="verified_user" size={16} />
            <span>{saving ? 'Saving Policy...' : 'Save Security Policy'}</span>
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
          Loading course DRM policies and media security inventory...
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
          <Icon name="security" size={36} className="text-indigo-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Courses Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Create a course in the Course Builder to configure signed video URLs, PDF access locks, and anti-piracy watermarks.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Architecture Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-indigo-500/20 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono font-bold uppercase">
                  <Icon name="shield" size={12} />
                  <span>6-Layer Paid Content Protection Active</span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                  Why Raw Video/PDF URLs Are Never Exposed to Unenrolled Visitors
                </h2>
                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                  Simply pasting a video or PDF URL is unsafe if the public API leaks it. Our DRM gateway redacts raw media URLs on all locked lessons in <code className="text-emerald-300">GET /api/courses/[slug]</code> and issues short-lived, student-bound <code className="text-emerald-300">HMAC-SHA256</code> tokens via <code className="text-emerald-300">GET /api/lessons/[id]/stream</code> only after verifying active enrollment.
                </p>
              </div>

              {/* Course Picker */}
              <div className="min-w-[260px] bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/15">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-200 mb-1">
                  Select Course to Configure
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => handleSelectCourse(e.target.value)}
                  className="w-full bg-slate-900/90 text-white text-xs font-bold rounded-lg px-3 py-2 border border-white/20 focus:outline-none focus:border-indigo-400"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.price > 0 ? `₹${c.price}` : 'Free'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {selectedCourse && (
            <>
              {/* Media & Enrollment Security KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="text-[11px] font-semibold text-slate-500">Protected Paid Lectures</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {selectedCourse.mediaSummary.protectedPaidLessonsCount}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-600 mt-1">
                    Raw URLs Redacted in Public API
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="text-[11px] font-semibold text-slate-500">Video Streams</div>
                  <div className="text-2xl font-black text-indigo-600 mt-1">
                    {selectedCourse.mediaSummary.videoCount}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">
                    {policyForm.signedUrlEnabled ? `Signed (${policyForm.signedUrlExpiryMinutes}m TTL)` : 'Standard URL'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="text-[11px] font-semibold text-slate-500">PDF Reference Docs</div>
                  <div className="text-2xl font-black text-rose-600 mt-1">
                    {selectedCourse.mediaSummary.pdfCount}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">
                    {policyForm.allowPdfDownload ? 'Downloadable' : 'View-Only (#toolbar=0)'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="text-[11px] font-semibold text-slate-500">Free Preview Lessons</div>
                  <div className="text-2xl font-black text-amber-600 mt-1">
                    {selectedCourse.mediaSummary.freePreviewLessonsCount}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">
                    Public Sample Access
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="text-[11px] font-semibold text-slate-500">Verified Enrollments</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    {selectedCourse.enrollmentsCount}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">
                    {accessType === 'LIMITED_DAYS' ? `${accessDays}-Day Access Window` : 'Lifetime Access'}
                  </div>
                </div>
              </div>

              {/* Main 2-Column Configuration Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 7 Columns: Policy Controls */}
                <div className="lg:col-span-7 space-y-6">
                  {/* 1. Signed URLs & Enrollment Validation */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Icon name="key" size={20} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            1. Signed / Private Video & PDF URLs
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Bind media URLs to the logged-in student&apos;s session and expire copied links automatically.
                          </p>
                        </div>
                      </div>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={policyForm.signedUrlEnabled}
                          onChange={(e) =>
                            setPolicyForm({ ...policyForm, signedUrlEnabled: e.target.checked })
                          }
                          className="w-4 h-4 accent-indigo-600 rounded"
                        />
                        <span className="text-xs font-bold text-indigo-700">Enabled</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Signed Token Expiration (TTL)
                        </label>
                        <select
                          value={policyForm.signedUrlExpiryMinutes}
                          onChange={(e) =>
                            setPolicyForm({
                              ...policyForm,
                              signedUrlExpiryMinutes: Number(e.target.value)
                            })
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800"
                        >
                          <option value={30}>30 Minutes (High Security)</option>
                          <option value={60}>1 Hour (Recommended)</option>
                          <option value={120}>2 Hours (Standard Lecture)</option>
                          <option value={360}>6 Hours (Long Workshop)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Course Enrollment Access Window
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            value={accessType}
                            onChange={(e) =>
                              setAccessType(e.target.value as 'LIFETIME' | 'LIMITED_DAYS')
                            }
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800"
                          >
                            <option value="LIFETIME">Lifetime Access</option>
                            <option value="LIMITED_DAYS">Time-Limited (Days)</option>
                          </select>
                          {accessType === 'LIMITED_DAYS' && (
                            <input
                              type="number"
                              min={1}
                              max={3650}
                              value={accessDays}
                              onChange={(e) => setAccessDays(Number(e.target.value) || 365)}
                              className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800"
                              placeholder="Days"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Allowed Streaming Referrer Domains (Optional Domain Lock)
                      </label>
                      <input
                        type="text"
                        value={domainsInput}
                        onChange={(e) => setDomainsInput(e.target.value)}
                        placeholder="e.g. morena.lms, learn.yourdomain.com"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  {/* 2. PDF Access Control & Download Permissions */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <Icon name="picture_as_pdf" size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          2. PDF Access Control & Download Permissions
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Control whether enrolled students can download raw files or only view inside the encrypted LMS reader.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-start justify-between gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer">
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Allow PDF Document Download & Printing
                          </div>
                          <div className="text-[11px] text-slate-500">
                            When unchecked, PDFs open in View-Only mode (<code className="text-rose-600">#toolbar=0&amp;navpanes=0</code>) with download buttons hidden.
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={policyForm.allowPdfDownload}
                          onChange={(e) =>
                            setPolicyForm({ ...policyForm, allowPdfDownload: e.target.checked })
                          }
                          className="w-4 h-4 accent-indigo-600 mt-0.5"
                        />
                      </label>

                      <label className="flex items-start justify-between gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer">
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Allow Direct Video File Download (MP4/WebM)
                          </div>
                          <div className="text-[11px] text-slate-500">
                            When unchecked, the video player enforces <code className="text-indigo-600">controlsList=&quot;nodownload&quot;</code> and blocks right-click saving.
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={policyForm.allowVideoDownload}
                          onChange={(e) =>
                            setPolicyForm({ ...policyForm, allowVideoDownload: e.target.checked })
                          }
                          className="w-4 h-4 accent-indigo-600 mt-0.5"
                        />
                      </label>

                      <label className="flex items-start justify-between gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer">
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Allow Supplementary Attachment Downloads (ZIP / Code / Slides)
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Controls whether enrolled students can download <code className="text-slate-700">fileUrl</code> resources on lectures where download is enabled.
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={policyForm.allowResourceDownload}
                          onChange={(e) =>
                            setPolicyForm({ ...policyForm, allowResourceDownload: e.target.checked })
                          }
                          className="w-4 h-4 accent-indigo-600 mt-0.5"
                        />
                      </label>
                    </div>
                  </div>

                  {/* 3. Anti-Piracy Watermarking & Player Hardening */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Icon name="branding_watermark" size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          3. Video Streaming & Anti-Piracy Player Protection
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Deter unauthorized screen recording and browser extraction on paid courses.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-2 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">Dynamic Watermark</span>
                          <input
                            type="checkbox"
                            checked={policyForm.dynamicWatermarkEnabled}
                            onChange={(e) =>
                              setPolicyForm({
                                ...policyForm,
                                dynamicWatermarkEnabled: e.target.checked
                              })
                            }
                            className="w-4 h-4 accent-indigo-600"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Overlays student Name, Email &amp; UID across video &amp; PDF canvas.
                        </p>
                      </label>

                      <label className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-2 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">Block Right-Click</span>
                          <input
                            type="checkbox"
                            checked={policyForm.preventRightClick}
                            onChange={(e) =>
                              setPolicyForm({
                                ...policyForm,
                                preventRightClick: e.target.checked
                              })
                            }
                            className="w-4 h-4 accent-indigo-600"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Prevents &quot;Save Video As...&quot; context menu on player &amp; PDF viewer.
                        </p>
                      </label>

                      <label className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-2 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">Disable PiP Popout</span>
                          <input
                            type="checkbox"
                            checked={policyForm.disablePictureInPicture}
                            onChange={(e) =>
                              setPolicyForm({
                                ...policyForm,
                                disablePictureInPicture: e.target.checked
                              })
                            }
                            className="w-4 h-4 accent-indigo-600"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Keeps video inside the watermarked player container.
                        </p>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Right 5 Columns: Live Signed Token Simulator & Per-Lesson Access Table */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Live Signed URL Simulator */}
                  <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                          Cryptographic Verification Lab
                        </span>
                        <h3 className="text-sm font-bold text-white mt-0.5">
                          Test Student-Specific Signed Stream Token
                        </h3>
                      </div>
                      <Icon name="terminal" size={20} className="text-emerald-400" />
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Generate a real <code className="text-emerald-300">HMAC-SHA256</code> signed stream URL bound to a single student session to see how the player validates access.
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleGenerateSignedPreview('VIDEO')}
                        disabled={generatingPreview}
                        className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Icon name="smart_display" size={16} />
                        <span>Simulate Signed Video URL</span>
                      </button>
                      <button
                        onClick={() => handleGenerateSignedPreview('PDF')}
                        disabled={generatingPreview}
                        className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Icon name="picture_as_pdf" size={16} />
                        <span>Simulate Signed PDF URL</span>
                      </button>
                    </div>

                    {tokenPreview && (
                      <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 space-y-2.5 text-[11px] font-mono">
                        <div className="flex items-center justify-between text-emerald-400">
                          <span>✓ SIGNED STREAM ISSUED</span>
                          <span>TTL: {tokenPreview.ttlMinutes} mins</span>
                        </div>
                        <div className="text-slate-300 truncate">
                          <span className="text-slate-500">Lecture: </span>
                          {tokenPreview.lessonTitle}
                        </div>
                        <div className="text-amber-300 truncate">
                          <span className="text-slate-500">Watermark: </span>
                          {tokenPreview.watermarkPreview}
                        </div>
                        <div>
                          <div className="text-slate-500 mb-1">Student-Bound Signed URL:</div>
                          <div className="p-2 rounded bg-slate-950 text-emerald-300 break-all text-[10px] leading-relaxed border border-emerald-500/20">
                            {tokenPreview.signedUrl}
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Expires At: {new Date(tokenPreview.expiresAt).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Per-Lesson Download & Access Matrix */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Lecture-Level Download Matrix ({selectedCourse.lessons.length})
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Toggle offline download permission for individual lectures.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSavePolicy(false)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold cursor-pointer"
                        >
                          Lock All
                        </button>
                        <button
                          onClick={() => handleSavePolicy(true)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold cursor-pointer"
                        >
                          Allow All
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                      {selectedCourse.lessons.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          No lessons in this course yet.
                        </div>
                      ) : (
                        selectedCourse.lessons.map((les, idx) => (
                          <div
                            key={les.id}
                            className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/80"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono text-slate-400">
                                  #{idx + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-800 truncate">
                                  {les.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                  {les.type || 'VIDEO'}
                                </span>
                                <span
                                  className={`text-[10px] font-bold ${
                                    les.isFree ? 'text-amber-600' : 'text-emerald-600'
                                  }`}
                                >
                                  {les.isFree ? 'Free Preview' : '🔒 Paid Enrollment Only'}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() =>
                                handleToggleLessonDownload(les.id, !les.allowDownload)
                              }
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all shrink-0 cursor-pointer ${
                                les.allowDownload
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : 'bg-slate-100 border-slate-200 text-slate-600'
                              }`}
                            >
                              {les.allowDownload ? 'Download Allowed' : 'Stream / View Only'}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </InstructorPortalShell>
  );
}

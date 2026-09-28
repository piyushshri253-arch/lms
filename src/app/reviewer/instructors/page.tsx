'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AuditorPortalShell from '@/components/reviewer/AuditorPortalShell';
import {
  UserCheck,
  FileText,
  Download,
  Calendar,
  Video,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Briefcase,
  Award,
  Sparkles,
  Send,
  Eye,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface InstructorApplicant {
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  userStatus: string;
  emailVerified: boolean;
  createdAt: string;
  qualification: string;
  additionalQualifications: string;
  qualificationsList?: Array<{
    degree: string;
    specialization: string;
    passingYear: string;
  }>;
  experience: string;
  experienceYears: string;
  resumeFileName: string | null;
  resumeDataUrl: string | null;
  resumeMimeType: string;
  resumeSize: number;
  applicationStatus: string;
  interviewDecision: 'PENDING' | 'TAKE_INTERVIEW' | 'SKIP_INTERVIEW';
  interviewStatus: string;
  interviewDate: string;
  interviewMeetingLink: string;
  interviewNotes: string;
  auditorNotes: string;
  onboardedAt: string | null;
  onboardedBy: string | null;
  submittedAt: string;
}

export default function AuditorInstructorOnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [instructors, setInstructors] = useState<InstructorApplicant[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    pendingOnboarding: 0,
    interviewStage: 0,
    onboarded: 0,
    rejected: 0
  });
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'INTERVIEW' | 'ONBOARDED' | 'REJECTED'>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<InstructorApplicant | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states for selected applicant
  const [interviewDecision, setInterviewDecision] = useState<'TAKE_INTERVIEW' | 'SKIP_INTERVIEW'>('TAKE_INTERVIEW');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewMeetingLink, setInterviewMeetingLink] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [auditorNotes, setAuditorNotes] = useState('');
  const [previewResumeOpen, setPreviewResumeOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reviewer/instructors');
      const data = await res.json();
      if (res.ok && data.instructors) {
        setInstructors(data.instructors);
        setSummary(
          data.summary || {
            total: data.instructors.length,
            pendingOnboarding: 0,
            interviewStage: 0,
            onboarded: 0,
            rejected: 0
          }
        );
        if (selected) {
          const refreshed = data.instructors.find((i: InstructorApplicant) => i.userId === selected.userId);
          if (refreshed) {
            setSelected(refreshed);
          }
        } else if (data.instructors.length > 0) {
          const firstPending =
            data.instructors.find((i: InstructorApplicant) => i.userStatus === 'PENDING_APPROVAL') ||
            data.instructors[0];
          selectApplicant(firstPending);
        }
      }
    } catch (err) {
      console.error('Failed to fetch instructor applications:', err);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectApplicant = (item: InstructorApplicant) => {
    setSelected(item);
    setInterviewDecision(item.interviewDecision === 'SKIP_INTERVIEW' ? 'SKIP_INTERVIEW' : 'TAKE_INTERVIEW');
    setInterviewDate(item.interviewDate || '');
    setInterviewMeetingLink(item.interviewMeetingLink || '');
    setInterviewNotes(item.interviewNotes || '');
    setAuditorNotes(item.auditorNotes || '');
    setPreviewResumeOpen(false);
  };

  const handleDownloadResume = (item: InstructorApplicant) => {
    if (!item.resumeDataUrl) {
      setToast({
        type: 'error',
        message: 'No uploaded resume file found for this pre-existing account.'
      });
      return;
    }
    const link = document.createElement('a');
    link.href = item.resumeDataUrl;
    link.download = item.resumeFileName || `${item.firstName}_${item.lastName}_Resume.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAuditorAction = async (
    action: 'DECIDE_INTERVIEW' | 'COMPLETE_INTERVIEW' | 'ONBOARD_INSTRUCTOR' | 'REJECT_INSTRUCTOR',
    extra?: { decision?: 'TAKE_INTERVIEW' | 'SKIP_INTERVIEW'; sendInviteEmail?: boolean }
  ) => {
    if (!selected) return;
    setActionLoading(action);
    setToast(null);

    try {
      const res = await fetch('/api/reviewer/instructors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selected.userId,
          action,
          interviewDecision: extra?.decision || interviewDecision,
          interviewDate,
          interviewMeetingLink,
          interviewNotes,
          auditorNotes,
          sendInviteEmail: extra?.sendInviteEmail ?? false
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ type: 'error', message: data.error || 'Action failed.' });
      } else {
        setToast({ type: 'success', message: data.message || 'Updated successfully!' });
        await loadData();
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Network error.' });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredList = instructors.filter((item) => {
    if (filter === 'PENDING') {
      if (item.userStatus !== 'PENDING_APPROVAL' && item.applicationStatus === 'ONBOARDED') return false;
    } else if (filter === 'INTERVIEW') {
      if (item.interviewDecision !== 'TAKE_INTERVIEW' || item.applicationStatus === 'ONBOARDED') return false;
    } else if (filter === 'ONBOARDED') {
      if (item.userStatus !== 'ACTIVE' || item.applicationStatus !== 'ONBOARDED') return false;
    } else if (filter === 'REJECTED') {
      if (item.userStatus !== 'REJECTED' && item.applicationStatus !== 'REJECTED') return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const match =
        item.fullName.toLowerCase().includes(q) ||
        item.firstName.toLowerCase().includes(q) ||
        item.lastName.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.qualification.toLowerCase().includes(q) ||
        item.experience.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <AuditorPortalShell
      title="Instructor Onboarding, Resume Review & Interview Studio"
      subtitle="Review new Instructor applications, download resumes, decide on interviews, and onboard instructors (triggers Welcome + Login Email)"
      actions={
        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      }
    >
      {/* Toast Notification */}
      {toast && (
        <div
          className={`mb-6 p-4 rounded-2xl border flex items-start justify-between gap-3 shadow-sm ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-start gap-2.5 text-xs font-bold leading-relaxed">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div
          onClick={() => setFilter('PENDING')}
          className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs cursor-pointer hover:border-amber-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Pending Onboarding
            </span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{summary.pendingOnboarding}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Awaiting resume &amp; interview review</p>
        </div>

        <div
          onClick={() => setFilter('INTERVIEW')}
          className="p-4 rounded-2xl bg-white border border-violet-200 shadow-xs cursor-pointer hover:border-violet-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-violet-700 uppercase tracking-wider">
              Interview Stage
            </span>
            <Video className="w-5 h-5 text-violet-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{summary.interviewStage}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Selected for Auditor interview</p>
        </div>

        <div
          onClick={() => setFilter('ONBOARDED')}
          className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs cursor-pointer hover:border-emerald-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Onboarded &amp; Active
            </span>
            <UserCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{summary.onboarded}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Login email sent &amp; studio active</p>
        </div>

        <div
          onClick={() => setFilter('ALL')}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs cursor-pointer hover:border-slate-400 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Total Applications
            </span>
            <GraduationCap className="w-5 h-5 text-slate-700" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{summary.total}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">All registered Instructors</p>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'All Applicants' },
            { id: 'PENDING', label: `Pending Approval (${summary.pendingOnboarding})` },
            { id: 'INTERVIEW', label: `Interview Stage (${summary.interviewStage})` },
            { id: 'ONBOARDED', label: `Onboarded (${summary.onboarded})` },
            { id: 'REJECTED', label: 'Rejected' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, qualification, exp..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Main Split View: Left Applicants Queue + Right Full Application, Resume Download & Onboarding Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-xs font-bold text-slate-500">
              Loading Instructor Applications...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
              <GraduationCap className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-800">No Instructor Applications Found</div>
              <p className="text-xs text-slate-500">
                New Instructor signups with resumes &amp; qualifications will appear here automatically.
              </p>
            </div>
          ) : (
            filteredList.map((item) => {
              const isSelected = selected?.userId === item.userId;
              const isPending = item.userStatus === 'PENDING_APPROVAL';
              const isOnboarded = item.userStatus === 'ACTIVE' && item.applicationStatus === 'ONBOARDED';
              return (
                <div
                  key={item.userId}
                  onClick={() => selectApplicant(item)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/70 border-emerald-500 shadow-md'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-extrabold text-sm text-slate-900">
                        {item.firstName} {item.lastName}
                      </div>
                      <div className="text-xs text-slate-500">{item.email}</div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                        isPending
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : isOnboarded
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {isPending
                        ? item.interviewDecision === 'TAKE_INTERVIEW'
                          ? '🎙️ Interview Stage'
                          : '⏳ Pending Approval'
                        : isOnboarded
                        ? '✅ Onboarded'
                        : item.userStatus}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <GraduationCap className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                      <span className="truncate font-semibold">{item.qualification}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Briefcase className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{item.experience}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      Applied: {new Date(item.submittedAt || item.createdAt).toLocaleDateString()}
                    </span>
                    {item.resumeDataUrl ? (
                      <span className="inline-flex items-center gap-1 font-bold text-violet-700">
                        <FileText className="w-3.5 h-3.5" />
                        Resume Uploaded
                      </span>
                    ) : (
                      <span className="text-slate-400">Profile Record</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Detail Panel (7 cols) */}
        <div className="lg:col-span-7">
          {!selected ? (
            <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
              <UserCheck className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">
                Select an Instructor Applicant to Review Details &amp; Onboard
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
              {/* Top Applicant Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-black text-slate-900">
                      {selected.firstName} {selected.lastName}
                    </h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        selected.userStatus === 'PENDING_APPROVAL'
                          ? 'bg-amber-100 text-amber-800'
                          : selected.userStatus === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {selected.userStatus === 'PENDING_APPROVAL'
                        ? 'PENDING AUDITOR ONBOARDING'
                        : selected.userStatus === 'ACTIVE'
                        ? 'ONBOARDED & ACTIVE'
                        : selected.userStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    First Name: <strong className="text-slate-800">{selected.firstName}</strong> • Last Name:{' '}
                    <strong className="text-slate-800">{selected.lastName}</strong>
                  </p>
                </div>

                {/* Resume Download Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadResume(selected)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Resume</span>
                  </button>
                  {selected.resumeDataUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewResumeOpen(!previewResumeOpen)}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{previewResumeOpen ? 'Hide Preview' : 'Preview'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Inline Resume Preview if opened */}
              {previewResumeOpen && selected.resumeDataUrl && (
                <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold">Resume Preview: {selected.resumeFileName}</span>
                    <button
                      onClick={() => setPreviewResumeOpen(false)}
                      className="text-slate-300 hover:text-white font-bold cursor-pointer"
                    >
                      Close ✕
                    </button>
                  </div>
                  {selected.resumeDataUrl.startsWith('data:application/pdf') ? (
                    <iframe
                      src={selected.resumeDataUrl}
                      title="Instructor Resume Preview"
                      className="w-full h-96 rounded-xl bg-white"
                    />
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-300">
                      This resume format ({selected.resumeFileName}) is ready for download. Click{' '}
                      <strong>Download Resume</strong> above to open it.
                    </div>
                  )}
                </div>
              )}

              {/* Qualifications, Additional Qualifications & Experience Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-violet-50/70 border border-violet-200">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-700">
                    <GraduationCap className="w-4 h-4" />
                    <span>Primary Qualification</span>
                  </div>
                  <div className="mt-1.5 text-sm font-extrabold text-slate-900">
                    {selected.qualification || 'Not specified'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                    <Award className="w-4 h-4" />
                    <span>Additional Qualification</span>
                  </div>
                  <div className="mt-1.5 text-sm font-extrabold text-slate-900">
                    {selected.additionalQualifications || 'None specified'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                    <Briefcase className="w-4 h-4" />
                    <span>Total Experience (Exp)</span>
                  </div>
                  <div className="mt-1.5 text-sm font-extrabold text-slate-900">
                    {selected.experience || 'Not specified'}
                  </div>
                </div>
              </div>

              {/* Detailed Qualifications & Passing Year List */}
              {selected.qualificationsList && selected.qualificationsList.length > 0 && (
                <div className="p-4 rounded-xl bg-violet-50/40 border border-violet-200/80 space-y-2.5">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-violet-950 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-violet-600" />
                    <span>Complete Qualifications &amp; Passing Years ({selected.qualificationsList.length})</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {selected.qualificationsList.map((q, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{q.degree}</span>
                          {q.specialization && (
                            <span className="text-slate-600 ml-1.5">— {q.specialization}</span>
                          )}
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-violet-100 text-violet-800 font-extrabold text-[11px] shrink-0">
                          Passing Year: {q.passingYear}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact & Address Details */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    <strong>Email:</strong> {selected.email}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    <strong>Mobile:</strong> {selected.phone || 'N/A'}
                  </span>
                </div>
                <div className="sm:col-span-2 flex items-start gap-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Address:</strong>{' '}
                    {[selected.address, selected.city, selected.state, selected.country, selected.pincode]
                      .filter(Boolean)
                      .join(', ') || 'N/A'}
                  </span>
                </div>
                <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-600">
                    <strong>Uploaded Resume File:</strong>{' '}
                    {selected.resumeFileName || 'Instructor_Resume.pdf'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownloadResume(selected)}
                    className="text-violet-600 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Resume Copy
                  </button>
                </div>
              </div>

              {/* STEP 1: Auditor Interview Decision */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Step 1: Auditor Interview Decision (Take Interview vs Direct Onboarding)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Decide whether to schedule an interview with {selected.firstName} or proceed directly to onboarding.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700">
                    Status: {selected.interviewStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setInterviewDecision('TAKE_INTERVIEW')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      interviewDecision === 'TAKE_INTERVIEW'
                        ? 'bg-violet-50 border-violet-500 text-violet-950 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-2">
                      <Video className="w-4 h-4 text-violet-600" />
                      <span>🎙️ Take Interview First</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Schedule or conduct an interview before approving onboarding.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInterviewDecision('SKIP_INTERVIEW')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      interviewDecision === 'SKIP_INTERVIEW'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>⚡ No Interview Needed (Direct Onboard)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Qualifications &amp; resume verified — ready for immediate onboarding.
                    </p>
                  </button>
                </div>

                {interviewDecision === 'TAKE_INTERVIEW' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Interview Date &amp; Time
                      </label>
                      <div className="relative">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={interviewDate}
                          onChange={(e) => setInterviewDate(e.target.value)}
                          placeholder="e.g. Tomorrow at 4:00 PM IST"
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Meeting Link (Google Meet / Zoom)
                      </label>
                      <input
                        type="text"
                        value={interviewMeetingLink}
                        onChange={(e) => setInterviewMeetingLink(e.target.value)}
                        placeholder="https://meet.google.com/..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Interview Assessment / Notes
                      </label>
                      <textarea
                        rows={2}
                        value={interviewNotes}
                        onChange={(e) => setInterviewNotes(e.target.value)}
                        placeholder="Record interview questions, subject knowledge feedback, or meeting instructions..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
                      />
                    </div>

                    <div className="sm:col-span-2 flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        disabled={!!actionLoading}
                        onClick={() =>
                          handleAuditorAction('DECIDE_INTERVIEW', {
                            decision: 'TAKE_INTERVIEW',
                            sendInviteEmail: true
                          })
                        }
                        className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Save &amp; Email Interview Invite</span>
                      </button>

                      <button
                        type="button"
                        disabled={!!actionLoading}
                        onClick={() => handleAuditorAction('COMPLETE_INTERVIEW')}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Interview Completed ✅</span>
                      </button>
                    </div>
                  </div>
                )}

                {interviewDecision === 'SKIP_INTERVIEW' && (
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={!!actionLoading}
                      onClick={() =>
                        handleAuditorAction('DECIDE_INTERVIEW', {
                          decision: 'SKIP_INTERVIEW',
                          sendInviteEmail: false
                        })
                      }
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm No Interview Required</span>
                    </button>
                  </div>
                )}
              </div>

              {/* STEP 2: Final Onboarding Approval & Send Login Email */}
              <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                    Step 2: Final Onboarding Decision &amp; Send Instructor Login Email
                  </h3>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Clicking <strong>Onboard Instructor &amp; Send Login Email</strong> activates{' '}
                    <strong>
                      {selected.firstName} {selected.lastName}&apos;s
                    </strong>{' '}
                    Instructor account and sends an official email to{' '}
                    <span className="font-mono font-bold">{selected.email}</span> with a direct{' '}
                    <strong>Log In to Instructor Portal →</strong> button linking to{' '}
                    <code>/instructor/login</code>.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    Auditor Remarks (Included in Onboarding Email)
                  </label>
                  <input
                    type="text"
                    value={auditorNotes}
                    onChange={(e) => setAuditorNotes(e.target.value)}
                    placeholder="e.g. Resume & interview verified. Welcome to Morena Teach Faculty!"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-emerald-300 text-xs text-slate-900"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={!!actionLoading}
                    onClick={() => handleAuditorAction('ONBOARD_INSTRUCTOR')}
                    className="flex-1 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>
                      {actionLoading === 'ONBOARD_INSTRUCTOR'
                        ? 'Onboarding & Sending Login Email...'
                        : selected.applicationStatus === 'ONBOARDED'
                        ? 'Re-Send Onboarding & Login Email ✅'
                        : 'Onboard Instructor & Send Login Email ✅'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={!!actionLoading}
                    onClick={() => handleAuditorAction('REJECT_INSTRUCTOR')}
                    className="py-3 px-4 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuditorPortalShell>
  );
}

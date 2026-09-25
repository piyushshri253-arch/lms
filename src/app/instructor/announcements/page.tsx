'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';
import { useApp } from '@/context/AppContext';

interface InstructorCourseOption {
  id: string;
  title: string;
  slug: string;
  status: string;
  enrolledCount: number;
}

interface SentAnnouncement {
  id: string;
  title: string;
  message: string;
  status: string;
  targetScope: 'ALL_OWN_COURSES' | 'SELECTED_COURSE';
  courseId: string | null;
  courseTitle: string;
  channel: 'BOTH' | 'IN_APP' | 'EMAIL';
  actionLink: string | null;
  recipientCount: number;
  inAppSentCount: number;
  emailSentCount: number;
  createdAt: string;
}

function InstructorAnnouncementsInner() {
  const { currentUser } = useApp();
  const searchParams = useSearchParams();
  const initialCourseId = searchParams?.get('courseId') || '';

  const [announcements, setAnnouncements] = useState<SentAnnouncement[]>([]);
  const [courses, setCourses] = useState<InstructorCourseOption[]>([]);
  const [stats, setStats] = useState({
    totalAnnouncements: 0,
    totalUniqueStudents: 0,
    totalInAppDelivered: 0,
    totalEmailsSent: 0
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Compose Form State
  const [targetScope, setTargetScope] = useState<'ALL_OWN_COURSES' | 'SELECTED_COURSE'>(
    initialCourseId ? 'SELECTED_COURSE' : 'ALL_OWN_COURSES'
  );
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [channel, setChannel] = useState<'BOTH' | 'IN_APP' | 'EMAIL'>('BOTH');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [actionLink, setActionLink] = useState('');
  const [alsoPostInCourseForum, setAlsoPostInCourseForum] = useState(true);
  const [sending, setSending] = useState(false);

  // History Filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyCourseFilter, setHistoryCourseFilter] = useState('');

  const showToastMessage = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (historySearch.trim()) params.set('search', historySearch.trim());
      if (historyCourseFilter) params.set('courseId', historyCourseFilter);

      const res = await fetch(`/api/instructor/announcements?${params.toString()}`, {
        cache: 'no-store'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load announcements');

      setAnnouncements(data.announcements || []);
      setCourses(data.courses || []);
      if (data.stats) setStats(data.stats);

      if (!selectedCourseId && data.courses?.length > 0) {
        setSelectedCourseId(data.courses[0].id);
      }
    } catch (err: any) {
      showToastMessage('error', err.message || 'Unable to load announcements');
    } finally {
      setLoading(false);
    }
  }, [historySearch, historyCourseFilter]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const activeSelectedCourse = courses.find((c) => c.id === selectedCourseId) || null;
  const estimatedRecipients =
    targetScope === 'ALL_OWN_COURSES'
      ? stats.totalUniqueStudents
      : activeSelectedCourse?.enrolledCount || 0;

  const applyQuickTemplate = (tplType: 'NEW_COURSE' | 'NEW_MODULE' | 'QUIZ_REMINDER' | 'LIVE_QA') => {
    const courseName =
      targetScope === 'SELECTED_COURSE' && activeSelectedCourse
        ? activeSelectedCourse.title
        : 'our latest masterclass';

    if (tplType === 'NEW_COURSE') {
      setTargetScope('ALL_OWN_COURSES');
      setTitle('🚀 New Course Launch: Enroll Now & Upgrade Your Skills!');
      setMessage(
        `Hello Students!\n\nI am thrilled to announce the launch of my brand-new course! Inside, you will learn hands-on projects, practical assignments, and industry best practices step by step.\n\nCheck it out directly from your Student Dashboard under Explore Courses!`
      );
      setActionLink('/lms/courses');
    } else if (tplType === 'NEW_MODULE') {
      setTitle(`📚 New Lessons & Study Material Added in ${courseName}`);
      setMessage(
        `Hi everyone!\n\nI have just published new video lessons and downloadable study resources in ${courseName}. Head over to your Course Player to watch the new module and post your questions in the Q&A tab!`
      );
      setActionLink(activeSelectedCourse ? `/learn/${activeSelectedCourse.id}` : '/dashboard/courses');
    } else if (tplType === 'QUIZ_REMINDER') {
      setTitle(`📝 New Quiz & Assignment Published — Test Your Knowledge!`);
      setMessage(
        `Hello Learners,\n\nA new graded Quiz and Assignment has been published in ${courseName}. Please complete your attempt before the due date to earn your course completion certificate.`
      );
      setActionLink(activeSelectedCourse ? `/learn/${activeSelectedCourse.id}` : '/dashboard/courses');
    } else if (tplType === 'LIVE_QA') {
      setTitle(`💬 Ask Your Doubts: Weekly Instructor Q&A Update`);
      setMessage(
        `Hello Students!\n\nI am reviewing all student questions and project submissions today. If you are stuck on any lesson or concept, post your doubt in the "Ask Instructor (Q&A)" section on your dashboard and I will reply with a complete solution!`
      );
      setActionLink('/dashboard/questions');
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToastMessage('error', 'Please enter both an Announcement Title and Message.');
      return;
    }
    if (targetScope === 'SELECTED_COURSE' && !selectedCourseId) {
      showToastMessage('error', 'Please select one of your courses.');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/instructor/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          targetScope,
          courseId: targetScope === 'SELECTED_COURSE' ? selectedCourseId : null,
          channel,
          actionLink: actionLink.trim() || null,
          alsoPostInCourseForum
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send announcement');

      setTitle('');
      setMessage('');
      setActionLink('');
      showToastMessage('success', data.message || 'Announcement sent successfully!');
      await fetchAnnouncements();
    } catch (err: any) {
      showToastMessage('error', err.message || 'Failed to broadcast announcement');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm('Delete this announcement from history?')) return;
    try {
      const res = await fetch(`/api/instructor/announcements?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete announcement');
      showToastMessage('success', 'Announcement deleted.');
      await fetchAnnouncements();
    } catch (err: any) {
      showToastMessage('error', err.message || 'Failed to delete announcement');
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  return (
    <InstructorPortalShell
      title="Student Announcements & Course Broadcasts"
      subtitle="Send new course launches, module updates, and reminders to students enrolled in your courses via Email & In-App Notification"
      profile={{
        name: currentUser?.name || 'Instructor',
        email: currentUser?.email || '',
        role: 'INSTRUCTOR',
        emailVerified: true
      }}
    >
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl border flex items-center gap-2.5 text-sm font-bold transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-[15px]">campaign</span>
            Instructor Broadcast Studio
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Send Announcements to Your Enrolled Students
          </h2>
          <p className="text-sm text-slate-500">
            Announce a new course launch, lesson update, or deadline to students in a specific course or across all your own courses.
          </p>
        </div>

        <div className="px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-bold text-emerald-800">
          <span className="material-symbols-outlined text-[18px] text-emerald-600">verified_user</span>
          <span>RBAC Scope: Only Your Own Courses ({courses.length})</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Announcements Sent
            </span>
            <span className="material-symbols-outlined text-[18px] text-indigo-600">campaign</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.totalAnnouncements}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Total broadcasts by you</p>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              My Enrolled Students
            </span>
            <span className="material-symbols-outlined text-[18px] text-emerald-600">groups</span>
          </div>
          <p className="text-2xl font-black text-emerald-700">{stats.totalUniqueStudents}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Unique students in your courses</p>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              In-App Alerts Sent
            </span>
            <span className="material-symbols-outlined text-[18px] text-sky-600">notifications_active</span>
          </div>
          <p className="text-2xl font-black text-sky-700">{stats.totalInAppDelivered}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Delivered to Student Dashboard</p>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Emails Dispatched
            </span>
            <span className="material-symbols-outlined text-[18px] text-purple-600">mail</span>
          </div>
          <p className="text-2xl font-black text-purple-700">{stats.totalEmailsSent}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Sent via Email notification</p>
        </div>
      </div>

      {/* Main Grid: Left Compose Form (7 cols) + Right Live Preview (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 items-start">
        {/* Left Column: Compose Broadcast Form */}
        <form
          onSubmit={handleBroadcastSubmit}
          className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Compose New Student Announcement
              </h3>
              <p className="text-xs text-slate-500">
                Choose a template or write a custom announcement for your students
              </p>
            </div>

            {/* Quick Template Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => applyQuickTemplate('NEW_COURSE')}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition-all"
              >
                🚀 New Launch Course
              </button>
              <button
                type="button"
                onClick={() => applyQuickTemplate('NEW_MODULE')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all"
              >
                📚 New Module Added
              </button>
              <button
                type="button"
                onClick={() => applyQuickTemplate('QUIZ_REMINDER')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all"
              >
                📝 Quiz / Assignment
              </button>
              <button
                type="button"
                onClick={() => applyQuickTemplate('LIVE_QA')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all"
              >
                💬 Q&A Session
              </button>
            </div>
          </div>

          {/* Step 1: Target Audience (All Own Courses vs Selected Own Course) */}
          <div>
            <label className="block text-xs font-black text-slate-800 mb-2">
              1. Select Target Audience (Only Your Own Courses) *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetScope('ALL_OWN_COURSES')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  targetScope === 'ALL_OWN_COURSES'
                    ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-slate-900">
                    All My Course Students
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black">
                    {stats.totalUniqueStudents} Students
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Send to every student enrolled across all {courses.length} of your courses (Best for &quot;New Launch Course&quot;)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTargetScope('SELECTED_COURSE')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  targetScope === 'SELECTED_COURSE'
                    ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-slate-900">
                    Selected Course Only
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black">
                    {activeSelectedCourse ? `${activeSelectedCourse.enrolledCount} Students` : 'Pick Course'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Send only to students enrolled in one specific course owned by you
                </p>
              </button>
            </div>

            {targetScope === 'SELECTED_COURSE' && (
              <div className="mt-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Choose Your Course *
                </label>
                <select
                  required
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Your Course --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.enrolledCount} Enrolled Students • {c.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Step 2: Delivery Channel (Email + In-App) */}
          <div>
            <label className="block text-xs font-black text-slate-800 mb-2">
              2. Select Delivery Channel *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  id: 'BOTH',
                  label: 'Email + In-App Alert',
                  desc: 'Recommended (Full Reach)',
                  icon: 'mark_email_unread'
                },
                {
                  id: 'IN_APP',
                  label: 'In-App Notification',
                  desc: 'Student Dashboard Bell',
                  icon: 'notifications_active'
                },
                {
                  id: 'EMAIL',
                  label: 'Email Only',
                  desc: 'Direct to Student Inbox',
                  icon: 'mail'
                }
              ].map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setChannel(ch.id as any)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    channel === ch.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-black text-xs mb-0.5">
                    <span className="material-symbols-outlined text-[16px]">{ch.icon}</span>
                    <span>{ch.label}</span>
                  </div>
                  <p
                    className={`text-[10px] ${
                      channel === ch.id ? 'text-indigo-100' : 'text-slate-400'
                    }`}
                  >
                    {ch.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Title & Message */}
          <div>
            <label className="block text-xs font-black text-slate-800 mb-1">
              3. Announcement Title / Subject *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g., "New Launch Course: Full-Stack AI Engineering Masterclass!"'
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-800 mb-1">
              4. Announcement Message *
            </label>
            <textarea
              rows={5}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your announcement message for your enrolled students..."
              className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Optional Action Link (URL / Route)
              </label>
              <input
                type="text"
                value={actionLink}
                onChange={(e) => setActionLink(e.target.value)}
                placeholder="e.g., /lms/courses or /learn/course-id"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700"
              />
            </div>

            <div className="pt-4">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alsoPostInCourseForum}
                  onChange={(e) => setAlsoPostInCourseForum(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Also pin this announcement in Course Q&A Forum
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Target Reach:{' '}
              <span className="font-black text-slate-900">
                {estimatedRecipients} Enrolled Student(s)
              </span>{' '}
              via{' '}
              <span className="font-black text-indigo-700">
                {channel === 'BOTH'
                  ? 'Email + In-App Notification'
                  : channel === 'IN_APP'
                  ? 'In-App Notification'
                  : 'Email'}
              </span>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-2 shadow-md transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              {sending ? 'Broadcasting Announcement...' : 'Send Announcement Now'}
            </button>
          </div>
        </form>

        {/* Right Column: Live Student Notification & Email Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-lg border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-indigo-400">
                  visibility
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Live Student Preview
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                {targetScope === 'ALL_OWN_COURSES'
                  ? 'All My Courses'
                  : activeSelectedCourse?.title || 'Selected Course'}
              </span>
            </div>

            {/* In-App Notification Preview */}
            <div className="bg-slate-800/90 rounded-2xl p-4 border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">notifications</span>
                  In-App Notification Bell Preview
                </span>
                <span className="text-[10px] text-slate-400">Just now</span>
              </div>
              <p className="text-xs font-black text-white">
                📢 {title.trim() || 'New Launch Course: Masterclass Update!'}
              </p>
              <p className="text-xs text-slate-300 whitespace-pre-wrap line-clamp-3">
                [
                {targetScope === 'ALL_OWN_COURSES'
                  ? 'All My Courses'
                  : activeSelectedCourse?.title || 'Course'}{' '}
                — {currentUser?.name || 'Instructor'}]:{' '}
                {message.trim() ||
                  'Your announcement message will appear here in every enrolled student’s dashboard notification center.'}
              </p>
            </div>

            {/* Email Inbox Preview */}
            <div className="bg-white text-slate-900 rounded-2xl p-4 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">mail</span>
                  Student Email Preview
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">Morena Teach LMS</span>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">
                  <strong className="text-slate-700">Subject:</strong> 📢 [
                  {targetScope === 'ALL_OWN_COURSES'
                    ? 'All My Courses'
                    : activeSelectedCourse?.title || 'Course'}
                  ] {title.trim() || 'New Launch Course!'}
                </p>
                <p className="text-[11px] text-slate-500">
                  <strong className="text-slate-700">From:</strong> {currentUser?.name || 'Instructor'} (Course Instructor)
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {message.trim() ||
                  'Hello Student,\nYour instructor has shared a new announcement with you...'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sent Announcements History */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Sent Announcements History ({announcements.length})
            </h3>
            <p className="text-xs text-slate-500">
              Complete log of announcements broadcasted to your enrolled students
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search sent announcements..."
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
            />
            <select
              value={historyCourseFilter}
              onChange={(e) => setHistoryCourseFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
            >
              <option value="">All Scopes & Courses</option>
              <option value="ALL_OWN">All My Courses Broadcasts</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-xs font-bold text-slate-500">
            Loading announcement history...
          </div>
        ) : announcements.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-slate-200 rounded-2xl">
            <p className="text-xs font-bold text-slate-600">
              No announcements sent yet. Use the broadcast composer above to send your first announcement!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase">
                      {ann.targetScope === 'ALL_OWN_COURSES'
                        ? 'All My Courses'
                        : `Course: ${ann.courseTitle}`}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                      {ann.channel === 'BOTH'
                        ? 'Email + In-App'
                        : ann.channel === 'IN_APP'
                        ? 'In-App Only'
                        : 'Email Only'}
                    </span>

                    <span className="text-[11px] text-slate-400 font-medium">
                      {formatDate(ann.createdAt)}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-slate-900">{ann.title}</h4>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">{ann.message}</p>
                </div>

                <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900">
                      {ann.recipientCount} Student(s)
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {ann.inAppSentCount} In-App • {ann.emailSentCount} Emails
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteAnnouncement(ann.id)}
                    className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </InstructorPortalShell>
  );
}

export default function InstructorAnnouncementsPage() {
  return (
    <Suspense fallback={null}>
      <InstructorAnnouncementsInner />
    </Suspense>
  );
}

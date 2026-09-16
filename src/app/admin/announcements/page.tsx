'use client';

import React, { useState, Suspense } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useAdmin } from '@/context/AdminContext';
import { useApp } from '@/context/AppContext';

function AnnouncementsPageContent() {
  const { activeFacility } = useAdmin();
  const { showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'ALL' | 'STUDENTS' | 'INSTRUCTORS' | 'SCHEDULED'>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [announcements, setAnnouncements] = useState<any[]>([
    {
      id: 'anc-1',
      title: 'Term 2 Final Assessments & Submission Deadlines',
      content:
        'All student submissions for architectural capstone projects are due by Friday 23:59 IST. Plagiarism checks will be automatically performed upon upload.',
      targetAudience: 'STUDENTS',
      priority: 'HIGH',
      status: 'PUBLISHED',
      scheduledDate: null,
      publishedAt: '14 Sept 2026, 10:00 AM',
      deliveredCount: 1840,
      readCount: 1420
    },
    {
      id: 'anc-2',
      title: 'Faculty Grading Portal Maintenance & Rubric Update',
      content:
        'The grading engine will undergo scheduled enhancements tonight. Faculty members are advised to export their draft evaluation sheets prior to 01:00 AM.',
      targetAudience: 'INSTRUCTORS',
      priority: 'URGENT',
      status: 'PUBLISHED',
      scheduledDate: null,
      publishedAt: '13 Sept 2026, 04:30 PM',
      deliveredCount: 42,
      readCount: 38
    },
    {
      id: 'anc-3',
      title: 'Upcoming Masterclass: Microservices on Kubernetes',
      content:
        'Guest lecture with Dr. Turing scheduled for next Tuesday at 16:00 IST. Link to live stream will be dispatched 30 minutes prior.',
      targetAudience: 'STUDENTS',
      priority: 'NORMAL',
      status: 'SCHEDULED',
      scheduledDate: '22 Sept 2026, 09:00 AM',
      publishedAt: null,
      deliveredCount: 0,
      readCount: 0
    },
    {
      id: 'anc-4',
      title: 'Annual Curriculum Review and Textbook Revisions',
      content:
        'All department heads and teaching faculty are invited to review the 2027 curriculum syllabus updates in the faculty lounge repository.',
      targetAudience: 'INSTRUCTORS',
      priority: 'NORMAL',
      status: 'PUBLISHED',
      scheduledDate: null,
      publishedAt: '10 Sept 2026, 11:15 AM',
      deliveredCount: 45,
      readCount: 40
    }
  ]);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetAudience: 'STUDENTS',
    priority: 'NORMAL',
    isScheduled: false,
    scheduledDate: ''
  });

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      showToast({ title: 'Validation Error', description: 'Title and announcement content are required.', type: 'error' });
      return;
    }

    const newAnc = {
      id: `anc-${Date.now()}`,
      title: formData.title.trim(),
      content: formData.content.trim(),
      targetAudience: formData.targetAudience,
      priority: formData.priority,
      status: formData.isScheduled ? 'SCHEDULED' : 'PUBLISHED',
      scheduledDate: formData.isScheduled ? formData.scheduledDate : null,
      publishedAt: formData.isScheduled ? null : 'Just now',
      deliveredCount: formData.isScheduled ? 0 : 1850,
      readCount: 0
    };

    setAnnouncements([newAnc, ...announcements]);
    setIsCreateModalOpen(false);
    setFormData({
      title: '',
      content: '',
      targetAudience: 'STUDENTS',
      priority: 'NORMAL',
      isScheduled: false,
      scheduledDate: ''
    });

    showToast({
      title: formData.isScheduled ? 'Announcement Scheduled' : 'Announcement Broadcasted',
      description: `Dispatched to ${formData.targetAudience.toLowerCase()}.`,
      type: 'success'
    });
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    showToast({ title: 'Removed', description: 'Announcement removed from notice board.', type: 'info' });
  };

  const filtered = announcements.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'STUDENTS') return matchesSearch && a.targetAudience === 'STUDENTS';
    if (activeTab === 'INSTRUCTORS') return matchesSearch && a.targetAudience === 'INSTRUCTORS';
    if (activeTab === 'SCHEDULED') return matchesSearch && a.status === 'SCHEDULED';
    return matchesSearch;
  });

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
              Announcements & Notice Board
            </h1>
            <span className="text-[11px] font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full">
              {activeFacility?.name}
            </span>
          </div>
          <p className="text-xs text-outline font-medium mt-1">
            Broadcast official circulars, scheduling alerts, and campus notices to learners and instructors.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Icon name="campaign" size={16} />
          <span>+ Create Announcement</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Total Notices</span>
            <Icon name="campaign" size={18} className="text-primary" />
          </div>
          <p className="text-2xl font-black text-on-surface">{announcements.length}</p>
          <p className="text-[11px] text-outline font-semibold">Active campus circulars</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Student Notices</span>
            <Icon name="school" size={18} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-on-surface">
            {announcements.filter((a) => a.targetAudience === 'STUDENTS').length}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold">1,840 learners notified</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Faculty Notices</span>
            <Icon name="groups" size={18} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black text-on-surface">
            {announcements.filter((a) => a.targetAudience === 'INSTRUCTORS').length}
          </p>
          <p className="text-[11px] text-outline font-semibold">45 faculty members</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Scheduled</span>
            <Icon name="schedule" size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-on-surface">
            {announcements.filter((a) => a.status === 'SCHEDULED').length}
          </p>
          <p className="text-[11px] text-amber-600 font-semibold">Upcoming broadcast</p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl overflow-x-auto w-full sm:w-auto">
          {(
            [
              { key: 'ALL', label: 'All Notices' },
              { key: 'STUDENTS', label: 'Student Notices' },
              { key: 'INSTRUCTORS', label: 'Faculty Notices' },
              { key: 'SCHEDULED', label: 'Scheduled Queue' }
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search circulars by keyword..."
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-surface-container-low border border-outline-variant/80 text-xs font-semibold focus:outline-none focus:border-primary placeholder:text-outline"
          />
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {filtered.map((anc) => (
          <div
            key={anc.id}
            className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs hover:border-primary/40 transition-colors space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                    anc.targetAudience === 'STUDENTS'
                      ? 'bg-blue-500/10 text-blue-700'
                      : 'bg-purple-500/10 text-purple-700'
                  }`}
                >
                  {anc.targetAudience === 'STUDENTS' ? '🎓 Students' : '🏛️ Faculty'}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                    anc.priority === 'URGENT'
                      ? 'bg-rose-500/10 text-rose-700'
                      : anc.priority === 'HIGH'
                      ? 'bg-amber-500/10 text-amber-700'
                      : 'bg-surface-container text-outline'
                  }`}
                >
                  {anc.priority} Priority
                </span>
                {anc.status === 'SCHEDULED' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-700 flex items-center gap-1">
                    <Icon name="schedule" size={12} />
                    <span>Scheduled for: {anc.scheduledDate}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-outline">
                {anc.publishedAt && <span>Dispatched: {anc.publishedAt}</span>}
                <button
                  type="button"
                  onClick={() => handleDeleteAnnouncement(anc.id)}
                  className="p-1 hover:text-rose-600 rounded transition-colors"
                  title="Delete circular"
                >
                  <Icon name="delete" size={16} />
                </button>
              </div>
            </div>

            <h3 className="text-sm font-extrabold text-on-surface">{anc.title}</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">{anc.content}</p>

            {anc.status === 'PUBLISHED' && (
              <div className="pt-2 border-t border-outline-variant/40 flex items-center gap-6 text-[11px] text-outline font-semibold">
                <span className="flex items-center gap-1.5">
                  <Icon name="mark_email_read" size={14} className="text-emerald-600" />
                  <span>{anc.deliveredCount} Delivered</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="visibility" size={14} className="text-primary" />
                  <span>{anc.readCount} Acknowledged ({Math.round((anc.readCount / anc.deliveredCount) * 100)}%)</span>
                </span>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="p-8 text-center bg-surface-container-lowest border border-outline-variant/80 rounded-2xl text-outline">
            No notices match the selected criteria.
          </div>
        )}
      </div>

      {/* Create Announcement Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            style={{ width: '100%', maxWidth: '640px' }}
            className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-8 w-full max-w-[640px] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon name="campaign" size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-on-surface">Publish Official Notice</h3>
                  <p className="text-[11px] text-outline font-mono">Broadcast to Campus Body</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Notice Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Schedule Update: Campus Mid-Term Evaluation"
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Target Audience</label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary"
                  >
                    <option value="STUDENTS">All Students</option>
                    <option value="INSTRUCTORS">Teaching Faculty</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent Action Required</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Notice Body / Circular Details</label>
                <textarea
                  rows={4}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Detailed announcements, instructions, links, or directives..."
                  className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-medium focus:outline-none focus:border-primary"
                />
              </div>

              {/* Schedule Toggle */}
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isScheduled}
                    onChange={(e) => setFormData({ ...formData, isScheduled: e.target.checked })}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span className="text-xs font-bold text-on-surface">Schedule for later date & time</span>
                </label>

                {formData.isScheduled && (
                  <input
                    type="datetime-local"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary"
                  />
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-outline hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
                >
                  {formData.isScheduled ? 'Schedule Broadcast' : 'Send Broadcast Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminAnnouncementsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-outline">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-mono">Loading Announcements...</p>
        </div>
      }
    >
      <AnnouncementsPageContent />
    </Suspense>
  );
}

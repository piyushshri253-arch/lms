'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

export default function SuperAdminAnnouncementsPage() {
  const { showToast } = useApp();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('ALL');
  const [courseId, setCourseId] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/super-admin/announcements');
      if (res.ok) {
        const d = await res.json();
        setAnnouncements(d.announcements || []);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      if (res.ok) {
        const d = await res.json();
        setCourses(d.courses || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchAnnouncements();
    fetchCourses();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setTitle('');
    setMessage('');
    setTargetAudience('ALL');
    setCourseId('');
    setStatus('ACTIVE');
    setIsModalOpen(true);
  };

  const openEditModal = (a: any) => {
    setEditingId(a.id);
    setTitle(a.title);
    setMessage(a.message);
    setTargetAudience(a.targetAudience || 'ALL');
    setCourseId(a.courseId || '');
    setStatus(a.status || 'ACTIVE');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast({ title: 'Validation Error', description: 'Title and message are required.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: editingId,
        title: title.trim(),
        message: message.trim(),
        targetAudience,
        courseId: targetAudience === 'COURSE' ? courseId || null : null,
        status
      };

      const res = await fetch('/api/super-admin/announcements', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save announcement');

      showToast({
        title: editingId ? 'Announcement Updated' : 'Announcement Broadcasted Live 🚀',
        description: `"${title}" has been saved with status "${status}".`,
        type: 'success'
      });

      setIsModalOpen(false);
      await fetchAnnouncements();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (a: any) => {
    const nextStatus = a.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    try {
      const res = await fetch('/api/super-admin/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.id, status: nextStatus })
      });
      if (res.ok) {
        showToast({
          title: `Status Changed to ${nextStatus}`,
          description: `Announcement is now ${nextStatus === 'ACTIVE' ? 'live on student dashboards' : 'saved as draft'}.`,
          type: 'info'
        });
        await fetchAnnouncements();
      }
    } catch (err: any) {
      showToast({ title: 'Update Failed', description: err.message, type: 'error' });
    }
  };

  const handleDelete = async (id: string, annTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${annTitle}"?`)) return;
    try {
      const res = await fetch(`/api/super-admin/announcements?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast({ title: 'Announcement Deleted', type: 'info' });
        await fetchAnnouncements();
      }
    } catch (err: any) {
      showToast({ title: 'Delete Failed', description: err.message, type: 'error' });
    }
  };

  const filteredAnnouncements = announcements.filter((a) => {
    if (statusFilter === 'ALL') return true;
    return a.status?.toUpperCase() === statusFilter;
  });

  const activeCount = announcements.filter((a) => a.status === 'ACTIVE').length;
  const draftCount = announcements.filter((a) => a.status === 'DRAFT').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/super-admin" className="hover:text-primary">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Announcements</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Platform Announcements &amp; Broadcasts
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Publish live alert banners, promotional notices, and course updates to students &amp; staff
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 bg-primary text-on-primary font-extrabold text-xs rounded-xl hover:bg-primary-container shadow-xs flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
        >
          <Icon name="add" size={18} />
          <span>New Broadcast</span>
        </button>
      </div>

      {/* KPI Stats & Status Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/80">
        <div className="flex items-center gap-2">
          {['ALL', 'ACTIVE', 'DRAFT', 'EXPIRED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === s
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:bg-surface hover:text-on-surface'
              }`}
            >
              {s === 'ALL' ? `All (${announcements.length})` : s === 'ACTIVE' ? `Live Active (${activeCount})` : s === 'DRAFT' ? `Drafts (${draftCount})` : s}
            </button>
          ))}
        </div>

        <button
          onClick={fetchAnnouncements}
          className="text-xs font-bold text-outline hover:text-primary flex items-center gap-1 cursor-pointer px-3 py-1.5 rounded-lg hover:bg-surface"
        >
          <Icon name="refresh" size={16} />
          <span>Refresh Live DB</span>
        </button>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-outline space-y-2">
            <Icon name="hourglass_top" size={24} className="animate-spin mx-auto text-primary" />
            <p>Loading platform announcements...</p>
          </div>
        ) : filteredAnnouncements.length > 0 ? (
          filteredAnnouncements.map((a) => (
            <div
              key={a.id}
              className={`p-6 bg-surface-container-lowest border rounded-3xl shadow-xs space-y-3 flex flex-col md:flex-row md:items-start justify-between gap-4 transition-all ${
                a.status === 'ACTIVE'
                  ? 'border-primary/40 bg-gradient-to-r from-primary/[0.02] to-surface-container-lowest'
                  : 'border-outline-variant/80 opacity-80'
              }`}
            >
              <div className="space-y-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-mono font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                      a.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}
                  >
                    ● {a.status}
                  </span>

                  <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    Audience: {a.targetAudience}
                  </span>

                  {a.course && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Course: {a.course.title}
                    </span>
                  )}

                  <span className="text-[10px] text-outline font-mono">
                    {new Date(a.createdAt).toLocaleDateString([], {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                <h3 className="font-extrabold text-base text-on-surface flex items-center gap-2">
                  <Icon name="campaign" size={20} className="text-primary shrink-0" />
                  <span>{a.title}</span>
                </h3>

                <p className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-line bg-surface p-3 rounded-xl border border-outline-variant/40">
                  {a.message}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                <button
                  onClick={() => handleToggleStatus(a)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    a.status === 'ACTIVE'
                      ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                      : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                  }`}
                  title={a.status === 'ACTIVE' ? 'Switch to Draft' : 'Publish Live to Students'}
                >
                  {a.status === 'ACTIVE' ? 'Set as Draft' : 'Publish Live'}
                </button>

                <button
                  onClick={() => openEditModal(a)}
                  className="p-2 border border-outline-variant hover:border-primary text-outline hover:text-primary rounded-xl cursor-pointer"
                  title="Edit Announcement"
                >
                  <Icon name="edit" size={16} />
                </button>

                <button
                  onClick={() => handleDelete(a.id, a.title)}
                  className="p-2 border border-outline-variant hover:border-rose-300 text-outline hover:text-rose-600 rounded-xl cursor-pointer"
                  title="Delete Announcement"
                >
                  <Icon name="delete" size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-xs text-outline space-y-3 bg-surface-container-lowest rounded-3xl border border-outline-variant/80">
            <Icon name="campaign" size={32} className="mx-auto text-outline/50" />
            <p className="font-bold text-sm text-on-surface">No announcements found</p>
            <p>Click "New Broadcast" above to create and publish a platform alert.</p>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="lg"
        title={editingId ? 'Edit Platform Announcement' : 'Broadcast Platform Announcement'}
        subtitle="Publish a global banner alert or targeted course message"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Announcement Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., 50% OFF Festive Discount on IT & Cloud Architecture Courses"
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Target Audience
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="ALL">Everyone (All Students &amp; Staff)</option>
                <option value="STUDENTS">All Students Only</option>
                <option value="COURSE">Specific Course Students Only</option>
                <option value="INSTRUCTORS">Faculty &amp; Instructors Only</option>
                <option value="ADMINS">Administrative Staff Only</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Publication Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="ACTIVE">ACTIVE (Published Live to Students)</option>
                <option value="DRAFT">DRAFT (Saved internally)</option>
                <option value="EXPIRED">EXPIRED (Archived)</option>
              </select>
            </div>
          </div>

          {/* Conditional Target Course Selection */}
          {targetAudience === 'COURSE' && (
            <div className="space-y-1.5 bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200 animate-in fade-in">
              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-900">
                Select Targeted Course
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                required
                className="w-full bg-surface border border-indigo-300 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="">-- Choose Course --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.category})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-indigo-700 font-medium">
                Only students actively enrolled in this course will see this announcement.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Announcement Message &amp; Content
            </label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Details regarding the platform update, exam schedule, discount code, or new master curriculum..."
              className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs focus:outline-none focus:border-primary leading-relaxed"
            />
          </div>

          {/* Live Preview Box */}
          {title.trim() && (
            <div className="space-y-1.5 bg-primary/5 p-3.5 rounded-2xl border border-primary/20">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary block">
                Student Dashboard Live Banner Preview:
              </span>
              <div className="p-3 bg-surface rounded-xl border border-primary/30 flex items-start gap-2.5">
                <Icon name="campaign" size={18} className="text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-on-surface">{title}</p>
                  <p className="text-[11px] text-on-surface-variant line-clamp-2">{message}</p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-outline-variant/40 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs rounded-xl border border-outline-variant cursor-pointer hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingId ? 'Update Announcement' : 'Publish Broadcast'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Modal } from '@/components/ui/Modal';
import { useAdmin } from '@/context/AdminContext';
import { useApp } from '@/context/AppContext';

interface Reviewer {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  bio?: string | null;
  status: string;
  role: string;
  customRole?: string | null;
  coursesReviewed: number;
  lastLoginAt?: string | null;
  createdAt: string;
}

export default function AdminReviewersPage() {
  const { showToast } = useApp();
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Reviewer Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: 'Reviewer@123',
    phone: '',
    bio: 'Quality Assurance & Course Evaluation Reviewer'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Credentials Modal
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);

  const fetchReviewers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/reviewers?search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setReviewers(data.reviewers || []);
      } else {
        showToast({ title: 'Error', description: data.error || 'Failed to load reviewers', type: 'error' });
      }
    } catch (e: any) {
      showToast({ title: 'Error', description: e.message || 'Network error', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewers();
  }, []);

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = 'Rev_';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: pwd }));
    setShowPassword(true);
  };

  const handleCreateReviewer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast({ title: 'Validation Error', description: 'Name and email are required.', type: 'error' });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/admin/reviewers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast({
          title: 'Reviewer Appointed! 🎉',
          description: data.message,
          type: 'success'
        });
        setCreatedCredentials({
          name: data.reviewer.name,
          email: data.credentials.email,
          password: data.credentials.password
        });
        setIsAddModalOpen(false);
        setFormData({
          name: '',
          email: '',
          password: 'Reviewer@123',
          phone: '',
          bio: 'Quality Assurance & Course Evaluation Reviewer'
        });
        fetchReviewers();
      } else {
        showToast({
          title: 'Creation Failed',
          description: data.error || 'Could not appoint reviewer.',
          type: 'error'
        });
      }
    } catch (e: any) {
      showToast({ title: 'Error', description: e.message || 'Server error', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (reviewer: Reviewer) => {
    const nextStatus = reviewer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/admin/reviewers/${reviewer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast({
          title: 'Status Updated',
          description: `Reviewer is now ${nextStatus}.`,
          type: 'success'
        });
        fetchReviewers();
      } else {
        showToast({ title: 'Error', description: data.error, type: 'error' });
      }
    } catch (e: any) {
      showToast({ title: 'Error', description: e.message, type: 'error' });
    }
  };

  const handleDeleteReviewer = async (reviewer: Reviewer) => {
    if (!confirm(`Are you sure you want to remove reviewer "${reviewer.name}"? If they evaluated courses, their account will be deactivated instead to preserve historical records.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/reviewers/${reviewer.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast({ title: 'Reviewer Removed', description: data.message, type: 'success' });
        fetchReviewers();
      } else {
        showToast({ title: 'Error', description: data.error, type: 'error' });
      }
    } catch (e: any) {
      showToast({ title: 'Error', description: e.message, type: 'error' });
    }
  };

  const filteredReviewers = reviewers.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
  });

  const activeReviewersCount = reviewers.filter((r) => r.status === 'ACTIVE').length;
  const totalCoursesReviewed = reviewers.reduce((acc, r) => acc + (r.coursesReviewed || 0), 0);

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
              Course Reviewers & Quality QA
            </h1>
            <span className="text-[11px] font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full">
              Review Board
            </span>
          </div>
          <p className="text-xs text-outline font-medium mt-1">
            Appoint and manage authorized reviewers who evaluate and approve/reject instructor course submissions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Icon name="person_add" size={16} />
          Appoint New Reviewer
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3">
        <Link
          href="/admin/instructors"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-outline hover:text-on-surface hover:bg-surface-variant transition-colors flex items-center gap-1.5"
        >
          <Icon name="school" size={16} />
          Faculty Instructors
        </Link>
        <div className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
          <Icon name="verified" size={16} />
          Course Reviewers
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-outline uppercase tracking-wider">Total Reviewers</span>
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Icon name="shield_person" size={20} />
            </span>
          </div>
          <div className="text-2xl font-black text-on-surface mt-2">{reviewers.length}</div>
          <p className="text-[11px] text-outline mt-0.5">Authorized Quality Review Staff</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-outline uppercase tracking-wider">Active Status</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Icon name="check_circle" size={20} />
            </span>
          </div>
          <div className="text-2xl font-black text-on-surface mt-2">{activeReviewersCount}</div>
          <p className="text-[11px] text-outline mt-0.5">Currently active and evaluating</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-outline uppercase tracking-wider">Courses Evaluated</span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Icon name="rate_review" size={20} />
            </span>
          </div>
          <div className="text-2xl font-black text-on-surface mt-2">{totalCoursesReviewed}</div>
          <p className="text-[11px] text-outline mt-0.5">Total curriculum evaluations done</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviewer name or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-container border border-outline-variant/40 text-xs sm:text-sm text-on-surface placeholder-outline focus:outline-none focus:border-primary transition-all"
          />
          <span className="absolute left-3 top-2.5 text-outline">
            <Icon name="search" size={16} />
          </span>
        </div>
      </div>

      {/* Reviewers Table */}
      <div className="rounded-2xl border border-outline-variant/30 bg-surface-container overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-outline">
            <Icon name="sync" size={28} className="animate-spin text-primary mx-auto mb-2" />
            <p className="text-xs">Loading reviewers roster...</p>
          </div>
        ) : filteredReviewers.length === 0 ? (
          <div className="py-16 text-center text-outline">
            <Icon name="shield_person" size={40} className="mx-auto text-outline mb-2" />
            <p className="text-sm font-semibold text-on-surface">No Course Reviewers Found</p>
            <p className="text-xs text-outline mt-1">
              Appoint a reviewer to start evaluating submitted courses.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold"
            >
              + Appoint First Reviewer
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-variant/30 text-outline font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Reviewer Details</th>
                  <th className="py-3 px-4">Role & Permissions</th>
                  <th className="py-3 px-4">Courses Evaluated</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Appointed Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredReviewers.map((reviewer) => (
                  <tr key={reviewer.id} className="hover:bg-surface-variant/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={reviewer.name} avatar={reviewer.avatar} size="sm" />
                        <div>
                          <div className="font-bold text-on-surface">{reviewer.name}</div>
                          <div className="text-[11px] text-outline">{reviewer.email}</div>
                          {reviewer.phone && (
                            <div className="text-[10px] text-outline flex items-center gap-1 mt-0.5">
                              <Icon name="phone" size={12} />
                              {reviewer.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        Course Reviewer
                      </span>
                      <p className="text-[10px] text-outline mt-1 max-w-[200px] truncate">
                        {reviewer.bio || 'Curriculum Quality & Policy'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-bold text-on-surface">
                        <Icon name="rate_review" size={14} className="text-primary" />
                        {reviewer.coursesReviewed} course{reviewer.coursesReviewed !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(reviewer)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                          reviewer.status === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                            : 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25'
                        }`}
                        title="Click to toggle status"
                      >
                        {reviewer.status}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-outline">
                      {new Date(reviewer.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteReviewer(reviewer)}
                        className="p-1.5 rounded-lg text-outline hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remove Reviewer"
                      >
                        <Icon name="delete" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Appoint Reviewer Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Appoint New Course Reviewer"
          maxWidth="md"
        >
          <form onSubmit={handleCreateReviewer} className="space-y-4 text-on-surface">
            <div>
              <label className="block text-xs font-semibold text-outline mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Dr. Rajesh Sharma"
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/40 text-xs sm:text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-outline mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="reviewer@morenateach.com"
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/40 text-xs sm:text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-outline">
                  Temporary Password *
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[11px] text-primary hover:underline font-bold"
                >
                  Generate Strong
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/40 text-xs sm:text-sm text-on-surface focus:outline-none focus:border-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-outline hover:text-on-surface"
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={16} />
                </button>
              </div>
              <p className="text-[10px] text-outline mt-1">
                Provide this temporary password to the reviewer. They will log in at /login.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-outline mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/40 text-xs sm:text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-outline mb-1">
                Bio / Specialization
              </label>
              <textarea
                rows={2}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Quality Assurance, Curriculum Review, Technical Pedagogy"
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/40 text-xs sm:text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-variant text-outline hover:text-on-surface text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Icon name="sync" size={14} className="animate-spin" />
                    Appointing...
                  </>
                ) : (
                  <>
                    <Icon name="check" size={14} />
                    Appoint Reviewer
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Generated Credentials Success Modal */}
      {createdCredentials && (
        <Modal
          isOpen={!!createdCredentials}
          onClose={() => setCreatedCredentials(null)}
          title="Reviewer Credentials Generated"
          maxWidth="sm"
        >
          <div className="space-y-4 text-on-surface">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
              <Icon name="check_circle" size={18} />
              <span>Reviewer account created successfully!</span>
            </div>

            <p className="text-xs text-outline">
              Share these credentials with <strong>{createdCredentials.name}</strong>. They will use these to log into the Course Quality Review Studio.
            </p>

            <div className="p-3 rounded-xl bg-surface-variant/40 border border-outline-variant/40 space-y-2 text-xs">
              <div>
                <span className="text-[10px] text-outline uppercase font-bold block">Login URL:</span>
                <span className="font-mono text-primary font-semibold">https://lms-phi-plum.vercel.app/login</span>
              </div>
              <div>
                <span className="text-[10px] text-outline uppercase font-bold block">Email:</span>
                <span className="font-mono text-on-surface font-semibold">{createdCredentials.email}</span>
              </div>
              <div>
                <span className="text-[10px] text-outline uppercase font-bold block">Password:</span>
                <span className="font-mono text-on-surface font-semibold">{createdCredentials.password}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Login URL: https://lms-phi-plum.vercel.app/login\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`
                  );
                  showToast({ title: 'Copied!', description: 'Credentials copied to clipboard.', type: 'success' });
                }}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Icon name="content_copy" size={14} />
                Copy Credentials
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-2 rounded-xl bg-surface-variant text-outline hover:text-on-surface text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

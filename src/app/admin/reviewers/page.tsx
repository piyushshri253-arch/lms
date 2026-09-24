'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

interface Auditor {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  bio?: string | null;
  status: string;
  emailVerified?: boolean;
  role: string;
  customRole?: string | null;
  coursesReviewed: number;
  lastLoginAt?: string | null;
  createdAt: string;
}

export default function AdminReviewersPage() {
  const { showToast } = useApp();
  const [reviewers, setReviewers] = useState<Auditor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Auditor Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: 'Auditor@123',
    phone: '',
    bio: 'Quality Assurance & Course Evaluation Auditor'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP Verification & Credentials Modal
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    isVerified?: boolean;
  } | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  const fetchReviewers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/reviewers?search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setReviewers(data.reviewers || []);
      } else {
        showToast({ title: 'Error', description: data.error || 'Failed to load auditors', type: 'error' });
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
    let pwd = 'Aud_';
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
          title: 'OTP Sent to Email! 📩',
          description: `Verification OTP dispatched to ${data.credentials.email}.`,
          type: 'success'
        });
        setOtpCode('');
        setCreatedCredentials({
          name: data.reviewer.name,
          email: data.credentials.email,
          password: data.credentials.password,
          isVerified: false
        });
        setIsAddModalOpen(false);
        setFormData({
          name: '',
          email: '',
          password: 'Auditor@123',
          phone: '',
          bio: 'Quality Assurance & Course Evaluation Auditor'
        });
        fetchReviewers();
      } else {
        showToast({
          title: 'Creation Failed',
          description: data.error || 'Could not appoint auditor.',
          type: 'error'
        });
      }
    } catch (e: any) {
      showToast({ title: 'Error', description: e.message || 'Server error', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdCredentials || !otpCode.trim() || otpCode.trim().length < 6) {
      showToast({ title: 'Invalid OTP', description: 'Please enter the 6-digit OTP sent to the email.', type: 'error' });
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createdCredentials.email,
          otp: otpCode.trim(),
          skipSessionCookie: true
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OTP verification failed');

      setCreatedCredentials((prev) => (prev ? { ...prev, isVerified: true } : null));
      showToast({
        title: 'Auditor Email Verified! 🎉',
        description: `${createdCredentials.email} has been verified and activated.`,
        type: 'success'
      });
      fetchReviewers();
    } catch (err: any) {
      showToast({
        title: 'OTP Verification Failed',
        description: err.message || 'Invalid or expired OTP.',
        type: 'error'
      });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async (targetEmail: string) => {
    setIsResendingOtp(true);
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend OTP');
      showToast({
        title: 'OTP Resent! 📩',
        description: `A new 6-digit verification code was sent to ${targetEmail}.`,
        type: 'success'
      });
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleToggleStatus = async (reviewer: Auditor) => {
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
          description: `Auditor is now ${nextStatus}.`,
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

  const handleDeleteReviewer = async (reviewer: Auditor) => {
    if (!confirm(`Are you sure you want to remove auditor "${reviewer.name}"? If they evaluated courses, their account will be deactivated instead to preserve historical records.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/reviewers/${reviewer.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast({ title: 'Auditor Removed', description: data.message, type: 'success' });
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
              Course Auditors &amp; Quality QA
            </h1>
            <span className="text-[11px] font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full">
              Audit Board
            </span>
          </div>
          <p className="text-xs text-outline font-medium mt-1">
            Appoint and manage authorized course auditors who evaluate and approve/reject instructor course submissions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Icon name="person_add" size={16} />
          Appoint New Auditor
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
          Course Auditors
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-outline uppercase tracking-wider">Total Auditors</span>
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Icon name="shield_person" size={20} />
            </span>
          </div>
          <div className="text-2xl font-black text-on-surface mt-2">{reviewers.length}</div>
          <p className="text-[11px] text-outline mt-0.5">Authorized Quality Audit Staff</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-outline uppercase tracking-wider">Active Status</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Icon name="check_circle" size={20} />
            </span>
          </div>
          <div className="text-2xl font-black text-on-surface mt-2">{activeReviewersCount}</div>
          <p className="text-[11px] text-outline mt-0.5">Currently active and auditing</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-outline uppercase tracking-wider">Courses Audited</span>
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
            placeholder="Search auditor name or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-container border border-outline-variant/40 text-xs sm:text-sm text-on-surface placeholder-outline focus:outline-none focus:border-primary transition-all"
          />
          <span className="absolute left-3 top-2.5 text-outline">
            <Icon name="search" size={16} />
          </span>
        </div>
      </div>

      {/* Auditors Table */}
      <div className="rounded-2xl border border-outline-variant/30 bg-surface-container overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-outline">
            <Icon name="sync" size={28} className="animate-spin text-primary mx-auto mb-2" />
            <p className="text-xs">Loading auditors roster...</p>
          </div>
        ) : filteredReviewers.length === 0 ? (
          <div className="py-16 text-center text-outline">
            <Icon name="shield_person" size={40} className="mx-auto text-outline mb-2" />
            <p className="text-sm font-semibold text-on-surface">No Course Auditors Found</p>
            <p className="text-xs text-outline mt-1">
              Appoint a course auditor to start evaluating submitted courses.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer"
            >
              + Appoint First Auditor
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-variant/30 text-outline font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Auditor Details</th>
                  <th className="py-3 px-4">Role &amp; Verification</th>
                  <th className="py-3 px-4">Courses Audited</th>
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          Course Auditor
                        </span>
                        {reviewer.emailVerified !== false ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                            <Icon name="verified" size={11} />
                            OTP Verified
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setOtpCode('');
                              setCreatedCredentials({
                                name: reviewer.name,
                                email: reviewer.email,
                                password: '(Set at creation)',
                                isVerified: false
                              });
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 hover:bg-amber-500/25 cursor-pointer flex items-center gap-1"
                          >
                            <Icon name="mark_email_unread" size={11} />
                            Verify OTP
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-outline mt-1 max-w-[200px] truncate">
                        {reviewer.bio || 'Curriculum Quality & Audit'}
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
                        className="p-1.5 rounded-lg text-outline hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Remove Auditor"
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

      {/* Appoint Auditor Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Appoint New Course Auditor"
          maxWidth="md"
        >
          <form onSubmit={handleCreateReviewer} className="space-y-4 text-on-surface">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-600 dark:text-indigo-300 flex items-start gap-2">
              <Icon name="mark_email_read" size={18} className="shrink-0 mt-0.5" />
              <span>
                When you appoint an Auditor, a <strong>6-digit verification OTP</strong> will be automatically sent to their email address for verification.
              </span>
            </div>

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
                Auditor Email Address (OTP will be sent here) *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="auditor@example.com"
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
                  className="text-[11px] text-primary hover:underline font-bold cursor-pointer"
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
                Provide this temporary password to the auditor. They will log in at /reviewer/login.
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
                placeholder="Quality Assurance, Curriculum Audit, Technical Pedagogy"
                className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/40 text-xs sm:text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-variant text-outline hover:text-on-surface text-xs font-medium cursor-pointer"
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
                    Sending OTP &amp; Creating...
                  </>
                ) : (
                  <>
                    <Icon name="mark_email_read" size={14} />
                    Send OTP &amp; Appoint Auditor
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* OTP Verification & Generated Credentials Modal */}
      {createdCredentials && (
        <Modal
          isOpen={!!createdCredentials}
          onClose={() => setCreatedCredentials(null)}
          title={createdCredentials.isVerified ? 'Auditor Verified & Ready' : 'Verify Auditor Email OTP'}
          maxWidth="md"
        >
          <div className="space-y-4 text-on-surface">
            {!createdCredentials.isVerified ? (
              <form onSubmit={handleVerifyOtp} className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
                <div className="flex items-start gap-2.5">
                  <Icon name="mark_email_read" size={20} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-extrabold text-on-surface">
                      6-Digit OTP Sent to {createdCredentials.email}
                    </h4>
                    <p className="text-[11px] text-outline mt-0.5">
                      Enter the 6-digit verification code received on the email above to verify immediately, or the auditor can verify it when signing in at <code>/reviewer/login</code>.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    className="flex-1 px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant text-center font-mono text-base font-black tracking-[0.35em] text-primary focus:outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    disabled={isVerifyingOtp || otpCode.length < 6}
                    className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-outline">Didn&apos;t receive the email?</span>
                  <button
                    type="button"
                    disabled={isResendingOtp}
                    onClick={() => handleResendOtp(createdCredentials.email)}
                    className="text-primary font-bold hover:underline cursor-pointer"
                  >
                    {isResendingOtp ? 'Resending...' : 'Resend OTP Code'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 font-bold flex items-center gap-2">
                <Icon name="verified" size={18} />
                <span>Email OTP verified! Course Auditor account is active.</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-surface-variant/40 border border-outline-variant/40 space-y-2 text-xs">
              <div>
                <span className="text-[10px] text-outline uppercase font-bold block">Auditor Studio Login URL:</span>
                <span className="font-mono text-primary font-semibold">https://lms-phi-plum.vercel.app/reviewer/login</span>
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
                    `Auditor Studio Login: https://lms-phi-plum.vercel.app/reviewer/login\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`
                  );
                  showToast({ title: 'Copied!', description: 'Auditor credentials copied to clipboard.', type: 'success' });
                }}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Icon name="content_copy" size={14} />
                Copy Credentials
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-2 rounded-xl bg-surface-variant text-outline hover:text-on-surface text-xs font-semibold cursor-pointer"
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

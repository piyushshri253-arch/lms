'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useApp } from '@/context/AppContext';

export default function SuperAdminInstructorsPage() {
  const { showToast } = useApp();
  const [instructors, setInstructors] = useState<any[]>([]);
  const [auditors, setAuditors] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'INSTRUCTORS' | 'AUDITORS'>('INSTRUCTORS');
  const [isLoading, setIsLoading] = useState(true);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createRole, setCreateRole] = useState<'INSTRUCTOR' | 'REVIEWER'>('INSTRUCTOR');
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('Instructor@123');
  const [createBio, setCreateBio] = useState('');
  const [createCustomRole, setCreateCustomRole] = useState('Faculty Lead');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP Verification & Credentials Modal
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    role: 'INSTRUCTOR' | 'REVIEWER';
    isVerified?: boolean;
  } | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  // Edit Modal
  const [selectedInst, setSelectedInst] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editCustomRole, setEditCustomRole] = useState('');
  const [editSuspended, setEditSuspended] = useState(false);
  const [editPassword, setEditPassword] = useState('');

  const fetchInstructors = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/super-admin/instructors');
      if (res.ok) {
        const d = await res.json();
        setInstructors(d.instructors || []);
        setAuditors(d.auditors || []);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstructors();
  }, []);

  const handleOpenCreate = (roleType: 'INSTRUCTOR' | 'REVIEWER') => {
    setCreateRole(roleType);
    setCreateName('');
    setCreateEmail('');
    setCreatePassword(roleType === 'REVIEWER' ? 'Auditor@123' : 'Instructor@123');
    setCreateCustomRole(roleType === 'REVIEWER' ? 'Course Auditor' : 'Faculty Lead');
    setCreateBio(
      roleType === 'REVIEWER'
        ? 'Quality Assurance & Course Curriculum Auditor'
        : 'Distinguished Faculty Educator'
    );
    setIsCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/super-admin/instructors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          password: createPassword,
          bio: createBio,
          customRole: createCustomRole,
          role: createRole
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create account');

      showToast({
        title: 'OTP Sent to Email! 📩',
        description: data.message,
        type: 'success'
      });

      setOtpCode('');
      setCreatedCredentials({
        name: createName.trim(),
        email: createEmail.trim().toLowerCase(),
        password: createPassword,
        role: createRole,
        isVerified: false
      });

      if (createRole === 'REVIEWER') {
        setActiveTab('AUDITORS');
      } else {
        setActiveTab('INSTRUCTORS');
      }

      setIsCreateOpen(false);
      setCreateName('');
      setCreateEmail('');
      setCreateBio('');
      await fetchInstructors();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
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
        title: 'Email OTP Verified! 🎉',
        description: `${createdCredentials.email} has been verified and activated.`,
        type: 'success'
      });
      await fetchInstructors();
    } catch (err: any) {
      showToast({ title: 'Verification Failed', description: err.message, type: 'error' });
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

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst) return;

    try {
      const res = await fetch('/api/super-admin/instructors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedInst.id,
          name: editName,
          email: editEmail,
          bio: editBio,
          customRole: editCustomRole,
          isSuspended: editSuspended,
          newPassword: editPassword || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update account');

      showToast({ title: 'Account Updated', description: data.message, type: 'success' });
      setIsEditOpen(false);
      await fetchInstructors();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;

    try {
      const res = await fetch(`/api/super-admin/instructors?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');

      showToast({ title: 'Account Removed', description: data.message, type: 'info' });
      await fetchInstructors();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/super-admin" className="hover:text-primary">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Faculty &amp; Course Auditors</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Faculty Instructors &amp; Course Auditors Governance
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Appoint verified instructors and course auditors with automated email OTP verification
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => handleOpenCreate('INSTRUCTOR')}
            className="px-4 py-2.5 bg-primary text-on-primary font-extrabold text-xs rounded-xl hover:bg-primary-container shadow-xs flex items-center gap-2 cursor-pointer transition-all"
          >
            <Icon name="person_add" size={17} />
            <span>Appoint Instructor</span>
          </button>
          <button
            onClick={() => handleOpenCreate('REVIEWER')}
            className="px-4 py-2.5 bg-indigo-600 text-white font-extrabold text-xs rounded-xl hover:bg-indigo-500 shadow-xs flex items-center gap-2 cursor-pointer transition-all"
          >
            <Icon name="verified_user" size={17} />
            <span>Appoint Auditor</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/40 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('INSTRUCTORS')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'INSTRUCTORS'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'bg-surface-container-lowest border border-outline-variant/60 text-outline hover:text-on-surface'
          }`}
        >
          <Icon name="school" size={16} />
          <span>Faculty Instructors ({instructors.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('AUDITORS')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'AUDITORS'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-surface-container-lowest border border-outline-variant/60 text-outline hover:text-on-surface'
          }`}
        >
          <Icon name="verified" size={16} />
          <span>Course Auditors ({auditors.length})</span>
        </button>
      </div>

      {activeTab === 'INSTRUCTORS' ? (
        /* Instructors Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instructors.map((inst) => (
            <div
              key={inst.id}
              className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      avatar={inst.avatar}
                      name={inst.name}
                      size="lg"
                      shape="rounded"
                      className="w-12 h-12 border-2 border-outline-variant"
                    />
                    <div>
                      <h3 className="font-extrabold text-sm text-on-surface">{inst.name}</h3>
                      <p className="text-[11px] text-outline font-mono">{inst.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        inst.isSuspended ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {inst.isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                    </span>
                    {inst.emailVerified !== false ? (
                      <span className="text-[9px] font-mono font-bold text-emerald-600 flex items-center gap-0.5">
                        <Icon name="verified" size={11} /> OTP Verified
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setOtpCode('');
                          setCreatedCredentials({
                            name: inst.name,
                            email: inst.email,
                            password: '(Set at creation)',
                            role: 'INSTRUCTOR',
                            isVerified: false
                          });
                        }}
                        className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 border border-amber-500/30 hover:bg-amber-500/25 cursor-pointer"
                      >
                        Verify OTP
                      </button>
                    )}
                  </div>
                </div>

                {inst.bio && (
                  <p className="text-xs text-on-surface-variant line-clamp-2 italic leading-relaxed">
                    &ldquo;{inst.bio}&rdquo;
                  </p>
                )}

                <div className="p-3 bg-surface-container-low rounded-2xl space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-outline">
                    <span>Courses Authored:</span>
                    <span className="font-bold text-on-surface">{inst.courseCount}</span>
                  </div>
                  <div className="flex justify-between text-outline">
                    <span>Total Students:</span>
                    <span className="font-bold text-primary">{inst.studentCount}</span>
                  </div>
                  <div className="flex justify-between text-outline">
                    <span>Gross Revenue:</span>
                    <span className="font-bold text-emerald-800">${inst.totalRevenue}</span>
                  </div>
                  <div className="flex justify-between text-outline">
                    <span>Average Rating:</span>
                    <span className="font-bold text-amber-700">★ {inst.avgRating}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-outline-variant/40 flex items-center justify-between">
                <span className="text-[10px] font-bold text-outline font-mono">
                  Role: {inst.customRole}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setSelectedInst(inst);
                      setEditName(inst.name);
                      setEditEmail(inst.email);
                      setEditBio(inst.bio || '');
                      setEditCustomRole(inst.customRole);
                      setEditSuspended(inst.isSuspended);
                      setIsEditOpen(true);
                    }}
                    className="p-1.5 border border-outline-variant hover:border-primary text-outline hover:text-primary rounded-xl cursor-pointer"
                    title="Edit Faculty Record"
                  >
                    <Icon name="edit" size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(inst.id, inst.name)}
                    className="p-1.5 border border-rose-300 text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                    title="Delete Faculty"
                  >
                    <Icon name="delete" size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Course Auditors Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auditors.length === 0 ? (
            <div className="col-span-full bg-surface-container-lowest p-12 rounded-3xl border border-outline-variant/80 text-center space-y-3">
              <Icon name="verified_user" size={40} className="mx-auto text-indigo-500" />
              <h3 className="text-sm font-extrabold text-on-surface">No Course Auditors Appointed Yet</h3>
              <p className="text-xs text-outline">
                Appoint a Course Auditor to inspect and approve instructor course submissions.
              </p>
              <button
                type="button"
                onClick={() => handleOpenCreate('REVIEWER')}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
              >
                + Appoint First Auditor
              </button>
            </div>
          ) : (
            auditors.map((aud) => (
              <div
                key={aud.id}
                className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-500/40 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        avatar={aud.avatar}
                        name={aud.name}
                        size="lg"
                        shape="rounded"
                        className="w-12 h-12 border-2 border-indigo-500/30"
                      />
                      <div>
                        <h3 className="font-extrabold text-sm text-on-surface">{aud.name}</h3>
                        <p className="text-[11px] text-outline font-mono">{aud.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        AUDITOR
                      </span>
                      {aud.emailVerified !== false ? (
                        <span className="text-[9px] font-mono font-bold text-emerald-600 flex items-center gap-0.5">
                          <Icon name="verified" size={11} /> OTP Verified
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setOtpCode('');
                            setCreatedCredentials({
                              name: aud.name,
                              email: aud.email,
                              password: '(Set at creation)',
                              role: 'REVIEWER',
                              isVerified: false
                            });
                          }}
                          className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 border border-amber-500/30 hover:bg-amber-500/25 cursor-pointer"
                        >
                          Verify OTP
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-on-surface-variant line-clamp-2 italic leading-relaxed">
                    &ldquo;{aud.bio || 'Quality Assurance & Course Curriculum Auditor'}&rdquo;
                  </p>

                  <div className="p-3 bg-surface-container-low rounded-2xl space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-outline">
                      <span>Courses Audited:</span>
                      <span className="font-bold text-indigo-600">{aud.coursesReviewed || 0}</span>
                    </div>
                    <div className="flex justify-between text-outline">
                      <span>Portal Login:</span>
                      <span className="font-bold text-on-surface">/reviewer/login</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-outline-variant/40 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-outline font-mono">
                    Role: Course Auditor
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedInst(aud);
                        setEditName(aud.name);
                        setEditEmail(aud.email);
                        setEditBio(aud.bio || '');
                        setEditCustomRole(aud.customRole || 'Course Auditor');
                        setEditSuspended(aud.isSuspended);
                        setIsEditOpen(true);
                      }}
                      className="p-1.5 border border-outline-variant hover:border-primary text-outline hover:text-primary rounded-xl cursor-pointer"
                      title="Edit Auditor"
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(aud.id, aud.name)}
                      className="p-1.5 border border-rose-300 text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                      title="Delete Auditor"
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Appoint Instructor / Auditor Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={createRole === 'REVIEWER' ? 'Appoint New Course Auditor' : 'Appoint New Faculty Instructor'}
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-2">
            <Icon name="mark_email_read" size={18} className="shrink-0 mt-0.5" />
            <span>
              A <strong>6-digit verification OTP</strong> will be sent to the email address below to verify and activate the {createRole === 'REVIEWER' ? 'Course Auditor' : 'Instructor'} account.
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-on-surface uppercase tracking-wider mb-1">
              Account Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreateRole('INSTRUCTOR');
                  setCreateCustomRole('Faculty Lead');
                  setCreatePassword('Instructor@123');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  createRole === 'INSTRUCTOR'
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface-container-low border-outline-variant text-outline'
                }`}
              >
                <Icon name="school" size={15} />
                Faculty Instructor
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreateRole('REVIEWER');
                  setCreateCustomRole('Course Auditor');
                  setCreatePassword('Auditor@123');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  createRole === 'REVIEWER'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-surface-container-low border-outline-variant text-outline'
                }`}
              >
                <Icon name="verified" size={15} />
                Course Auditor
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-on-surface uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder={createRole === 'REVIEWER' ? 'Dr. Rajesh Sharma' : 'Prof. Sarah Jenkins'}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-xs font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-extrabold text-on-surface uppercase tracking-wider mb-1">
                Email Address (For OTP) *
              </label>
              <input
                type="email"
                required
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-on-surface uppercase tracking-wider mb-1">
                Password *
              </label>
              <input
                type="text"
                required
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-xs font-semibold font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-on-surface uppercase tracking-wider mb-1">
              Academic Title / Role Label
            </label>
            <input
              type="text"
              value={createCustomRole}
              onChange={(e) => setCreateCustomRole(e.target.value)}
              placeholder={createRole === 'REVIEWER' ? 'Course Auditor' : 'Senior Faculty Lead'}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-on-surface uppercase tracking-wider mb-1">
              Biography / Credentials
            </label>
            <textarea
              rows={3}
              value={createBio}
              onChange={(e) => setCreateBio(e.target.value)}
              placeholder="Academic background and specialization..."
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3.5 text-xs font-medium"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-outline-variant rounded-xl font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-primary text-on-primary font-extrabold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Icon name="mark_email_read" size={15} />
              <span>{isSubmitting ? 'Sending OTP...' : `Send OTP & Appoint ${createRole === 'REVIEWER' ? 'Auditor' : 'Instructor'}`}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* OTP Verification & Credentials Modal */}
      {createdCredentials && (
        <Modal
          isOpen={!!createdCredentials}
          onClose={() => setCreatedCredentials(null)}
          title={
            createdCredentials.isVerified
              ? `${createdCredentials.role === 'REVIEWER' ? 'Course Auditor' : 'Instructor'} Verified!`
              : `Verify ${createdCredentials.role === 'REVIEWER' ? 'Auditor' : 'Instructor'} Email OTP`
          }
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
                      Enter the 6-digit verification code sent to this email to verify immediately, or the user can enter it when signing in.
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
                  <span className="text-outline">Didn&apos;t receive the OTP?</span>
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
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 font-bold flex items-center gap-2">
                <Icon name="verified" size={18} />
                <span>Email OTP verified! Account is active and ready.</span>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant space-y-2 text-xs font-mono">
              <div>
                <span className="text-[10px] text-outline uppercase font-bold block">Portal Login URL:</span>
                <span className="text-primary font-bold">
                  {createdCredentials.role === 'REVIEWER'
                    ? 'https://lms-phi-plum.vercel.app/reviewer/login'
                    : 'https://lms-phi-plum.vercel.app/instructor/login'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-outline uppercase font-bold block">Email:</span>
                <span className="text-on-surface font-bold">{createdCredentials.email}</span>
              </div>
              <div>
                <span className="text-[10px] text-outline uppercase font-bold block">Password:</span>
                <span className="text-emerald-700 font-bold">{createdCredentials.password}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const loginUrl =
                    createdCredentials.role === 'REVIEWER'
                      ? 'https://lms-phi-plum.vercel.app/reviewer/login'
                      : 'https://lms-phi-plum.vercel.app/instructor/login';
                  navigator.clipboard.writeText(
                    `Login URL: ${loginUrl}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`
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
                className="px-4 py-2 rounded-xl border border-outline-variant text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Record — ${selectedInst?.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-extrabold text-on-surface uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-xs font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-extrabold text-on-surface uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-on-surface uppercase tracking-wider mb-1">
                Title / Role
              </label>
              <input
                type="text"
                value={editCustomRole}
                onChange={(e) => setEditCustomRole(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-xs font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-on-surface uppercase tracking-wider mb-1">
              Biography
            </label>
            <textarea
              rows={3}
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3.5 text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-on-surface uppercase tracking-wider mb-1">
              Reset Password (Optional)
            </label>
            <input
              type="password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="Leave blank to keep existing password"
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-xs font-semibold"
            />
          </div>

          <div className="p-3 bg-surface-container-low rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold text-on-surface">Suspend Account</p>
              <p className="text-[10px] text-outline">Temporarily block studio login</p>
            </div>
            <input
              type="checkbox"
              checked={editSuspended}
              onChange={(e) => setEditSuspended(e.target.checked)}
              className="w-4 h-4 accent-rose-600"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 border border-outline-variant rounded-xl font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary text-on-primary font-extrabold text-xs rounded-xl cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

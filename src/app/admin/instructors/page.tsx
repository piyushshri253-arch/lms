'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAdmin } from '@/context/AdminContext';
import { useApp } from '@/context/AppContext';

function InstructorsPageContent() {
  const { activeFacility, hasPermission } = useAdmin();
  const { showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<any | null>(null);

  const [instructors, setInstructors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Instructor Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'Early Childhood Education',
    title: 'Senior Educator',
    bio: '',
    password: 'Instructor@123'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ name: string; email: string; password: string; isVerified?: boolean } | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [bankActionLoading, setBankActionLoading] = useState<string | null>(null);

  const handleBankDecision = async (
    userId: string,
    instructorName: string,
    actionType: 'VERIFY_BANK' | 'REJECT_BANK'
  ) => {
    let reason = '';
    if (actionType === 'REJECT_BANK') {
      const input = window.prompt(
        `Enter reason for rejecting ${instructorName}'s bank account:`
      );
      if (!input || !input.trim()) return;
      reason = input.trim();
    }

    setBankActionLoading(userId);
    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          userId,
          reason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update bank status');

      showToast({
        title:
          actionType === 'VERIFY_BANK'
            ? 'Bank Account Approved & Verified! ✅'
            : 'Bank Account Rejected',
        description: data.message,
        type: actionType === 'VERIFY_BANK' ? 'success' : 'info'
      });
      await fetchInstructors();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setBankActionLoading(null);
    }
  };

  const fetchInstructors = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/instructors');
      if (res.ok) {
        const data = await res.json();
        setInstructors(data.instructors || []);
      }
    } catch (err) {
      console.error('Failed to load instructors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchInstructors();
  }, []);

  const handleAddInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast({ title: 'Validation Error', description: 'Name and email are required.', type: 'error' });
      return;
    }

    const assignedPassword = formData.password.trim() || 'Instructor@123';

    try {
      const res = await fetch('/api/admin/instructors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          bio: `${formData.title} - ${formData.department}. ${formData.bio}`.trim(),
          password: assignedPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to appoint instructor');
      }

      setOtpCode('');
      setCreatedCredentials({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: assignedPassword,
        isVerified: false
      });

      showToast({
        title: 'OTP Sent to Email! 📩',
        description: `Verification OTP sent to ${formData.email.trim().toLowerCase()}.`,
        type: 'success'
      });
      setIsAddModalOpen(false);
      setFormData({ name: '', email: '', department: 'Early Childhood Education', title: 'Senior Educator', bio: '', password: 'Instructor@123' });
      fetchInstructors();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
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
        title: 'Instructor Email Verified! 🎓',
        description: `${createdCredentials.email} is now verified and active.`,
        type: 'success'
      });
      fetchInstructors();
    } catch (err: any) {
      showToast({ title: 'OTP Verification Failed', description: err.message, type: 'error' });
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

  const handleToggleStatus = (id: string) => {
    setInstructors((prev) =>
      prev.map((inst) =>
        inst.id === id
          ? { ...inst, status: inst.status === 'ACTIVE' ? 'ON_LEAVE' : 'ACTIVE' }
          : inst
      )
    );
    if (selectedInstructor && selectedInstructor.id === id) {
      setSelectedInstructor((prev: any) => ({
        ...prev,
        status: prev.status === 'ACTIVE' ? 'ON_LEAVE' : 'ACTIVE'
      }));
    }
    showToast({ title: 'Status Updated', description: 'Faculty availability status changed.', type: 'info' });
  };

  // Filtered instructors with safe fallbacks
  const filtered = instructors.filter((inst) => {
    const name = (inst?.name || '').toLowerCase();
    const email = (inst?.email || '').toLowerCase();
    const department = (inst?.department || 'Early Childhood Education').toLowerCase();
    const title = (inst?.title || '').toLowerCase();
    const query = searchQuery.trim().toLowerCase();

    const matchesSearch =
      !query ||
      name.includes(query) ||
      email.includes(query) ||
      department.includes(query) ||
      title.includes(query);

    const matchesDept =
      selectedDepartment === 'ALL' ||
      department.includes(selectedDepartment.toLowerCase());

    return matchesSearch && matchesDept;
  });

  const totalAssignedCourses = instructors.reduce(
    (acc, i) => acc + (i.assignedCourses?.length || i.courses?.length || i.coursesCount || 0),
    0
  );
  const totalLearners = instructors.reduce(
    (acc, i) => acc + (i.totalStudents || i.studentsCount || 0),
    0
  );
  const activeCount = instructors.filter((i) => i.status === 'ACTIVE').length;
  const pendingBankInstructors = instructors.filter(
    (inst) => inst.bankAccount?.status === 'PENDING_VERIFICATION'
  );

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
              Instructors & Academic Faculty
            </h1>
            <span className="text-[11px] font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full">
              {activeFacility?.name || 'Academic Core'}
            </span>
          </div>
          <p className="text-xs text-outline font-medium mt-1">
            Manage professorial roster, bank account payout verifications, course assignments, and faculty performance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Icon name="person_add" size={16} />
          <span>+ Appoint Instructor</span>
        </button>
      </div>

      {/* PROMINENT TOP PENDING BANK VERIFICATIONS BANNER */}
      {pendingBankInstructors.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Icon name="account_balance" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">
                  Pending Instructor Bank Account Verification ({pendingBankInstructors.length})
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-200 text-amber-900">
                  Awaiting Admin Approval
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Verify submitted bank account details (Account Number, RBI IFSC, Holder Name, PAN) below to enable Instructor payouts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingBankInstructors.map((inst) => (
              <div
                key={inst.id}
                className="bg-white rounded-2xl border border-amber-200 p-4 shadow-2xs flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar
                        avatar={inst.avatar}
                        name={inst.name}
                        size="md"
                        className="w-10 h-10 border border-amber-300"
                      />
                      <div>
                        <p className="font-extrabold text-sm text-slate-900">{inst.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{inst.email}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                      PENDING VERIFICATION
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Bank Name
                      </span>
                      <span className="font-extrabold text-slate-900">
                        {inst.bankAccount.bankName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Account Number
                      </span>
                      <span className="font-mono font-extrabold text-slate-900">
                        {inst.bankAccount.accountNumber || inst.bankAccount.accountNumberMasked}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        IFSC &amp; Branch
                      </span>
                      <span className="font-mono font-bold text-indigo-700">
                        {inst.bankAccount.ifscCode}{' '}
                        {inst.bankAccount.branchName ? `• ${inst.bankAccount.branchName}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Account Holder &amp; PAN
                      </span>
                      <span className="font-bold text-slate-800">
                        {inst.bankAccount.accountHolderName}{' '}
                        {inst.bankAccount.panNumber ? `(${inst.bankAccount.panNumber})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={bankActionLoading === inst.id}
                    onClick={() => handleBankDecision(inst.id, inst.name, 'REJECT_BANK')}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold transition-all cursor-pointer disabled:opacity-50"
                  >
                    ✕ Reject
                  </button>
                  <button
                    type="button"
                    disabled={bankActionLoading === inst.id}
                    onClick={() => handleBankDecision(inst.id, inst.name, 'VERIFY_BANK')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Icon name="verified" size={15} />
                    <span>
                      {bankActionLoading === inst.id
                        ? 'Approving...'
                        : '✓ Approve & Verify Bank Account'}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3">
        <div className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
          <Icon name="school" size={16} />
          Faculty Instructors
        </div>
        <Link
          href="/admin/reviewers"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-outline hover:text-on-surface hover:bg-surface-variant transition-colors flex items-center gap-1.5"
        >
          <Icon name="verified" size={16} />
          Course Auditors
        </Link>
        <Link
          href="/admin/users"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors flex items-center gap-1.5"
        >
          <Icon name="account_balance" size={16} />
          Bank &amp; Payout Governance
        </Link>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Total Faculty</span>
            <Icon name="groups" size={18} className="text-primary" />
          </div>
          <p className="text-2xl font-black text-on-surface">{instructors.length}</p>
          <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <Icon name="check_circle" size={12} />
            <span>{activeCount} Active On Campus</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Assigned Courses</span>
            <Icon name="menu_book" size={18} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black text-on-surface">{totalAssignedCourses}</p>
          <p className="text-[11px] text-outline">Across all departments</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Total Learners</span>
            <Icon name="school" size={18} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-on-surface">
            {totalLearners.toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold">+12% enrollment rate</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Average Rating</span>
            <Icon name="star" size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-on-surface">4.9 / 5.0</p>
          <p className="text-[11px] text-amber-600 font-semibold">98.4% student satisfaction</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by faculty name, email, department..."
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-container-low border border-outline-variant/80 text-xs font-semibold focus:outline-none focus:border-primary transition-colors placeholder:text-outline"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-outline shrink-0">Department:</span>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant/80 text-xs font-bold focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Departments</option>
            <option value="Early Childhood Education">Early Childhood Education</option>
            <option value="Teacher Development">Teacher Development & Pedagogy</option>
            <option value="Primary Years & Curriculum">Primary Years & Curriculum</option>
            <option value="Professional Learning">Professional Learning & Inclusion</option>
            <option value="Leadership & School Development">Leadership & School Development</option>
          </select>
        </div>
      </div>

      {/* Instructors Table */}
      <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-[10px] font-mono font-extrabold uppercase text-outline border-b border-outline-variant/60">
                <th className="p-4">Faculty Member</th>
                <th className="p-4">Bank Account &amp; Verification</th>
                <th className="p-4">Assigned Courses</th>
                <th className="p-4">Students</th>
                <th className="p-4">Rating</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 text-xs">
              {filtered.map((inst) => (
                <tr key={inst.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        avatar={inst.avatar}
                        name={inst.name}
                        size="md"
                        className="w-10 h-10 border border-outline-variant"
                      />
                      <div>
                        <p className="font-extrabold text-on-surface hover:text-primary transition-colors cursor-pointer" onClick={() => setSelectedInstructor(inst)}>
                          {inst.name}
                        </p>
                        <p className="text-[11px] text-outline font-mono">{inst.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {inst.bankAccount && inst.bankAccount.status !== 'NOT_ADDED' ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-900 text-xs">
                            {inst.bankAccount.bankName}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              inst.bankAccount.status === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : inst.bankAccount.status === 'PENDING_VERIFICATION'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {inst.bankAccount.status === 'PENDING_VERIFICATION'
                              ? 'PENDING APPROVAL'
                              : inst.bankAccount.status}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-600">
                          {inst.bankAccount.accountNumber || inst.bankAccount.accountNumberMasked} •{' '}
                          <span className="text-indigo-700 font-bold">{inst.bankAccount.ifscCode}</span>
                        </p>
                        {inst.bankAccount.status !== 'VERIFIED' && (
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <button
                              type="button"
                              disabled={bankActionLoading === inst.id}
                              onClick={() => handleBankDecision(inst.id, inst.name, 'VERIFY_BANK')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] cursor-pointer"
                            >
                              ✓ Approve Bank
                            </button>
                            <button
                              type="button"
                              disabled={bankActionLoading === inst.id}
                              onClick={() => handleBankDecision(inst.id, inst.name, 'REJECT_BANK')}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-[10px] cursor-pointer"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-outline italic">No Bank Submitted</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                      {(inst.assignedCourses || inst.courses || []).map((c: any) => (
                        <span
                          key={c.id}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold truncate max-w-[180px]"
                          title={c.title}
                        >
                          {c.title}
                        </span>
                      ))}
                      {(!inst.assignedCourses || inst.assignedCourses.length === 0) &&
                        (!inst.courses || inst.courses.length === 0) && (
                          <span className="text-[11px] text-outline italic">No active courses</span>
                        )}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-on-surface">
                    {(inst.totalStudents ?? inst.studentsCount ?? 0).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 font-extrabold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-lg text-xs">
                      <Icon name="star" size={12} className="fill-amber-500 text-amber-500" />
                      {inst.rating ?? inst.avgRating ?? 5.0}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        inst.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-700'
                          : 'bg-amber-500/10 text-amber-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${inst.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {inst.status === 'ACTIVE' ? 'Active' : 'On Leave'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedInstructor(inst)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
                      >
                        Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(inst.id)}
                        className="p-1.5 text-outline hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
                        title="Toggle availability status"
                      >
                        <Icon name="swap_horiz" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-outline">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Icon name="sync" size={24} className="animate-spin text-primary" />
                      <span className="font-mono text-xs">Loading faculty roster...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-outline">
                    No faculty members found matching your search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Instructor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            style={{ width: '100%', maxWidth: '620px' }}
            className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-8 w-full max-w-[620px] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon name="person_add" size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-on-surface">Appoint New Faculty</h3>
                  <p className="text-[11px] text-outline font-mono">Institutional Educator Registration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleAddInstructor} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dr. Jane Goodall"
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jane@academy.edu"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Academic Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Senior Educator / Faculty Lead"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Specialization / Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary"
                  >
                    <option value="Early Childhood Education">Early Childhood Education</option>
                    <option value="Teacher Development">Teacher Development & Pedagogy</option>
                    <option value="Primary Years & Curriculum">Primary Years & Curriculum</option>
                    <option value="Professional Learning">Professional Learning & Inclusion</option>
                    <option value="Leadership & School Development">Leadership & School Development</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Login Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="e.g. Instructor@123"
                      className="w-full h-10 px-3 pr-9 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-mono font-semibold focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
                    >
                      <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={15} />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Biography / Teaching Background</label>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Key certifications, teaching credentials, subject expertise, and educational philosophy..."
                  className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-outline hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
                >
                  Create & Appoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Created Credentials & OTP Verification Modal */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            style={{ width: '100%', maxWidth: '480px' }}
            className="bg-surface-container-lowest border border-emerald-300 rounded-3xl p-6 sm:p-8 w-full max-w-[480px] shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <Icon name="mark_email_read" size={32} />
              </div>
              <h3 className="text-lg font-black text-on-surface">
                {createdCredentials.isVerified ? 'Instructor Email Verified! 🎓' : 'Verify Instructor Email OTP'}
              </h3>
              <p className="text-xs text-on-surface-variant">
                A 6-digit verification OTP has been sent to <strong className="text-on-surface">{createdCredentials.email}</strong>.
              </p>
            </div>

            {!createdCredentials.isVerified ? (
              <form onSubmit={handleVerifyOtp} className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
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
                  <span className="text-outline">Or instructor can verify at login</span>
                  <button
                    type="button"
                    disabled={isResendingOtp}
                    onClick={() => handleResendOtp(createdCredentials.email)}
                    className="text-primary font-bold hover:underline cursor-pointer"
                  >
                    {isResendingOtp ? 'Resending...' : 'Resend OTP'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 font-bold flex items-center gap-2">
                <Icon name="verified" size={18} />
                <span>OTP verified! Instructor account is active.</span>
              </div>
            )}

            <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant space-y-3 font-mono text-xs">
              <div>
                <span className="text-[10px] text-outline uppercase font-bold tracking-wider block">Login URL</span>
                <span className="font-bold text-primary select-all">https://lms-ipvw.vercel.app/instructor/login</span>
              </div>
              <div>
                <span className="text-[10px] text-outline uppercase font-bold tracking-wider block">Email Address</span>
                <span className="font-bold text-on-surface select-all">{createdCredentials.email}</span>
              </div>
              <div>
                <span className="text-[10px] text-outline uppercase font-bold tracking-wider block">Password</span>
                <span className="font-bold text-emerald-700 select-all">{createdCredentials.password}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Morena Teach LMS - Instructor Login Credentials:\nURL: https://lms-ipvw.vercel.app/instructor/login\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`
                  );
                  showToast({ title: 'Copied!', description: 'Credentials copied to clipboard.', type: 'success' });
                }}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant hover:bg-surface-container text-xs font-bold text-on-surface inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Icon name="content_copy" size={15} />
                <span>Copy Credentials</span>
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructor Profile Drawer */}
      {selectedInstructor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div
            style={{ width: '100%', maxWidth: '500px' }}
            className="w-full max-w-[500px] bg-surface-container-lowest h-full shadow-2xl p-6 overflow-y-auto space-y-6 border-l border-outline-variant animate-in slide-in-from-right duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <span className="text-[11px] font-mono font-bold uppercase text-primary tracking-wide">
                Faculty Profile & Pedagogy
              </span>
              <button
                type="button"
                onClick={() => setSelectedInstructor(null)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Profile Banner */}
            <div className="flex items-center gap-4">
              <UserAvatar
                avatar={selectedInstructor.avatar}
                name={selectedInstructor.name}
                size="lg"
                className="w-16 h-16 border-2 border-primary"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-black text-on-surface truncate">{selectedInstructor.name}</h2>
                <p className="text-xs text-primary font-bold">{selectedInstructor.title}</p>
                <p className="text-[11px] text-outline font-mono truncate mt-0.5">{selectedInstructor.email}</p>
              </div>
            </div>

            {/* Bio */}
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/60 text-xs text-on-surface-variant leading-relaxed">
              {selectedInstructor.bio}
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40">
                <p className="text-lg font-black text-on-surface">
                  {(selectedInstructor.assignedCourses || selectedInstructor.courses || []).length}
                </p>
                <p className="text-[10px] text-outline font-semibold">Courses</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40">
                <p className="text-lg font-black text-on-surface">
                  {(selectedInstructor.totalStudents ?? selectedInstructor.studentsCount ?? 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-outline font-semibold">Learners</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40">
                <p className="text-lg font-black text-amber-600">
                  {selectedInstructor.rating ?? selectedInstructor.avgRating ?? 5.0}
                </p>
                <p className="text-[10px] text-outline font-semibold">Rating</p>
              </div>
            </div>

            {/* Assigned Courses List */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-outline">Assigned Courses</h3>
              <div className="space-y-2">
                {(selectedInstructor.assignedCourses || selectedInstructor.courses || []).map((c: any) => (
                  <div key={c.id} className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-on-surface">{c.title}</p>
                      <p className="text-[10px] text-outline">{c.students || 0} active learners</p>
                    </div>
                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                      <Icon name="star" size={12} className="fill-amber-500 text-amber-500" />
                      {c.rating || 5.0}
                    </span>
                  </div>
                ))}
                {(!selectedInstructor.assignedCourses || selectedInstructor.assignedCourses.length === 0) &&
                  (!selectedInstructor.courses || selectedInstructor.courses.length === 0) && (
                    <p className="text-xs text-outline italic py-2">No courses assigned yet.</p>
                  )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-outline-variant/60 space-y-2">
              <button
                type="button"
                onClick={() => handleToggleStatus(selectedInstructor.id)}
                className="w-full py-2.5 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                {selectedInstructor.status === 'ACTIVE' ? 'Set to "On Leave"' : 'Activate Instructor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminInstructorsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-outline">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-mono">Loading Instructor Directory...</p>
        </div>
      }
    >
      <InstructorsPageContent />
    </Suspense>
  );
}

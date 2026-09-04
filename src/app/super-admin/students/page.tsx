'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useApp } from '@/context/AppContext';

export default function SuperAdminStudentsPage() {
  const { showToast } = useApp();
  const [students, setStudents] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [orgFilter, setOrgFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Inspector & Troubleshooting state
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isTroubleshootOpen, setIsTroubleshootOpen] = useState(false);
  const [troubleshootAction, setTroubleshootAction] = useState('GRANT_COURSE_ACCESS');
  const [troubleshootCourseId, setTroubleshootCourseId] = useState('');
  const [troubleshootOrderId, setTroubleshootOrderId] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Edit / Suspend state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSuspended, setEditSuspended] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const fetchStudentsAndCourses = async () => {
    setIsLoading(true);
    try {
      const [stRes, crRes] = await Promise.all([
        fetch(`/api/super-admin/students?q=${encodeURIComponent(search)}&status=${statusFilter}&orgId=${orgFilter}`),
        fetch('/api/super-admin/courses')
      ]);

      if (stRes.ok) {
        const d = await stRes.json();
        setStudents(d.students || []);
        if (d.organizations) setOrganizations(d.organizations);
      }
      if (crRes.ok) {
        const c = await crRes.json();
        setCourses(c.courses || []);
        if (c.courses?.length > 0 && !troubleshootCourseId) {
          setTroubleshootCourseId(c.courses[0].id);
        }
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentsAndCourses();
  }, [search, statusFilter, orgFilter]);

  const openStudentInspector = async (studentId: string) => {
    try {
      const res = await fetch(`/api/super-admin/students?id=${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedStudent(data.student);
        setIsInspectorOpen(true);
      }
    } catch {
      showToast({ title: 'Error', description: 'Could not load student profile', type: 'error' });
    }
  };

  const handleImpersonate = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to enter Support Mode for ${studentName}?`)) return;

    try {
      const res = await fetch('/api/super-admin/students/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: studentId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start support mode');

      showToast({
        title: 'Support Mode Active',
        description: `Now viewing as ${studentName}.`,
        type: 'success'
      });

      window.location.href = data.redirectUrl || '/lms/dashboard';
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleExecuteTroubleshooting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setIsProcessingAction(true);

    try {
      const res = await fetch('/api/super-admin/students/troubleshoot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: troubleshootAction,
          studentId: selectedStudent.id,
          courseId: troubleshootCourseId,
          orderId: troubleshootOrderId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Troubleshooting action failed');

      showToast({ title: 'Troubleshooting Action Completed', description: data.message, type: 'success' });
      setIsTroubleshootOpen(false);
      await openStudentInspector(selectedStudent.id);
      await fetchStudentsAndCourses();
    } catch (err: any) {
      showToast({ title: 'Action Failed', description: err.message, type: 'error' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      const res = await fetch('/api/super-admin/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedStudent.id,
          name: editName,
          email: editEmail,
          isSuspended: editSuspended,
          newPassword: newPassword || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update student');

      showToast({ title: 'Student Updated', description: data.message, type: 'success' });
      setIsEditOpen(false);
      await fetchStudentsAndCourses();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (
      !confirm(
        `🚨 WARNING: Are you sure you want to permanently delete student ${studentName}? This will purge all their enrollments, orders, progress, and certificates.`
      )
    )
      return;

    try {
      const res = await fetch(`/api/super-admin/students?id=${studentId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete student');

      showToast({ title: 'Student Deleted', description: data.message, type: 'info' });
      setIsInspectorOpen(false);
      await fetchStudentsAndCourses();
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
            <span className="text-primary font-bold">Students Governance</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Multi-Tenant Student Registry &amp; Diagnostics
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Identify which company each student is registered under, manage enrollments, and execute live support mode.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold px-3 py-1 bg-primary/10 text-primary rounded-full">
            {students.length} Registered Students
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Icon
              name="search"
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student name or email..."
              className="w-full bg-surface-container-lowest border border-outline-variant/80 rounded-2xl pl-10 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
            />
          </div>

          {/* Company Filter Dropdown */}
          <div className="relative w-full sm:w-64">
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/80 rounded-2xl px-3.5 py-2 text-xs font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">🏢 All Companies ({organizations.length})</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {['ALL', 'ACTIVE', 'SUSPENDED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-lowest border border-outline-variant/80 text-outline hover:text-on-surface'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden">
        {students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/70 border-b border-outline-variant/60 text-outline uppercase font-extrabold tracking-wider text-[10px]">
                <tr>
                  <th className="p-4 pl-6">Student</th>
                  <th className="p-4">Registered Company</th>
                  <th className="p-4">Enrollments</th>
                  <th className="p-4">Certificates</th>
                  <th className="p-4">Total Spent</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Joined</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          avatar={s.avatar}
                          name={s.name}
                          size="sm"
                          shape="rounded"
                          className="w-9 h-9 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-on-surface text-sm leading-tight">{s.name}</p>
                          <p className="font-mono text-[11px] text-outline mt-0.5">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 font-bold text-xs">
                        <Icon name="business" size={14} className="text-indigo-600" />
                        <span>{s.organizationName}</span>
                      </div>
                      {s.organizationSlug && (
                        <span className="block text-[10px] font-mono text-outline mt-0.5">
                          /org/{s.organizationSlug}
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono font-bold text-on-surface">
                      {s.enrollmentCount} Courses
                    </td>
                    <td className="p-4 font-mono font-bold text-amber-700">
                      {s.certificateCount} Diplomas
                    </td>
                    <td className="p-4 font-mono font-bold text-emerald-800">₹{s.totalSpent}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          s.isSuspended
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {s.isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-outline">{s.createdAt}</td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* View As Student Support Mode Button */}
                        <button
                          onClick={() => handleImpersonate(s.id, s.name)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 hover:bg-amber-500 hover:text-slate-950 font-mono font-extrabold text-[11px] border border-amber-500/30 flex items-center gap-1 transition-all cursor-pointer"
                          title="Open Student Dashboard in Support Mode"
                        >
                          <Icon name="visibility" size={14} />
                          <span>Support Mode</span>
                        </button>

                        {/* Inspector / Troubleshoot Button */}
                        <button
                          onClick={() => openStudentInspector(s.id)}
                          className="p-1.5 rounded-xl border border-outline-variant hover:border-primary text-outline hover:text-primary transition-colors cursor-pointer"
                          title="Inspect Student Records & Troubleshoot"
                        >
                          <Icon name="build" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-outline text-xs">
            No students found matching current search and company filter.
          </div>
        )}
      </div>

      {/* Student Inspector Drawer / Modal */}
      <Modal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        maxWidth="lg"
        title="Student Diagnostic Inspector"
        subtitle={`Viewing technical record for: ${selectedStudent?.name} (${selectedStudent?.email})`}
      >
        {selectedStudent && (
          <div className="space-y-6">
            {/* Registered Company Info Banner */}
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  {selectedStudent.organization?.name?.charAt(0) || 'C'}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-indigo-950">
                    {selectedStudent.organization?.name || 'Platform Direct'}
                  </h4>
                  <p className="text-xs text-indigo-700 font-mono">
                    Plan: {selectedStudent.organization?.plan || 'STARTER'} • Slug: {selectedStudent.organization?.slug || 'none'}
                  </p>
                </div>
              </div>

              {selectedStudent.organization?.slug && (
                <Link
                  href={`/org/${selectedStudent.organization.slug}`}
                  target="_blank"
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <span>View Company LMS</span>
                  <Icon name="open_in_new" size={14} />
                </Link>
              )}
            </div>

            {/* Quick Actions Bar */}
            <div className="p-4 bg-surface-container-low rounded-2xl flex flex-wrap items-center justify-between gap-3 border border-outline-variant/60">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleImpersonate(selectedStudent.id, selectedStudent.name)}
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs hover:bg-amber-400 cursor-pointer"
                >
                  <Icon name="visibility" size={16} />
                  <span>Enter Support Mode</span>
                </button>

                <button
                  onClick={() => setIsTroubleshootOpen(true)}
                  className="px-4 py-2 bg-primary text-on-primary font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs hover:bg-primary-container cursor-pointer"
                >
                  <Icon name="auto_fix_high" size={16} />
                  <span>Fix &amp; Troubleshoot</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditName(selectedStudent.name);
                    setEditEmail(selectedStudent.email);
                    setEditSuspended(selectedStudent.isSuspended);
                    setIsEditOpen(true);
                  }}
                  className="px-3 py-2 border border-outline-variant rounded-xl text-xs font-bold hover:bg-surface-container cursor-pointer"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => handleDeleteStudent(selectedStudent.id, selectedStudent.name)}
                  className="p-2 border border-rose-300 text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                  title="Delete Student"
                >
                  <Icon name="delete" size={16} />
                </button>
              </div>
            </div>

            {/* Enrolled Courses & Progress Grid */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
                <Icon name="school" size={16} className="text-primary" />
                <span>Enrolled Curricula ({selectedStudent.enrollments?.length || 0})</span>
              </h4>

              {selectedStudent.enrollments?.length > 0 ? (
                <div className="space-y-2">
                  {selectedStudent.enrollments.map((e: any) => {
                    const lessons = e.course?.sections?.flatMap((s: any) => s.lessons) || [];
                    const completedInCourse = selectedStudent.lessonProgress?.filter(
                      (p: any) =>
                        p.completed &&
                        p.lesson?.section?.courseId === e.courseId
                    ).length || 0;
                    const percent = lessons.length > 0 ? Math.round((completedInCourse / lessons.length) * 100) : 0;

                    return (
                      <div
                        key={e.id}
                        className="p-4 bg-surface-container-lowest border border-outline-variant/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-extrabold text-xs text-on-surface">{e.course?.title}</p>
                          <p className="text-[11px] text-outline font-mono mt-0.5">
                            Status: <span className="font-bold text-primary">{e.status}</span> • Instructor: {e.course?.instructor?.name}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-primary">{percent}%</span>
                            <p className="text-[10px] text-outline font-mono">
                              {completedInCourse}/{lessons.length} Lectures
                            </p>
                          </div>
                          <div className="w-24 h-2 bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-outline italic">No active course enrollments.</p>
              )}
            </div>

            {/* Orders Ledger */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
                <Icon name="receipt_long" size={16} className="text-primary" />
                <span>Orders &amp; Receipts ({selectedStudent.orders?.length || 0})</span>
              </h4>

              {selectedStudent.orders?.length > 0 ? (
                <div className="divide-y divide-outline-variant/40 border border-outline-variant/80 rounded-2xl overflow-hidden bg-surface-container-lowest">
                  {selectedStudent.orders.map((o: any) => (
                    <div key={o.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-primary">#{o.transactionId}</span>
                        <p className="text-[11px] text-on-surface mt-0.5">{o.course?.title}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-emerald-800">₹{o.amount}</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                          {o.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-outline italic">No order transactions found.</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Troubleshooting Action Modal */}
      <Modal
        isOpen={isTroubleshootOpen}
        onClose={() => setIsTroubleshootOpen(false)}
        maxWidth="md"
        title="Student Diagnostic Repair Tool"
        subtitle={`Execute direct administrative actions for ${selectedStudent?.name}`}
      >
        <form onSubmit={handleExecuteTroubleshooting} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Select Troubleshooting Action
            </label>
            <select
              value={troubleshootAction}
              onChange={(e) => setTroubleshootAction(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="GRANT_COURSE_ACCESS">1. Grant Manual Course Access (Create Enrollment)</option>
              <option value="REVOKE_COURSE_ACCESS">2. Revoke Course Access (Remove Enrollment)</option>
              <option value="GENERATE_CERTIFICATE">3. Generate / Issue Verified Certificate</option>
              <option value="REVOKE_CERTIFICATE">4. Revoke Certificate</option>
              <option value="RESET_COURSE_PROGRESS">5. Reset Course Progress (0%)</option>
              <option value="SYNC_PAYMENT">6. Sync Payment Transaction &amp; Unlock Access</option>
            </select>
          </div>

          {(troubleshootAction === 'GRANT_COURSE_ACCESS' ||
            troubleshootAction === 'REVOKE_COURSE_ACCESS' ||
            troubleshootAction === 'GENERATE_CERTIFICATE' ||
            troubleshootAction === 'REVOKE_CERTIFICATE' ||
            troubleshootAction === 'RESET_COURSE_PROGRESS') && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Target Master Course
              </label>
              <select
                required
                value={troubleshootCourseId}
                onChange={(e) => setTroubleshootCourseId(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} (₹{c.price})
                  </option>
                ))}
              </select>
            </div>
          )}

          {troubleshootAction === 'SYNC_PAYMENT' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Select Order to Sync
              </label>
              <select
                required
                value={troubleshootOrderId}
                onChange={(e) => setTroubleshootOrderId(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="">-- Choose Order --</option>
                {selectedStudent?.orders?.map((o: any) => (
                  <option key={o.id} value={o.id}>
                    Txn #{o.transactionId} - ₹{o.amount} ({o.course?.title})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 font-mono">
            ⚠️ This operation will immediately execute in the database and append to the immutable audit trail.
          </div>

          <div className="pt-3 border-t border-outline-variant/40 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsTroubleshootOpen(false)}
              className="px-4 py-2 text-xs rounded-xl border border-outline-variant cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessingAction}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-xs cursor-pointer"
            >
              {isProcessingAction ? 'Executing Action...' : 'Execute Repair Action'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        maxWidth="md"
        title="Edit Student Account"
        subtitle="Modify identity and suspension parameters"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Student Full Name
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Email Address
            </label>
            <input
              type="email"
              required
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Reset Password (Optional)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
            <div>
              <p className="font-bold text-xs text-on-surface">Account Suspension</p>
              <p className="text-[10px] text-outline">Suspended students cannot log in or access courses</p>
            </div>
            <input
              type="checkbox"
              checked={editSuspended}
              onChange={(e) => setEditSuspended(e.target.checked)}
              className="w-4 h-4 text-rose-600 rounded cursor-pointer"
            />
          </div>

          <div className="pt-3 border-t border-outline-variant/40 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 text-xs rounded-xl border border-outline-variant cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-xs cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

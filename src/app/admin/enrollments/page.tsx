'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAdmin } from '@/context/AdminContext';
import { useApp } from '@/context/AppContext';

function EnrollmentsPageContent() {
  const searchParams = useSearchParams();
  const { hasPermission, activeFacility } = useAdmin();
  const { showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('ALL');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Manual Enrollment Form State
  const [manualForm, setManualForm] = useState({
    studentName: '',
    studentEmail: '',
    courseId: '',
    accessType: 'LIFETIME',
    status: 'ACTIVE'
  });

  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEnrollmentsData = async () => {
    setIsLoading(true);
    try {
      const [enrRes, crsRes] = await Promise.all([
        fetch(`/api/admin/enrollments${activeFacility?.id ? `?facilityId=${encodeURIComponent(activeFacility.id)}` : ''}`),
        fetch(`/api/admin/courses${activeFacility?.id ? `?facilityId=${encodeURIComponent(activeFacility.id)}` : ''}`)
      ]);

      if (enrRes.ok) {
        const enrData = await enrRes.json();
        setEnrollments(enrData.enrollments || []);
      }
      if (crsRes.ok) {
        const crsData = await crsRes.json();
        const crsList = crsData.courses || [];
        setAvailableCourses(crsList);
        if (crsList.length > 0 && !manualForm.courseId) {
          setManualForm((prev) => ({ ...prev, courseId: crsList[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load enrollments data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollmentsData();
  }, [activeFacility?.id]);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'active') setActiveTab('active');
    else if (status === 'completed') setActiveTab('completed');
    else if (status === 'pending') setActiveTab('pending');
  }, [searchParams]);

  const handleManualEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.studentName.trim() || !manualForm.studentEmail.trim() || !manualForm.courseId) {
      showToast({ title: 'Validation Error', description: 'Student name, email, and course are required.', type: 'error' });
      return;
    }

    try {
      const res = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: manualForm.studentName.trim(),
          studentEmail: manualForm.studentEmail.trim().toLowerCase(),
          courseId: manualForm.courseId,
          accessType: manualForm.accessType,
          status: manualForm.status
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to allot seat');
      }

      showToast({
        title: 'Seat Allotted',
        description: `Enrolled ${manualForm.studentName} in course successfully.`,
        type: 'success'
      });

      setIsManualModalOpen(false);
      setManualForm({
        studentName: '',
        studentEmail: '',
        courseId: availableCourses[0]?.id || '',
        accessType: 'LIFETIME',
        status: 'ACTIVE'
      });
      fetchEnrollmentsData();
    } catch (err: any) {
      showToast({ title: 'Enrollment Error', description: err.message, type: 'error' });
    }
  };

  const handleCancelEnrollment = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke enrollment for ${name}?`)) return;
    try {
      const res = await fetch(`/api/admin/enrollments?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast({ title: 'Enrollment Revoked', description: `Cancelled enrollment for ${name}.`, type: 'info' });
        fetchEnrollmentsData();
      }
    } catch (err) {
      showToast({ title: 'Error', description: 'Failed to revoke enrollment', type: 'error' });
    }
  };

  const handleApproveEnrollment = async (id: string) => {
    try {
      const res = await fetch('/api/admin/enrollments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'ACTIVE' })
      });
      if (res.ok) {
        showToast({ title: 'Enrollment Approved', description: 'Student access activated.', type: 'success' });
        fetchEnrollmentsData();
      }
    } catch (err) {
      showToast({ title: 'Error', description: 'Failed to approve enrollment', type: 'error' });
    }
  };

  const courseList = Array.from(new Set(enrollments.map((e) => e.courseTitle)));

  const filtered = enrollments.filter((e) => {
    if (activeTab === 'active' && e.status !== 'ACTIVE') return false;
    if (activeTab === 'completed' && e.status !== 'COMPLETED') return false;
    if (activeTab === 'pending' && e.status !== 'PENDING') return false;
    if (selectedCourseFilter !== 'ALL' && e.courseTitle !== selectedCourseFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.studentName.toLowerCase().includes(q) ||
        e.studentEmail.toLowerCase().includes(q) ||
        e.courseTitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
              Course Enrollments & Seat Allocation
            </h1>
            <span className="text-[11px] font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full">
              {activeFacility?.name}
            </span>
          </div>
          <p className="text-xs text-outline font-medium mt-1">
            Monitor institutional student registrations, manual admissions, and course progression status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsManualModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Icon name="person_add" size={16} />
          <span>+ Manual Enrollment</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Total Seats</span>
            <Icon name="how_to_reg" size={18} className="text-primary" />
          </div>
          <p className="text-2xl font-black text-on-surface">{enrollments.length}</p>
          <p className="text-[11px] text-outline font-semibold">Active campus cohort</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">In Progress</span>
            <Icon name="trending_up" size={18} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-on-surface">
            {enrollments.filter((e) => e.status === 'ACTIVE').length}
          </p>
          <p className="text-[11px] text-blue-600 font-semibold">Actively learning</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
            <Icon name="verified" size={18} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-on-surface">
            {enrollments.filter((e) => e.status === 'COMPLETED').length}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold">Graduated learners</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Approval</span>
            <Icon name="pending" size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-on-surface">
            {enrollments.filter((e) => e.status === 'PENDING').length}
          </p>
          <p className="text-[11px] text-amber-600 font-semibold">Requires verification</p>
        </div>
      </div>

      {/* Tabs, Course-wise filter, and Student Search */}
      <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl overflow-x-auto w-full sm:w-auto">
          {(
            [
              { key: 'all', label: 'All Enrollments' },
              { key: 'active', label: 'Active Learning' },
              { key: 'completed', label: 'Completed' },
              { key: 'pending', label: 'Pending Review' }
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

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Course-wise Filter */}
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="h-9 px-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-bold focus:outline-none focus:border-primary max-w-[200px] truncate"
          >
            <option value="ALL">All Courses</option>
            {courseList.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search learner or course..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary placeholder:text-outline"
            />
          </div>
        </div>
      </div>

      {/* Enrollments Table */}
      <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-[10px] font-mono font-extrabold uppercase text-outline border-b border-outline-variant/60">
                <th className="p-4">Student</th>
                <th className="p-4">Course Program</th>
                <th className="p-4">Progress</th>
                <th className="p-4">Status</th>
                <th className="p-4">Access Tier</th>
                <th className="p-4">Enrolled Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 text-xs">
              {filtered.map((enr) => (
                <tr key={enr.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={enr.studentName} size="sm" className="w-8 h-8" />
                      <div>
                        <p className="font-extrabold text-on-surface">{enr.studentName}</p>
                        <p className="text-[11px] text-outline font-mono">{enr.studentEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-on-surface max-w-[220px] truncate" title={enr.courseTitle}>
                      {enr.courseTitle}
                    </p>
                  </td>
                  <td className="p-4">
                    <div className="w-28 space-y-1">
                      <div className="flex justify-between text-[10px] font-mono font-bold text-outline">
                        <span>Progress</span>
                        <span>{enr.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            enr.progress === 100 ? 'bg-emerald-500' : 'bg-primary'
                          }`}
                          style={{ width: `${enr.progress}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        enr.status === 'ACTIVE'
                          ? 'bg-blue-500/10 text-blue-700'
                          : enr.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-700'
                          : 'bg-amber-500/10 text-amber-700'
                      }`}
                    >
                      {enr.status}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-outline text-[11px]">
                    {enr.accessType === 'LIFETIME' ? 'Lifetime Access' : '1 Year Annual'}
                  </td>
                  <td className="p-4 font-mono text-outline text-[11px]">
                    {enr.enrolledAt}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {enr.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleApproveEnrollment(enr.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCancelEnrollment(enr.id, enr.studentName)}
                        className="p-1.5 text-outline hover:text-rose-600 rounded-lg transition-colors"
                        title="Cancel enrollment"
                      >
                        <Icon name="close" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-outline">
                    No enrollments found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Enrollment Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            style={{ width: '100%', maxWidth: '600px' }}
            className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-8 w-full max-w-[600px] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon name="person_add" size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-on-surface">Manual Course Seat Allocation</h3>
                  <p className="text-[11px] text-outline font-mono">Grant Immediate Course Authorization</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleManualEnroll} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={manualForm.studentName}
                  onChange={(e) => setManualForm({ ...manualForm, studentName: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Student Email Address</label>
                <input
                  type="email"
                  required
                  value={manualForm.studentEmail}
                  onChange={(e) => setManualForm({ ...manualForm, studentEmail: e.target.value })}
                  placeholder="rahul@example.com"
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Select Course Program</label>
                <select
                  value={manualForm.courseId}
                  onChange={(e) => setManualForm({ ...manualForm, courseId: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary"
                >
                  {availableCourses.length > 0 ? (
                    availableCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} {c.price ? `(₹${c.price})` : '(Free)'}
                      </option>
                    ))
                  ) : (
                    <option value="">No courses available</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Access Entitlement</label>
                  <select
                    value={manualForm.accessType}
                    onChange={(e) => setManualForm({ ...manualForm, accessType: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary"
                  >
                    <option value="LIFETIME">Lifetime Access</option>
                    <option value="1_YEAR">1 Year License</option>
                    <option value="6_MONTHS">6 Months License</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Initial Status</label>
                  <select
                    value={manualForm.status}
                    onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary"
                  >
                    <option value="ACTIVE">Active (Immediate Access)</option>
                    <option value="PENDING">Pending Verification</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-outline hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
                >
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminEnrollmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-outline">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-mono">Loading Enrollments...</p>
        </div>
      }
    >
      <EnrollmentsPageContent />
    </Suspense>
  );
}

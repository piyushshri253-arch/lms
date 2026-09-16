'use client';

import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/context/AdminContext';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';
import { ADMIN_PERMISSIONS, ADMIN_ROLE_PRESETS } from '@/lib/admin-permissions';

interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  customRole: string;
  permissions: string[];
  createdAt: string;
}

const PERMISSION_GROUPS = [
  {
    name: 'Courses & Content',
    icon: 'menu_book',
    permissions: [
      { key: ADMIN_PERMISSIONS.COURSE_VIEW, label: 'View Courses' },
      { key: ADMIN_PERMISSIONS.COURSE_CREATE, label: 'Create Courses' },
      { key: ADMIN_PERMISSIONS.COURSE_EDIT, label: 'Edit Courses' },
      { key: ADMIN_PERMISSIONS.COURSE_PUBLISH, label: 'Approve & Publish Courses' },
      { key: ADMIN_PERMISSIONS.COURSE_DELETE, label: 'Delete Courses' },
      { key: ADMIN_PERMISSIONS.CONTENT_VIEW, label: 'View Content Studio' },
      { key: ADMIN_PERMISSIONS.CONTENT_UPLOAD, label: 'Upload Videos & Files' }
    ]
  },
  {
    name: 'Students & Faculty',
    icon: 'school',
    permissions: [
      { key: ADMIN_PERMISSIONS.STUDENT_VIEW, label: 'View Students' },
      { key: ADMIN_PERMISSIONS.STUDENT_CREATE, label: 'Add Students' },
      { key: ADMIN_PERMISSIONS.STUDENT_EDIT, label: 'Edit Student Details' },
      { key: ADMIN_PERMISSIONS.STUDENT_IMPORT, label: 'Bulk Import CSV' },
      { key: ADMIN_PERMISSIONS.STUDENT_DELETE, label: 'Delete Student Records' },
      { key: 'instructor.view', label: 'View Instructors' },
      { key: 'instructor.create', label: 'Add / Invite Faculty' }
    ]
  },
  {
    name: 'Enrollments',
    icon: 'how_to_reg',
    permissions: [
      { key: ADMIN_PERMISSIONS.ENROLLMENT_VIEW, label: 'View Enrollments' },
      { key: ADMIN_PERMISSIONS.ENROLLMENT_CREATE, label: 'Manual Seat Allotment' },
      { key: ADMIN_PERMISSIONS.ENROLLMENT_EDIT, label: 'Modify Expirations' },
      { key: ADMIN_PERMISSIONS.ENROLLMENT_CANCEL, label: 'Revoke Access' }
    ]
  },
  {
    name: 'Payments & Revenue',
    icon: 'payments',
    permissions: [
      { key: ADMIN_PERMISSIONS.PAYMENT_VIEW, label: 'View Transactions & Orders' },
      { key: ADMIN_PERMISSIONS.PAYMENT_EXPORT, label: 'Export Tax & Invoices' },
      { key: ADMIN_PERMISSIONS.PAYMENT_REFUND, label: 'Process Refunds' },
      { key: ADMIN_PERMISSIONS.COUPON_VIEW, label: 'View Discount Coupons' },
      { key: ADMIN_PERMISSIONS.COUPON_CREATE, label: 'Create Discount Codes' }
    ]
  },
  {
    name: 'Certificates & Accreditation',
    icon: 'workspace_premium',
    permissions: [
      { key: ADMIN_PERMISSIONS.CERTIFICATE_VIEW, label: 'View Issued Accreditations' },
      { key: ADMIN_PERMISSIONS.CERTIFICATE_ISSUE, label: 'Manually Issue Certificates' },
      { key: ADMIN_PERMISSIONS.CERTIFICATE_REVOKE, label: 'Revoke Credentials' }
    ]
  },
  {
    name: 'Reports & Analytics',
    icon: 'bar_chart',
    permissions: [
      { key: ADMIN_PERMISSIONS.REPORT_COURSE, label: 'Course Analytics' },
      { key: ADMIN_PERMISSIONS.REPORT_STUDENT, label: 'Student Progress Reports' },
      { key: ADMIN_PERMISSIONS.REPORT_PAYMENT, label: 'Revenue Reports' },
      { key: ADMIN_PERMISSIONS.NOTIFICATION_SEND, label: 'Publish Announcements' },
      { key: ADMIN_PERMISSIONS.SETTING_VIEW, label: 'View Platform Settings' }
    ]
  }
];

export default function ManageAdminsPage() {
  const { isSuperAdmin } = useAdmin();
  const { currentUser, showToast } = useApp();

  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminAccount | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [customRole, setCustomRole] = useState('Course Admin');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/admins');
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins || []);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to load admins', 'error');
      }
    } catch {
      showToast('Network error loading admins', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleApplyPreset = (presetKey: keyof typeof ADMIN_ROLE_PRESETS) => {
    const preset = ADMIN_ROLE_PRESETS[presetKey];
    setCustomRole(preset.name);
    setSelectedPermissions([...preset.permissions]);
  };

  const togglePermission = (permKey: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permKey) ? prev.filter((p) => p !== permKey) : [...prev, permKey]
    );
  };

  const toggleGroup = (groupPerms: { key: string }[]) => {
    const allSelected = groupPerms.every((p) => selectedPermissions.includes(p.key));
    if (allSelected) {
      const keysToRemove = groupPerms.map((p) => p.key);
      setSelectedPermissions((prev) => prev.filter((k) => !keysToRemove.includes(k)));
    } else {
      const keysToAdd = groupPerms.map((p) => p.key);
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...keysToAdd])));
    }
  };

  const handleOpenAddModal = () => {
    setName('');
    setEmail('');
    setPassword(`Admin@${Math.floor(1000 + Math.random() * 9000)}!`);
    handleApplyPreset('COURSE_ADMIN');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (admin: AdminAccount) => {
    setSelectedAdmin(admin);
    setName(admin.name);
    setCustomRole(admin.customRole);
    setSelectedPermissions(admin.permissions || []);
    setIsEditModalOpen(true);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      showToast('Name, email, and temporary password are required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          customRole: customRole.trim(),
          permissions: selectedPermissions
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Admin created successfully with assigned permissions!', 'success');
        setIsAddModalOpen(false);
        fetchAdmins();
      } else {
        showToast(data.error || 'Failed to create admin', 'error');
      }
    } catch {
      showToast('Error creating admin', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAdmin.id,
          name: name.trim(),
          customRole: customRole.trim(),
          permissions: selectedPermissions
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Admin permissions updated successfully!', 'success');
        setIsEditModalOpen(false);
        fetchAdmins();
      } else {
        showToast(data.error || 'Failed to update permissions', 'error');
      }
    } catch {
      showToast('Error updating permissions', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAdmin = async (admin: AdminAccount) => {
    if (admin.id === currentUser?.id) {
      showToast('You cannot delete your own Super Admin account', 'error');
      return;
    }
    if (!confirm(`Are you sure you want to remove administrator "${admin.name}" (${admin.email})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/admins?id=${admin.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Admin account removed', 'info');
        fetchAdmins();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to remove admin', 'error');
      }
    } catch {
      showToast('Network error removing admin', 'error');
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center space-y-3">
        <Icon name="lock" size={48} className="text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-on-surface">Super Admin Access Required</h2>
        <p className="text-sm text-outline max-w-md mx-auto">
          Only the Super Administrator has permission to provision and delegate operational permissions to Admin users.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
            <Icon name="admin_panel_settings" size={16} />
            <span>Role-Based Access Control (RBAC)</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Administrator Staff & Permissions
          </h1>
          <p className="text-xs sm:text-sm text-outline mt-1 max-w-2xl">
            Super Admin grants explicit module permissions to each Admin. An Admin will only see and access the sections permitted below.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all cursor-pointer shrink-0"
        >
          <Icon name="person_add" size={16} />
          <span>+ Add New Admin</span>
        </button>
      </div>

      {/* Role Preset Callout Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-1">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
            <Icon name="menu_book" size={16} />
            <span>Course Admin Preset</span>
          </div>
          <p className="text-xs text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed">
            Grants access to <strong>Courses</strong>, <strong>Instructors</strong>, <strong>Students</strong>, and <strong>Enrollments</strong>. Hides financial & payment reports.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
            <Icon name="payments" size={16} />
            <span>Payment Admin Preset</span>
          </div>
          <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed">
            Grants access to <strong>Transactions</strong>, <strong>Revenue Reports</strong>, <strong>Invoices</strong>, and <strong>Coupons</strong>. Hides curriculum authoring.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-1">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold text-xs">
            <Icon name="verified_user" size={16} />
            <span>Super Admin</span>
          </div>
          <p className="text-xs text-purple-900/80 dark:text-purple-200/80 leading-relaxed">
            Unrestricted master authority across all operations, payment gateways, instructor approvals, and admin delegation.
          </p>
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-outline-variant/60 flex items-center justify-between">
          <h2 className="text-sm font-bold text-on-surface">Registered Administrators ({admins.length})</h2>
          <span className="text-[11px] font-mono text-outline">Active Staff</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-outline font-medium flex items-center justify-center gap-2">
            <Icon name="sync" size={18} className="animate-spin text-primary" />
            <span>Loading Administrator Directory...</span>
          </div>
        ) : admins.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-xs text-outline">No administrators found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-outline-variant/60 bg-surface-container-low text-[11px] font-bold text-outline uppercase tracking-wider">
                  <th className="py-3 px-4">Admin Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Active Permissions</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {admins.map((adm) => {
                  const isSuper = adm.role === 'SUPER_ADMIN';
                  return (
                    <tr key={adm.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-3 px-4 font-bold text-on-surface">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {adm.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate">{adm.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-outline truncate">{adm.email}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase ${
                            isSuper
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                              : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
                          }`}
                        >
                          <Icon name={isSuper ? 'stars' : 'badge'} size={12} />
                          <span>{adm.customRole || (isSuper ? 'Super Admin' : 'Admin')}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isSuper ? (
                          <span className="text-purple-600 font-bold text-[11px]">Universal Access (All Modules)</span>
                        ) : adm.permissions && adm.permissions.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {adm.permissions.slice(0, 4).map((p) => (
                              <span
                                key={p}
                                className="px-1.5 py-0.5 bg-surface-container rounded text-[10px] font-mono text-on-surface-variant"
                              >
                                {p}
                              </span>
                            ))}
                            {adm.permissions.length > 4 && (
                              <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-mono font-bold">
                                +{adm.permissions.length - 4} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-600 text-[11px] italic">No permissions assigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(adm)}
                            disabled={isSuper}
                            className="px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isSuper ? 'Super Admin always has universal permissions' : 'Configure permissions'}
                          >
                            Edit Permissions
                          </button>
                          {!isSuper && adm.id !== currentUser?.id && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAdmin(adm)}
                              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                              title="Delete Admin"
                            >
                              <Icon name="delete" size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add New Admin */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div
            className="w-full max-w-[640px] max-h-[90vh] overflow-y-auto bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 shadow-2xl space-y-5"
            style={{ width: '100%', maxWidth: '640px' }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon name="person_add" size={18} />
                </div>
                <h3 className="text-base font-bold text-on-surface">Provision New Administrator</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tarun Verma"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tarun@morenateach.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Temporary Password *</label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Role Title / Label</label>
                  <input
                    type="text"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder="Course Admin / Operations"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="p-3 bg-surface-container-low rounded-2xl space-y-2 border border-outline-variant/60">
                <p className="text-[11px] font-bold text-outline uppercase tracking-wider">Apply Role Presets</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('COURSE_ADMIN')}
                    className="px-3 py-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs hover:bg-indigo-200 transition-colors cursor-pointer"
                  >
                    + Course Admin Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('PAYMENT_ADMIN')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-200 transition-colors cursor-pointer"
                  >
                    + Payment Admin Preset
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('FULL_ADMIN')}
                    className="px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-xs hover:bg-purple-200 transition-colors cursor-pointer"
                  >
                    + Full Admin Preset
                  </button>
                </div>
              </div>

              {/* Granular Checkbox Matrix */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-on-surface">Fine-Grained Permissions Matrix ({selectedPermissions.length} selected)</p>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {PERMISSION_GROUPS.map((group) => {
                    const allSelected = group.permissions.every((p) => selectedPermissions.includes(p.key));
                    return (
                      <div key={group.name} className="p-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-on-surface">
                            <Icon name={group.icon} size={15} className="text-primary" />
                            <span>{group.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.permissions)}
                            className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                          >
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {group.permissions.map((perm) => {
                            const isChecked = selectedPermissions.includes(perm.key);
                            return (
                              <label
                                key={perm.key}
                                className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                                  isChecked ? 'bg-primary/5 font-semibold text-primary' : 'text-on-surface-variant hover:bg-surface-container'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(perm.key)}
                                  className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                                />
                                <span className="truncate">{perm.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-outline hover:bg-surface-container rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-primary text-on-primary rounded-xl hover:bg-primary/90 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating Admin...' : 'Create Admin Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Existing Admin Permissions */}
      {isEditModalOpen && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div
            className="w-full max-w-[640px] max-h-[90vh] overflow-y-auto bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 shadow-2xl space-y-5"
            style={{ width: '100%', maxWidth: '640px' }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon name="admin_panel_settings" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">Edit Permissions: {selectedAdmin.name}</h3>
                  <p className="text-[11px] font-mono text-outline">{selectedAdmin.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface cursor-pointer"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateAdmin} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Custom Role Title</label>
                  <input
                    type="text"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant bg-surface text-on-surface focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="p-3 bg-surface-container-low rounded-2xl space-y-2 border border-outline-variant/60">
                <p className="text-[11px] font-bold text-outline uppercase tracking-wider">Quick Preset Overwrite</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('COURSE_ADMIN')}
                    className="px-3 py-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs hover:bg-indigo-200 transition-colors cursor-pointer"
                  >
                    Course Admin (Courses, Students, Enrollments)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('PAYMENT_ADMIN')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-200 transition-colors cursor-pointer"
                  >
                    Payment Admin (Finance & Orders Only)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('FULL_ADMIN')}
                    className="px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-xs hover:bg-purple-200 transition-colors cursor-pointer"
                  >
                    Full Operational Admin
                  </button>
                </div>
              </div>

              {/* Granular Checkbox Matrix */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-on-surface">Assigned Modules & Permissions ({selectedPermissions.length} selected)</p>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {PERMISSION_GROUPS.map((group) => {
                    const allSelected = group.permissions.every((p) => selectedPermissions.includes(p.key));
                    return (
                      <div key={group.name} className="p-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-on-surface">
                            <Icon name={group.icon} size={15} className="text-primary" />
                            <span>{group.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.permissions)}
                            className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                          >
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {group.permissions.map((perm) => {
                            const isChecked = selectedPermissions.includes(perm.key);
                            return (
                              <label
                                key={perm.key}
                                className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                                  isChecked ? 'bg-primary/5 font-semibold text-primary' : 'text-on-surface-variant hover:bg-surface-container'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(perm.key)}
                                  className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                                />
                                <span className="truncate">{perm.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-outline hover:bg-surface-container rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-primary text-on-primary rounded-xl hover:bg-primary/90 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

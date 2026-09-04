'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useApp } from '@/context/AppContext';

const AVAILABLE_PERMISSIONS = [
  { key: 'courses.all', label: 'Course Management (Create, Edit, Publish, Delete)' },
  { key: 'curriculum.all', label: 'Curriculum & Lectures (Sections, Videos, Quizzes)' },
  { key: 'students.all', label: 'Student Management (View, Enroll, Reset Progress)' },
  { key: 'finance.all', label: 'Finance & Orders (Orders, Payments, Refunds)' },
  { key: 'certificates.all', label: 'Certificates (Issue, Regenerate, Revoke)' },
  { key: 'reviews.moderate', label: 'Review Moderation (Approve, Hide, Delete)' },
  { key: 'support.all', label: 'Support Desk (Reply, Reassign, Resolve Tickets)' },
  { key: 'content.all', label: 'Website CMS & Media (Categories, Homepage, Media)' },
  { key: 'analytics.view', label: 'Analytics & Revenue Reports' }
];

export default function SuperAdminAdminsPage() {
  const { showToast, currentUser } = useApp();
  const [admins, setAdmins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Admin State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState('ADMIN');
  const [createCustomRole, setCreateCustomRole] = useState('Course Manager');
  const [createPermissions, setCreatePermissions] = useState<string[]>([
    'courses.all',
    'curriculum.all',
    'students.all'
  ]);

  // Edit Admin State
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCustomRole, setEditCustomRole] = useState('');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editSuspended, setEditSuspended] = useState(false);
  const [editPassword, setEditPassword] = useState('');

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/super-admin/admins');
      if (res.ok) {
        const d = await res.json();
        setAdmins(d.admins || []);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/super-admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          password: createPassword,
          role: createRole,
          customRole: createCustomRole,
          permissions: createPermissions
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create administrator');

      showToast({ title: 'Administrator Created', description: data.message, type: 'success' });
      setIsCreateOpen(false);
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      await fetchAdmins();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;

    try {
      const res = await fetch('/api/super-admin/admins', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAdmin.id,
          name: editName,
          email: editEmail,
          customRole: editCustomRole,
          permissions: editPermissions,
          isSuspended: editSuspended,
          newPassword: editPassword || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update admin');

      showToast({ title: 'Admin Updated', description: data.message, type: 'success' });
      setIsEditOpen(false);
      await fetchAdmins();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleDeleteAdmin = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete administrator ${name}?`)) return;

    try {
      const res = await fetch(`/api/super-admin/admins?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete admin');

      showToast({ title: 'Admin Deleted', description: data.message, type: 'info' });
      await fetchAdmins();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleViewAsAdmin = async (adminId: string, adminName: string) => {
    if (!confirm(`Enter Support Mode to view dashboard as ${adminName}?`)) return;

    try {
      const res = await fetch('/api/super-admin/students/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: adminId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start support mode');

      showToast({ title: 'Support Mode Active', description: `Viewing as ${adminName}`, type: 'success' });
      window.location.href = data.redirectUrl || '/admin';
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const toggleCreatePermission = (key: string) => {
    setCreatePermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const toggleEditPermission = (key: string) => {
    setEditPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
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
            <span className="text-primary font-bold">Administrators</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Administrator Roles &amp; Permissions
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Configure platform staff accounts, delegate operational access, and grant custom granular permissions
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-5 py-2.5 bg-primary text-on-primary font-extrabold text-xs rounded-xl hover:bg-primary-container shadow-xs flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
        >
          <Icon name="add_moderator" size={18} />
          <span>Create New Admin</span>
        </button>
      </div>

      {/* Admins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {admins.map((adm) => {
          const isSuper = adm.role === 'SUPER_ADMIN';

          return (
            <div
              key={adm.id}
              className={`bg-surface-container-lowest p-6 rounded-3xl border shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all ${
                isSuper ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/5 to-surface-container-lowest' : 'border-outline-variant/80'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      avatar={adm.avatar}
                      name={adm.name}
                      size="lg"
                      shape="rounded"
                      className="w-12 h-12 border-2 border-outline-variant"
                    />
                    <div>
                      <h3 className="font-extrabold text-sm text-on-surface">{adm.name}</h3>
                      <p className="text-[11px] text-outline font-mono">{adm.email}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      isSuper
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {adm.role}
                  </span>
                </div>

                <div className="p-3 bg-surface-container-low rounded-2xl space-y-1 text-xs">
                  <div className="flex justify-between text-outline font-mono text-[11px]">
                    <span>Custom Role:</span>
                    <span className="font-bold text-primary">{adm.customRole}</span>
                  </div>
                  <div className="flex justify-between text-outline font-mono text-[11px]">
                    <span>Managed Curricula:</span>
                    <span className="font-bold text-on-surface">{adm.managedCoursesCount} Courses</span>
                  </div>
                </div>

                {/* Granular Permissions Badges */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-outline block">
                    Assigned Permissions:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {isSuper ? (
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 rounded-md font-mono text-[10px] font-extrabold">
                        ★ ALL MASTER PRIVILEGES
                      </span>
                    ) : adm.permissions?.length > 0 ? (
                      adm.permissions.map((p: string) => (
                        <span
                          key={p}
                          className="px-2 py-0.5 bg-surface-container text-on-surface-variant rounded-md font-mono text-[10px] font-bold"
                        >
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-outline italic">No permissions granted</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-outline-variant/40 flex items-center justify-between gap-2">
                {!isSuper && (
                  <button
                    onClick={() => handleViewAsAdmin(adm.id, adm.name)}
                    className="px-3 py-1.5 bg-amber-500/10 text-amber-700 hover:bg-amber-500 hover:text-slate-950 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
                    title="View Admin Workspace in Support Mode"
                  >
                    <Icon name="visibility" size={14} />
                    <span>View as Admin</span>
                  </button>
                )}

                <div className="flex items-center gap-1 ml-auto">
                  <button
                    onClick={() => {
                      setSelectedAdmin(adm);
                      setEditName(adm.name);
                      setEditEmail(adm.email);
                      setEditCustomRole(adm.customRole);
                      setEditPermissions(adm.permissions || []);
                      setEditSuspended(adm.isSuspended);
                      setIsEditOpen(true);
                    }}
                    className="p-1.5 border border-outline-variant hover:border-primary text-outline hover:text-primary rounded-xl cursor-pointer"
                    title="Edit Admin Role & Permissions"
                  >
                    <Icon name="edit" size={16} />
                  </button>

                  {!isSuper && adm.id !== currentUser?.id && (
                    <button
                      onClick={() => handleDeleteAdmin(adm.id, adm.name)}
                      className="p-1.5 border border-rose-300 text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                      title="Delete Admin"
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Admin Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        maxWidth="lg"
        title="Create Platform Administrator"
        subtitle="Provision a new admin account with granular role permissions"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Admin Full Name
              </label>
              <input
                type="text"
                required
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
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
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="sarah@aadhyara.com"
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Temporary Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Custom Role Title
              </label>
              <input
                type="text"
                required
                value={createCustomRole}
                onChange={(e) => setCreateCustomRole(e.target.value)}
                placeholder="e.g. Content Manager, Finance Lead"
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Granular Permissions Selector */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Select Granular System Permissions
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/60 max-h-56 overflow-y-auto">
              {AVAILABLE_PERMISSIONS.map((perm) => {
                const isChecked = createPermissions.includes(perm.key);

                return (
                  <label
                    key={perm.key}
                    className="flex items-start gap-2.5 p-2 rounded-xl bg-surface-container-lowest border border-outline-variant/60 cursor-pointer hover:border-primary transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCreatePermission(perm.key)}
                      className="mt-0.5 rounded text-primary"
                    />
                    <div>
                      <span className="font-bold text-xs text-on-surface block font-mono">
                        {perm.key}
                      </span>
                      <span className="text-[11px] text-outline block">{perm.label}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-outline-variant/40 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs rounded-xl border border-outline-variant cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-xs cursor-pointer"
            >
              Create Administrator
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Admin Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        maxWidth="lg"
        title="Edit Administrator &amp; Permissions"
        subtitle={`Updating settings for ${selectedAdmin?.name}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Admin Full Name
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Custom Role Title
              </label>
              <input
                type="text"
                required
                value={editCustomRole}
                onChange={(e) => setEditCustomRole(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Reset Password (Optional)
              </label>
              <input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Leave blank to preserve current password"
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Granular Permissions */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Modify Granular System Permissions
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/60 max-h-56 overflow-y-auto">
              {AVAILABLE_PERMISSIONS.map((perm) => {
                const isChecked = editPermissions.includes(perm.key);

                return (
                  <label
                    key={perm.key}
                    className="flex items-start gap-2.5 p-2 rounded-xl bg-surface-container-lowest border border-outline-variant/60 cursor-pointer hover:border-primary transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleEditPermission(perm.key)}
                      className="mt-0.5 rounded text-primary"
                    />
                    <div>
                      <span className="font-bold text-xs text-on-surface block font-mono">
                        {perm.key}
                      </span>
                      <span className="text-[11px] text-outline block">{perm.label}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
            <div>
              <p className="font-bold text-xs text-on-surface">Suspend Admin Access</p>
              <p className="text-[10px] text-outline">Suspended admins cannot log into the control center</p>
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
              Save Admin Settings
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

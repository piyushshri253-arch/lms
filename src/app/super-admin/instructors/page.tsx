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
  const [isLoading, setIsLoading] = useState(true);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createBio, setCreateBio] = useState('');
  const [createCustomRole, setCreateCustomRole] = useState('Faculty Lead');

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
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstructors();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/super-admin/instructors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          password: createPassword,
          bio: createBio,
          customRole: createCustomRole
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create instructor');

      showToast({ title: 'Instructor Appointed', description: data.message, type: 'success' });
      setIsCreateOpen(false);
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      setCreateBio('');
      await fetchInstructors();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
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
      if (!res.ok) throw new Error(data.error || 'Failed to update instructor');

      showToast({ title: 'Instructor Updated', description: data.message, type: 'success' });
      setIsEditOpen(false);
      await fetchInstructors();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to remove faculty instructor ${name}? Their authored courses will be reassigned to the primary administrator.`
      )
    )
      return;

    try {
      const res = await fetch(`/api/super-admin/instructors?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete instructor');

      showToast({ title: 'Instructor Removed', description: data.message, type: 'info' });
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
            <span className="text-primary font-bold">Faculty</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Faculty &amp; Instructor Governance
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Manage course instructors, monitor student enrollment reach, and track gross revenue shares
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-5 py-2.5 bg-primary text-on-primary font-extrabold text-xs rounded-xl hover:bg-primary-container shadow-xs flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
        >
          <Icon name="person_add" size={18} />
          <span>Appoint Instructor</span>
        </button>
      </div>

      {/* Instructors Grid */}
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

                <span
                  className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    inst.isSuspended ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {inst.isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                </span>
              </div>

              {inst.bio && (
                <p className="text-xs text-on-surface-variant line-clamp-2 italic leading-relaxed">
                  "{inst.bio}"
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

      {/* Appoint Instructor Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        maxWidth="md"
        title="Appoint Faculty Instructor"
        subtitle="Create a new instructor profile in the database"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Instructor Name
            </label>
            <input
              type="text"
              required
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. Dr. Alan Turing"
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
              placeholder="alan@morenateach.com"
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                Academic Title
              </label>
              <input
                type="text"
                required
                value={createCustomRole}
                onChange={(e) => setCreateCustomRole(e.target.value)}
                placeholder="Faculty Lead, Professor"
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Bio &amp; Academic Credentials
            </label>
            <textarea
              rows={3}
              value={createBio}
              onChange={(e) => setCreateBio(e.target.value)}
              placeholder="Background in Distributed Systems, Cloud Architecture..."
              className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
            />
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
              Appoint Instructor
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Instructor Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        maxWidth="md"
        title="Edit Faculty Record"
        subtitle={`Updating settings for ${selectedInst?.name}`}
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Full Name
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Academic Title
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
                placeholder="Leave blank to keep password"
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Bio &amp; Academic Credentials
            </label>
            <textarea
              rows={3}
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl p-3 text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
            <div>
              <p className="font-bold text-xs text-on-surface">Account Suspension</p>
              <p className="text-[10px] text-outline">Suspended instructors cannot author or edit courses</p>
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
              Save Faculty Settings
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

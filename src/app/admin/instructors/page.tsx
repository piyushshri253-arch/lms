'use client';

import React, { useState, Suspense } from 'react';
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
    department: 'Computer Science',
    title: 'Assistant Professor',
    bio: '',
    password: ''
  });

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

    try {
      const res = await fetch('/api/admin/instructors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          bio: `${formData.title} - ${formData.department}. ${formData.bio}`.trim(),
          password: formData.password || 'Instructor@2026'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to appoint instructor');
      }

      showToast({ title: 'Faculty Appointed', description: `${formData.name} added to database.`, type: 'success' });
      setIsAddModalOpen(false);
      setFormData({ name: '', email: '', department: 'Computer Science', title: 'Assistant Professor', bio: '', password: '' });
      fetchInstructors();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
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

  // Filtered instructors
  const filtered = instructors.filter((inst) => {
    const matchesSearch =
      inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDepartment === 'ALL' || inst.department.includes(selectedDepartment);
    return matchesSearch && matchesDept;
  });

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
              {activeFacility?.name}
            </span>
          </div>
          <p className="text-xs text-outline font-medium mt-1">
            Manage professorial roster, course assignments, pedagogy ratings, and faculty performance.
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
            <span>{instructors.filter((i) => i.status === 'ACTIVE').length} Active On Campus</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Assigned Courses</span>
            <Icon name="menu_book" size={18} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black text-on-surface">
            {instructors.reduce((acc, i) => acc + i.assignedCourses.length, 0)}
          </p>
          <p className="text-[11px] text-outline">Across 5 departments</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Total Learners</span>
            <Icon name="school" size={18} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-on-surface">
            {instructors.reduce((acc, i) => acc + i.totalStudents, 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold">+12% enrollment rate</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Average Rating</span>
            <Icon name="star" size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-on-surface">4.91 / 5.0</p>
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
            <option value="ALL">All Disciplines</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Artificial Intelligence">Artificial Intelligence</option>
            <option value="DevOps">DevOps & Cloud</option>
            <option value="Database">Database Engineering</option>
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
                <th className="p-4">Department & Title</th>
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
                    <p className="font-bold text-on-surface">{inst.department}</p>
                    <p className="text-[11px] text-outline">{inst.title}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                      {inst.assignedCourses.map((c: any) => (
                        <span key={c.id} className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 font-semibold truncate max-w-[180px]" title={c.title}>
                          {c.title}
                        </span>
                      ))}
                      {inst.assignedCourses.length === 0 && (
                        <span className="text-[11px] text-outline italic">No active courses</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-on-surface">
                    {inst.totalStudents.toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 font-extrabold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-lg text-xs">
                      <Icon name="star" size={12} className="fill-amber-500 text-amber-500" />
                      {inst.rating}
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-outline">
                    No faculty members found matching your search.
                  </td>
                </tr>
              )}
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
                    placeholder="e.g. Associate Professor"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Department</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary"
                >
                  <option value="Computer Science">Computer Science & Architecture</option>
                  <option value="Artificial Intelligence">Artificial Intelligence & ML</option>
                  <option value="DevOps & Cloud Systems">DevOps & Cloud Systems</option>
                  <option value="Database Engineering">Database Engineering</option>
                  <option value="Pedagogical Leadership">Pedagogical Leadership</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Biography / Research Background</label>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Key research accomplishments, industry credentials, and teaching philosophy..."
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
                  Save & Appoint
                </button>
              </div>
            </form>
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
                <p className="text-lg font-black text-on-surface">{selectedInstructor.assignedCourses.length}</p>
                <p className="text-[10px] text-outline font-semibold">Courses</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40">
                <p className="text-lg font-black text-on-surface">{selectedInstructor.totalStudents}</p>
                <p className="text-[10px] text-outline font-semibold">Learners</p>
              </div>
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40">
                <p className="text-lg font-black text-amber-600">{selectedInstructor.rating}</p>
                <p className="text-[10px] text-outline font-semibold">Rating</p>
              </div>
            </div>

            {/* Assigned Courses List */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-outline">Assigned Courses</h3>
              <div className="space-y-2">
                {selectedInstructor.assignedCourses.map((c: any) => (
                  <div key={c.id} className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-on-surface">{c.title}</p>
                      <p className="text-[10px] text-outline">{c.students} active learners</p>
                    </div>
                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                      <Icon name="star" size={12} className="fill-amber-500 text-amber-500" />
                      {c.rating}
                    </span>
                  </div>
                ))}
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

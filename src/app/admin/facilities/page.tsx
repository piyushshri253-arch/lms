'use client';

import React, { useState, Suspense } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useAdmin } from '@/context/AdminContext';
import { useApp } from '@/context/AppContext';

function FacilitiesPageContent() {
  const { facilities, activeFacility, switchFacility } = useAdmin();
  const { showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<any | null>(null);

  const [facilitiesData, setFacilitiesData] = useState<any[]>([
    {
      id: 'main-facility',
      name: 'ABC Institute (Main Campus)',
      slug: 'abc-institute',
      location: 'New Delhi, India',
      admins: [
        { name: 'Dr. Elena Rodriguez', email: 'admin@morenateach.com', role: 'Campus Dean' }
      ],
      studentsCount: 1420,
      coursesCount: 24,
      revenue: 485000,
      status: 'ACTIVE',
      establishedYear: 2022
    },
    {
      id: 'blr-facility',
      name: 'Bengaluru Tech Campus',
      slug: 'bengaluru-campus',
      location: 'Bengaluru, Karnataka',
      admins: [
        { name: 'Dr. Alan Turing', email: 'instructor@morenateach.com', role: 'Regional Director' }
      ],
      studentsCount: 980,
      coursesCount: 18,
      revenue: 340000,
      status: 'ACTIVE',
      establishedYear: 2024
    },
    {
      id: 'mumbai-facility',
      name: 'Mumbai Digital Academy',
      slug: 'mumbai-academy',
      location: 'Mumbai, Maharashtra',
      admins: [
        { name: 'Dr. Sameer Verma', email: 'sameer@mumbai.edu', role: 'Academic Lead' }
      ],
      studentsCount: 650,
      coursesCount: 12,
      revenue: 210000,
      status: 'ACTIVE',
      establishedYear: 2025
    }
  ]);

  // Form State for Add Facility
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    location: '',
    adminName: '',
    adminEmail: ''
  });

  const handleAddFacility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      showToast({ title: 'Validation Error', description: 'Name and slug are required.', type: 'error' });
      return;
    }

    const newFacility = {
      id: `fac-${Date.now()}`,
      name: formData.name.trim(),
      slug: formData.slug.trim().toLowerCase().replace(/\s+/g, '-'),
      location: formData.location.trim() || 'India',
      admins: [
        {
          name: formData.adminName || 'Admin Lead',
          email: formData.adminEmail || 'admin@facility.edu',
          role: 'Facility Administrator'
        }
      ],
      studentsCount: 0,
      coursesCount: 0,
      revenue: 0,
      status: 'ACTIVE',
      establishedYear: 2026
    };

    setFacilitiesData([...facilitiesData, newFacility]);
    setIsAddModalOpen(false);
    setFormData({ name: '', slug: '', location: '', adminName: '', adminEmail: '' });
    showToast({ title: 'Facility Created', description: `Added ${newFacility.name} to network.`, type: 'success' });
  };

  const handleSwitchFacility = (fac: any) => {
    switchFacility(fac.id);
    showToast({
      title: 'Active Scope Switched',
      description: `Now administering "${fac.name}".`,
      type: 'info'
    });
  };

  const filtered = facilitiesData.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
              Facility & Multi-Campus Management
            </h1>
            <span className="text-[11px] font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full">
              {activeFacility?.name}
            </span>
          </div>
          <p className="text-xs text-outline font-medium mt-1">
            Supervise decentralized educational facilities, localized campus admins, and multi-tenant quotas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Icon name="add_business" size={16} />
          <span>+ Provision New Facility</span>
        </button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Total Facilities</span>
            <Icon name="domain" size={18} className="text-primary" />
          </div>
          <p className="text-2xl font-black text-on-surface">{facilitiesData.length}</p>
          <p className="text-[11px] text-emerald-600 font-semibold">All campuses operational</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Total Students</span>
            <Icon name="groups" size={18} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-on-surface">
            {facilitiesData.reduce((acc, f) => acc + f.studentsCount, 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-outline font-semibold">Across all campuses</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Institutional Courses</span>
            <Icon name="menu_book" size={18} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black text-on-surface">
            {facilitiesData.reduce((acc, f) => acc + f.coursesCount, 0)}
          </p>
          <p className="text-[11px] text-outline font-semibold">Active curriculums</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-bold uppercase tracking-wider">Combined Revenue</span>
            <Icon name="payments" size={18} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-on-surface">
            ₹{facilitiesData.reduce((acc, f) => acc + f.revenue, 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold">+18.5% year-over-year</p>
        </div>
      </div>

      {/* Facilities Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((fac) => {
          const isCurrentlyActive = activeFacility?.id === fac.id || activeFacility?.name === fac.name;
          return (
            <div
              key={fac.id}
              className={`p-5 rounded-2xl bg-surface-container-lowest border transition-all space-y-4 shadow-2xs relative ${
                isCurrentlyActive
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/2'
                  : 'border-outline-variant/80 hover:border-outline'
              }`}
            >
              {isCurrentlyActive && (
                <div className="absolute top-4 right-4">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase bg-primary text-on-primary">
                    Active Scope
                  </span>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-primary flex items-center justify-center shrink-0">
                  <Icon name="domain" size={22} />
                </div>
                <div className="min-w-0 pr-16">
                  <h3 className="text-sm font-extrabold text-on-surface truncate">{fac.name}</h3>
                  <p className="text-[11px] text-outline font-mono truncate">{fac.slug}</p>
                  <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                    <Icon name="location_on" size={13} className="text-primary" />
                    <span>{fac.location}</span>
                  </p>
                </div>
              </div>

              {/* Campus Admins */}
              <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-outline">Assigned Admins:</span>
                {fac.admins.map((adm: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-on-surface">{adm.name}</span>
                    <span className="text-[10px] text-outline font-mono">{adm.role}</span>
                  </div>
                ))}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-surface-container-low">
                  <p className="font-black text-on-surface">{fac.studentsCount}</p>
                  <p className="text-[10px] text-outline">Students</p>
                </div>
                <div className="p-2 rounded-lg bg-surface-container-low">
                  <p className="font-black text-on-surface">{fac.coursesCount}</p>
                  <p className="text-[10px] text-outline">Courses</p>
                </div>
                <div className="p-2 rounded-lg bg-surface-container-low">
                  <p className="font-black text-emerald-600">₹{(fac.revenue / 1000).toFixed(0)}k</p>
                  <p className="text-[10px] text-outline">Revenue</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFacility(fac)}
                  className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container transition-colors"
                >
                  View Campus Details
                </button>

                {!isCurrentlyActive ? (
                  <button
                    type="button"
                    onClick={() => handleSwitchFacility(fac)}
                    className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    Switch to this Facility
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                    <Icon name="check" size={14} />
                    <span>Viewing</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Facility Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            style={{ width: '100%', maxWidth: '620px' }}
            className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-8 w-full max-w-[620px] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon name="add_business" size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-on-surface">Provision Campus Facility</h3>
                  <p className="text-[11px] text-outline font-mono">Create Multi-Tenant Educational Unit</p>
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

            <form onSubmit={handleAddFacility} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">Facility / Campus Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Pune Innovation Campus"
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Facility Slug</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="pune-campus"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Geographic Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Pune, Maharashtra"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-3">
                <span className="text-[11px] font-mono font-bold uppercase text-primary">Initial Campus Admin</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">Admin Name</label>
                    <input
                      type="text"
                      value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                      placeholder="e.g. Dr. Rajesh K."
                      className="w-full h-9 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">Admin Email</label>
                    <input
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      placeholder="rajesh@pune.edu"
                      className="w-full h-9 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
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
                  Create Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Facility Details Modal */}
      {selectedFacility && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            style={{ width: '100%', maxWidth: '620px' }}
            className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 sm:p-8 w-full max-w-[620px] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon name="domain" size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-on-surface">{selectedFacility.name}</h3>
                  <p className="text-[11px] text-outline font-mono">{selectedFacility.location}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFacility(null)}
                className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-surface-container-low">
                  <p className="text-base font-black text-on-surface">{selectedFacility.studentsCount}</p>
                  <p className="text-[10px] text-outline">Enrolled Students</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-low">
                  <p className="text-base font-black text-on-surface">{selectedFacility.coursesCount}</p>
                  <p className="text-[10px] text-outline">Active Courses</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-low">
                  <p className="text-base font-black text-emerald-600">₹{selectedFacility.revenue.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-outline">Gross Revenue</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-outline">Appointed Facility Directors:</span>
                {selectedFacility.admins.map((a: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-1">
                    <span className="font-bold text-on-surface">{a.name} ({a.email})</span>
                    <span className="text-[10px] text-primary font-bold">{a.role}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  handleSwitchFacility(selectedFacility);
                  setSelectedFacility(null);
                }}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
              >
                Switch Active Scope to this Facility
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminFacilitiesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-outline">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-mono">Loading Facilities...</p>
        </div>
      }
    >
      <FacilitiesPageContent />
    </Suspense>
  );
}

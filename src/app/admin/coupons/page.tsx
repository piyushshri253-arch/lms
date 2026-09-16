'use client';

import React, { useState, Suspense } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useAdmin } from '@/context/AdminContext';
import { useApp } from '@/context/AppContext';

function CouponsPageContent() {
  const { hasPermission, activeFacility } = useAdmin();
  const { showToast } = useApp();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [coupons, setCoupons] = useState<any[]>([
    {
      id: 'cp-1',
      code: 'WELCOME50',
      discountType: 'PERCENTAGE',
      discountValue: 50,
      maxUses: 500,
      usedCount: 284,
      expiresAt: '31 Dec 2026',
      isActive: true,
      revenueGenerated: 142000
    },
    {
      id: 'cp-2',
      code: 'AADHYARA20',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      maxUses: 1000,
      usedCount: 420,
      expiresAt: '15 Oct 2026',
      isActive: true,
      revenueGenerated: 84000
    },
    {
      id: 'cp-3',
      code: 'FLAT1000',
      discountType: 'FIXED',
      discountValue: 1000,
      maxUses: 100,
      usedCount: 100,
      expiresAt: '01 Sept 2026',
      isActive: false,
      revenueGenerated: 49900
    }
  ]);

  const [form, setForm] = useState({
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    maxUses: 200,
    expiresAt: '2026-12-31'
  });

  // RBAC Access Guard: coupon.view
  if (!hasPermission('coupon.view')) {
    return (
      <div className="p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-3xl space-y-3 max-w-lg mx-auto mt-12">
        <div className="w-12 h-12 rounded-full bg-error-container/30 text-error flex items-center justify-center mx-auto">
          <Icon name="lock" size={24} />
        </div>
        <h2 className="text-base font-extrabold text-on-surface">Access Denied</h2>
        <p className="text-xs text-outline">
          Your administrator account does not possess the <strong>coupon.view</strong> permission for{' '}
          {activeFacility?.name || 'this facility'}.
        </p>
      </div>
    );
  }

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('coupon.create')) {
      showToast('Permission coupon.create required', 'error');
      return;
    }
    const newCoupon = {
      id: `cp-${Date.now()}`,
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maxUses: Number(form.maxUses),
      usedCount: 0,
      expiresAt: form.expiresAt,
      isActive: true,
      revenueGenerated: 0
    };
    setCoupons([newCoupon, ...coupons]);
    setIsCreateModalOpen(false);
    setForm({
      code: '',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      maxUses: 200,
      expiresAt: '2026-12-31'
    });
    showToast(`Coupon ${newCoupon.code} launched for ${activeFacility?.name}`, 'success');
  };

  const handleDeleteCoupon = (id: string, code: string) => {
    if (!hasPermission('coupon.delete')) {
      showToast('Permission coupon.delete required', 'error');
      return;
    }
    if (confirm(`Deactivate and delete promotion code ${code}?`)) {
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      showToast(`Coupon ${code} removed`, 'info');
    }
  };

  const filteredCoupons = coupons.filter((c) =>
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
              Coupons &amp; Promotional Discounts
            </h1>
            <span className="text-[11px] font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full">
              {activeFacility?.name}
            </span>
          </div>
          <p className="text-xs text-outline font-medium mt-1">
            Create fee waivers, referral codes, and percentage discounts scoped to this facility.
          </p>
        </div>

        {/* Action Button: Create Coupon (guarded by coupon.create) */}
        {hasPermission('coupon.create') && (
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Icon name="sell" size={16} />
            <span>+ Create Coupon</span>
          </button>
        )}
      </div>

      {/* Coupons Table Box */}
      <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-extrabold text-sm text-on-surface">Active Institutional Discounts</h3>
          <div className="relative w-full sm:w-64">
            <Icon
              name="search"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search coupon code..."
              className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-outline uppercase font-mono text-[10px] border-b border-outline-variant/40">
              <tr>
                <th className="p-3">Coupon Code</th>
                <th className="p-3">Discount Value</th>
                <th className="p-3">Usage Progress</th>
                <th className="p-3">Expiry Date</th>
                <th className="p-3">Revenue Driven</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 font-medium text-on-surface">
              {filteredCoupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="p-3">
                    <span className="font-mono font-black text-xs text-primary px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
                      {coupon.code}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-on-surface">
                    {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                  </td>
                  <td className="p-3">
                    <div className="w-28 space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-outline">
                        <span>{coupon.usedCount} used</span>
                        <span>{coupon.maxUses} max</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, (coupon.usedCount / coupon.maxUses) * 100)}%` }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-outline">{coupon.expiresAt}</td>
                  <td className="p-3 font-mono font-bold text-emerald-600">
                    ₹{coupon.revenueGenerated.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        coupon.isActive
                          ? 'bg-emerald-500/10 text-emerald-700'
                          : 'bg-rose-500/10 text-rose-700'
                      }`}
                    >
                      {coupon.isActive ? 'ACTIVE' : 'EXPIRED'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(coupon.code);
                          showToast(`Code ${coupon.code} copied!`, 'info');
                        }}
                        className="p-1 rounded text-outline hover:text-primary hover:bg-surface-container cursor-pointer"
                        title="Copy Code"
                      >
                        <Icon name="content_copy" size={16} />
                      </button>
                      {hasPermission('coupon.delete') && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                          className="p-1 rounded text-outline hover:text-error hover:bg-error-container/20 cursor-pointer"
                          title="Delete Coupon"
                        >
                          <Icon name="delete" size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Coupon */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            style={{ width: '100%', maxWidth: '560px' }}
            className="bg-surface-container-lowest border border-outline-variant/80 rounded-3xl p-6 sm:p-8 w-full max-w-[560px] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
              <div className="flex items-center gap-2">
                <Icon name="sell" size={20} className="text-primary" />
                <h3 className="font-black text-sm text-on-surface">Generate Discount Code</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-on-surface block mb-1">Coupon Promo Code</label>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. DIWALI50"
                  className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl px-3 py-2 text-xs font-mono uppercase font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-on-surface block mb-1">Discount Type</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
                  >
                    <option value="PERCENTAGE">Percentage (% Off)</option>
                    <option value="FIXED">Fixed Amount (₹ Off)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-on-surface block mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                    className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-on-surface block mb-1">Max Uses Limit</label>
                  <input
                    type="number"
                    min={1}
                    value={form.maxUses}
                    onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })}
                    className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-on-surface block mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl text-[11px] text-outline">
                Scoped strictly to: <strong className="text-on-surface">{activeFacility?.name}</strong>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-outline-variant/40">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant/80 text-xs font-bold text-outline hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 cursor-pointer"
                >
                  Save &amp; Activate Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CouponsAdminPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-outline">Loading Coupons...</div>}>
      <CouponsPageContent />
    </Suspense>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

export default function SuperAdminCouponsPage() {
  const { showToast } = useApp();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState('20');
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [usageLimit, setUsageLimit] = useState('');

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/super-admin/coupons');
      if (res.ok) {
        const d = await res.json();
        setCoupons(d.coupons || []);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/super-admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          discountPercent,
          discountType,
          usageLimit: usageLimit ? Number(usageLimit) : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create coupon');

      showToast({ title: 'Coupon Created', description: data.message, type: 'success' });
      setIsCreateOpen(false);
      setCode('');
      await fetchCoupons();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      const res = await fetch('/api/super-admin/coupons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus })
      });
      if (res.ok) {
        showToast({ title: 'Coupon Status Updated', type: 'info' });
        await fetchCoupons();
      }
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const res = await fetch(`/api/super-admin/coupons?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast({ title: 'Coupon Deleted', type: 'info' });
        await fetchCoupons();
      }
    } catch {}
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/super-admin" className="hover:text-primary">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Coupons</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Promotional Coupons &amp; Discount Vouchers
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Manage global and course-specific promotional redemption codes
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-5 py-2.5 bg-primary text-on-primary font-extrabold text-xs rounded-xl hover:bg-primary-container shadow-xs flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
        >
          <Icon name="add" size={18} />
          <span>New Discount Code</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {coupons.map((c) => (
          <div
            key={c.id}
            className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <span className="font-mono font-black text-xl text-primary tracking-wider">
                  {c.code}
                </span>
                <span
                  className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    c.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {c.status}
                </span>
              </div>

              <div className="p-3 bg-surface-container-low rounded-2xl text-xs space-y-1 font-mono">
                <div className="flex justify-between text-outline">
                  <span>Discount:</span>
                  <span className="font-bold text-on-surface">{c.discountPercent}% OFF</span>
                </div>
                <div className="flex justify-between text-outline">
                  <span>Redemptions:</span>
                  <span className="font-bold text-primary">{c.usedCount} Used</span>
                </div>
                {c.usageLimit && (
                  <div className="flex justify-between text-outline">
                    <span>Usage Limit:</span>
                    <span className="font-bold text-on-surface">{c.usageLimit} Max</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-outline-variant/40 flex items-center justify-between">
              <button
                onClick={() => handleToggleStatus(c.id, c.status)}
                className={`text-xs font-bold ${
                  c.status === 'ACTIVE' ? 'text-amber-700' : 'text-emerald-700'
                } hover:underline cursor-pointer`}
              >
                {c.status === 'ACTIVE' ? 'Disable Code' : 'Activate Code'}
              </button>

              <button
                onClick={() => handleDelete(c.id)}
                className="text-outline hover:text-rose-600 p-1 cursor-pointer"
                title="Delete Coupon"
              >
                <Icon name="delete" size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        maxWidth="md"
        title="Create Promotional Coupon"
        subtitle="Provision a new discount code for cart checkout"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Coupon Code (UPPERCASE)
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ARCHITECTURE30"
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-mono font-bold uppercase focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Discount Value (%)
              </label>
              <input
                type="number"
                required
                min="1"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-mono font-bold focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                Usage Limit (Optional)
              </label>
              <input
                type="number"
                min="1"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="Unlimited"
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-primary"
              />
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
              Create Promo Coupon
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';

export default function WebsiteNavigationManagement() {
  const { showToast } = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [footerText, setFooterText] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newIsExternal, setNewIsExternal] = useState(false);

  useEffect(() => {
    fetchNavData();
  }, []);

  const fetchNavData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/website/navigation');
      if (res.ok) {
        const data = await res.json();
        setItems(data.navigationItems || []);
        if (data.footer) {
          setFooterText(data.footer.footerText || '');
          setContactEmail(data.footer.contactEmail || '');
          setContactPhone(data.footer.contactPhone || '');
        }
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to fetch navigation settings.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/website/navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newLabel,
          url: newUrl,
          isExternal: newIsExternal,
          order: items.length
        })
      });

      if (res.ok) {
        showToast({ title: 'Link Added', description: `Navigation item "${newLabel}" added.`, type: 'success' });
        setIsAddOpen(false);
        setNewLabel('');
        setNewUrl('');
        setNewIsExternal(false);
        fetchNavData();
      }
    } catch {}
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await fetch(`/api/admin/website/navigation?id=${id}`, { method: 'DELETE' });
      showToast({ title: 'Deleted', description: 'Navigation link removed.', type: 'info' });
      fetchNavData();
    } catch {}
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/website/navigation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          footerText
        })
      });

      if (res.ok) {
        showToast({ title: 'Saved', description: 'Navigation and footer updated.', type: 'success' });
        fetchNavData();
      }
    } catch {} finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-primary mb-1">
            <Icon name="menu_book" size={16} />
            <span>HEADER &amp; FOOTER NAVIGATION</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Navigation &amp; Footer Builder
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Customize header navigation links, custom URLs, and storefront footer copyright text.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isSaving}
          className="px-5 py-2.5 bg-primary text-on-primary hover:bg-primary-container font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <Icon name={isSaving ? 'sync' : 'save'} size={16} className={isSaving ? 'animate-spin' : ''} />
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Header Links (Span 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-on-surface flex items-center gap-2">
                <Icon name="menu" size={20} className="text-primary" />
                <span>Header Navigation Menu</span>
              </h2>

              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Icon name="add_circle" size={16} />
                <span>Add Link</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono font-bold text-xs">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-xs text-on-surface">{item.label}</h4>
                      <p className="text-[10px] font-mono text-outline">{item.url}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1 text-outline hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                  >
                    <Icon name="delete" size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Footer Customization (Span 5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/80 shadow-xs space-y-4">
            <h2 className="text-base font-extrabold text-on-surface flex items-center gap-2">
              <Icon name="vertical_align_bottom" size={20} className="text-primary" />
              <span>Footer Configuration</span>
            </h2>

            <div>
              <label className="text-xs font-bold text-on-surface block mb-1">Copyright &amp; Footer Text</label>
              <textarea
                rows={3}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="© 2026 ABC Academy. All rights reserved."
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add Link */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Navigation Link"
      >
        <form onSubmit={handleAddItem} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-on-surface block mb-1">Link Label</label>
            <input
              type="text"
              required
              placeholder="e.g. Masterclasses"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface block mb-1">Destination URL</label>
            <input
              type="text"
              required
              placeholder="/courses or https://external.com"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-mono"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-on-surface cursor-pointer select-none">
            <input
              type="checkbox"
              checked={newIsExternal}
              onChange={(e) => setNewIsExternal(e.target.checked)}
              className="rounded border-outline text-primary h-4 w-4"
            />
            <span>Open in new tab (External Link)</span>
          </label>

          <button
            type="submit"
            className="w-full py-3 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-md cursor-pointer mt-2"
          >
            Add Link
          </button>
        </form>
      </Modal>
    </div>
  );
}

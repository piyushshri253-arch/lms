'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';

export default function WebsitePagesManagement() {
  const { showToast } = useApp();
  const [pages, setPages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddPageOpen, setIsAddPageOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [newSeoTitle, setNewSeoTitle] = useState('');

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/website/pages');
      if (res.ok) {
        const data = await res.json();
        setPages(data.pages || []);
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to fetch pages.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/website/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPageTitle,
          slug: newPageSlug,
          seoTitle: newSeoTitle
        })
      });

      if (res.ok) {
        showToast({ title: 'Page Created', description: `Page "${newPageTitle}" created.`, type: 'success' });
        setIsAddPageOpen(false);
        setNewPageTitle('');
        setNewPageSlug('');
        setNewSeoTitle('');
        fetchPages();
      }
    } catch {}
  };

  const handleToggleStatus = async (page: any) => {
    const nextStatus = page.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      await fetch('/api/admin/website/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: page.id, status: nextStatus })
      });
      showToast({ title: 'Status Updated', description: `Page set to ${nextStatus}.`, type: 'info' });
      fetchPages();
    } catch {}
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-primary mb-1">
            <Icon name="auto_stories" size={16} />
            <span>WEBSITE PAGES</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Storefront Pages
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Manage your company's public website pages, publication statuses, and SEO meta tags.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddPageOpen(true)}
          className="px-4 py-2.5 bg-primary text-on-primary hover:bg-primary-container font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
        >
          <Icon name="add" size={16} />
          <span>Create New Page</span>
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
          <Icon name="sync" size={18} className="animate-spin text-primary" />
          <span>Loading Pages...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pages.map((p) => (
            <div
              key={p.id}
              className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                    /{p.slug}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                      p.status === 'PUBLISHED'
                        ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <h3 className="font-extrabold text-base text-on-surface group-hover:text-primary transition-colors">
                  {p.title}
                </h3>
                <p className="text-xs text-on-surface-variant line-clamp-2 mt-1">
                  {p.seoDescription || `Public ${p.title} page for your academy storefront.`}
                </p>

                <div className="flex items-center gap-2 text-[11px] font-mono text-outline pt-3">
                  <Icon name="view_agenda" size={14} />
                  <span>{p._count?.sections || 0} Configured Sections</span>
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant/60 flex items-center justify-between gap-2">
                <Link
                  href={`/admin/website/builder`}
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Icon name="edit" size={14} />
                  <span>Open Builder</span>
                </Link>

                <button
                  type="button"
                  onClick={() => handleToggleStatus(p)}
                  className="text-xs font-bold text-outline hover:text-on-surface transition-colors cursor-pointer"
                >
                  {p.status === 'PUBLISHED' ? 'Set to Draft' : 'Publish'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Page */}
      <Modal
        isOpen={isAddPageOpen}
        onClose={() => setIsAddPageOpen(false)}
        title="Create New Storefront Page"
      >
        <form onSubmit={handleCreatePage} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-on-surface block mb-1">Page Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Terms & Conditions"
              value={newPageTitle}
              onChange={(e) => {
                setNewPageTitle(e.target.value);
                if (!newPageSlug) {
                  setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface block mb-1">Page Slug (URL Path)</label>
            <input
              type="text"
              required
              placeholder="terms"
              value={newPageSlug}
              onChange={(e) => setNewPageSlug(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface block mb-1">SEO Title</label>
            <input
              type="text"
              placeholder="Academy Terms & Policies"
              value={newSeoTitle}
              onChange={(e) => setNewSeoTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-md cursor-pointer mt-2"
          >
            Create Page
          </button>
        </form>
      </Modal>
    </div>
  );
}

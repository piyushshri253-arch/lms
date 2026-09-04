'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { AiWebsiteBuilderModal } from '@/components/ai/AiWebsiteBuilderModal';

interface Section {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  content: string;
  order: number;
  enabled: boolean;
}

export default function WebsiteBuilderPage() {
  const { showToast } = useApp();

  const [pages, setPages] = useState<any[]>([]);
  const [activePageSlug, setActivePageSlug] = useState('home');
  const [activePage, setActivePage] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [orgSettings, setOrgSettings] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Modals
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [isEditSectionOpen, setIsEditSectionOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isAiBuilderOpen, setIsAiBuilderOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  // Theme & Header live controls
  const [fontFamily, setFontFamily] = useState('Plus Jakarta Sans');
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');
  const [secondaryColor, setSecondaryColor] = useState('#10b981');
  const [buttonStyle, setButtonStyle] = useState('rounded');
  const [headerStyle, setHeaderStyle] = useState('BLURRED');
  const [headerSticky, setHeaderSticky] = useState(true);
  const [headerCtaText, setHeaderCtaText] = useState('Explore Courses');
  const [logoHeight, setLogoHeight] = useState(36);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activePageSlug) {
      fetchSections(activePageSlug);
    }
  }, [activePageSlug]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [pagesRes, settingsRes, coursesRes, instRes] = await Promise.all([
        fetch('/api/admin/website/pages'),
        fetch('/api/admin/settings'),
        fetch('/api/courses'),
        fetch('/api/admin/instructors')
      ]);

      if (pagesRes.ok) {
        const pData = await pagesRes.json();
        setPages(pData.pages || []);
      }
      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        const s = sData.settings || {};
        setOrgSettings(s);
        setFontFamily(s.fontFamily || 'Plus Jakarta Sans');
        setPrimaryColor(s.primaryColor || '#4f46e5');
        setSecondaryColor(s.secondaryColor || '#10b981');
        setButtonStyle(s.buttonStyle || 'rounded');
        setHeaderStyle(s.headerStyle || 'BLURRED');
        setHeaderSticky(s.headerSticky ?? true);
        setHeaderCtaText(s.headerCtaText || 'Explore Courses');
        setLogoHeight(s.logoHeight || 36);
      }
      if (coursesRes.ok) {
        const cData = await coursesRes.json();
        setCourses(cData.courses || []);
      }
      if (instRes.ok) {
        const iData = await instRes.json();
        setInstructors(iData.instructors || []);
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to load website builder resources.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSections = async (slug: string) => {
    try {
      const res = await fetch(`/api/admin/website/sections?page=${slug}`);
      if (res.ok) {
        const data = await res.json();
        setActivePage(data.page);
        setSections(data.sections || []);
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to load sections.', type: 'error' });
    }
  };

  const handleToggleSection = async (id: string, currentStatus: boolean) => {
    const updated = sections.map((s) => (s.id === id ? { ...s, enabled: !currentStatus } : s));
    setSections(updated);
    try {
      await fetch('/api/admin/website/sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: { id, enabled: !currentStatus } })
      });
      showToast({ title: 'Visibility Updated', description: 'Section visibility toggled.', type: 'info' });
    } catch {}
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sections.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...sections];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const updatedWithOrder = reordered.map((s, idx) => ({ ...s, order: idx }));
    setSections(updatedWithOrder);

    try {
      await fetch('/api/admin/website/sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: updatedWithOrder.map((s) => ({ id: s.id, order: s.order }))
        })
      });
    } catch {}
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Are you sure you want to remove this section?')) return;
    setSections(sections.filter((s) => s.id !== id));
    try {
      await fetch(`/api/admin/website/sections?id=${id}`, { method: 'DELETE' });
      showToast({ title: 'Section Deleted', description: 'Section removed from page.', type: 'success' });
    } catch {}
  };

  const handleDuplicateSection = async (sec: Section) => {
    try {
      const res = await fetch('/api/admin/website/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: activePage.id,
          type: sec.type,
          title: `${sec.title} (Copy)`,
          subtitle: sec.subtitle,
          content: sec.content,
          order: sections.length
        })
      });

      if (res.ok) {
        showToast({ title: 'Section Duplicated', description: 'Copy created.', type: 'success' });
        fetchSections(activePageSlug);
      }
    } catch {}
  };

  const handleAddSection = async (type: string) => {
    setIsAddSectionOpen(false);
    let defaultTitle = 'New Section';
    let defaultSubtitle = '';
    let defaultContent: any = {};

    if (type === 'HERO') {
      defaultTitle = 'Master Modern Technology & Software Engineering';
      defaultSubtitle = 'Accelerate your career with accredited cohorts';
      defaultContent = {
        heading: 'Master Modern Technology & Software Engineering',
        subheading: 'Accelerate your career with accredited cohorts and 1-on-1 mentorship.',
        backgroundType: 'IMAGE',
        backgroundImage: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1600&q=80',
        overlayOpacity: 0.75,
        primaryBtnText: 'Explore Curricula',
        primaryBtnUrl: '/courses',
        secondaryBtnText: 'Join Academy',
        secondaryBtnUrl: '/register'
      };
    } else if (type === 'FEATURED_COURSES') {
      defaultTitle = 'Featured Masterclasses';
      defaultSubtitle = 'Selected industry-focused programs';
      defaultContent = { filterMode: 'FEATURED', limit: 6, selectedCourseIds: [] };
    } else if (type === 'ABOUT') {
      defaultTitle = `About ${orgSettings?.name || 'Our Academy'}`;
      defaultSubtitle = 'Our mission to redefine modern pedagogy';
      defaultContent = {
        story: 'We empower ambitious software engineers and teams with cutting-edge system architecture.'
      };
    } else if (type === 'FAQ') {
      defaultTitle = 'Frequently Asked Questions';
      defaultSubtitle = 'Common inquiries on enrollment, certificates and payments';
      defaultContent = {
        faqs: [
          { q: 'How do cohorts work?', a: 'Cohorts include self-paced masterclasses and scheduled mentor feedback.' },
          { q: 'Is there a refund policy?', a: 'Yes, full satisfaction guaranteed within the first 14 days.' }
        ]
      };
    } else if (type === 'CTA') {
      defaultTitle = 'Begin Your Learning Journey Today';
      defaultSubtitle = 'Join our global community of engineers';
      defaultContent = {
        heading: 'Begin Your Learning Journey Today',
        description: 'Get immediate lifetime access to full curriculum and source codes.',
        buttonText: 'Enroll Now',
        buttonUrl: '/courses'
      };
    }

    try {
      const res = await fetch('/api/admin/website/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: activePage.id,
          type,
          title: defaultTitle,
          subtitle: defaultSubtitle,
          content: defaultContent,
          order: sections.length
        })
      });

      if (res.ok) {
        showToast({ title: 'Section Added', description: `Added ${type} section.`, type: 'success' });
        fetchSections(activePageSlug);
      }
    } catch {}
  };

  const openEditModal = (sec: Section) => {
    setSelectedSection(sec);
    let parsed: any = {};
    try {
      parsed = JSON.parse(sec.content || '{}');
    } catch {
      parsed = {};
    }
    setEditFormData({
      title: sec.title || '',
      subtitle: sec.subtitle || '',
      ...parsed
    });
    setIsEditSectionOpen(true);
  };

  const handleSaveSectionEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection) return;

    const { title, subtitle, ...restContent } = editFormData;

    try {
      const res = await fetch('/api/admin/website/sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: {
            id: selectedSection.id,
            title,
            subtitle,
            content: restContent
          }
        })
      });

      if (res.ok) {
        showToast({ title: 'Section Updated', description: 'Changes saved.', type: 'success' });
        setIsEditSectionOpen(false);
        fetchSections(activePageSlug);
      }
    } catch {}
  };

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fontFamily,
          primaryColor,
          secondaryColor,
          buttonStyle,
          headerStyle,
          headerSticky,
          headerCtaText,
          logoHeight
        })
      });

      if (res.ok) {
        showToast({ title: 'Branding Saved', description: 'Fonts, header, and colors updated.', type: 'success' });
        setIsThemeModalOpen(false);
        fetchInitialData();
      }
    } catch {}
  };

  const handleApplyAiGeneratedSite = async (siteData: any) => {
    if (!activePage) return;
    try {
      if (siteData.theme) {
        if (siteData.theme.fontFamily) setFontFamily(siteData.theme.fontFamily);
        if (siteData.theme.primaryColor) setPrimaryColor(siteData.theme.primaryColor);
        if (siteData.theme.secondaryColor) setSecondaryColor(siteData.theme.secondaryColor);
      }
      for (const sec of siteData.sections || []) {
        await fetch('/api/admin/website/sections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageId: activePage.id,
            type: sec.type,
            title: sec.title,
            subtitle: sec.subtitle,
            content: sec.content,
            order: sec.order
          })
        });
      }
      fetchSections(activePageSlug);
    } catch {}
  };

  const handlePublishPage = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (!activePage) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/website/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activePage.id, status })
      });

      if (res.ok) {
        setActivePage({ ...activePage, status });
        showToast({
          title: status === 'PUBLISHED' ? 'Website Published! 🚀' : 'Status set to Draft',
          description: status === 'PUBLISHED' ? 'Your live storefront is updated.' : 'Page is now in draft mode.',
          type: 'success'
        });
      }
    } catch {} finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" style={{ fontFamily: `'${fontFamily}', sans-serif` }}>
      {/* Top Navbar & Page Controls */}
      <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-3xl border border-outline-variant/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Page Selector */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Icon name="web" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-on-surface">Page:</span>
              <select
                value={activePageSlug}
                onChange={(e) => setActivePageSlug(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-bold text-on-surface focus:outline-none focus:border-primary"
              >
                {pages.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.title} ({p.status})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              White-Label URL: <code className="font-mono text-primary font-bold">/org/{orgSettings?.slug || 'slug'}</code>
            </p>
          </div>
        </div>

        {/* Center: Device Switcher */}
        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/50 self-center">
          <button
            type="button"
            onClick={() => setPreviewDevice('desktop')}
            className={`p-2 rounded-xl transition-all ${
              previewDevice === 'desktop' ? 'bg-surface text-primary shadow-xs' : 'text-outline hover:text-on-surface'
            }`}
            title="Desktop View"
          >
            <Icon name="desktop_windows" size={18} />
          </button>
          <button
            type="button"
            onClick={() => setPreviewDevice('tablet')}
            className={`p-2 rounded-xl transition-all ${
              previewDevice === 'tablet' ? 'bg-surface text-primary shadow-xs' : 'text-outline hover:text-on-surface'
            }`}
            title="Tablet View (768px)"
          >
            <Icon name="tablet_mac" size={18} />
          </button>
          <button
            type="button"
            onClick={() => setPreviewDevice('mobile')}
            className={`p-2 rounded-xl transition-all ${
              previewDevice === 'mobile' ? 'bg-surface text-primary shadow-xs' : 'text-outline hover:text-on-surface'
            }`}
            title="Mobile View (375px)"
          >
            <Icon name="smartphone" size={18} />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAiBuilderOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105"
          >
            <Icon name="sparkles" size={16} />
            <span>AI Website Builder</span>
          </button>

          <button
            type="button"
            onClick={() => setIsThemeModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Icon name="palette" size={16} />
            <span>Theme &amp; Fonts</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddSectionOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Icon name="add" size={16} />
            <span>Add Section</span>
          </button>

          <Link
            href={`/org/${orgSettings?.slug}`}
            target="_blank"
            className="px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Icon name="visibility" size={16} />
            <span>Preview Live</span>
          </Link>

          {activePage?.status === 'DRAFT' ? (
            <button
              type="button"
              onClick={() => handlePublishPage('PUBLISHED')}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Icon name="rocket_launch" size={16} />
              <span>Publish Live</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handlePublishPage('DRAFT')}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Icon name="edit_note" size={16} />
              <span>Set to Draft</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Builder Grid: Left Section Tree + Right Device Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Sections Outline & Tree (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-outline">
              Page Sections ({sections.length})
            </span>
            <button
              type="button"
              onClick={() => setIsAddSectionOpen(true)}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Icon name="add_circle" size={14} />
              <span>Add Section</span>
            </button>
          </div>

          <div className="space-y-2">
            {sections.map((sec, idx) => (
              <div
                key={sec.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  sec.enabled
                    ? 'bg-surface-container-lowest border-outline-variant shadow-xs'
                    : 'bg-surface-container-low/50 border-outline-variant/40 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase font-bold text-primary block leading-tight">
                      {sec.type.replace('_', ' ')}
                    </span>
                    <p className="text-xs font-extrabold text-on-surface truncate">
                      {sec.title || sec.type}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 text-outline hover:text-on-surface disabled:opacity-30 cursor-pointer"
                    title="Move Up"
                  >
                    <Icon name="arrow_upward" size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 'down')}
                    disabled={idx === sections.length - 1}
                    className="p-1 text-outline hover:text-on-surface disabled:opacity-30 cursor-pointer"
                    title="Move Down"
                  >
                    <Icon name="arrow_downward" size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSection(sec.id, sec.enabled)}
                    className={`p-1 cursor-pointer ${sec.enabled ? 'text-primary' : 'text-outline'}`}
                    title={sec.enabled ? 'Disable Section' : 'Enable Section'}
                  >
                    <Icon name={sec.enabled ? 'visibility' : 'visibility_off'} size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(sec)}
                    className="p-1 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                    title="Edit Content"
                  >
                    <Icon name="edit" size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateSection(sec)}
                    className="p-1 text-outline hover:text-on-surface rounded-lg transition-colors cursor-pointer"
                    title="Duplicate Section"
                  >
                    <Icon name="content_copy" size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSection(sec.id)}
                    className="p-1 text-outline hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    title="Delete Section"
                  >
                    <Icon name="delete" size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Visual Device Viewport Simulator (8 Cols) */}
        <div className="lg:col-span-8 flex justify-center">
          <div
            className={`transition-all duration-300 rounded-[32px] border-4 border-slate-800 shadow-2xl overflow-hidden bg-[#060814] text-white flex flex-col ${
              previewDevice === 'desktop'
                ? 'w-full min-h-[680px]'
                : previewDevice === 'tablet'
                ? 'w-[640px] min-h-[640px]'
                : 'w-[360px] min-h-[600px]'
            }`}
          >
            {/* Mockup Browser Top Bar */}
            <div className="bg-slate-900 px-4 py-2.5 border-b border-white/10 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="font-mono text-[10px] bg-slate-950 px-3 py-1 rounded-full border border-white/10 text-slate-300">
                https://{orgSettings?.slug || 'academy'}.aadhyara.com/{activePageSlug === 'home' ? '' : activePageSlug}
              </div>
              <div className="text-[10px] font-mono text-emerald-400 font-bold">
                {activePage?.status || 'PUBLISHED'}
              </div>
            </div>

            {/* Mockup Storefront Header */}
            <div className="px-6 py-3.5 border-b border-white/10 bg-[#0a0e22] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {orgSettings?.logo ? (
                  <img src={orgSettings.logo} alt="Logo" style={{ height: `${logoHeight}px` }} className="w-auto object-contain rounded" />
                ) : (
                  <div
                    style={{ backgroundColor: primaryColor }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white"
                  >
                    {orgSettings?.name?.charAt(0) || 'A'}
                  </div>
                )}
                <span className="font-black text-xs text-white tracking-tight">
                  {orgSettings?.name || 'Academy Name'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-medium text-slate-300">
                <span>Courses</span>
                <span>About</span>
                <span
                  style={{ backgroundColor: primaryColor }}
                  className="px-2.5 py-1 rounded-lg text-white font-bold text-[10px]"
                >
                  Sign In
                </span>
              </div>
            </div>

            {/* Sections Render Simulation */}
            <div className="p-6 space-y-10 overflow-y-auto max-h-[620px]">
              {sections
                .filter((s) => s.enabled)
                .map((sec) => {
                  let content: any = {};
                  try {
                    content = JSON.parse(sec.content || '{}');
                  } catch {}

                  if (sec.type === 'HERO') {
                    const bgImage = content.backgroundImage || orgSettings?.heroBackgroundImage;
                    const opacity = content.overlayOpacity ?? orgSettings?.heroOverlayOpacity ?? 0.7;

                    return (
                      <div
                        key={sec.id}
                        className="text-center space-y-4 py-10 px-4 relative rounded-2xl overflow-hidden border border-white/10"
                        style={{
                          backgroundImage: bgImage ? `url(${bgImage})` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        {bgImage && (
                          <div className="absolute inset-0 bg-[#060814]" style={{ opacity }} />
                        )}
                        <div className="relative z-10 space-y-3">
                          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/[0.08] border border-white/10 text-[10px] font-mono text-indigo-300">
                            <span>{content.badgeText || orgSettings?.name?.toUpperCase() || 'ACADEMY'}</span>
                          </div>
                          <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                            {content.heading || sec.title}
                          </h2>
                          <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
                            {content.subheading || sec.subtitle}
                          </p>
                          <div className="flex items-center justify-center gap-3 pt-2">
                            <button
                              type="button"
                              style={{ backgroundColor: primaryColor }}
                              className="px-4 py-2 rounded-xl text-xs font-extrabold text-white shadow-lg"
                            >
                              {content.primaryBtnText || 'Explore Courses'}
                            </button>
                            <button
                              type="button"
                              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-white/5 border border-white/10"
                            >
                              {content.secondaryBtnText || 'Register'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (sec.type === 'FEATURED_COURSES' || sec.type === 'LATEST_COURSES') {
                    return (
                      <div key={sec.id} className="space-y-4">
                        <div className="border-b border-white/10 pb-2 flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-black text-white">{sec.title}</h3>
                            <p className="text-[10px] text-slate-400">{sec.subtitle}</p>
                          </div>
                          <span className="text-[10px] font-mono text-indigo-400 font-bold">View All ({courses.length}) →</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {courses.slice(0, 2).map((c) => (
                            <div key={c.id} className="p-3.5 rounded-2xl bg-[#0e1329] border border-white/10 space-y-2">
                              <h4 className="font-extrabold text-xs text-white truncate">{c.title}</h4>
                              <p className="text-[10px] text-slate-400 line-clamp-2">{c.shortDescription || c.description}</p>
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-xs font-mono font-black text-white">₹{c.price}</span>
                                <span style={{ color: secondaryColor }} className="text-[10px] font-bold">Enroll →</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={sec.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                      <h4 className="text-xs font-bold text-white">{sec.title}</h4>
                      <p className="text-[10px] text-slate-400">{sec.subtitle}</p>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Edit Section */}
      <Modal
        isOpen={isEditSectionOpen}
        onClose={() => setIsEditSectionOpen(false)}
        title={`Edit Section: ${selectedSection?.type}`}
      >
        <form onSubmit={handleSaveSectionEdit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-on-surface block mb-1">Section Title</label>
            <input
              type="text"
              value={editFormData.title || ''}
              onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface block mb-1">Section Subtitle</label>
            <input
              type="text"
              value={editFormData.subtitle || ''}
              onChange={(e) => setEditFormData({ ...editFormData, subtitle: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium"
            />
          </div>

          {/* Hero Section Specific Controls */}
          {selectedSection?.type === 'HERO' && (
            <>
              <div>
                <label className="text-xs font-bold text-on-surface block mb-1">Main Heading</label>
                <input
                  type="text"
                  value={editFormData.heading || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, heading: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1">Hero Description</label>
                <textarea
                  rows={2}
                  value={editFormData.subheading || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, subheading: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">Background Type</label>
                  <select
                    value={editFormData.backgroundType || 'IMAGE'}
                    onChange={(e) => setEditFormData({ ...editFormData, backgroundType: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium"
                  >
                    <option value="IMAGE">Background Image</option>
                    <option value="GRADIENT">Dark Gradient</option>
                    <option value="VIDEO">Background Video</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">Overlay Opacity ({editFormData.overlayOpacity ?? 0.7})</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={editFormData.overlayOpacity ?? 0.7}
                    onChange={(e) => setEditFormData({ ...editFormData, overlayOpacity: parseFloat(e.target.value) })}
                    className="w-full mt-2"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1">Background Image URL</label>
                <input
                  type="url"
                  value={editFormData.backgroundImage || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, backgroundImage: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">Primary Button Text</label>
                  <input
                    type="text"
                    value={editFormData.primaryBtnText || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, primaryBtnText: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">Primary Button URL</label>
                  <input
                    type="text"
                    value={editFormData.primaryBtnUrl || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, primaryBtnUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-md cursor-pointer mt-2"
          >
            Save Section Changes
          </button>
        </form>
      </Modal>

      {/* Modal: Theme, Fonts & Header */}
      <Modal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        title="White-Label Branding, Fonts & Header"
      >
        <form onSubmit={handleSaveTheme} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-on-surface block mb-1">Supported Font Family</label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-bold"
            >
              <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Geometric)</option>
              <option value="Inter">Inter (Clean Tech Standard)</option>
              <option value="Poppins">Poppins (Friendly &amp; Rounded)</option>
              <option value="Montserrat">Montserrat (Editorial Premium)</option>
              <option value="Roboto">Roboto (Google Standard)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-on-surface block mb-1">Header Style</label>
              <select
                value={headerStyle}
                onChange={(e) => setHeaderStyle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium"
              >
                <option value="BLURRED">Glassmorphism (Blurred)</option>
                <option value="SOLID">Solid Dark</option>
                <option value="TRANSPARENT">Transparent</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface block mb-1">Logo Height ({logoHeight}px)</label>
              <input
                type="number"
                min="24"
                max="60"
                value={logoHeight}
                onChange={(e) => setLogoHeight(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-on-surface block mb-1">Header CTA Text</label>
              <input
                type="text"
                value={headerCtaText}
                onChange={(e) => setHeaderCtaText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface block mb-1">Button Radius</label>
              <select
                value={buttonStyle}
                onChange={(e) => setButtonStyle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium"
              >
                <option value="rounded">Rounded</option>
                <option value="pill">Pill</option>
                <option value="square">Square</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-on-surface cursor-pointer select-none">
            <input
              type="checkbox"
              checked={headerSticky}
              onChange={(e) => setHeaderSticky(e.target.checked)}
              className="rounded border-outline text-primary h-4 w-4"
            />
            <span>Sticky Header (Remains fixed on scroll)</span>
          </label>

          <button
            type="submit"
            className="w-full py-3 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-md cursor-pointer mt-2"
          >
            Apply Branding &amp; Fonts
          </button>
        </form>
      </Modal>

      {/* Modal: Add Section */}
      <Modal
        isOpen={isAddSectionOpen}
        onClose={() => setIsAddSectionOpen(false)}
        title="Add Website Section"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">
          {[
            { type: 'HERO', label: 'Hero Banner', icon: 'view_headline', desc: 'Main headline, background image/video, CTA buttons' },
            { type: 'FEATURED_COURSES', label: 'Featured Courses', icon: 'school', desc: 'Highlight top curricula from your database' },
            { type: 'LATEST_COURSES', label: 'Latest Courses', icon: 'new_releases', desc: 'Recent courses uploaded by your faculty' },
            { type: 'ABOUT', label: 'About Us Section', icon: 'info', desc: 'Academy mission, values and company background' },
            { type: 'WHY_CHOOSE_US', label: 'Why Choose Us', icon: 'verified', desc: 'Feature benefit cards and value propositions' },
            { type: 'INSTRUCTORS', label: 'Instructors Section', icon: 'groups', desc: 'Display faculty roster from organization' },
            { type: 'TESTIMONIALS', label: 'Student Testimonials', icon: 'reviews', desc: 'Verified reviews and ratings from learners' },
            { type: 'STATISTICS', label: 'Key Statistics', icon: 'query_stats', desc: 'Numeric counter metrics and achievements' },
            { type: 'FAQ', label: 'FAQ Accordion', icon: 'help_outline', desc: 'Frequently asked questions and answers' },
            { type: 'CTA', label: 'Call to Action Banner', icon: 'campaign', desc: 'Prominent enrollment banner' },
            { type: 'NEWSLETTER', label: 'Newsletter Signup', icon: 'mail', desc: 'Capture prospective learner emails' }
          ].map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => handleAddSection(item.type)}
              className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant hover:border-primary text-left transition-all flex items-start gap-3 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Icon name={item.icon} size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-on-surface">{item.label}</h4>
                <p className="text-[11px] text-on-surface-variant leading-snug mt-0.5">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </Modal>
      {/* Modal: AI Website Builder */}
      <AiWebsiteBuilderModal
        isOpen={isAiBuilderOpen}
        onClose={() => setIsAiBuilderOpen(false)}
        onApplyGeneratedSite={handleApplyAiGeneratedSite}
      />
    </div>
  );
}

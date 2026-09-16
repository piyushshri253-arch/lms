'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useAdmin } from '@/context/AdminContext';
import { Icon } from '@/components/ui/Icon';
import { CompanyEmailSettingsTab } from '@/components/admin/CompanyEmailSettingsTab';

type SettingsTab = 'profile' | 'branding' | 'payments' | 'email' | 'registration' | 'seo';

function AdminSettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as SettingsTab) || 'profile';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const { showToast } = useApp();
  const { hasPermission, activeFacility } = useAdmin();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('India');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [footerText, setFooterText] = useState('');

  // Social Links
  const [socialFacebook, setSocialFacebook] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialLinkedin, setSocialLinkedin] = useState('');
  const [socialYoutube, setSocialYoutube] = useState('');
  const [socialTwitter, setSocialTwitter] = useState('');

  // Branding
  const [logo, setLogo] = useState('');
  const [favicon, setFavicon] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');
  const [secondaryColor, setSecondaryColor] = useState('#10b981');
  const [buttonStyle, setButtonStyle] = useState('rounded');
  const [typography, setTypography] = useState('sans');
  const [theme, setTheme] = useState('luxury');

  // SEO
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [ogImage, setOgImage] = useState('');

  // Gateways
  const [hasRazorpayConfigured, setHasRazorpayConfigured] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState('');

  // Policies
  const [allowStudentRegistration, setAllowStudentRegistration] = useState(true);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as SettingsTab;
    if (tabParam) setActiveTab(tabParam);
  }, [searchParams]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        const s = data.settings;
        setName(s.name || '');
        setSlug(s.slug || '');
        setDescription(s.description || '');
        setContactEmail(s.contactEmail || '');
        setContactPhone(s.contactPhone || '');
        setWebsite(s.website || '');
        setAddress(s.address || '');
        setCountry(s.country || 'India');
        setTimezone(s.timezone || 'Asia/Kolkata');
        setFooterText(s.footerText || '');
        setLogo(s.logo || '');
        setFavicon(s.favicon || '');
        setPrimaryColor(s.primaryColor || '#4f46e5');
        setSecondaryColor(s.secondaryColor || '#10b981');
        setButtonStyle(s.buttonStyle || 'rounded');
        setTypography(s.typography || 'sans');
        setTheme(s.theme || 'luxury');
        setSeoTitle(s.seoTitle || '');
        setSeoDescription(s.seoDescription || '');
        setOgImage(s.ogImage || '');
        setAllowStudentRegistration(s.allowStudentRegistration ?? true);
        setHasRazorpayConfigured(s.hasRazorpayConfigured || false);
        setRazorpayKeyId(s.razorpayKeyId || '');

        if (s.socialLinks) {
          setSocialFacebook(s.socialLinks.facebook || '');
          setSocialInstagram(s.socialLinks.instagram || '');
          setSocialLinkedin(s.socialLinks.linkedin || '');
          setSocialYoutube(s.socialLinks.youtube || '');
          setSocialTwitter(s.socialLinks.twitter || '');
        }
      }
    } catch {
      showToast({ title: 'Error', description: 'Failed to load organization settings.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          contactEmail,
          contactPhone,
          website,
          address,
          country,
          timezone,
          footerText,
          logo,
          favicon,
          primaryColor,
          secondaryColor,
          buttonStyle,
          typography,
          theme,
          seoTitle,
          seoDescription,
          ogImage,
          allowStudentRegistration,
          razorpayKeyId,
          razorpayKeySecret,
          razorpayWebhookSecret,
          socialLinks: {
            facebook: socialFacebook,
            instagram: socialInstagram,
            linkedin: socialLinkedin,
            youtube: socialYoutube,
            twitter: socialTwitter
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');

      showToast({
        title: 'Settings Saved',
        description: 'Your organization settings and public LMS storefront have been updated.',
        type: 'success'
      });
      fetchSettings();
    } catch (err: any) {
      showToast({
        title: 'Save Failed',
        description: err.message,
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
        <Icon name="sync" size={18} className="animate-spin text-primary" />
        <span>Loading Organization Settings...</span>
      </div>
    );
  }

  if (!hasPermission('setting.view')) {
    return (
      <div className="p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-3xl space-y-3 max-w-lg mx-auto mt-12">
        <div className="w-12 h-12 rounded-full bg-error-container/30 text-error flex items-center justify-center mx-auto">
          <Icon name="lock" size={24} />
        </div>
        <h2 className="text-base font-extrabold text-on-surface">Access Denied</h2>
        <p className="text-xs text-outline">
          Your administrator account does not possess the <strong>setting.view</strong> permission for{' '}
          {activeFacility?.name || 'this facility'}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/60 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-primary mb-1">
            <Icon name="domain" size={16} />
            <span>ORGANIZATION WORKSPACE SETTINGS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Company Profile &amp; Branding
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Configure your public LMS storefront branding, payment gateways, and registration policies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/org/${slug}`}
            target="_blank"
            className="px-4 py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Icon name="visibility" size={16} />
            <span>View Public LMS Website</span>
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-primary text-on-primary hover:bg-primary-container font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Icon name={isSaving ? 'sync' : 'save'} size={16} className={isSaving ? 'animate-spin' : ''} />
            <span>{isSaving ? 'Saving Changes...' : 'Save All Changes'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-outline-variant/60 pb-2 overflow-x-auto">
        {[
          { id: 'profile', label: 'Company Profile', icon: 'business' },
          { id: 'branding', label: 'Branding & Theme', icon: 'palette' },
          { id: 'payments', label: 'Payment Gateways', icon: 'credit_card' },
          { id: 'email', label: 'Email & SMTP', icon: 'mail' },
          { id: 'registration', label: 'Student Registration', icon: 'how_to_reg' },
          { id: 'seo', label: 'SEO & Sharing', icon: 'search' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as SettingsTab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <Icon name={tab.icon} size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Company Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
          <div className="p-6 sm:p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant/80 shadow-xs space-y-6">
            <h2 className="text-base font-extrabold text-on-surface flex items-center gap-2">
              <Icon name="business" size={20} className="text-primary" />
              <span>General Company Identification</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Company / Academy Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. ABC Academy"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Storefront Slug / Subdomain</label>
                <input
                  type="text"
                  disabled
                  value={slug}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant text-xs text-outline font-mono cursor-not-allowed"
                />
                <span className="text-[10px] text-outline mt-1 block">Live URL: aadhyara.com/org/{slug}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface block mb-1.5">Company Description / Mission</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your academy, disciplines, and learning mission..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Phone Number</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Official Website</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://mycompany.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Physical Address / HQ</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Tech Park, Bangalore"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="India"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="Asia/Kolkata"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Social Profiles */}
          <div className="p-6 sm:p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant/80 shadow-xs space-y-6">
            <h2 className="text-base font-extrabold text-on-surface flex items-center gap-2">
              <Icon name="share" size={20} className="text-primary" />
              <span>Social &amp; Community Channels</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">LinkedIn Profile / Page</label>
                <input
                  type="url"
                  value={socialLinkedin}
                  onChange={(e) => setSocialLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/company/abc"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">X / Twitter</label>
                <input
                  type="url"
                  value={socialTwitter}
                  onChange={(e) => setSocialTwitter(e.target.value)}
                  placeholder="https://x.com/abcacademy"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">YouTube Channel</label>
                <input
                  type="url"
                  value={socialYoutube}
                  onChange={(e) => setSocialYoutube(e.target.value)}
                  placeholder="https://youtube.com/@abcacademy"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Instagram</label>
                <input
                  type="url"
                  value={socialInstagram}
                  onChange={(e) => setSocialInstagram(e.target.value)}
                  placeholder="https://instagram.com/abcacademy"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Tab 2: Branding & Theme */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
          <div className="p-6 sm:p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant/80 shadow-xs space-y-6">
            <h2 className="text-base font-extrabold text-on-surface flex items-center gap-2">
              <Icon name="palette" size={20} className="text-primary" />
              <span>Brand Assets &amp; Color Scheme</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Logo URL (PNG / SVG)</label>
                <input
                  type="url"
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  placeholder="https://cdn.example.com/logo.png"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Favicon URL (ICO / PNG)</label>
                <input
                  type="url"
                  value={favicon}
                  onChange={(e) => setFavicon(e.target.value)}
                  placeholder="https://cdn.example.com/favicon.ico"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Primary Brand Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-mono text-on-surface uppercase font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Secondary Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-mono text-on-surface uppercase font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Typography & Button Styles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4 border-t border-outline-variant/60">
              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Button Radius Style</label>
                <select
                  value={buttonStyle}
                  onChange={(e) => setButtonStyle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                >
                  <option value="rounded">Rounded (12px standard)</option>
                  <option value="pill">Pill (Fully circular edges)</option>
                  <option value="square">Square (Modern flat 4px)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Typography Family</label>
                <select
                  value={typography}
                  onChange={(e) => setTypography(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                >
                  <option value="sans">Modern Geometric Sans (Default)</option>
                  <option value="modern">Futuristic Clean</option>
                  <option value="serif">Academic Classic Serif</option>
                  <option value="mono">Deep-Tech Monospace</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Storefront Theme Mode</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                >
                  <option value="luxury">Luxury Dark Glass (Recommended)</option>
                  <option value="midnight">Midnight Deep Blue</option>
                  <option value="light">Editorial Clean Light</option>
                </select>
              </div>
            </div>

            {/* Live Visual Mini Preview */}
            <div className="pt-4 border-t border-outline-variant/60 space-y-3">
              <span className="text-[11px] font-mono font-bold uppercase text-outline">Live Theme Preview</span>
              <div className="p-6 rounded-2xl bg-[#060814] border border-white/10 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div style={{ backgroundColor: primaryColor }} className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md">
                    {name.charAt(0) || 'A'}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">{name || 'Your Company Name'}</h4>
                    <p className="text-xs text-slate-400">Accredited Academy Portal</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    style={{
                      backgroundColor: primaryColor,
                      borderRadius: buttonStyle === 'pill' ? '9999px' : buttonStyle === 'square' ? '4px' : '12px'
                    }}
                    className="px-4 py-2 text-xs font-bold text-white shadow-lg"
                  >
                    Primary Action
                  </button>
                  <button
                    type="button"
                    style={{
                      borderColor: secondaryColor,
                      color: secondaryColor,
                      borderRadius: buttonStyle === 'pill' ? '9999px' : buttonStyle === 'square' ? '4px' : '12px'
                    }}
                    className="px-4 py-2 text-xs font-bold border"
                  >
                    Accent Action
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Tab 3: Payment Gateways */}
      {activeTab === 'payments' && (
        <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
          <div className="p-6 sm:p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-on-surface flex items-center gap-2">
                <Icon name="payments" size={20} className="text-emerald-600" />
                <span>Isolated Razorpay Merchant Configuration</span>
              </h2>

              <div className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${
                hasRazorpayConfigured
                  ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
              }`}>
                <span className={`w-2 h-2 rounded-full ${hasRazorpayConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>{hasRazorpayConfigured ? 'LIVE GATEWAY ACTIVE' : 'PENDING CONFIGURATION'}</span>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Every course purchase made on your storefront will deposit funds directly into your own Razorpay merchant account. AADHYARA securely encrypts your API secrets.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Razorpay Key ID</label>
                <input
                  type="text"
                  value={razorpayKeyId}
                  onChange={(e) => setRazorpayKeyId(e.target.value)}
                  placeholder="rzp_live_..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-mono text-on-surface font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Razorpay Key Secret</label>
                <input
                  type="password"
                  value={razorpayKeySecret}
                  onChange={(e) => setRazorpayKeySecret(e.target.value)}
                  placeholder={hasRazorpayConfigured ? '••••••••••••••••••••••••' : 'Enter secret key'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-mono text-on-surface font-medium focus:outline-none focus:border-primary"
                />
                <span className="text-[10px] text-outline mt-1 block">Leave empty to keep existing encrypted secret.</span>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Razorpay Webhook Secret (Optional)</label>
                <input
                  type="password"
                  value={razorpayWebhookSecret}
                  onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                  placeholder={hasRazorpayConfigured ? '••••••••••••••••' : 'Enter webhook secret'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-mono text-on-surface font-medium focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Tab: Email & SMTP Configuration */}
      {activeTab === 'email' && <CompanyEmailSettingsTab />}

      {/* Tab 4: Student Registration Policy */}
      {activeTab === 'registration' && (
        <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
          <div className="p-6 sm:p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant/80 shadow-xs space-y-6">
            <h2 className="text-base font-extrabold text-on-surface flex items-center gap-2">
              <Icon name="how_to_reg" size={20} className="text-primary" />
              <span>Student Registration &amp; Access Policy</span>
            </h2>

            <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-on-surface">Allow Public Student Registration</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  When enabled, prospective learners can self-register at <code className="font-mono text-primary">/org/{slug}/register</code>. When disabled, learners can only join via direct administrator invitation.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={allowStudentRegistration}
                  onChange={(e) => setAllowStudentRegistration(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>
          </div>
        </form>
      )}

      {/* Tab 5: SEO & Social Sharing */}
      {activeTab === 'seo' && (
        <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
          <div className="p-6 sm:p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant/80 shadow-xs space-y-6">
            <h2 className="text-base font-extrabold text-on-surface flex items-center gap-2">
              <Icon name="search" size={20} className="text-primary" />
              <span>Search Engine Optimization &amp; Social Previews</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Meta SEO Title</label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="ABC Academy — Deep-Tech Masterclasses & Engineering"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">Meta SEO Description</label>
                <textarea
                  rows={3}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Join industry-leading cohort masterclasses..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1.5">OpenGraph Social Share Image URL</label>
                <input
                  type="url"
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  placeholder="https://cdn.example.com/social-banner.jpg"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
          <Icon name="sync" size={18} className="animate-spin text-primary" />
          <span>Loading Settings...</span>
        </div>
      }
    >
      <AdminSettingsContent />
    </Suspense>
  );
}

'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

// Business Types
interface BusinessTypeOption {
  id: string;
  icon: string;
  title: string;
  description: string;
  example: string;
  personalizedHeading: string;
  defaultCategory: string;
}

const BUSINESS_TYPES: BusinessTypeOption[] = [
  {
    id: 'ONLINE_ACADEMY',
    icon: '🎓',
    title: 'Online Academy',
    description: 'Sell courses and build a complete learning business online.',
    example: 'Courses, memberships, certifications.',
    personalizedHeading: 'Tell us about your academy',
    defaultCategory: 'Online Education & Academies'
  },
  {
    id: 'COACHING',
    icon: '👨‍🏫',
    title: 'Coaching Business',
    description: 'Sell coaching programs, sessions and digital resources.',
    example: 'Life coaching, business coaching, career coaching.',
    personalizedHeading: 'Tell us about your coaching practice',
    defaultCategory: 'Executive & Life Coaching'
  },
  {
    id: 'CREATOR',
    icon: '✨',
    title: 'Creator Business',
    description: 'Turn your knowledge, audience and content into products.',
    example: 'Creators, YouTubers, influencers, educators.',
    personalizedHeading: 'Tell us about your creator brand',
    defaultCategory: 'Creator Economy & Media'
  },
  {
    id: 'TRAINING_INSTITUTE',
    icon: '🏫',
    title: 'Training Institute',
    description: 'Manage and sell training programs for students and professionals.',
    example: 'Bootcamps, vocational institutes, corporate trainers.',
    personalizedHeading: 'Tell us about your training institute',
    defaultCategory: 'Professional Training Institute'
  },
  {
    id: 'CORPORATE_TRAINING',
    icon: '🏢',
    title: 'Corporate Training',
    description: 'Create and manage training programs for teams and organizations.',
    example: 'Employee onboarding, compliance, workforce upskilling.',
    personalizedHeading: 'Tell us about your corporate organization',
    defaultCategory: 'Corporate Learning & Development'
  },
  {
    id: 'DIGITAL_PRODUCTS',
    icon: '📦',
    title: 'Digital Products',
    description: 'Sell ebooks, templates, downloads, resources and other digital products.',
    example: 'Design kits, vector packs, codebases, presets, PDFs.',
    personalizedHeading: 'Tell us about your digital products business',
    defaultCategory: 'Digital Products & Software Assets'
  },
  {
    id: 'COMMUNITY',
    icon: '👥',
    title: 'Membership / Community',
    description: 'Build a paid community or recurring membership business.',
    example: 'Paid masterminds, subscriber vaults, recurring networks.',
    personalizedHeading: 'Tell us about your community business',
    defaultCategory: 'Memberships & Masterminds'
  },
  {
    id: 'SERVICE_BUSINESS',
    icon: '💼',
    title: 'Service Business',
    description: 'Sell professional services, packages and consultations.',
    example: 'Design agency, software consultancy, marketing services.',
    personalizedHeading: 'Tell us about your service business',
    defaultCategory: 'Professional Services & Consulting'
  },
  {
    id: 'OTHER',
    icon: '＋',
    title: 'Something Else',
    description: 'Tell us what you\'re building.',
    example: 'Custom commerce, bespoke agency, niche venture.',
    personalizedHeading: 'Tell us about your business vision',
    defaultCategory: 'Custom Digital Venture'
  }
];

const LEGAL_BUSINESS_TYPES = [
  'Individual / Freelancer',
  'Sole Proprietorship',
  'Partnership Firm',
  'Limited Liability Partnership (LLP)',
  'Private Limited Company (Pvt Ltd)',
  'Public Limited Company',
  'Trust / Society / NGO',
  'Other Entity'
];

const GOAL_OPTIONS = [
  { id: 'WEBSITE', icon: '🌐', title: 'Build a Website', desc: 'Create a professional branded website.' },
  { id: 'PRODUCTS', icon: '🛍️', title: 'Sell Products', desc: 'Sell courses, digital products, memberships or services.' },
  { id: 'PAYMENTS', icon: '💳', title: 'Accept Payments', desc: 'Connect payment gateways and collect payments.' },
  { id: 'CUSTOMERS', icon: '👥', title: 'Get Customers', desc: 'Generate leads and manage customers.' },
  { id: 'GROWTH', icon: '📈', title: 'Grow Sales', desc: 'Marketing, analytics and conversion tools.' },
  { id: 'AI', icon: '🤖', title: 'Use AI', desc: 'Build websites, products and marketing with AI.' },
  { id: 'EMAIL', icon: '📧', title: 'Email Marketing', desc: 'Create campaigns and automated customer journeys.' },
  { id: 'BRAND', icon: '🔗', title: 'Build My Brand', desc: 'Use a custom domain and branded experience.' }
];

const AUDIENCE_OPTIONS = [
  'Students',
  'Professionals',
  'Businesses',
  'Creators',
  'Entrepreneurs',
  'Beginners',
  'Advanced Users',
  'Consumers',
  'Children / Parents',
  'Corporate Teams',
  'Other'
];

const PRODUCT_TYPE_OPTIONS = [
  'Online Courses',
  'Digital Downloads',
  'Memberships',
  'Subscriptions',
  'Coaching',
  'Services',
  'Physical Products',
  'Events',
  'Other'
];

const PRESET_COLORS = [
  { name: 'Indigo Aura', primary: '#4f46e5', secondary: '#10b981' },
  { name: 'Cosmic Purple', primary: '#7c3aed', secondary: '#ec4899' },
  { name: 'Emerald Growth', primary: '#059669', secondary: '#3b82f6' },
  { name: 'Ocean Cyan', primary: '#0284c7', secondary: '#6366f1' },
  { name: 'Rose Sunset', primary: '#e11d48', secondary: '#f59e0b' },
  { name: 'Midnight Minimal', primary: '#0f172a', secondary: '#64748b' }
];

function SalesOnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, showToast } = useApp();

  // Wizard Navigation: Step 1 (What you're building), Step 2 (Business details & Legal/GST), Step 3 (Goals & Audience), Step 4 (Brand), Step 5 (Workspace & Review)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isWelcomeDismissed, setIsWelcomeDismissed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreationSuccess, setIsCreationSuccess] = useState(false);
  const [creationStepIndex, setCreationStepIndex] = useState(0);

  // STEP 1: What are you building?
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>('');
  const [customBusinessType, setCustomBusinessType] = useState<string>('');

  // STEP 2: Business Details & Legal Information
  const [businessName, setBusinessName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  // Legal & GST Details
  const [legalName, setLegalName] = useState('');
  const [legalBusinessType, setLegalBusinessType] = useState(LEGAL_BUSINESS_TYPES[0]);
  const [hasGst, setHasGst] = useState<'YES' | 'NO' | 'NOT_SURE'>('NOT_SURE');
  const [gstin, setGstin] = useState('');
  const [gstVerificationState, setGstVerificationState] = useState<'IDLE' | 'CHECKING' | 'VERIFIED' | 'INVALID'>('IDLE');
  const [gstDetails, setGstDetails] = useState<any>(null);
  const [gstError, setGstError] = useState('');

  // STEP 3: Goals, Audience & What You Sell
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['WEBSITE', 'PRODUCTS', 'PAYMENTS', 'GROWTH', 'AI']);
  const [selectedAudience, setSelectedAudience] = useState<string[]>(['Professionals', 'Students']);
  const [idealCustomer, setIdealCustomer] = useState('');
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>(['Online Courses', 'Digital Downloads']);

  // STEP 4: Brand Setup
  const [logo, setLogo] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');
  const [secondaryColor, setSecondaryColor] = useState('#10b981');
  const [tagline, setTagline] = useState('Build. Learn. Grow.');

  // STEP 5: Workspace Details & URL Availability
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [isSlugAutoGenerated, setIsSlugAutoGenerated] = useState(true);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);
  const [slugError, setSlugError] = useState('');

  // Pre-fill initial user data
  useEffect(() => {
    if (currentUser) {
      if (!contactEmail && currentUser.email) setContactEmail(currentUser.email);
      if (!businessName && currentUser.organizationName) {
        setBusinessName(currentUser.organizationName);
        setWorkspaceName(currentUser.organizationName);
      }
    }
  }, [currentUser]);

  // Auto-generate Workspace Name & Slug from Business Name
  useEffect(() => {
    if (isSlugAutoGenerated && businessName.trim()) {
      setWorkspaceName(businessName);
      const generated = businessName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setWorkspaceSlug(generated);
    }
  }, [businessName, isSlugAutoGenerated]);

  // Debounced Workspace Slug Availability Check
  useEffect(() => {
    if (!workspaceSlug || workspaceSlug.length < 2) {
      setSlugAvailable(null);
      setSlugSuggestions([]);
      setSlugError('');
      return;
    }

    setSlugChecking(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sales/workspace/check-slug?slug=${encodeURIComponent(workspaceSlug)}`);
        const json = await res.json();
        setSlugChecking(false);
        if (json.available) {
          setSlugAvailable(true);
          setSlugSuggestions([]);
          setSlugError('');
        } else {
          setSlugAvailable(false);
          setSlugSuggestions(json.suggestions || []);
          setSlugError(json.error || 'Workspace URL is already taken.');
        }
      } catch (e) {
        setSlugChecking(false);
        setSlugAvailable(true);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [workspaceSlug]);

  // Auto-fill category based on selected business type
  useEffect(() => {
    const found = BUSINESS_TYPES.find((b) => b.id === selectedBusinessType);
    if (found && !category) {
      setCategory(found.defaultCategory);
    }
  }, [selectedBusinessType]);

  // GSTIN Verification Handler
  const handleVerifyGstin = async () => {
    if (!gstin || gstin.trim().length < 15) {
      setGstVerificationState('INVALID');
      setGstError('GSTIN must be 15 characters long.');
      return;
    }

    setGstVerificationState('CHECKING');
    setGstError('');

    try {
      const res = await fetch('/api/sales/gstin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstin: gstin.trim().toUpperCase(), businessName: businessName || legalName })
      });
      const json = await res.json();

      if (json.verified) {
        setGstVerificationState('VERIFIED');
        setGstDetails(json.details);
        if (json.details.legalName && !legalName) {
          setLegalName(json.details.legalName);
        }
        if (json.details.state && !state) {
          setState(json.details.state);
        }
      } else {
        setGstVerificationState('INVALID');
        setGstError(json.error || "We couldn't verify this GSTIN. Please check the number and try again.");
      }
    } catch (err: any) {
      setGstVerificationState('INVALID');
      setGstError('Network error verifying GSTIN.');
    }
  };

  // Logo Upload Simulator
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type)) {
      alert('Please upload a valid PNG, JPG, or SVG image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogoPreview(result);
      setLogo(result);
    };
    reader.readAsDataURL(file);
  };

  // Multi-select toggle helpers
  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  };

  const toggleAudience = (aud: string) => {
    setSelectedAudience((prev) => (prev.includes(aud) ? prev.filter((a) => a !== aud) : [...prev, aud]));
  };

  const toggleProductType = (pt: string) => {
    setSelectedProductTypes((prev) => (prev.includes(pt) ? prev.filter((p) => p !== pt) : [...prev, pt]));
  };

  // Current selected business type details
  const selectedTypeObj = BUSINESS_TYPES.find((b) => b.id === selectedBusinessType);

  // Final Workspace Submission Handler
  const handleCreateWorkspace = async () => {
    setIsSubmitting(true);

    const checklistItems = [
      'Creating workspace',
      'Configuring business profile',
      'Setting up your brand',
      'Preparing website tools',
      'Preparing sales tools',
      'Preparing AI tools'
    ];

    // Animated progress simulator
    for (let i = 0; i < checklistItems.length; i++) {
      setCreationStepIndex(i);
      await new Promise((r) => setTimeout(r, 450));
    }

    try {
      const payload = {
        isFinalSubmit: true,
        step: 5,
        businessType: selectedBusinessType,
        customBusinessType: selectedBusinessType === 'OTHER' ? customBusinessType : undefined,
        businessName: businessName || workspaceName,
        contactEmail,
        contactPhone,
        country,
        state,
        city,
        industry: category || selectedTypeObj?.defaultCategory,
        description,
        legalName: legalName || businessName,
        legalBusinessType,
        hasGst,
        gstin: hasGst === 'YES' ? gstin : undefined,
        gstStatus: gstVerificationState,
        gstDetails,
        goals: selectedGoals,
        targetAudience: selectedAudience,
        idealCustomer,
        productTypes: selectedProductTypes,
        logo,
        primaryColor,
        secondaryColor,
        tagline,
        workspaceName,
        workspaceSlug
      };

      const res = await fetch('/api/sales/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsSubmitting(false);
        setIsCreationSuccess(true);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to initialize workspace');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      alert(err.message || 'Workspace initialization error');
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // VIEW: CREATION LOADING STATE
  // -------------------------------------------------------------
  if (isSubmitting) {
    const checklist = [
      'Creating workspace',
      'Configuring business profile',
      'Setting up your brand',
      'Preparing website tools',
      'Preparing sales tools',
      'Preparing AI tools'
    ];

    return (
      <div className="min-h-screen bg-[#060814] text-white flex items-center justify-center p-6 select-none">
        <div className="w-full max-w-md bg-[#090d24] border border-white/15 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto text-3xl shadow-xl shadow-indigo-600/30 animate-bounce">
            🚀
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Setting up your workspace...</h2>
            <p className="text-xs text-slate-400 mt-1">Configuring MORENA TEACH Sales for {businessName || 'your business'}</p>
          </div>

          <div className="p-5 rounded-2xl bg-black/40 border border-white/10 text-left space-y-3 font-mono text-xs">
            {checklist.map((item, idx) => {
              const isDone = idx <= creationStepIndex;
              const isCurrent = idx === creationStepIndex;

              return (
                <div key={item} className="flex items-center gap-3 transition-all duration-300">
                  {isDone ? (
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold shrink-0">
                      ✓
                    </span>
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-slate-500 shrink-0">
                      •
                    </span>
                  )}
                  <span className={isDone ? 'text-white font-bold' : isCurrent ? 'text-indigo-300 animate-pulse' : 'text-slate-500'}>
                    {item}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: CREATION SUCCESS STATE
  // -------------------------------------------------------------
  if (isCreationSuccess) {
    const checklist = [
      { id: 1, title: 'Build your website', desc: 'Create your first website with AI or manually', action: '/admin/website/builder' },
      { id: 2, title: 'Create your first product', desc: 'Add courses, software, or digital goods to sell', action: '/admin/products' },
      { id: 3, title: 'Connect payments', desc: 'Accept payments via Razorpay and Stripe', action: '/admin/settings?tab=payments' },
      { id: 4, title: 'Connect your domain', desc: 'Use your own custom branded domain', action: '/admin/settings?tab=branding' },
      { id: 5, title: 'Publish', desc: 'Launch your business to the global market', action: '/admin' }
    ];

    return (
      <div className="min-h-screen bg-[#060814] text-white flex items-center justify-center p-4 sm:p-8 select-none">
        <div className="w-full max-w-2xl bg-[#090d24] border border-white/15 rounded-3xl p-6 sm:p-10 shadow-2xl text-center space-y-8 animate-fadeIn relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Heading */}
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Workspace Provisioned &amp; Active</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              🎉 Your MORENA TEACH Sales workspace is ready!
            </h1>
            <p className="text-sm text-slate-300">
              Your business operating system has been customized for <strong className="text-white">{businessName || workspaceName}</strong>.
            </p>
          </div>

          {/* Workspace URL Banner */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-left relative z-10">
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase font-bold">Your Live Workspace URL</div>
              <div className="text-sm sm:text-base font-black text-indigo-400 font-mono">
                https://{workspaceSlug || 'mybrand'}.morenateach.com
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full font-mono">
              ✓ Active
            </span>
          </div>

          {/* Setup Checklist */}
          <div className="space-y-3 text-left relative z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white">Let&apos;s get your business ready to launch</h3>
              <span className="text-xs font-mono text-indigo-300 font-bold bg-indigo-500/10 px-2.5 py-0.5 rounded-full">
                0 / 5 complete
              </span>
            </div>

            <div className="space-y-2">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 flex items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-400 font-mono">
                      {item.id}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{item.title}</div>
                      <div className="text-[11px] text-slate-400">{item.desc}</div>
                    </div>
                  </div>

                  <Link
                    href={item.action}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Start
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2 relative z-10">
            <Link
              href="/admin"
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-2xl shadow-indigo-600/40 hover:shadow-indigo-600/60 hover:scale-[1.01] transition-all cursor-pointer border border-white/20"
            >
              <span>Go to Sales Dashboard →</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: WELCOME MODAL OVERLAY (DISMISSIBLE STEP 0)
  // -------------------------------------------------------------
  if (!isWelcomeDismissed) {
    return (
      <div className="min-h-screen bg-[#060814] text-white flex items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-indigo-600/20 blur-[140px] rounded-full pointer-events-none" />

        <div className="w-full max-w-xl bg-[#090d24] border border-white/15 rounded-3xl p-8 sm:p-12 shadow-2xl text-center space-y-8 relative z-10 animate-fadeIn">
          {/* Brand Logo */}
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-indigo-500/30 border border-white/20">
              A
            </div>
            <span className="text-2xl font-black text-white tracking-tight">MORENA TEACH Sales</span>
          </div>

          {/* Welcome Message */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Let&apos;s build your business
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-md mx-auto">
              First, tell us what you&apos;re building. We&apos;ll personalize MORENA TEACH Sales around your business model and target audience.
            </p>
            <p className="text-xs text-slate-400">
              This will only take a few minutes. You can change these settings later at any time.
            </p>
          </div>

          {/* Start Button */}
          <div>
            <button
              onClick={() => setIsWelcomeDismissed(true)}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/35 hover:shadow-indigo-600/60 transition-all cursor-pointer border border-white/20"
            >
              <span>Let&apos;s Get Started →</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN 5-STEP WIZARD CONTAINER
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#060814] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-10 select-none relative overflow-x-hidden">
      {/* Top Header & Progress Bar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between pb-6 border-b border-white/10">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-base shadow-md border border-white/20">
            A
          </div>
          <div>
            <span className="font-black text-lg text-white tracking-tight">MORENA TEACH</span>
            <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase block -mt-1">
              Sales Onboarding
            </span>
          </div>
        </Link>

        {/* Step Progress Indicators */}
        <div className="hidden md:flex items-center gap-2">
          {[
            { num: 1, label: "What you're building" },
            { num: 2, label: 'Business details' },
            { num: 3, label: 'Your goals' },
            { num: 4, label: 'Brand' },
            { num: 5, label: 'Workspace' }
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold transition-all ${
                  currentStep === s.num
                    ? 'bg-indigo-600 text-white shadow-md'
                    : currentStep > s.num
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-slate-500'
                }`}
              >
                <span>{currentStep > s.num ? '✓' : s.num}</span>
                <span className="hidden lg:inline">{s.label}</span>
              </div>
              {s.num < 5 && <span className="text-slate-600 text-xs">›</span>}
            </div>
          ))}
        </div>

        {/* Save & Continue Later */}
        <Link
          href="/admin"
          className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          Save &amp; continue later
        </Link>
      </header>

      {/* Center Wizard Body */}
      <main className="max-w-4xl mx-auto w-full my-8 flex-grow">
        {/* ========================================================================= */}
        {/* STEP 1: WHAT ARE YOU BUILDING? */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                What are you building?
              </h2>
              <p className="text-sm text-slate-300">
                Choose the option that best describes your business. We will tailor your storefront and tools accordingly.
              </p>
            </div>

            {/* 9 Selectable Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BUSINESS_TYPES.map((type) => {
                const isSelected = selectedBusinessType === type.id;

                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedBusinessType(type.id)}
                    className={`p-6 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-between group cursor-pointer relative shadow-lg ${
                      isSelected
                        ? 'bg-gradient-to-b from-indigo-950/60 to-purple-950/30 border-2 border-indigo-500 shadow-indigo-950/60 scale-[1.01]'
                        : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl">{type.icon}</span>
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold shadow-md">
                            ✓
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-white/20 group-hover:border-white/40" />
                        )}
                      </div>

                      <h3 className="text-base font-extrabold text-white group-hover:text-indigo-300 transition-colors">
                        {type.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                        {type.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 text-[11px] font-mono text-slate-500">
                      {type.example}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* "Other" Custom Description Input */}
            {selectedBusinessType === 'OTHER' && (
              <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2 animate-fadeIn">
                <label className="text-xs font-bold text-slate-300 block">
                  Tell us what you&apos;re building *
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={customBusinessType}
                  onChange={(e) => setCustomBusinessType(e.target.value)}
                  placeholder="Example: Photography education business & custom lightroom presets"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <div className="text-[11px] text-right text-slate-500 font-mono">
                  {customBusinessType.length} / 100 characters
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: BUSINESS DETAILS & LEGAL / GST */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-8 animate-fadeIn max-w-3xl mx-auto">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold uppercase">
                <span>{selectedTypeObj?.title || 'Business'} Profile</span>
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">
                {selectedTypeObj?.personalizedHeading || 'Tell us about your business'}
              </h2>
              <p className="text-sm text-slate-300">
                This information configures your business profile, invoicing details, and public storefront.
              </p>
            </div>

            {/* Form Box 1: Core Details */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#090d24] border border-white/15 space-y-5 shadow-xl">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono border-b border-white/10 pb-3">
                1. General Business Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Business / Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. GraphicPro Academy & Design Studio"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Business Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@yourbusiness.com"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Business Phone Number
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">Country *</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">State / Region</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Maharashtra, Karnataka, California"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Mumbai, Bengaluru, New York"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">Business Category *</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Online Design Academy"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">Short Business Description</label>
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell us what your business does and the value you provide..."
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="text-[10px] text-right text-slate-500 font-mono">
                    {description.length} / 300 characters
                  </div>
                </div>
              </div>
            </div>

            {/* Form Box 2: Legal & GST Information */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#090d24] border border-white/15 space-y-5 shadow-xl">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">
                  2. Business Legal &amp; Tax Information
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  This information helps us configure your business invoices, payment gateways, and tax compliance.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">Legal Registered Name</label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="e.g. GraphicPro Technologies Pvt Ltd"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">Legal Entity Type</label>
                  <select
                    value={legalBusinessType}
                    onChange={(e) => setLegalBusinessType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0b0e24] border border-white/15 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {LEGAL_BUSINESS_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* GST Radio Choices */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <label className="text-xs font-bold text-slate-300 block">
                  Do you have a GST registration?
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { val: 'YES', label: 'Yes' },
                    { val: 'NO', label: 'No' },
                    { val: 'NOT_SURE', label: 'Not sure' }
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setHasGst(opt.val as any)}
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        hasGst === opt.val
                          ? 'bg-indigo-600 text-white shadow-md border border-indigo-400'
                          : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* If YES: Show GSTIN Input & Verification */}
                {hasGst === 'YES' && (
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 animate-fadeIn mt-3">
                    <label className="text-xs font-bold text-slate-300 block">
                      15-Character GSTIN Number
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={15}
                        value={gstin}
                        onChange={(e) => {
                          setGstin(e.target.value.toUpperCase());
                          setGstVerificationState('IDLE');
                        }}
                        placeholder="e.g. 27AAAAA0000A1Z5"
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-mono uppercase focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyGstin}
                        disabled={gstVerificationState === 'CHECKING'}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        {gstVerificationState === 'CHECKING' ? 'Checking...' : 'Verify GSTIN'}
                      </button>
                    </div>

                    {/* Verification Result Feedback */}
                    {gstVerificationState === 'VERIFIED' && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>✓ GSTIN verified</span>
                        </div>
                        <div className="text-[11px] text-slate-300">
                          Legal Entity: <strong>{gstDetails?.legalName}</strong> • State: {gstDetails?.state}
                        </div>
                      </div>
                    )}

                    {gstVerificationState === 'INVALID' && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                        {gstError || "We couldn't verify this GSTIN. Please check the number and try again."}
                      </div>
                    )}
                  </div>
                )}

                {hasGst === 'NO' && (
                  <p className="text-[11px] text-slate-400 italic">
                    💡 You can add your GST information later at any time from Business Settings.
                  </p>
                )}

                {hasGst === 'NOT_SURE' && (
                  <p className="text-[11px] text-slate-400 italic">
                    💡 You can continue without GST now and update your tax details later.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: YOUR GOALS, AUDIENCE & PRODUCTS */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-white tracking-tight">
                What do you want to do with MORENA TEACH?
              </h2>
              <p className="text-sm text-slate-300">
                Select your primary goals. You can choose multiple options.
              </p>
            </div>

            {/* Goals Cards Multi-Select */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {GOAL_OPTIONS.map((g) => {
                const isSelected = selectedGoals.includes(g.id);

                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGoal(g.id)}
                    className={`p-4 rounded-2xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/60 border-2 border-indigo-500 text-white shadow-lg'
                        : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 text-slate-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{g.icon}</span>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
                            isSelected ? 'bg-indigo-500 text-white' : 'border border-white/20'
                          }`}
                        >
                          {isSelected && '✓'}
                        </div>
                      </div>
                      <h4 className="text-xs font-extrabold text-white">{g.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{g.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Target Audience Section */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#090d24] border border-white/15 space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">
                  Who are you building for?
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Select your primary target audience segments.</p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {AUDIENCE_OPTIONS.map((aud) => {
                  const isSelected = selectedAudience.includes(aud);
                  return (
                    <button
                      key={aud}
                      type="button"
                      onClick={() => toggleAudience(aud)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                      }`}
                    >
                      {isSelected ? `✓ ${aud}` : aud}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Describe your ideal customer (Optional)
                </label>
                <textarea
                  rows={2}
                  value={idealCustomer}
                  onChange={(e) => setIdealCustomer(e.target.value)}
                  placeholder="e.g. Mid-level graphic designers looking to switch to Figma and freelance full-time..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* What Will You Sell Section */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#090d24] border border-white/15 space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">
                  What will you sell?
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Select all product and service types you plan to offer.</p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {PRODUCT_TYPE_OPTIONS.map((pt) => {
                  const isSelected = selectedProductTypes.includes(pt);
                  return (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => toggleProductType(pt)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                      }`}
                    >
                      {isSelected ? `✓ ${pt}` : pt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: BRAND SETUP */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="space-y-8 animate-fadeIn max-w-3xl mx-auto">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-white tracking-tight">
                Let&apos;s set up your brand
              </h2>
              <p className="text-sm text-slate-300">
                Upload your logo, pick your brand colors, and establish your public identity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Form Controls */}
              <div className="md:col-span-7 space-y-6">
                {/* Logo Upload Box */}
                <div className="p-6 rounded-3xl bg-[#090d24] border border-white/15 space-y-3">
                  <label className="text-xs font-bold text-slate-300 block">
                    Upload Business Logo
                  </label>
                  <div className="border-2 border-dashed border-white/20 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer relative bg-white/[0.02]">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-2">
                      <Icon name="upload" size={20} />
                    </div>
                    <p className="text-xs font-bold text-white">Click or drag &amp; drop logo</p>
                    <p className="text-[10px] text-slate-500 mt-1">PNG, JPG, or SVG (Max 5MB)</p>
                  </div>
                </div>

                {/* Color Palettes */}
                <div className="p-6 rounded-3xl bg-[#090d24] border border-white/15 space-y-4">
                  <label className="text-xs font-bold text-slate-300 block">
                    Brand Colors &amp; Presets
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_COLORS.map((pal) => (
                      <button
                        key={pal.name}
                        type="button"
                        onClick={() => {
                          setPrimaryColor(pal.primary);
                          setSecondaryColor(pal.secondary);
                        }}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left flex items-center gap-2"
                      >
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: pal.primary }} />
                        <span className="text-[10px] font-bold text-slate-300 truncate">{pal.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">Primary Color</label>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-xs font-mono text-white">{primaryColor}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">Secondary Color</label>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-xs font-mono text-white">{secondaryColor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tagline */}
                <div className="p-6 rounded-3xl bg-[#090d24] border border-white/15 space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">Brand Tagline</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Build. Learn. Grow."
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Right Column: Live Mini Storefront Card Preview */}
              <div className="md:col-span-5 space-y-3">
                <div className="text-xs font-mono font-bold uppercase text-slate-400">Live Brand Preview</div>
                <div className="p-6 rounded-3xl bg-[#0b0e20] border border-white/15 space-y-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-white/20" />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-md"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {(businessName || 'A').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-extrabold text-white">{businessName || 'Your Business Name'}</div>
                      <div className="text-[11px] text-slate-400">{tagline || 'Your Brand Tagline'}</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-1">
                    <div className="text-[10px] font-mono text-slate-500 uppercase">Primary Action Button</div>
                    <button
                      type="button"
                      style={{ backgroundColor: primaryColor }}
                      className="w-full py-2 rounded-lg text-white font-bold text-xs shadow-md mt-1"
                    >
                      Explore Store &amp; Catalog
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: WORKSPACE CREATION & SETUP REVIEW */}
        {/* ========================================================================= */}
        {currentStep === 5 && (
          <div className="space-y-8 animate-fadeIn max-w-3xl mx-auto">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-white tracking-tight">
                Create your workspace
              </h2>
              <p className="text-sm text-slate-300">
                Your workspace is where you&apos;ll manage your business, website, products, customers and sales.
              </p>
            </div>

            {/* Workspace URL Config Box */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#090d24] border border-white/15 space-y-4 shadow-xl">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Workspace Name *</label>
                <input
                  type="text"
                  required
                  value={workspaceName}
                  onChange={(e) => {
                    setWorkspaceName(e.target.value);
                    if (isSlugAutoGenerated) {
                      setWorkspaceSlug(
                        e.target.value
                          .toLowerCase()
                          .trim()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)/g, '')
                      );
                    }
                  }}
                  placeholder="e.g. GraphicPro Academy"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/15 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 block">Workspace URL Subdomain *</label>
                  {slugChecking && <span className="text-[11px] font-mono text-indigo-400 animate-pulse">Checking...</span>}
                  {!slugChecking && slugAvailable === true && (
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">✓ Available</span>
                  )}
                  {!slugChecking && slugAvailable === false && (
                    <span className="text-[11px] font-mono text-rose-400 font-bold">✕ Already taken</span>
                  )}
                </div>

                <div className="flex items-center rounded-xl bg-black/40 border border-white/15 px-3 py-2.5">
                  <input
                    type="text"
                    required
                    value={workspaceSlug}
                    onChange={(e) => {
                      setIsSlugAutoGenerated(false);
                      setWorkspaceSlug(
                        e.target.value
                          .toLowerCase()
                          .trim()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)/g, '')
                      );
                    }}
                    placeholder="mybrand"
                    className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none"
                  />
                  <span className="text-xs font-mono text-slate-500">.morenateach.com</span>
                </div>

                {/* Suggestions if Slug is Taken */}
                {slugAvailable === false && slugSuggestions.length > 0 && (
                  <div className="pt-2 space-y-1">
                    <span className="text-[11px] text-slate-400">Suggested alternatives:</span>
                    <div className="flex flex-wrap gap-2">
                      {slugSuggestions.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            setWorkspaceSlug(sug);
                            setIsSlugAutoGenerated(false);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-mono hover:bg-indigo-500/30 transition-colors"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Comprehensive Setup Review Box */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#090d24] border border-white/15 space-y-6 shadow-xl text-left">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono border-b border-white/10 pb-3">
                Review your setup
              </h3>

              <div className="space-y-4 text-xs">
                {/* Business Info Review */}
                <div className="flex items-start justify-between pb-3 border-b border-white/5">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Business &amp; Category</div>
                    <div className="text-sm font-bold text-white mt-0.5">{businessName || 'My Business'}</div>
                    <div className="text-slate-400">{category || selectedTypeObj?.defaultCategory} • {country}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Edit
                  </button>
                </div>

                {/* Business Type Review */}
                <div className="flex items-start justify-between pb-3 border-b border-white/5">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Business Type</div>
                    <div className="text-sm font-bold text-white mt-0.5">{selectedTypeObj?.title || 'Online Academy'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Edit
                  </button>
                </div>

                {/* Goals Review */}
                <div className="flex items-start justify-between pb-3 border-b border-white/5">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Goals &amp; Offerings</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedGoals.map((g) => (
                        <span key={g} className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-indigo-300 font-mono">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Edit
                  </button>
                </div>

                {/* Brand Review */}
                <div className="flex items-start justify-between pb-3 border-b border-white/5">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Brand Styling</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: primaryColor }} />
                      <span className="font-mono text-slate-300">{primaryColor}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-300">{tagline}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Edit
                  </button>
                </div>

                {/* Workspace URL Review */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Workspace Address</div>
                    <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                      https://{workspaceSlug || 'mybrand'}.morenateach.com
                    </div>
                  </div>
                  <span className="text-emerald-400 font-mono text-[11px]">✓ Ready</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Controls */}
      <footer className="max-w-4xl mx-auto w-full pt-6 border-t border-white/10 flex items-center justify-between">
        {/* Back Button */}
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Icon name="arrow_back" size={14} />
            <span>Back</span>
          </button>
        ) : (
          <div />
        )}

        {/* Next / Submit Button */}
        {currentStep < 5 ? (
          <button
            type="button"
            disabled={
              (currentStep === 1 && (!selectedBusinessType || (selectedBusinessType === 'OTHER' && !customBusinessType.trim()))) ||
              (currentStep === 2 && !businessName.trim())
            }
            onClick={() => setCurrentStep((prev) => (prev + 1) as any)}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Continue</span>
            <Icon name="arrow_forward" size={14} />
          </button>
        ) : (
          <button
            type="button"
            disabled={!workspaceSlug || slugAvailable === false || isSubmitting}
            onClick={handleCreateWorkspace}
            className="px-9 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs shadow-xl shadow-emerald-600/40 hover:scale-[1.02] disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-2 cursor-pointer border border-white/20"
          >
            <span>Create My Workspace →</span>
          </button>
        )}
      </footer>
    </div>
  );
}

export default function SalesOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060814] flex items-center justify-center text-white text-xs font-mono">
          Loading MORENA TEACH Sales Onboarding...
        </div>
      }
    >
      <SalesOnboardingWizard />
    </Suspense>
  );
}

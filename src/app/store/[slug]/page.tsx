'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';
import {
  ShoppingBag,
  Code2,
  BookOpen,
  Briefcase,
  Star,
  CheckCircle2,
  Download,
  Key,
  ShieldCheck,
  Zap,
  ArrowRight,
  Send,
  Sparkles
} from 'lucide-react';

export default function SellerStorePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'SOFTWARE' | 'PRODUCTS' | 'SERVICES' | 'COURSES'>('ALL');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [bookingRequirements, setBookingRequirements] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchStore();
    }
  }, [slug]);

  const fetchStore = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/business/${slug}`);
      const json = await res.json();
      if (json.business) {
        setStore(json.business);
      }
    } catch (err) {
      console.error('Failed to load store:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingSuccess(true);
    setTimeout(() => {
      setSelectedService(null);
      setBookingSuccess(false);
    }, 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <ShoppingBag className="w-16 h-16 text-slate-600 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Storefront Not Found</h1>
          <Link href="/marketplace" className="px-5 py-2.5 bg-indigo-600 rounded-xl text-white font-medium">
            Explore Marketplace
          </Link>
        </div>
        <LandingFooter />
      </div>
    );
  }

  const primaryColor = store.primaryColor || '#6366f1';
  const software = store.products?.filter((p: any) => p.type === 'SOFTWARE') || [];
  const digitalProducts = store.products?.filter((p: any) => p.type !== 'SOFTWARE') || [];
  const services = store.services || [];
  const courses = store.courses || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <PublicNavbar />

      {/* Branded Store Hero Header */}
      <section className="relative pt-32 pb-20 overflow-hidden border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold uppercase tracking-wider mb-6 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Official Verified Storefront
          </div>

          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-indigo-600/20 border border-indigo-500/40 p-2 shadow-2xl mb-5 flex items-center justify-center">
            {store.logo ? (
              <img src={store.logo} alt={store.name} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <span className="text-3xl font-black text-white">{store.name.charAt(0)}</span>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">{store.name}</h1>
          <p className="mt-3 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-medium">
            {store.tagline || 'Elevating clients and creators with verified digital excellence, software, and training.'}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm">
            {store.verifiedSeller && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Verified AADHYARA Seller
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-amber-400 font-semibold">
              <Star className="w-4 h-4 fill-amber-400" /> {store.sellerRating?.toFixed(1) || '5.0'} Rating
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
              {store.industry || 'Digital Studio'}
            </span>
          </div>
        </div>
      </section>

      {/* Main Store Catalog */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4 mb-10">
          {[
            { id: 'ALL', label: 'All Catalog' },
            { id: 'SOFTWARE', label: `Software & Code (${software.length})` },
            { id: 'PRODUCTS', label: `Digital Assets (${digitalProducts.length})` },
            { id: 'SERVICES', label: `Services (${services.length})` },
            { id: 'COURSES', label: `Masterclasses (${courses.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                activeCategory === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Software Cards */}
        {(activeCategory === 'ALL' || activeCategory === 'SOFTWARE') && software.length > 0 && (
          <div className="mb-14">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-purple-400" /> Software Systems & Code Licenses
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {software.map((item: any) => (
                <div key={item.id} className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between hover:border-purple-500/50 transition shadow-xl">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-mono text-[11px] font-bold">
                        v{item.version || '1.0.0'}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">{item.licenseType || 'Commercial License'}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{item.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-3 mb-6 leading-relaxed">
                      {item.shortDescription || item.description || 'Production-ready software source code with full documentation and license activation key.'}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xl font-black text-white">₹{item.price.toLocaleString()}</span>
                    <button
                      onClick={() => alert(`Purchasing ${item.name}. Razorpay/Stripe checkout will initialize for ₹${item.price}.`)}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-600/30 flex items-center gap-1.5"
                    >
                      <Key className="w-3.5 h-3.5" /> Purchase License
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Digital Products Cards */}
        {(activeCategory === 'ALL' || activeCategory === 'PRODUCTS') && digitalProducts.length > 0 && (
          <div className="mb-14">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-400" /> Digital Assets & UI Templates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {digitalProducts.map((item: any) => (
                <div key={item.id} className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between hover:border-indigo-500/50 transition shadow-xl">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold text-[10px] uppercase mb-3 inline-block">
                      {item.category || 'Asset'}
                    </span>
                    <h3 className="text-lg font-bold text-white mb-2">{item.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-3 mb-6 leading-relaxed">
                      {item.shortDescription || item.description || 'Verified downloadable digital asset package.'}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xl font-black text-white">{item.price === 0 ? 'FREE' : `₹${item.price.toLocaleString()}`}</span>
                    <button
                      onClick={() => alert(`Starting download checkout for ${item.name}.`)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Instant Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services Showcase & Booking Modal Trigger */}
        {(activeCategory === 'ALL' || activeCategory === 'SERVICES') && services.length > 0 && (
          <div className="mb-14">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-pink-400" /> Bespoke Services & Strategy
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((item: any) => (
                <div key={item.id} className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between hover:border-pink-500/50 transition shadow-xl">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-pink-500/10 text-pink-400 font-bold text-[10px]">
                        {item.category}
                      </span>
                      <span>{item.deliveryDays} Days Turnaround</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{item.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-3 mb-6 leading-relaxed">
                      {item.shortDescription || item.description}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Starting at</div>
                      <span className="text-xl font-black text-white">₹{item.price.toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => setSelectedService(item)}
                      className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition shadow-lg shadow-pink-600/30 flex items-center gap-1.5"
                    >
                      <Briefcase className="w-3.5 h-3.5" /> Book Project
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Masterclasses Courses */}
        {(activeCategory === 'ALL' || activeCategory === 'COURSES') && courses.length > 0 && (
          <div className="mb-14">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" /> Masterclasses & Training
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((item: any) => (
                <div key={item.id} className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between hover:border-emerald-500/50 transition shadow-xl">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[10px] uppercase mb-3 inline-block">
                      {item.level || 'Masterclass'}
                    </span>
                    <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-3 mb-6 leading-relaxed">
                      {item.shortDescription || item.description}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xl font-black text-white">{item.price === 0 ? 'FREE' : `₹${item.price.toLocaleString()}`}</span>
                    <Link
                      href={`/courses/${item.slug}`}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> Start Learning
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Service Booking Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <h3 className="text-xl font-bold text-white mb-1">Book "{selectedService.name}"</h3>
            <p className="text-xs text-slate-400 mb-6">
              Turnaround: {selectedService.deliveryDays} Days • Total: ₹{selectedService.price.toLocaleString()}
            </p>

            {bookingSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <h4 className="text-base font-bold text-white">Service Booking Confirmed!</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Your project requirements have been submitted to {store.name}. You can track progress in your Client Dashboard.
                </p>
              </div>
            ) : (
              <form onSubmit={handleBookServiceSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Describe your project requirements & objectives:
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={bookingRequirements}
                    onChange={(e) => setBookingRequirements(e.target.value)}
                    placeholder="Provide details about your project, target audience, brand assets, and deadlines..."
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:ring-1 focus:ring-pink-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedService(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-lg shadow-pink-600/30 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Confirm & Pay ₹{selectedService.price.toLocaleString()}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <LandingFooter />
    </div>
  );
}

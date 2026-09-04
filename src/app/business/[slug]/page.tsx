'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';
import {
  ShieldCheck,
  Star,
  ShoppingBag,
  Code2,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Mail,
  ExternalLink,
  Sparkles,
  Download,
  Key,
  Layers,
  ArrowRight,
  Globe
} from 'lucide-react';

export default function BusinessProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PRODUCTS' | 'SOFTWARE' | 'SERVICES' | 'COURSES' | 'REVIEWS'>('ALL');

  useEffect(() => {
    if (slug) {
      fetchBusiness();
    }
  }, [slug]);

  const fetchBusiness = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/business/${slug}`);
      const json = await res.json();
      if (json.business) {
        setBusiness(json.business);
      }
    } catch (err) {
      console.error('Failed to load business profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <LandingFooter />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <ShoppingBag className="w-16 h-16 text-slate-600 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Business Profile Not Found</h1>
          <p className="text-slate-400 max-w-md mb-6">The requested studio or creator profile could not be located.</p>
          <Link href="/marketplace" className="px-5 py-2.5 bg-indigo-600 rounded-xl text-white font-medium">
            Return to Marketplace
          </Link>
        </div>
        <LandingFooter />
      </div>
    );
  }

  const softwareProducts = business.products?.filter((p: any) => p.type === 'SOFTWARE') || [];
  const digitalProducts = business.products?.filter((p: any) => p.type !== 'SOFTWARE') || [];
  const services = business.services || [];
  const courses = business.courses || [];
  const reviews = business.productReviews || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <PublicNavbar />

      {/* Hero Header */}
      <section className="relative pt-32 pb-16 border-b border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-black text-white text-3xl shadow-xl border border-indigo-500/30 overflow-hidden">
                {business.logo ? (
                  <img src={business.logo} alt={business.name} className="w-full h-full object-cover" />
                ) : (
                  business.name.charAt(0)
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">{business.name}</h1>
                  {business.verifiedSeller && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified Seller
                    </span>
                  )}
                </div>
                <p className="text-sm sm:text-base text-slate-400 mt-1 font-medium">
                  {business.industry || 'Digital Innovation Studio'} • {business.businessType || 'Multi-Category Creator'}
                </p>
                {business.tagline && (
                  <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl">{business.tagline}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/store/${business.slug}`}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
              >
                <Globe className="w-4 h-4" />
                Visit Official Storefront
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Products & Code</div>
              <div className="text-xl font-bold text-white mt-1">{business.products?.length || 0}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Masterclasses</div>
              <div className="text-xl font-bold text-white mt-1">{courses.length}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Bespoke Services</div>
              <div className="text-xl font-bold text-white mt-1">{services.length}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Seller Rating</div>
              <div className="text-xl font-bold text-amber-400 mt-1 flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400" />
                {business.sellerRating?.toFixed(1) || '5.0'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Studio Catalog */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4 mb-8">
          {[
            { id: 'ALL', label: 'All Offerings', icon: Layers, count: (business.products?.length || 0) + courses.length + services.length },
            { id: 'SOFTWARE', label: 'Software & Code', icon: Code2, count: softwareProducts.length },
            { id: 'PRODUCTS', label: 'Digital Products', icon: ShoppingBag, count: digitalProducts.length },
            { id: 'COURSES', label: 'Courses', icon: BookOpen, count: courses.length },
            { id: 'SERVICES', label: 'Services', icon: Briefcase, count: services.length },
            { id: 'REVIEWS', label: 'Reviews', icon: Star, count: reviews.length }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900/40 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>

        {/* Tab Content Display */}
        <div className="space-y-12">
          {/* Software Section */}
          {(activeTab === 'ALL' || activeTab === 'SOFTWARE') && softwareProducts.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Code2 className="w-4 h-4 text-purple-400" />
                Software Systems & Developer Assets
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {softwareProducts.map((p: any) => (
                  <div key={p.id} className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono">v{p.version || '1.0.0'}</span>
                        <span>{p.licenseType || 'Single User'}</span>
                      </div>
                      <h3 className="text-base font-bold text-white mb-1">{p.name}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4">{p.shortDescription || p.description}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-lg font-bold text-white">₹{p.price.toLocaleString()}</span>
                      <Link href={`/store/${business.slug}`} className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5">
                        <Key className="w-3 h-3" /> License
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Digital Products Section */}
          {(activeTab === 'ALL' || activeTab === 'PRODUCTS') && digitalProducts.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <ShoppingBag className="w-4 h-4 text-indigo-400" />
                Digital Products, UI Kits & Templates
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {digitalProducts.map((p: any) => (
                  <div key={p.id} className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase mb-2 inline-block">
                        {p.category || 'Asset'}
                      </span>
                      <h3 className="text-base font-bold text-white mb-1">{p.name}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4">{p.shortDescription || p.description}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-lg font-bold text-white">{p.price === 0 ? 'FREE' : `₹${p.price.toLocaleString()}`}</span>
                      <Link href={`/store/${business.slug}`} className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5">
                        <Download className="w-3 h-3" /> Download
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bespoke Services Section */}
          {(activeTab === 'ALL' || activeTab === 'SERVICES') && services.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Briefcase className="w-4 h-4 text-pink-400" />
                Professional Services
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((s: any) => (
                  <div key={s.id} className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 font-bold">{s.category}</span>
                        <span>{s.deliveryDays} Days</span>
                      </div>
                      <h3 className="text-base font-bold text-white mb-1">{s.name}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4">{s.shortDescription || s.description}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-lg font-bold text-white">₹{s.price.toLocaleString()}</span>
                      <Link href={`/store/${business.slug}`} className="px-3.5 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5">
                        <Briefcase className="w-3 h-3" /> Book Now
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Courses Section */}
          {(activeTab === 'ALL' || activeTab === 'COURSES') && courses.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                Masterclasses & Academies
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((c: any) => (
                  <div key={c.id} className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase mb-2 inline-block">
                        {c.level || 'Masterclass'}
                      </span>
                      <h3 className="text-base font-bold text-white mb-1">{c.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4">{c.shortDescription || c.description}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-lg font-bold text-white">{c.price === 0 ? 'FREE' : `₹${c.price.toLocaleString()}`}</span>
                      <Link href={`/courses/${c.slug}`} className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3" /> View Masterclass
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Section */}
          {(activeTab === 'ALL' || activeTab === 'REVIEWS') && reviews.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                Client Testimonials & Verified Reviews
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {reviews.map((r: any) => (
                  <div key={r.id} className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">
                          {r.user?.name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{r.user?.name || 'Verified Client'}</div>
                          <div className="text-[10px] text-emerald-400 font-medium">✓ Verified Purchase</div>
                        </div>
                      </div>
                      <div className="flex items-center text-amber-400 text-xs">
                        {[...Array(r.rating || 5)].map((_, idx) => (
                          <Star key={idx} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 italic mt-2">"{r.comment}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

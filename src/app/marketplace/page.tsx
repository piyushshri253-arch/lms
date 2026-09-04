'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';
import {
  Search,
  Sparkles,
  ShoppingBag,
  Code2,
  BookOpen,
  Briefcase,
  Layers,
  Star,
  CheckCircle2,
  Filter,
  ArrowRight,
  Download,
  Key,
  ShieldCheck,
  TrendingUp,
  Tag
} from 'lucide-react';

export default function MarketplacePage() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PRODUCT' | 'SOFTWARE' | 'COURSE' | 'SERVICE'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('POPULAR');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    products: any[];
    courses: any[];
    services: any[];
    sellers: any[];
    counts: { products: number; courses: number; services: number; sellers: number };
  }>({
    products: [],
    courses: [],
    services: [],
    sellers: [],
    counts: { products: 0, courses: 0, services: 0, sellers: 0 }
  });

  useEffect(() => {
    fetchMarketplace();
  }, [activeTab, selectedCategory, sortBy]);

  const fetchMarketplace = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (activeTab !== 'ALL') params.set('type', activeTab);
      if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
      if (sortBy) params.set('sort', sortBy);

      const res = await fetch(`/api/marketplace?${params.toString()}`);
      const json = await res.json();
      if (json.products || json.courses || json.services) {
        setData(json);
      }
    } catch (err) {
      console.error('Marketplace fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMarketplace();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            Global Digital Economy & Creator Marketplace
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Software, Courses, Assets</span> & Services
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Directly from verified creators, developers, designers, and specialized academies worldwide.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="mt-8 max-w-2xl mx-auto relative flex items-center">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search software code, Figma templates, masterclasses, UI kits, design services..."
                className="w-full pl-12 pr-32 py-4 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base shadow-2xl transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-indigo-500/20"
              >
                Search
              </button>
            </div>
          </form>

          {/* Quick Tags */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
            <span className="text-slate-500">Trending:</span>
            {['Next.js SaaS Boilerplate', 'Canva Marketing Kit', 'Fullstack React Course', 'Figma UI System', 'Logo Design Service'].map((tag) => (
              <button
                key={tag}
                onClick={() => { setQuery(tag); fetchMarketplace(); }}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Marketplace Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        {/* Navigation Tabs & Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-10">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'All Offerings', icon: Layers },
              { id: 'SOFTWARE', label: 'Software & Code', icon: Code2 },
              { id: 'PRODUCT', label: 'Digital Products', icon: ShoppingBag },
              { id: 'COURSE', label: 'Masterclasses & Courses', icon: BookOpen },
              { id: 'SERVICE', label: 'Bespoke Services', icon: Briefcase }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort marketplace offerings"
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs sm:text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="POPULAR">Most Popular</option>
              <option value="NEWEST">Newest Added</option>
              <option value="PRICE_LOW">Price: Low to High</option>
              <option value="PRICE_HIGH">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Featured Verified Sellers Strip */}
        {data.sellers.length > 0 && activeTab === 'ALL' && (
          <div className="mb-14">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Featured Verified Businesses & Studios
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.sellers.map((seller) => (
                <Link
                  key={seller.id}
                  href={`/business/${seller.slug}`}
                  className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900 transition group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-lg shadow-md">
                        {seller.logo ? (
                          <img src={seller.logo} alt={seller.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          seller.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-indigo-400 transition text-sm flex items-center gap-1.5">
                          {seller.name}
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        </h3>
                        <p className="text-xs text-slate-400">{seller.industry || 'Digital Studio'}</p>
                      </div>
                    </div>
                    {seller.tagline && (
                      <p className="text-xs text-slate-300 line-clamp-2 mb-4">{seller.tagline}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-amber-400 font-medium">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {seller.sellerRating?.toFixed(1) || '5.0'}
                    </span>
                    <span className="text-indigo-400 font-medium group-hover:translate-x-1 transition flex items-center gap-1">
                      Visit Store <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 bg-slate-900/40 rounded-2xl border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-12">
            {/* Products & Software Grid */}
            {data.products.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-indigo-400" />
                    {activeTab === 'SOFTWARE' ? 'Software & Code Systems' : 'Digital Products & Templates'}
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">{data.products.length} available</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.products.map((product) => (
                    <div
                      key={product.id}
                      className="bg-slate-900/40 rounded-2xl border border-slate-800/80 hover:border-indigo-500/40 transition overflow-hidden flex flex-col justify-between group hover:shadow-xl hover:shadow-indigo-500/5"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            product.type === 'SOFTWARE'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}>
                            {product.type}
                          </span>
                          {product.version && (
                            <span className="text-[11px] text-slate-500 font-mono">v{product.version}</span>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition mb-2">
                          {product.name}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                          {product.shortDescription || product.description || 'Premium verified digital product asset ready for instant download.'}
                        </p>

                        {product.organization && (
                          <Link
                            href={`/business/${product.organization.slug}`}
                            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-indigo-300 mb-4 transition"
                          >
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            {product.organization.name}
                            {product.organization.verifiedSeller && (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            )}
                          </Link>
                        )}
                      </div>

                      <div className="p-6 pt-0 border-t border-slate-800/50 bg-slate-900/20 mt-auto flex items-center justify-between">
                        <div>
                          <div className="text-xs text-slate-400">Price</div>
                          <div className="text-lg font-extrabold text-white">
                            {product.price === 0 ? 'FREE' : `₹${product.price.toLocaleString()}`}
                          </div>
                        </div>

                        <Link
                          href={`/store/${product.organization?.slug || 'aadhyara'}`}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                        >
                          {product.type === 'SOFTWARE' ? <Key className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                          Get Access
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Courses Masterclasses Grid */}
            {data.courses.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-400" />
                    Courses & Accredited Masterclasses
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">{data.courses.length} courses</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.courses.map((course) => (
                    <div
                      key={course.id}
                      className="bg-slate-900/40 rounded-2xl border border-slate-800/80 hover:border-purple-500/40 transition overflow-hidden flex flex-col justify-between group"
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {course.level || 'All Levels'}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            5.0
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition mb-2">
                          {course.title}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                          {course.shortDescription || course.description}
                        </p>

                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>Instructor:</span>
                          <span className="text-slate-200 font-medium">{course.instructor?.name || 'Lead Master'}</span>
                        </div>
                      </div>

                      <div className="p-6 pt-0 border-t border-slate-800/50 bg-slate-900/20 mt-auto flex items-center justify-between">
                        <div>
                          <div className="text-xs text-slate-400">Enrollment</div>
                          <div className="text-lg font-extrabold text-white">
                            {course.price === 0 ? 'FREE' : `₹${course.price.toLocaleString()}`}
                          </div>
                        </div>

                        <Link
                          href={`/courses/${course.slug}`}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition shadow-md shadow-purple-600/20 flex items-center gap-1.5"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          View Course
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Services Grid */}
            {data.services.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-pink-400" />
                    Bespoke Professional Services
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">{data.services.length} available</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.services.map((service) => (
                    <div
                      key={service.id}
                      className="bg-slate-900/40 rounded-2xl border border-slate-800/80 hover:border-pink-500/40 transition overflow-hidden flex flex-col justify-between group"
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-pink-500/10 text-pink-400 border border-pink-500/20">
                            {service.category}
                          </span>
                          <span className="text-xs text-slate-400">
                            {service.deliveryDays} Days Delivery
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-white group-hover:text-pink-400 transition mb-2">
                          {service.name}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                          {service.shortDescription || service.description}
                        </p>

                        {service.organization && (
                          <Link
                            href={`/business/${service.organization.slug}`}
                            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-pink-300 mb-4 transition"
                          >
                            <span className="w-2 h-2 rounded-full bg-pink-500" />
                            {service.organization.name}
                          </Link>
                        )}
                      </div>

                      <div className="p-6 pt-0 border-t border-slate-800/50 bg-slate-900/20 mt-auto flex items-center justify-between">
                        <div>
                          <div className="text-xs text-slate-400">Starting From</div>
                          <div className="text-lg font-extrabold text-white">
                            ₹{service.price.toLocaleString()}
                          </div>
                        </div>

                        <Link
                          href={`/store/${service.organization?.slug || 'aadhyara'}`}
                          className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-medium text-xs transition shadow-md shadow-pink-600/20 flex items-center gap-1.5"
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                          Book Service
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {data.products.length === 0 && data.courses.length === 0 && data.services.length === 0 && (
              <div className="text-center py-20 bg-slate-900/20 rounded-3xl border border-slate-800/60 p-8">
                <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No offerings matched your query</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
                  Try clearing your search filters or browse across all categories.
                </p>
                <button
                  onClick={() => { setQuery(''); setActiveTab('ALL'); setSelectedCategory('ALL'); }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition shadow-lg"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <LandingFooter />
    </div>
  );
}

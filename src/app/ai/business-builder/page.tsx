'use client';

import React, { useState } from 'react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';
import {
  Sparkles,
  ShoppingBag,
  Briefcase,
  BookOpen,
  Code2,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Send,
  Layers,
  Globe,
  Sliders,
  DollarSign
} from 'lucide-react';

export default function AiBusinessBuilderPage() {
  const [prompt, setPrompt] = useState(
    'I am a fullstack web developer. I want to sell Next.js starter kits, SaaS source code, custom web development services, and a React masterclass.'
  );
  const [industry, setIndustry] = useState('Software & Tech');
  const [businessType, setBusinessType] = useState('Digital Commerce & Learning');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setPublishSuccess(false);

    try {
      const res = await fetch('/api/ai/business/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, industry, businessType })
      });

      const json = await res.json();
      if (json.businessPlan) {
        setResult(json.businessPlan);
      } else {
        alert(json.error || 'Generation failed');
      }
    } catch (err: any) {
      alert(err.message || 'Error connecting to AI architect');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = () => {
    setPublishSuccess(true);
    setTimeout(() => setPublishSuccess(false), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <PublicNavbar />

      {/* Header */}
      <section className="relative pt-32 pb-16 border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Autonomous AI Business Architect
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Build Your Entire <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Digital Business & Store</span> with AI
          </h1>
          <p className="mt-4 text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Describe your passion or profession. In seconds, AI scaffolds your products, services, courses, pricing, and website copy.
          </p>

          {/* Prompt Form */}
          <form onSubmit={handleGenerate} className="mt-8 max-w-3xl mx-auto text-left bg-slate-900/80 p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Describe your digital business idea & offerings:
              </label>
              <textarea
                required
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. I am a fitness coach wanting to sell workout templates, 1-on-1 coaching services, and nutritional meal plan guides..."
                className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Software & Tech">Software & Technology</option>
                  <option value="Graphic Design & Creative">Graphic Design & Creative</option>
                  <option value="Coaching & Consulting">Coaching & Consulting</option>
                  <option value="Marketing & Growth">Marketing & Growth</option>
                  <option value="Education & Academies">Education & Academies</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Business Model</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Digital Commerce & Learning">Full Hybrid (Products + Services + Courses)</option>
                  <option value="Software Systems">Software & Code Licenses</option>
                  <option value="Agency & Services">Bespoke Services & Agency</option>
                  <option value="Academy & Courses">Academy & Video Courses</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Synthesizing Business Architecture & Offerings...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Complete Business Plan & Catalog
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Generated Result Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full">
        {result && (
          <div className="space-y-10 animate-fade-in">
            {/* Business Header Overview */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <span className="text-xs uppercase tracking-wider text-indigo-400 font-bold">Generated Business Blueprint</span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">{result.businessName}</h2>
                <p className="text-sm text-slate-300 italic mt-1">"{result.tagline}"</p>
                <p className="text-xs text-slate-400 mt-3 max-w-2xl leading-relaxed">{result.description}</p>
              </div>

              <button
                onClick={handlePublish}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-xl shadow-emerald-600/30 flex items-center gap-2 shrink-0 transition"
              >
                <CheckCircle2 className="w-4 h-4" /> Apply Blueprint to Store
              </button>
            </div>

            {publishSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold text-center">
                🎉 Business architecture successfully saved! Products, services, and website copy staged for publishing.
              </div>
            )}

            {/* Generated Products Grid */}
            {result.products?.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                  <ShoppingBag className="w-5 h-5 text-indigo-400" />
                  Suggested Digital Products & Software
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.products.map((p: any, idx: number) => (
                    <div key={idx} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold text-[10px]">{p.type}</span>
                          <span className="text-white font-bold text-sm">₹{p.price.toLocaleString()}</span>
                        </div>
                        <h4 className="font-bold text-white text-sm mb-1">{p.name}</h4>
                        <p className="text-xs text-slate-400">{p.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generated Services Grid */}
            {result.services?.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                  <Briefcase className="w-5 h-5 text-pink-400" />
                  Suggested Bespoke Services
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.services.map((s: any, idx: number) => (
                    <div key={idx} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 font-bold text-[10px]">{s.pricingType}</span>
                          <span className="text-white font-bold text-sm">₹{s.price.toLocaleString()}</span>
                        </div>
                        <h4 className="font-bold text-white text-sm mb-1">{s.name}</h4>
                        <p className="text-xs text-slate-400">{s.description}</p>
                      </div>
                      <div className="mt-3 text-[11px] text-slate-500">{s.deliveryDays} Days Estimated Turnaround</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generated Masterclasses Grid */}
            {result.courses?.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  Suggested Academy Masterclasses
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.courses.map((c: any, idx: number) => (
                    <div key={idx} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold text-[10px]">{c.level}</span>
                          <span className="text-white font-bold text-sm">₹{c.price.toLocaleString()}</span>
                        </div>
                        <h4 className="font-bold text-white text-sm mb-1">{c.title}</h4>
                        <p className="text-xs text-slate-400">{c.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Website Copywriting Preview */}
            {result.website && (
              <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  High-Converting Website Copywriting
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 font-semibold uppercase">Hero Headline:</span>
                    <div className="text-sm font-bold text-white mt-1">{result.website.heroHeadline}</div>
                    <div className="text-slate-400 mt-1">{result.website.heroSubheadline}</div>
                  </div>

                  {result.website.faqs?.length > 0 && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="text-slate-500 font-semibold uppercase">Store FAQs:</span>
                      {result.website.faqs.map((faq: any, idx: number) => (
                        <div key={idx} className="pt-2 border-t border-slate-900">
                          <div className="font-bold text-slate-200">Q: {faq.question}</div>
                          <div className="text-slate-400 mt-0.5">A: {faq.answer}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <LandingFooter />
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

export default function AdminAiDashboardPage() {
  const { showToast } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/analytics');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskCopilot = async () => {
    if (!query.trim()) return;
    setIsQuerying(true);
    setQueryResult(null);
    try {
      const res = await fetch('/api/ai/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      if (res.ok) {
        setQueryResult(data.analysis);
      } else {
        showToast({ title: 'Query Failed', description: data.error || 'Failed to query analytics copilot', type: 'error' });
      }
    } catch {
      showToast({ title: 'Error', description: 'Network error querying AI copilot', type: 'error' });
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Icon name="sparkles" className="text-primary" size={26} />
            AI Platform & Copilot Studio
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Monitor multi-tenant AI usage, support assistant performance, and query business analytics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total AI Requests', value: stats?.totalRequests || 0, icon: 'zap', color: 'from-blue-500/20 to-indigo-500/20' },
          { label: 'Support Bot Chats', value: stats?.breakdown?.supportChats || 0, icon: 'message-square', color: 'from-emerald-500/20 to-teal-500/20' },
          { label: 'Course Generations', value: stats?.breakdown?.courseGenerations || 0, icon: 'book-open', color: 'from-purple-500/20 to-pink-500/20' },
          { label: 'Website Generations', value: stats?.breakdown?.websiteGenerations || 0, icon: 'layout', color: 'from-amber-500/20 to-orange-500/20' }
        ].map((kpi, idx) => (
          <div key={idx} className={`p-4 rounded-2xl bg-gradient-to-br ${kpi.color} border border-white/10 flex flex-col justify-between`}>
            <div className="flex items-center justify-between text-white/70 mb-2">
              <span className="text-xs font-semibold">{kpi.label}</span>
              <Icon name={kpi.icon as any} size={18} />
            </div>
            <span className="text-2xl font-black text-white">{kpi.value.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="p-5 rounded-2xl bg-[#0c1022] border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-primary font-bold text-sm">
          <Icon name="bot" size={18} />
          <span>Ask AI Business & Analytics Copilot</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskCopilot()}
            placeholder="e.g. How many active students do we have and what are the top performing courses?"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleAskCopilot}
            disabled={isQuerying || !query.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold disabled:opacity-50 transition-all"
          >
            {isQuerying ? <Icon name="loader" size={14} className="animate-spin" /> : <Icon name="send" size={14} />}
            <span>Query Copilot</span>
          </button>
        </div>

        {queryResult && (
          <div className="p-4 rounded-xl bg-black/40 border border-primary/20 text-xs text-white/90 leading-relaxed animate-in fade-in">
            <div className="font-bold text-primary mb-1.5 flex items-center gap-1.5">
              <Icon name="sparkles" size={14} /> AI Analysis:
            </div>
            {queryResult}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-[#0c1022] border border-white/10 space-y-4">
          <h3 className="font-bold text-sm text-white">AI Feature Suite Status</h3>
          <div className="space-y-2.5 text-xs">
            {[
              { label: 'AI Support Chatbot', desc: 'Context-aware floating student bot with RAG & human handoff', enabled: true },
              { label: 'AI Website Builder', desc: 'Structured JSON page & section designer with live preview', enabled: true },
              { label: 'AI Course & Syllabus Studio', desc: 'Automated curriculum, lesson, and assignment creator', enabled: true },
              { label: 'AI In-Player Student Tutor', desc: '1-on-1 lesson explanation in English, Hindi & Hinglish', enabled: true }
            ].map((feat, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{feat.label}</div>
                  <div className="text-[11px] text-white/50">{feat.desc}</div>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">Active</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0c1022] border border-white/10 space-y-4">
          <h3 className="font-bold text-sm text-white">Monthly Token Usage Quota</h3>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3 text-xs">
            <div className="flex justify-between font-semibold">
              <span className="text-white/60">Tokens Consumed This Month</span>
              <span className="text-primary font-bold">{stats?.setting?.tokensUsedThisMonth || 0} / {stats?.setting?.monthlyTokenQuota || 500000}</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round(((stats?.setting?.tokensUsedThisMonth || 0) / (stats?.setting?.monthlyTokenQuota || 500000)) * 100))}%` }}
              />
            </div>
            <p className="text-[11px] text-white/40">
              Quota automatically resets on the 1st of each calendar month. Upgrades available in SaaS Subscription Settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
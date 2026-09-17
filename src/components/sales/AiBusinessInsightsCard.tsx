'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface AiBusinessInsightsCardProps {
  insights: any[];
  onOpenAiAssistant: () => void;
}

export const AiBusinessInsightsCard: React.FC<AiBusinessInsightsCardProps> = ({
  insights,
  onOpenAiAssistant
}) => {
  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-purple-950/40 via-[#0a0d24] to-[#090d24] border border-purple-500/30 space-y-6 shadow-2xl relative overflow-hidden">
      {/* Glow Ambience */}
      <div className="absolute -top-10 -right-10 w-60 h-60 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h2 className="text-lg font-black text-white">MORENA TEACH AI Business Insights</h2>
            <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/30">
              Live Engine
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">AI continuously analyzed your storefront telemetry, checkout funnels and customer retention.</p>
        </div>

        <button
          type="button"
          onClick={onOpenAiAssistant}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
        >
          <span>Ask AI Copilot</span>
          <Icon name="arrow_forward" size={14} />
        </button>
      </div>

      {/* 3 Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
        {insights.map((ins) => (
          <div
            key={ins.id}
            className="p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-purple-500/40 transition-all duration-300 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="text-xs font-mono font-bold text-purple-300">
                {ins.badge}
              </div>
              <h3 className="text-sm font-extrabold text-white">
                {ins.title}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {ins.description}
              </p>
              {ins.recommendation && (
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] text-slate-300">
                  <strong className="text-purple-300">Recommendation:</strong> {ins.recommendation}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/5">
              <Link
                href={ins.actionUrl}
                className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-purple-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <span>{ins.actionText}</span>
                <Icon name="arrow_forward" size={12} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

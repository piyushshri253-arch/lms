'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { checkGrammar, GrammarSuggestion, GrammarCheckResult } from '@/lib/grammar/grammarEngine';

export interface GrammarHintAssistantProps {
  text: string;
  onApplyCorrection?: (correctedText: string) => void;
  fieldName?: string;
  className?: string;
  compact?: boolean;
}

export const GrammarHintAssistant: React.FC<GrammarHintAssistantProps> = ({
  text,
  onApplyCorrection,
  fieldName = 'Content',
  className = '',
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [aiChecking, setAiChecking] = useState(false);
  const [aiResult, setAiResult] = useState<GrammarCheckResult | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Instant Client-Side Grammar & Spell Check
  const heuristicResult = useMemo(() => {
    return checkGrammar(text || '');
  }, [text]);

  // Use AI result if available and text hasn't changed since scan
  const activeResult = aiResult || heuristicResult;
  const suggestions = activeResult.suggestions;
  const hasIssues = suggestions.length > 0;

  // Clear AI result if user changed text significantly
  useEffect(() => {
    setAiResult(null);
  }, [text]);

  // Click outside to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // 2. Apply single suggestion
  const handleApplySingle = (suggestion: GrammarSuggestion) => {
    if (!onApplyCorrection || !text) return;

    let updatedText = text;
    if (suggestion.startIndex !== undefined && suggestion.endIndex !== undefined) {
      const before = text.slice(0, suggestion.startIndex);
      const after = text.slice(suggestion.endIndex);
      updatedText = before + suggestion.suggestion + after;
    } else {
      // Fallback replace first occurrence
      updatedText = text.replace(suggestion.original, suggestion.suggestion);
    }

    onApplyCorrection(updatedText);

    // If only 1 suggestion was left, close popover
    if (suggestions.length <= 1) {
      setIsOpen(false);
    }
  };

  // 3. Apply all suggestions in one click
  const handleApplyAll = () => {
    if (!onApplyCorrection) return;
    onApplyCorrection(activeResult.correctedText);
    setIsOpen(false);
  };

  // 4. Trigger Deep AI Check via Gemini API
  const handleDeepAiCheck = async () => {
    if (!text.trim()) return;
    setAiChecking(true);
    try {
      const res = await fetch('/api/ai/grammar-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const data = await res.json();
        setAiResult({
          score: data.score || 95,
          status: data.status || 'clean',
          suggestions: data.suggestions || [],
          correctedText: data.correctedText || text
        });
        setIsOpen(true);
      }
    } catch {
      // fallback to heuristic check
    } finally {
      setAiChecking(false);
    }
  };

  if (!text || text.trim().length < 3) {
    return null;
  }

  // If in compact mode and there are no issues, remain hidden to avoid clutter
  if (compact && !hasIssues) {
    return null;
  }

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Trigger Button / Badge */}
      <div className="flex items-center gap-1.5">
        {hasIssues ? (
          compact ? (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 shadow-xs hover:bg-amber-100 dark:hover:bg-amber-900/60 transition cursor-pointer select-none shrink-0"
              title={`${suggestions.length} grammar & spelling hints found in ${fieldName}`}
            >
              <Icon name="auto_fix_high" size={11} className="text-amber-600 dark:text-amber-400" />
              <span>{suggestions.length} Hint{suggestions.length > 1 ? 's' : ''}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 shadow-xs hover:bg-amber-100 dark:hover:bg-amber-900/60 transition cursor-pointer select-none"
              title={`${suggestions.length} grammar & spelling hints found in ${fieldName}`}
            >
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <Icon name="auto_fix_high" size={13} className="text-amber-600 dark:text-amber-400" />
              <span>
                {suggestions.length} Grammar Hint{suggestions.length > 1 ? 's' : ''}
              </span>
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={handleDeepAiCheck}
            disabled={aiChecking}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 transition cursor-pointer select-none"
            title="Grammar and spelling look clean. Click for deep AI scan."
          >
            <Icon name="check_circle" size={12} className="text-emerald-600" />
            <span>{aiChecking ? 'Scanning...' : '✓ Grammar Clean'}</span>
          </button>
        )}
      </div>

      {/* Popover Suggestions Card */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-1.5 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3.5 text-slate-900 dark:text-white animate-in fade-in zoom-in-95 duration-150">
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950 text-violet-600 flex items-center justify-center font-bold text-xs">
                ✨
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Grammar &amp; Spell Hints
                </h4>
                <p className="text-[10px] text-slate-500">
                  {suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''} for {fieldName} • Quality Score: {activeResult.score}%
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Icon name="close" size={16} />
            </button>
          </div>

          {/* Suggestions List */}
          <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
            {suggestions.map((s, idx) => {
              const typeColor =
                s.type === 'spelling'
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                  : s.type === 'grammar'
                  ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300'
                  : s.type === 'punctuation'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300';

              return (
                <div
                  key={s.id || idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${typeColor}`}>
                      {s.type}
                    </span>
                    {onApplyCorrection && (
                      <button
                        type="button"
                        onClick={() => handleApplySingle(s)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-2xs"
                      >
                        <Icon name="check" size={12} />
                        <span>Accept Fix</span>
                      </button>
                    )}
                  </div>

                  {/* Word transformation */}
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="line-through text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                      {s.original}
                    </span>
                    <span className="text-slate-400">➔</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      {s.suggestion}
                    </span>
                  </div>

                  {/* Reason / Hint */}
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                    {s.reason}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={aiChecking}
              onClick={handleDeepAiCheck}
              className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Icon name="psychology" size={14} className={aiChecking ? 'animate-spin' : ''} />
              <span>{aiChecking ? 'AI Analyzing...' : 'Deep AI Scan'}</span>
            </button>

            {onApplyCorrection && hasIssues && (
              <button
                type="button"
                onClick={handleApplyAll}
                className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Icon name="done_all" size={14} />
                <span>Fix All ({suggestions.length})</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

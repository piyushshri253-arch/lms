'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface SetupProgressWidgetProps {
  checklist: {
    completedCount: number;
    totalCount: number;
    items: { id: string; title: string; done: boolean; action: string }[];
  };
}

export const SetupProgressWidget: React.FC<SetupProgressWidgetProps> = ({ checklist }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // If 100% complete, we can allow hiding
  const percent = Math.round((checklist.completedCount / Math.max(1, checklist.totalCount)) * 100);

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/50 via-[#0a0d24] to-[#090d24] border border-indigo-500/40 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-white">Get your business ready to launch</h3>
            <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
              {checklist.completedCount} / {checklist.totalCount} complete
            </span>
          </div>
          <p className="text-xs text-slate-400">Complete these critical setup tasks to launch your storefront and accept customer orders.</p>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <Icon name={isCollapsed ? 'expand_more' : 'expand_less'} size={18} />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Tasks List */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 animate-fadeIn">
          {checklist.items.map((task) => (
            <div
              key={task.id}
              className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                task.done
                  ? 'bg-white/[0.02] border-white/5 opacity-80'
                  : 'bg-white/[0.04] hover:bg-white/[0.07] border-white/15'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    task.done
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'border border-white/20 text-slate-500'
                  }`}
                >
                  {task.done ? '✓' : '○'}
                </span>
                <span className={`text-xs truncate ${task.done ? 'text-slate-400 line-through' : 'text-white font-semibold'}`}>
                  {task.title}
                </span>
              </div>

              {!task.done && (
                <Link
                  href={task.action}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 shrink-0 flex items-center gap-1"
                >
                  <span>Continue</span>
                  <Icon name="arrow_forward" size={12} />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

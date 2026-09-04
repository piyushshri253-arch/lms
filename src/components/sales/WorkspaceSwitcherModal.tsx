'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

interface WorkspaceSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkspace: any;
  workspaces: any[];
}

export const WorkspaceSwitcherModal: React.FC<WorkspaceSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentWorkspace,
  workspaces
}) => {
  const router = useRouter();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#090d24] border border-white/20 rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-sm font-extrabold text-white">Your Workspaces</h3>
            <p className="text-[11px] text-slate-400">Switch between isolated business accounts</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Workspaces List */}
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          {workspaces.map((ws) => {
            const isCurrent = ws.id === currentWorkspace?.id || ws.slug === currentWorkspace?.slug;

            return (
              <div
                key={ws.id || ws.slug}
                onClick={() => {
                  onClose();
                  if (!isCurrent) {
                    router.push(`/admin?workspace=${ws.slug}`);
                  }
                }}
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-md'
                    : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold text-sm shrink-0">
                    {ws.name?.charAt(0)?.toUpperCase() || 'W'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{ws.name}</div>
                    <div className="text-[10px] font-mono text-slate-400 truncate">
                      {ws.slug}.aadhyara.com
                    </div>
                  </div>
                </div>

                {isCurrent ? (
                  <span className="text-emerald-400 text-xs font-bold font-mono">✓ Active</span>
                ) : (
                  <span className="text-slate-500 text-xs font-medium group-hover:text-white">Switch →</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions Footer */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <Link
            href="/sales/onboarding"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/10"
          >
            <Icon name="add" size={16} />
            <span>+ Create New Workspace</span>
          </Link>

          <Link
            href="/admin/settings"
            onClick={onClose}
            className="w-full py-2 px-4 rounded-xl text-slate-400 hover:text-white text-center text-xs block transition-colors"
          >
            Workspace Settings
          </Link>
        </div>
      </div>
    </div>
  );
};

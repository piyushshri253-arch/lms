'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Icon } from '@/components/ui/Icon';
import { useRouter } from 'next/navigation';

export const SuperAdminSupportBanner: React.FC = () => {
  const { currentUser, showToast } = useApp();
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);

  if (!currentUser?.impersonatedBy) {
    return null;
  }

  const handleExitSupportMode = async () => {
    setIsExiting(true);
    try {
      const res = await fetch('/api/super-admin/students/exit-impersonation', {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        showToast({ title: 'Exited Support Mode', description: 'Restored Super Admin session.', type: 'info' });
        window.location.href = data.redirectUrl || '/super-admin';
      }
    } catch {
      window.location.href = '/super-admin';
    } finally {
      setIsExiting(false);
    }
  };

  return (
    <aside aria-label="Support mode banner" className="sticky top-0 z-[100] w-full bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white px-4 py-2.5 shadow-lg border-b border-amber-400/40 flex items-center justify-between text-xs font-bold animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-black/25 flex items-center justify-center shrink-0">
          <Icon name="shield" fill size={18} className="text-amber-200" />
        </div>
        <div>
          <span className="tracking-wider uppercase font-black text-amber-200 mr-2">
            SUPER ADMIN SUPPORT MODE
          </span>
          <span className="font-medium text-white/90">
            Viewing: <strong className="text-white font-extrabold">{currentUser.name}</strong> ({currentUser.email}) • Role: {currentUser.role}
          </span>
        </div>
      </div>

      <button
        onClick={handleExitSupportMode}
        disabled={isExiting}
        className="px-3.5 py-1.5 bg-black/40 hover:bg-black/60 text-white rounded-xl border border-white/20 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
      >
        <Icon name="logout" size={14} />
        <span>{isExiting ? 'Exiting...' : 'Exit Support Mode'}</span>
      </button>
    </aside>
  );
};

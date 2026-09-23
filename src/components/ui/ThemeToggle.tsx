'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';

interface ThemeToggleProps {
  variant?: 'icon' | 'pill';
  className?: string;
}

export function ThemeToggle({ variant = 'icon', className = '' }: ThemeToggleProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('mt_theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }

    const handleThemeChange = (e: any) => {
      const newTheme = e.detail?.theme;
      if (newTheme) {
        setTheme(newTheme);
      }
    };

    window.addEventListener('mt-theme-change', handleThemeChange);
    return () => window.removeEventListener('mt-theme-change', handleThemeChange);
  }, []);

  const toggleTheme = (targetTheme?: 'light' | 'dark') => {
    const nextTheme = targetTheme || (theme === 'dark' ? 'light' : 'dark');
    setTheme(nextTheme);
    localStorage.setItem('mt_theme', nextTheme);

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    window.dispatchEvent(
      new CustomEvent('mt-theme-change', { detail: { theme: nextTheme } })
    );
  };

  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 animate-pulse ${className}`}
      />
    );
  }

  // Pill / Segmented variant (Ideal for Dashboard Banners and Action Bars)
  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center p-1 rounded-2xl bg-surface-container-low/90 dark:bg-slate-800/90 border border-outline-variant/60 dark:border-slate-700 backdrop-blur-md shadow-xs transition-all ${className}`}
      >
        <button
          type="button"
          onClick={() => toggleTheme('light')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            theme === 'light'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
          title="Switch to Light Theme"
        >
          <Icon name="light_mode" size={15} className={theme === 'light' ? 'text-amber-500' : ''} />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => toggleTheme('dark')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-700'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
          title="Switch to Dark Theme"
        >
          <Icon name="dark_mode" size={15} className={theme === 'dark' ? 'text-indigo-400' : ''} />
          <span>Dark</span>
        </button>
      </div>
    );
  }

  // Default Icon variant (Ideal for Headers and Navigation Bars)
  return (
    <button
      type="button"
      onClick={() => toggleTheme()}
      className={`p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/80 transition-all cursor-pointer flex items-center justify-center relative group ${className}`}
      title={theme === 'dark' ? 'Switch to Light mode (☀️)' : 'Switch to Dark mode (🌙)'}
      aria-label="Toggle theme mode"
    >
      {theme === 'dark' ? (
        <Icon
          name="light_mode"
          size={20}
          className="text-amber-400 group-hover:rotate-45 transition-transform duration-300"
        />
      ) : (
        <Icon
          name="dark_mode"
          size={20}
          className="text-indigo-600 dark:text-indigo-400 group-hover:-rotate-12 transition-transform duration-300"
        />
      )}
    </button>
  );
}

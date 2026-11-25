'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

interface FinancePageHeaderProps {
  title: string;
  subtitle: string;
  activeTab?: string;
  badge?: string;
  dateFilter?: {
    range: string;
    onChange: (range: string) => void;
  };
  onRefresh?: () => void;
  onExport?: () => void;
  actions?: React.ReactNode;
}

export const FinancePageHeader: React.FC<FinancePageHeaderProps> = ({
  title,
  subtitle,
  badge,
  dateFilter,
  onRefresh,
  onExport,
  actions
}) => {
  const pathname = usePathname();
  const isAdminPortal = pathname?.startsWith('/admin');
  const portalRoot = isAdminPortal ? '/admin' : '/super-admin';
  const portalLabel = isAdminPortal ? 'Admin Console' : 'Super Admin';
  const financeRoot = isAdminPortal ? '/admin/finance' : '/super-admin/finance';

  return (
    <div className="flex flex-col gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href={portalRoot} className="hover:text-primary transition-colors">
              {portalLabel}
            </Link>
            <span>/</span>
            <Link href={financeRoot} className="hover:text-primary transition-colors font-medium">
              Accounts &amp; Finance
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">{title}</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-on-surface tracking-tight">
              {title}
            </h1>
            {badge && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-on-surface-variant mt-1 max-w-3xl">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {dateFilter && (
            <div className="flex items-center bg-surface-container rounded-xl p-1 border border-outline-variant/60 text-xs">
              <span className="px-2 py-1 text-[11px] font-mono font-bold text-outline">
                PERIOD:
              </span>
              {(['all', '7d', '30d', '90d', '1y'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => dateFilter.onChange(r)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    dateFilter.range === r
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {r === 'all' ? 'All Time' : r.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl border border-outline-variant/80 hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <Icon name="refresh" size={18} />
            </button>
          )}

          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-outline-variant/80 hover:bg-surface-container text-xs font-bold text-on-surface transition-colors cursor-pointer"
            >
              <Icon name="download" size={16} />
              <span>Export CSV</span>
            </button>
          )}

          {actions}
        </div>
      </div>
    </div>
  );
};

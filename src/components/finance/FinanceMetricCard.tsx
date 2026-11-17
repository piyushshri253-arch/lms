'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { formatINR } from '@/lib/finance-service';

interface FinanceMetricCardProps {
  label: string;
  value: number | string;
  isCurrency?: boolean;
  subtext?: string;
  icon: string;
  badge?: string;
  badgeType?: 'positive' | 'negative' | 'neutral' | 'primary';
  color?: 'primary' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'violet' | 'cyan';
  onClick?: () => void;
}

export const FinanceMetricCard: React.FC<FinanceMetricCardProps> = ({
  label,
  value,
  isCurrency = true,
  subtext,
  icon,
  badge,
  badgeType = 'neutral',
  color = 'primary',
  onClick
}) => {
  const displayValue = typeof value === 'number' && isCurrency ? formatINR(value) : value;

  const colorStyles = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    emerald: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-600 bg-rose-500/10 border-rose-500/20',
    indigo: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20',
    violet: 'text-violet-600 bg-violet-500/10 border-violet-500/20',
    cyan: 'text-cyan-600 bg-cyan-500/10 border-cyan-500/20'
  }[color];

  const badgeStyles = {
    positive: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    negative: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    neutral: 'bg-surface-container text-on-surface-variant border-outline-variant/60',
    primary: 'bg-primary/10 text-primary border-primary/20'
  }[badgeType];

  return (
    <div
      onClick={onClick}
      className={`bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/80 shadow-xs flex flex-col justify-between transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-primary/50 hover:shadow-sm group' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-bold text-on-surface-variant tracking-tight line-clamp-1">
            {label}
          </p>
          <h3 className="text-2xl font-black text-on-surface tracking-tight group-hover:text-primary transition-colors">
            {displayValue}
          </h3>
        </div>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${colorStyles}`}>
          <Icon name={icon} size={20} />
        </div>
      </div>

      {(subtext || badge) && (
        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-outline-variant/40 text-[11px]">
          {subtext && (
            <span className="text-on-surface-variant truncate font-medium">
              {subtext}
            </span>
          )}
          {badge && (
            <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[10px] border shrink-0 ${badgeStyles}`}>
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

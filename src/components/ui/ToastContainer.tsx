'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Icon } from './Icon';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              toast.type === 'success'
                ? 'bg-emerald-100 text-emerald-700'
                : toast.type === 'error'
                ? 'bg-error-container text-error'
                : 'bg-primary/10 text-primary'
            }`}
          >
            <Icon
              name={
                toast.type === 'success'
                  ? 'check_circle'
                  : toast.type === 'error'
                  ? 'error'
                  : 'info'
              }
              fill
              size={18}
            />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-on-surface">{toast.title}</h4>
            {toast.description && (
              <p className="text-xs text-on-surface-variant mt-0.5">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-outline hover:text-on-surface p-1 rounded-md transition-colors"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

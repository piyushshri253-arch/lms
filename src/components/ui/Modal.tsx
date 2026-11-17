'use client';

import React, { useEffect } from 'react';
import { Icon } from './Icon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
  size
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthKey = size || maxWidth || 'md';

  const maxWidthClass = {
    sm: 'max-w-[480px]',
    md: 'max-w-[580px]',
    lg: 'max-w-[720px]',
    xl: 'max-w-[900px]',
    '2xl': 'max-w-[1050px]',
    '4xl': 'max-w-[1200px]',
    '5xl': 'max-w-[1300px]',
    '6xl': 'max-w-[1400px]'
  }[widthKey] || 'max-w-[900px]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-scrim/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full ${maxWidthClass} max-h-[90vh] flex flex-col bg-surface-container-lowest border border-outline-variant/80 rounded-3xl shadow-xl z-10 overflow-hidden animate-scale-in`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/60 shrink-0">
          <div>
            <h2 className="text-xl font-black text-on-surface tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-on-surface-variant mt-0.5 font-medium">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

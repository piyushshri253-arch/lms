'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';

interface InvoicePrintButtonProps {
  className?: string;
  label?: string;
}

export const InvoicePrintButton: React.FC<InvoicePrintButtonProps> = ({
  className = "flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#1c1d1f] hover:bg-black rounded-lg transition-all shadow-md cursor-pointer",
  label = "Print Invoice / Save PDF"
}) => {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <button
      onClick={handlePrint}
      className={className}
      aria-label="Print or save invoice as PDF"
      type="button"
    >
      <Icon name="print" size={16} />
      <span>{label}</span>
    </button>
  );
};

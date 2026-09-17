'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

export interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: {
    id?: string;
    certificateNumber?: string;
    studentName?: string;
    courseTitle?: string;
    instructorName?: string;
    issuedAt?: string;
  } | null;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  certificate
}) => {
  const { showToast } = useApp();

  if (!isOpen || !certificate) return null;

  const certNumber = certificate.certificateNumber || `TEACH-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  const student = certificate.studentName || 'Verified Student';
  const course = certificate.courseTitle || 'Masterclass Curriculum';
  const instructor = certificate.instructorName || 'Lead Academic Faculty';
  const dateStr = certificate.issuedAt
    ? new Date(certificate.issuedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const link = `${window.location.origin}/certificate/${certNumber}`;
      navigator.clipboard?.writeText(link);
      showToast({
        title: 'Verification Link Copied',
        description: 'Shareable certificate link copied to clipboard.',
        type: 'success'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col my-8">
        {/* Modal Top Bar (Hidden on print) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#f7f9fa]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#2d2f31]">
              Verified Certificate of Completion
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2d2f31] hover:text-[#5022c3] hover:bg-white rounded border border-gray-200 transition-colors cursor-pointer"
            >
              <Icon name="content_copy" size={14} />
              <span>Copy Link</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#5022c3] hover:bg-[#3b198f] rounded transition-colors shadow-xs cursor-pointer"
            >
              <Icon name="print" size={14} />
              <span>Print / Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-[#1c1d1f] rounded-lg hover:bg-gray-100 transition-colors ml-2 cursor-pointer"
              aria-label="Close modal"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        {/* Certificate Canvas (Printable Target) */}
        <div id="printable-certificate" className="p-8 sm:p-12 bg-gradient-to-br from-amber-50/20 via-white to-amber-50/10 relative selection:bg-none">
          {/* Double Ornate Border */}
          <div className="border-4 border-[#1c1d1f] p-6 sm:p-10 relative rounded-sm bg-white shadow-inner">
            <div className="border border-amber-600/40 p-6 sm:p-8 relative text-center">
              {/* Corner Ornaments */}
              <div className="absolute top-2 left-2 text-amber-700/60 font-serif text-xs select-none">❖</div>
              <div className="absolute top-2 right-2 text-amber-700/60 font-serif text-xs select-none">❖</div>
              <div className="absolute bottom-2 left-2 text-amber-700/60 font-serif text-xs select-none">❖</div>
              <div className="absolute bottom-2 right-2 text-amber-700/60 font-serif text-xs select-none">❖</div>

              {/* Certificate Header */}
              <div className="flex flex-col items-center justify-center space-y-1">
                <div className="flex items-center gap-2">
                  <img
                    src="/logo.png"
                    alt="Morena Teach"
                    className="h-14 w-auto object-contain"
                  />
                  <span className="text-xl font-black tracking-wider" style={{ color: '#183257' }}>
                    Morena Teach
                  </span>
                </div>
                <p className="text-[10px] font-bold tracking-normal" style={{ color: '#9190b3' }}>
                  Teacher Excellence early childhood hub
                </p>
              </div>

              {/* Certificate Title */}
              <div className="my-6">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-amber-700">
                  Certificate of Achievement
                </h2>
                <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent mx-auto my-2" />
                <p className="text-xs italic text-gray-500 font-serif">
                  This official credential certifies that
                </p>
              </div>

              {/* Student Name */}
              <div className="my-4">
                <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1c1d1f] font-serif tracking-wide border-b border-gray-300 pb-2 max-w-lg mx-auto">
                  {student}
                </h1>
              </div>

              {/* Course Description */}
              <div className="my-4 max-w-lg mx-auto space-y-2">
                <p className="text-xs text-gray-600 font-serif leading-relaxed">
                  has successfully completed all rigorous modules, assessments, and practical exercises for
                </p>
                <h3 className="text-lg sm:text-xl font-bold text-[#5022c3] leading-snug">
                  {course}
                </h3>
              </div>

              {/* Bottom Signatures & Seal */}
              <div className="mt-10 pt-6 border-t border-gray-100 grid grid-cols-3 items-end text-center">
                {/* Instructor Signature */}
                <div className="flex flex-col items-center">
                  <div className="font-serif italic text-base sm:text-lg text-gray-800 border-b border-gray-400 pb-1 w-32 sm:w-44 truncate">
                    {instructor}
                  </div>
                  <span className="text-[10px] font-bold uppercase text-gray-500 mt-1">
                    Lead Faculty Instructor
                  </span>
                </div>

                {/* Gold Seal Emblem */}
                <div className="flex flex-col items-center justify-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 p-0.5 shadow-md flex items-center justify-center">
                    <div className="w-full h-full rounded-full border-2 border-dashed border-amber-900/40 flex flex-col items-center justify-center text-center p-1 bg-amber-50">
                      <Icon name="verified" size={20} className="text-amber-800" />
                      <span className="text-[8px] font-extrabold uppercase text-amber-900 leading-tight mt-0.5">
                        MORENA TEACH SEAL
                      </span>
                    </div>
                  </div>
                </div>

                {/* Issue Date & Verification */}
                <div className="flex flex-col items-center">
                  <div className="font-serif text-sm text-gray-800 border-b border-gray-400 pb-1 w-32 sm:w-44">
                    {dateStr}
                  </div>
                  <span className="text-[10px] font-bold uppercase text-gray-500 mt-1">
                    Date of Issuance
                  </span>
                </div>
              </div>

              {/* Certificate Meta ID */}
              <div className="mt-8 pt-4 border-t border-gray-200/60 flex flex-col sm:flex-row items-center justify-between text-[10px] text-gray-400 font-mono">
                <span>Credential ID: <strong className="text-gray-600">{certNumber}</strong></span>
                <span>Verify at: teach.hub/certificate/{certNumber}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="flex min-h-full items-center justify-center py-2 sm:py-6">
        <div className="relative w-full max-w-3xl bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col my-auto animate-in zoom-in-95 duration-200">
          {/* Modal Top Bar (Hidden on print) */}
          <div className="print:hidden flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-[#f7f9fa]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#2d2f31]">
                Verified Certificate of Completion
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#2d2f31] hover:text-[#5022c3] hover:bg-white rounded border border-gray-200 transition-colors cursor-pointer bg-white"
              >
                <Icon name="content_copy" size={14} />
                <span>Copy Link</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-[#5022c3] hover:bg-[#3b198f] rounded transition-colors shadow-xs cursor-pointer"
              >
                <Icon name="print" size={14} />
                <span>Print / Download PDF</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-gray-500 hover:text-[#1c1d1f] rounded-lg hover:bg-gray-100 transition-colors ml-1 cursor-pointer"
                aria-label="Close modal"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
          </div>

          {/* Certificate Canvas (Printable Target) */}
          <div id="printable-certificate" className="p-4 sm:p-8 md:p-12 bg-gradient-to-br from-amber-50/20 via-white to-amber-50/10 relative selection:bg-none">
            {/* Double Ornate Border */}
            <div className="border-2 sm:border-4 border-[#1c1d1f] p-3 sm:p-6 md:p-10 relative rounded-sm bg-white shadow-inner">
              <div className="border border-amber-600/40 p-3 sm:p-6 md:p-8 relative text-center">
                {/* Corner Ornaments */}
                <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 text-amber-700/60 font-serif text-xs select-none">❖</div>
                <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 text-amber-700/60 font-serif text-xs select-none">❖</div>
                <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 text-amber-700/60 font-serif text-xs select-none">❖</div>
                <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 text-amber-700/60 font-serif text-xs select-none">❖</div>

                {/* Certificate Header */}
                <div className="flex flex-col items-center justify-center space-y-1">
                  <div className="flex items-center gap-2">
                    <img
                      src="/logo.png"
                      alt="Morena Teach"
                      className="h-10 sm:h-14 w-auto object-contain"
                    />
                    <span className="text-lg sm:text-xl font-black tracking-wider" style={{ color: '#183257' }}>
                      Morena Teach
                    </span>
                  </div>
                  <p className="text-xs sm:text-[13px] font-bold tracking-normal" style={{ color: '#9190b3' }}>
                    Teacher Excellence Hub
                  </p>
                </div>

                {/* Certificate Title */}
                <div className="my-4 sm:my-6">
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-amber-700">
                    Certificate of Achievement
                  </h2>
                  <div className="w-20 sm:w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent mx-auto my-1.5 sm:my-2" />
                  <p className="text-[11px] sm:text-xs italic text-gray-500 font-serif">
                    This official credential certifies that
                  </p>
                </div>

                {/* Student Name */}
                <div className="my-2.5 sm:my-4">
                  <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-[#1c1d1f] font-serif tracking-wide border-b border-gray-300 pb-1.5 sm:pb-2 max-w-lg mx-auto">
                    {student}
                  </h1>
                </div>

                {/* Course Description */}
                <div className="my-2.5 sm:my-4 max-w-lg mx-auto space-y-1.5 sm:space-y-2">
                  <p className="text-[11px] sm:text-xs text-gray-600 font-serif leading-relaxed">
                    has successfully completed all rigorous modules, assessments, and practical exercises for
                  </p>
                  <h3 className="text-base sm:text-xl font-bold text-[#5022c3] leading-snug">
                    {course}
                  </h3>
                </div>

                {/* Bottom Signatures & Seal */}
                <div className="mt-6 sm:mt-10 pt-4 sm:pt-6 border-t border-gray-100 grid grid-cols-3 items-end text-center gap-1 sm:gap-2">
                  {/* Instructor Signature */}
                  <div className="flex flex-col items-center">
                    <div className="font-serif italic text-xs sm:text-base md:text-lg text-gray-800 border-b border-gray-400 pb-1 w-20 sm:w-32 md:w-44 truncate">
                      {instructor}
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-bold uppercase text-gray-500 mt-1">
                      Lead Faculty Instructor
                    </span>
                  </div>

                  {/* Gold Seal Emblem */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 p-0.5 shadow-md flex items-center justify-center">
                      <div className="w-full h-full rounded-full border-2 border-dashed border-amber-900/40 flex flex-col items-center justify-center text-center p-0.5 sm:p-1 bg-amber-50">
                        <Icon name="verified" size={18} className="text-amber-800 sm:text-[20px]" />
                        <span className="text-[6px] sm:text-[8px] font-extrabold uppercase text-amber-900 leading-tight mt-0.5">
                          MORENA TEACH SEAL
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Issue Date & Verification */}
                  <div className="flex flex-col items-center">
                    <div className="font-serif text-xs sm:text-sm text-gray-800 border-b border-gray-400 pb-1 w-20 sm:w-32 md:w-44">
                      {dateStr}
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-bold uppercase text-gray-500 mt-1">
                      Date of Issuance
                    </span>
                  </div>
                </div>

                {/* Certificate Meta ID */}
                <div className="mt-5 sm:mt-8 pt-3 sm:pt-4 border-t border-gray-200/60 flex flex-col sm:flex-row items-center justify-between text-[9px] sm:text-[10px] text-gray-400 font-mono gap-1">
                  <span>Credential ID: <strong className="text-gray-600">{certNumber}</strong></span>
                  <span>Verify at: teach.hub/certificate/{certNumber}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

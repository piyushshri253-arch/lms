'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export interface PublicCertificateCardProps {
  certificateNumber: string;
  studentName: string;
  courseTitle: string;
  instructorName?: string;
  issuedAt?: string | Date;
  courseSlug?: string;
  isValid?: boolean;
}

export const PublicCertificateCard: React.FC<PublicCertificateCardProps> = ({
  certificateNumber,
  studentName,
  courseTitle,
  instructorName = 'aarav sharma',
  issuedAt,
  courseSlug,
  isValid = true
}) => {
  const [copied, setCopied] = useState(false);

  const dateStr = issuedAt
    ? new Date(issuedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-3 sm:p-6 antialiased selection:bg-amber-100">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .no-print, header, footer, nav {
                display: none !important;
              }
              #printable-certificate {
                padding: 0 !important;
                margin: 0 auto !important;
                width: 100% !important;
                max-width: 100% !important;
                box-shadow: none !important;
              }
            }
          `
        }}
      />

      {/* Main Certificate Card Wrapper (Matches CertificateModal 100%) */}
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col my-4 sm:my-8">
        {/* Top Bar (Hidden on print) */}
        <div className="no-print print:hidden flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-gray-200 bg-[#f7f9fa]">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isValid ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-[#2d2f31]">
              {isValid ? 'Verified Certificate of Completion' : 'Revoked Certificate'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#2d2f31] hover:text-[#5022c3] hover:bg-white rounded-lg border border-gray-200 transition-colors cursor-pointer bg-white shadow-xs"
              title="Copy shareable certificate verification link"
            >
              <Icon name={copied ? 'check' : 'content_copy'} size={14} className={copied ? 'text-emerald-600' : ''} />
              <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#5022c3] hover:bg-[#3b198f] rounded-lg transition-colors shadow-xs cursor-pointer"
              title="Print or download high-resolution PDF certificate"
            >
              <Icon name="print" size={14} />
              <span>Print / Download PDF</span>
            </button>
          </div>
        </div>

        {/* Certificate Canvas (Printable Target - Exactly matches CertificateModal) */}
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
                <p className="text-[13px] font-bold tracking-normal" style={{ color: '#9190b3' }}>
                  Teacher Excellence Hub
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
                  {studentName}
                </h1>
              </div>

              {/* Course Description */}
              <div className="my-4 max-w-lg mx-auto space-y-2">
                <p className="text-xs text-gray-600 font-serif leading-relaxed">
                  has successfully completed all rigorous modules, assessments, and practical exercises for
                </p>
                <h3 className="text-lg sm:text-xl font-bold text-[#5022c3] leading-snug">
                  {courseTitle}
                </h3>
              </div>

              {/* Bottom Signatures & Seal */}
              <div className="mt-10 pt-6 border-t border-gray-100 grid grid-cols-3 items-end text-center">
                {/* Instructor Signature */}
                <div className="flex flex-col items-center">
                  <div className="font-serif italic text-base sm:text-lg text-gray-800 border-b border-gray-400 pb-1 w-32 sm:w-44 truncate">
                    {instructorName}
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
              <div className="mt-8 pt-4 border-t border-gray-200/60 flex flex-col sm:flex-row items-center justify-between text-[10px] text-gray-400 font-mono gap-1">
                <span>Credential ID: <strong className="text-gray-600">{certificateNumber}</strong></span>
                <span>Verify at: teach.hub/certificate/{certificateNumber}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Helpful Navigation Bar (Hidden on print) */}
        <div className="no-print print:hidden px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <span>Official verifiable credential issued by Morena Teach Academy.</span>
          <div className="flex items-center gap-3">
            {courseSlug && (
              <Link
                href={`/courses/${courseSlug}`}
                className="text-[#5022c3] hover:underline font-bold"
              >
                View Course Curriculum →
              </Link>
            )}
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 hover:underline"
            >
              Platform Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

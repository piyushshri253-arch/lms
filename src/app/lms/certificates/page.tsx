'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LMS_ROUTES } from '@/lib/lms-routes';
import { LmsLayout } from '@/components/lms/LmsLayout';

export default function LmsCertificatesPage() {
  const [certificates] = useState([
    {
      id: 'cert-1',
      certificateNumber: 'CERT-2026-NXT16-9842',
      courseTitle: 'Full-Stack Next.js 16 Masterclass',
      issueDate: 'August 24, 2026',
      grade: '98% (Distinction)',
      issuer: 'MORENA TEACH Academic Board',
      downloadUrl: '#'
    },
    {
      id: 'cert-2',
      certificateNumber: 'CERT-2026-AI99-4412',
      courseTitle: 'Enterprise AI Agents & LLM Integration',
      issueDate: 'July 15, 2026',
      grade: '95% (Distinction)',
      issuer: 'MORENA TEACH Academic Board',
      downloadUrl: '#'
    }
  ]);

  return (
    <LmsLayout activePath={LMS_ROUTES.CERTIFICATES} pageTitle="Certificates">
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.03] p-6 rounded-3xl border border-emerald-500/20 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 mb-1">
              <Link href={LMS_ROUTES.DASHBOARD} className="hover:text-emerald-400 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-emerald-400">Verified Credentials</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              My Verified Certificates
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Cryptographically verified graduation credentials and competency badges.
            </p>
          </div>

          <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-300 flex items-center gap-2 self-start sm:self-auto">
            <span>🛡</span>
            <span>All credentials tamper-proof verified</span>
          </div>
        </div>

        {/* Certificates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="p-6 rounded-3xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-emerald-500/30 hover:border-emerald-500/60 transition-all flex flex-col justify-between space-y-6 shadow-2xl group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-xl">
                    🎖
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    {cert.grade}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-white group-hover:text-emerald-300 transition-colors">
                    {cert.courseTitle}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Issued by {cert.issuer}</p>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1 font-mono text-[11px]">
                  <div className="text-slate-400 flex justify-between">
                    <span>Credential ID:</span>
                    <span className="text-emerald-300 font-bold">{cert.certificateNumber}</span>
                  </div>
                  <div className="text-slate-400 flex justify-between">
                    <span>Issue Date:</span>
                    <span className="text-white">{cert.issueDate}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center gap-3">
                <Link
                  href={LMS_ROUTES.CERTIFICATE_VIEW(cert.certificateNumber)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <Icon name="visibility" size={16} />
                  <span>View Full Certificate</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </LmsLayout>
  );
}

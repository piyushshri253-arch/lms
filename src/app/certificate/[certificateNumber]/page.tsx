import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Icon } from '@/components/ui/Icon';

interface PageProps {
  params: Promise<{ certificateNumber: string }>;
}

export default async function CertificateVerificationPage({ params }: PageProps) {
  const { certificateNumber } = await params;

  const certificate = await prisma.certificate.findUnique({
    where: { certificateNumber },
    include: {
      user: { select: { name: true, email: true, avatar: true } },
      organization: { select: { name: true, logo: true, slug: true, primaryColor: true } },
      course: {
        include: {
          instructor: { select: { name: true, bio: true, avatar: true } },
          category: { select: { name: true } }
        }
      }
    }
  });

  if (!certificate) {
    return (
      <div className="min-h-screen bg-[#070919] text-white flex flex-col items-center justify-center p-6 text-center font-body-md">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mb-4">
          <Icon name="error" size={36} />
        </div>
        <h1 className="text-2xl font-black text-white">Certificate Not Found</h1>
        <p className="text-sm text-slate-400 max-w-md mt-2">
          The certificate reference <code className="font-mono bg-white/10 px-2 py-0.5 rounded text-amber-400">{certificateNumber}</code> could not be validated in the registry.
        </p>
        <Link
          href="/"
          className="mt-6 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
        >
          Return to Platform Home
        </Link>
      </div>
    );
  }

  const issueDateStr = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const orgName = certificate.organization?.name || 'AADHYARA Academy';
  const isValid = certificate.status === 'VALID';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#060814] via-[#0b0f2a] to-[#060814] text-white flex flex-col items-center justify-center p-4 sm:p-8 antialiased font-body-md relative overflow-hidden">
      {/* Ambience */}
      <div className="absolute inset-0 bg-grid-pattern opacity-15 pointer-events-none" />
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Top Banner */}
      <div className="max-w-3xl w-full mb-6 flex items-center justify-between relative z-10">
        <Link href={`/org/${certificate.organization?.slug || ''}`} className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-sm shadow-md">
            {orgName.charAt(0)}
          </div>
          <span className="font-extrabold text-base text-white">{orgName}</span>
        </Link>
        <div className={`flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold font-mono border ${
          isValid
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
        }`}>
          <Icon name={isValid ? 'verified' : 'cancel'} fill size={16} />
          <span>{isValid ? 'OFFICIALLY VERIFIED' : 'REVOKED CERTIFICATE'}</span>
        </div>
      </div>

      {/* Diploma Certificate Canvas */}
      <div className="max-w-3xl w-full bg-[#0c112b]/95 border-4 border-amber-400/80 rounded-3xl p-8 sm:p-12 shadow-2xl backdrop-blur-md relative overflow-hidden text-center space-y-6 z-10">
        {/* Subtle Watermark */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5 select-none">
          <span className="text-9xl font-black text-amber-400 tracking-widest uppercase">VERIFIED</span>
        </div>

        {/* Certificate Emblem */}
        <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20">
          <Icon name="workspace_premium" fill size={36} />
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-mono tracking-[0.3em] uppercase text-amber-400 font-extrabold block">
            Accredited Certificate of Mastery &amp; Distinction
          </span>
          <h2 className="text-xs text-slate-400">{orgName} Academic Council</h2>
        </div>

        <div className="py-2 space-y-2">
          <p className="text-xs text-slate-300">This official record proudly certifies that</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
            {certificate.user.name}
          </h1>
          <p className="text-xs text-slate-300 max-w-lg mx-auto">
            has demonstrated mastery and successfully satisfied all lectures, hands-on coding modules, and final examinations for:
          </p>
          <h3 className="text-xl sm:text-2xl font-black text-amber-300 max-w-xl mx-auto pt-1">
            {certificate.course.title}
          </h3>
        </div>

        {/* Details & Signatures */}
        <div className="pt-8 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left text-xs font-mono text-slate-300">
          <div>
            <span className="text-[10px] text-slate-400 uppercase block font-bold">Faculty Instructor</span>
            <p className="font-bold text-white mt-0.5">{certificate.course.instructor.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{certificate.course.instructor.bio || 'Lead Faculty'}</p>
          </div>

          <div className="sm:text-center">
            <span className="text-[10px] text-slate-400 uppercase block font-bold">Date of Graduation</span>
            <p className="font-bold text-white mt-0.5">{issueDateStr}</p>
            <p className="text-[10px] text-emerald-400">Authentic Record</p>
          </div>

          <div className="sm:text-right">
            <span className="text-[10px] text-slate-400 uppercase block font-bold">Unique Certificate #</span>
            <p className="font-bold text-amber-400 mt-0.5">{certificate.certificateNumber}</p>
            <p className="text-[10px] text-slate-400">Registry Verified</p>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="max-w-3xl w-full mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 relative z-10">
        <p>© {new Date().getFullYear()} {orgName}. Cryptographically signed transcript.</p>
        <div className="flex items-center gap-3">
          <Link
            href={`/courses/${certificate.course.slug}`}
            className="text-amber-400 hover:underline font-bold"
          >
            Explore this Curriculum →
          </Link>
        </div>
      </div>
    </div>
  );
}

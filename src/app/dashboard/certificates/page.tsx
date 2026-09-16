'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

export default function StudentCertificatesPage() {
  const { currentUser, showToast } = useApp();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCertificates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/student/certificates');
      if (res.ok) {
        const d = await res.json();
        setCertificates(d.certificates || []);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/dashboard" className="hover:text-primary">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Certificates</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Accredited Diplomas &amp; Credentials
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Verified diplomas issued by Morena Teach upon 100% curriculum completion
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-3 py-1 bg-amber-500/10 text-amber-800 rounded-full border border-amber-500/20">
            {certificates.length} Total Diplomas
          </span>
        </div>
      </div>

      {/* Certificates Grid */}
      {certificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs p-6 space-y-4 hover:border-primary/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Certificate Badge Header */}
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    <Icon name="workspace_premium" fill size={26} />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Verified
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-base text-on-surface line-clamp-2">
                    {cert.course.title}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Instructor: <span className="font-bold text-on-surface">{cert.course.instructor?.name}</span>
                  </p>
                </div>

                <div className="p-3 bg-surface-container-low rounded-xl text-xs space-y-1 font-mono">
                  <div className="flex justify-between text-outline">
                    <span>Certificate #:</span>
                    <span className="font-bold text-primary">{cert.certificateNumber}</span>
                  </div>
                  <div className="flex justify-between text-outline">
                    <span>Issue Date:</span>
                    <span className="text-on-surface">{cert.issuedAt}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-outline-variant/40 flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedCert(cert);
                    setIsModalOpen(true);
                  }}
                  className="flex-1 py-2 bg-primary text-on-primary hover:bg-primary-container rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Icon name="visibility" size={16} />
                  <span>View Diploma</span>
                </button>

                <Link
                  href={`/certificate/${cert.certificateNumber}`}
                  target="_blank"
                  className="p-2 border border-outline-variant hover:border-primary text-outline hover:text-primary rounded-xl cursor-pointer transition-colors"
                  title="Public Verification Link"
                >
                  <Icon name="open_in_new" size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface-container-lowest p-12 rounded-3xl border border-outline-variant/80 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto font-bold">
            <Icon name="workspace_premium" size={28} />
          </div>
          <h3 className="font-bold text-base text-on-surface">No certificates earned yet</h3>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto">
            Complete 100% of all lectures and assignments in any enrolled course to claim your verified diploma!
          </p>
          <Link
            href="/dashboard/courses"
            className="inline-block px-5 py-2 bg-primary text-on-primary rounded-xl font-bold text-xs shadow-xs"
          >
            Continue Enrolled Courses
          </Link>
        </div>
      )}

      {/* Diploma Modal (Large 720px) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="lg"
        title="Verified Diploma of Completion"
        subtitle={`Accredited Diploma #${selectedCert?.certificateNumber}`}
      >
        {selectedCert && (
          <div className="space-y-6">
            {/* Diploma Canvas */}
            <div
              id="printable-diploma"
              className="p-8 sm:p-10 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl border-4 border-amber-400/80 shadow-2xl relative overflow-hidden text-center space-y-4"
            >
              <div className="w-14 h-14 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center mx-auto font-bold shadow-lg">
                <Icon name="workspace_premium" fill size={32} />
              </div>

              <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-amber-400 font-extrabold block">
                Certificate of Technical Mastery
              </span>

              <p className="text-xs text-slate-300">This certifies that</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide font-display">
                {currentUser?.name || selectedCert.studentName || 'Learner'}
              </h2>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                has successfully fulfilled all curriculum requirements, code labs, and examinations for
              </p>

              <h3 className="text-lg sm:text-xl font-black text-amber-300 max-w-lg mx-auto">
                {selectedCert.course.title}
              </h3>

              <div className="pt-6 border-t border-slate-700/60 flex justify-between items-end text-left text-xs font-mono text-slate-300">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Faculty Lead</p>
                  <p className="font-bold text-white mt-0.5">{selectedCert.course.instructor?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Verification ID</p>
                  <p className="font-bold text-amber-400 mt-0.5">{selectedCert.certificateNumber}</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between">
              <Link
                href={`/certificate/${selectedCert.certificateNumber}`}
                target="_blank"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span>Open Public Verification Link</span>
                <Icon name="open_in_new" size={14} />
              </Link>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-outline-variant cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handlePrint}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Icon name="print" size={16} />
                  <span>Print Diploma</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


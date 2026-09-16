'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useAdmin } from '@/context/AdminContext';
import { useApp } from '@/context/AppContext';

function CertificatesPageContent() {
  const searchParams = useSearchParams();
  const { hasPermission, activeFacility } = useAdmin();
  const { showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'issued' | 'pending' | 'templates' | 'verify'>('issued');
  const [searchQuery, setSearchQuery] = useState('');
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [verifyQuery, setVerifyQuery] = useState('');
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [hasSearchedVerify, setHasSearchedVerify] = useState(false);

  // Form State
  const [issueForm, setIssueForm] = useState({
    studentName: '',
    courseTitle: 'Full-Stack Next.js 15 & Turbopack Masterclass',
    grade: 'A+ (Distinction)',
    date: new Date().toISOString().slice(0, 10)
  });

  const [certificates, setCertificates] = useState<any[]>([
    {
      id: 'cert-1',
      certificateNumber: 'CERT-2026-98124',
      studentName: 'Amit Verma',
      studentEmail: 'amit@example.com',
      courseTitle: 'Full-Stack Next.js 15 & Turbopack Masterclass',
      issuedAt: '14 Sept 2026',
      grade: 'Distinction (94%)',
      status: 'ISSUED'
    },
    {
      id: 'cert-2',
      certificateNumber: 'CERT-2026-98123',
      studentName: 'Priya Patel',
      studentEmail: 'priya@example.com',
      courseTitle: 'Production AI Agents with LangChain & LangGraph',
      issuedAt: '12 Sept 2026',
      grade: 'Honors (98%)',
      status: 'ISSUED'
    },
    {
      id: 'cert-3',
      certificateNumber: 'CERT-2026-98122',
      studentName: 'Vikram Singh',
      studentEmail: 'vikram@example.com',
      courseTitle: 'Modern Distributed Systems with Go & gRPC',
      issuedAt: '08 Sept 2026',
      grade: 'Pass (88%)',
      status: 'ISSUED'
    }
  ]);

  const [pendingCertificates, setPendingCertificates] = useState<any[]>([
    {
      id: 'p-cert-1',
      studentName: 'Ananya Roy',
      studentEmail: 'ananya@example.com',
      courseTitle: 'Advanced Cloud Architecture on AWS',
      completedAt: '13 Sept 2026',
      quizScore: 92
    },
    {
      id: 'p-cert-2',
      studentName: 'Rohan Mehta',
      studentEmail: 'rohan@example.com',
      courseTitle: 'Enterprise PostgreSQL Optimization',
      completedAt: '14 Sept 2026',
      quizScore: 89
    }
  ]);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'pending') setActiveTab('pending');
    const tab = searchParams.get('tab');
    if (tab === 'templates') setActiveTab('templates');
    else if (tab === 'verify') setActiveTab('verify');
    const action = searchParams.get('action');
    if (action === 'issue' && hasPermission('certificate.issue')) {
      setIsIssueModalOpen(true);
    }
  }, [searchParams, hasPermission]);

  // RBAC Access Guard: certificate.view
  if (!hasPermission('certificate.view')) {
    return (
      <div className="p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-3xl space-y-3 max-w-lg mx-auto mt-12">
        <div className="w-12 h-12 rounded-full bg-error-container/30 text-error flex items-center justify-center mx-auto">
          <Icon name="lock" size={24} />
        </div>
        <h2 className="text-base font-extrabold text-on-surface">Access Denied</h2>
        <p className="text-xs text-outline">
          Your administrator account does not possess the <strong>certificate.view</strong> permission for{' '}
          {activeFacility?.name || 'this facility'}.
        </p>
      </div>
    );
  }

  // Handle Manual Certificate Issuance
  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('certificate.issue')) {
      showToast('Permission denied: certificate.issue required', 'error');
      return;
    }
    const newCert = {
      id: `cert-${Date.now()}`,
      certificateNumber: `CERT-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      studentName: issueForm.studentName,
      studentEmail: `${issueForm.studentName.toLowerCase().replace(/\s+/g, '')}@student.aadhyara.com`,
      courseTitle: issueForm.courseTitle,
      issuedAt: 'Just now',
      grade: issueForm.grade,
      status: 'ISSUED'
    };
    setCertificates([newCert, ...certificates]);
    setIsIssueModalOpen(false);
    setIssueForm({
      studentName: '',
      courseTitle: 'Full-Stack Next.js 15 & Turbopack Masterclass',
      grade: 'A+ (Distinction)',
      date: new Date().toISOString().slice(0, 10)
    });
    showToast(`Certificate ${newCert.certificateNumber} issued successfully!`, 'success');
  };

  // Handle Revoke Certificate
  const handleRevoke = (certId: string, certNum: string) => {
    if (!hasPermission('certificate.revoke')) {
      showToast('Permission denied: certificate.revoke required', 'error');
      return;
    }
    if (confirm(`Are you sure you want to revoke accreditation certificate ${certNum}?`)) {
      setCertificates((prev) => prev.filter((c) => c.id !== certId));
      showToast(`Certificate ${certNum} revoked`, 'info');
    }
  };

  // Approve Pending
  const handleApprovePending = (item: any) => {
    if (!hasPermission('certificate.issue')) {
      showToast('Permission certificate.issue required', 'error');
      return;
    }
    setPendingCertificates((prev) => prev.filter((p) => p.id !== item.id));
    setCertificates((prev) => [
      {
        id: `cert-${Date.now()}`,
        certificateNumber: `CERT-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        studentName: item.studentName,
        studentEmail: item.studentEmail,
        courseTitle: item.courseTitle,
        issuedAt: 'Today',
        grade: `Passed (${item.quizScore}%)`,
        status: 'ISSUED'
      },
      ...prev
    ]);
    showToast(`Certificate dispatched to ${item.studentName}`, 'success');
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">
              Accredited Certificates Hub
            </h1>
            <span className="text-[11px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-full">
              {activeFacility?.name}
            </span>
          </div>
          <p className="text-xs text-outline font-medium mt-1">
            Issue cryptographically verified completion certificates, review graduation requests, and manage templates.
          </p>
        </div>

        {/* Action Button: Issue Certificate (guarded by certificate.issue) */}
        {hasPermission('certificate.issue') && (
          <button
            type="button"
            onClick={() => setIsIssueModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Icon name="workspace_premium" size={16} />
            <span>+ Issue Certificate</span>
          </button>
        )}
      </div>

      {/* Tabs & Search */}
      <div className="bg-surface-container-lowest border border-outline-variant/80 rounded-2xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl">
            {(
              [
                { key: 'issued', label: `Issued (${certificates.length})` },
                { key: 'pending', label: `Pending Approvals (${pendingCertificates.length})` },
                { key: 'templates', label: 'Certificate Templates' },
                { key: 'verify', label: 'Verify Credential' }
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-surface-container-lowest text-on-surface shadow-2xs'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Icon
              name="search"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student or cert #..."
              className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Tab 4: Verify Credential Search */}
        {activeTab === 'verify' ? (
          <div className="p-6 max-w-xl mx-auto space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-on-surface">Cryptographic Credential Verification</h3>
              <p className="text-xs text-outline">Search by Certificate Serial Number or Student Name</p>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              setHasSearchedVerify(true);
              const q = verifyQuery.trim().toLowerCase();
              const found = certificates.find(c => c.certificateNumber.toLowerCase().includes(q) || c.studentName.toLowerCase().includes(q));
              setVerificationResult(found || null);
            }} className="flex gap-2">
              <input
                type="text"
                required
                value={verifyQuery}
                onChange={(e) => setVerifyQuery(e.target.value)}
                placeholder="e.g. CERT-2026-98124 or Amit Verma"
                className="flex-1 h-11 px-4 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold focus:outline-none focus:border-primary font-mono"
              />
              <button
                type="submit"
                className="px-5 h-11 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Icon name="verified" size={16} />
                <span>Verify</span>
              </button>
            </form>

            {hasSearchedVerify && (
              verificationResult ? (
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 animate-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs">
                    <Icon name="verified" size={18} className="text-emerald-600" />
                    <span>AUTHENTIC &amp; VALID CREDENTIAL FOUND</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] text-outline uppercase font-mono">Recipient</p>
                      <p className="font-extrabold text-on-surface">{verificationResult.studentName}</p>
                      <p className="text-[10px] text-outline font-mono">{verificationResult.studentEmail}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-outline uppercase font-mono">Certificate #</p>
                      <p className="font-mono font-bold text-primary">{verificationResult.certificateNumber}</p>
                      <p className="text-[10px] text-outline">Issue Date: {verificationResult.issuedAt}</p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-emerald-500/20">
                      <p className="text-[10px] text-outline uppercase font-mono">Curriculum Awarded</p>
                      <p className="font-bold text-on-surface">{verificationResult.courseTitle}</p>
                      <p className="text-[10px] text-emerald-600 font-bold">{verificationResult.grade}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center text-xs space-y-1 text-rose-700 animate-in zoom-in-95 duration-150">
                  <p className="font-extrabold">No Matching Credential Found</p>
                  <p className="text-[11px] text-outline">Double check the certificate number and campus registry.</p>
                </div>
              )
            )}
          </div>
        ) : activeTab === 'templates' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="p-5 rounded-2xl border-2 border-primary/40 bg-surface-container-low/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-on-surface">AADHYARA Institutional Standard (Default)</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                  ACTIVE
                </span>
              </div>
              <div className="aspect-[1.4/1] bg-gradient-to-tr from-indigo-950 via-slate-900 to-indigo-900 rounded-xl p-6 text-white flex flex-col justify-between border border-white/10 shadow-md">
                <div className="text-center space-y-1">
                  <p className="text-[10px] uppercase font-mono tracking-widest text-indigo-300">Certificate of Completion</p>
                  <p className="text-sm font-black tracking-tight">{activeFacility?.name || 'ABC Institute'}</p>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[10px] text-white/60">This credential certifies that</p>
                  <p className="text-xs font-bold text-white">[Student Full Name]</p>
                  <p className="text-[10px] text-white/60">has successfully completed the curriculum for</p>
                  <p className="text-[11px] font-bold text-indigo-200">[Course Title]</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[8px] font-mono text-white/50">
                  <span>SHA-256 Verified</span>
                  <span>Credential ID: #CERT-SAMPLE</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-outline-variant/60 bg-surface-container-low/20 space-y-3 opacity-80">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-on-surface">Executive Gold Seal Certificate</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-700">
                  OPTIONAL
                </span>
              </div>
              <div className="aspect-[1.4/1] bg-gradient-to-tr from-amber-950 via-slate-900 to-yellow-950 rounded-xl p-6 text-white flex flex-col justify-between border border-amber-500/20 shadow-md">
                <div className="text-center space-y-1">
                  <p className="text-[10px] uppercase font-mono tracking-widest text-amber-300">Honorary Diploma</p>
                  <p className="text-sm font-black tracking-tight">{activeFacility?.name}</p>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[10px] text-amber-200/60">Conferred upon</p>
                  <p className="text-xs font-bold text-amber-100">[Student Full Name]</p>
                  <p className="text-[10px] text-amber-200/60">with Highest Distinction</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-amber-500/20 text-[8px] font-mono text-amber-200/50">
                  <span>Gold Badge</span>
                  <span>Signature: Academic Director</span>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'pending' ? (
          /* Tab 2: Pending Approvals */
          <div className="divide-y divide-outline-variant/30 pt-1">
            {pendingCertificates.length === 0 ? (
              <p className="p-8 text-center text-xs text-outline">No pending certificate requests.</p>
            ) : (
              pendingCertificates.map((p) => (
                <div key={p.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs text-on-surface">{p.studentName}</p>
                    <p className="text-[11px] text-outline font-mono">{p.courseTitle}</p>
                    <p className="text-[10px] text-emerald-600 font-bold font-mono">
                      Completed: {p.completedAt} • Final Quiz Score: {p.quizScore}%
                    </p>
                  </div>
                  {hasPermission('certificate.issue') && (
                    <button
                      type="button"
                      onClick={() => handleApprovePending(p)}
                      className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                      Sign &amp; Dispatch
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          /* Tab 1: Issued Certificates Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-outline uppercase font-mono text-[10px] border-b border-outline-variant/40">
                <tr>
                  <th className="p-3">Certificate Number</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Course Credential</th>
                  <th className="p-3">Issue Date</th>
                  <th className="p-3">Grade / Honor</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 font-medium text-on-surface">
                {certificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-primary">
                      {cert.certificateNumber}
                    </td>
                    <td className="p-3">
                      <p className="font-bold">{cert.studentName}</p>
                      <p className="text-[10px] text-outline font-mono">{cert.studentEmail}</p>
                    </td>
                    <td className="p-3 max-w-[220px] truncate">{cert.courseTitle}</td>
                    <td className="p-3 font-mono text-outline">{cert.issuedAt}</td>
                    <td className="p-3">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700">
                        {cert.grade}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => showToast(`Opening certificate preview ${cert.certificateNumber}`, 'info')}
                          className="px-2.5 py-1 rounded-lg border border-outline-variant hover:bg-surface-container text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          View
                        </button>
                        {hasPermission('certificate.revoke') && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(cert.id, cert.certificateNumber)}
                            className="p-1 rounded text-outline hover:text-error hover:bg-error-container/20 transition-colors cursor-pointer"
                            title="Revoke Certificate"
                          >
                            <Icon name="delete" size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Issue Certificate */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            style={{ width: '100%', maxWidth: '560px' }}
            className="bg-surface-container-lowest border border-outline-variant/80 rounded-3xl p-6 sm:p-8 w-full max-w-[560px] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
              <div className="flex items-center gap-2">
                <Icon name="workspace_premium" size={20} className="text-primary" />
                <h3 className="font-black text-sm text-on-surface">Issue Accreditation Certificate</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsIssueModalOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-on-surface"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-on-surface block mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={issueForm.studentName}
                  onChange={(e) => setIssueForm({ ...issueForm, studentName: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-bold text-on-surface block mb-1">Course Credential</label>
                <input
                  type="text"
                  required
                  value={issueForm.courseTitle}
                  onChange={(e) => setIssueForm({ ...issueForm, courseTitle: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-bold text-on-surface block mb-1">Grade / Distinction</label>
                <input
                  type="text"
                  value={issueForm.grade}
                  onChange={(e) => setIssueForm({ ...issueForm, grade: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant/80 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-outline-variant/40">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-outline-variant/80 text-xs font-bold text-outline hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 cursor-pointer"
                >
                  Issue &amp; Sign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CertificatesAdminPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-outline">Loading Certificates...</div>}>
      <CertificatesPageContent />
    </Suspense>
  );
}

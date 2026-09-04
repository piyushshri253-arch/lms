'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

export default function SuperAdminCertificatesPage() {
  const { showToast } = useApp();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Issue Certificate State
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');

  const fetchCertificatesAndData = async () => {
    setIsLoading(true);
    try {
      const [certRes, stRes, crRes] = await Promise.all([
        fetch(`/api/super-admin/certificates?q=${encodeURIComponent(search)}`),
        fetch('/api/super-admin/students'),
        fetch('/api/super-admin/courses')
      ]);

      if (certRes.ok) {
        const d = await certRes.json();
        setCertificates(d.certificates || []);
      }
      if (stRes.ok) {
        const s = await stRes.json();
        setStudents(s.students || []);
        if (s.students?.length > 0 && !selectedStudentId) {
          setSelectedStudentId(s.students[0].id);
        }
      }
      if (crRes.ok) {
        const c = await crRes.json();
        setCourses(c.courses || []);
        if (c.courses?.length > 0 && !selectedCourseId) {
          setSelectedCourseId(c.courses[0].id);
        }
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificatesAndData();
  }, [search]);

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/super-admin/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedStudentId,
          courseId: selectedCourseId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to issue certificate');

      showToast({ title: 'Certificate Issued', description: data.message, type: 'success' });
      setIsIssueOpen(false);
      await fetchCertificatesAndData();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleRevoke = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to revoke diploma #${code}?`)) return;

    try {
      const res = await fetch(`/api/super-admin/certificates?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke certificate');

      showToast({ title: 'Certificate Revoked', description: data.message, type: 'info' });
      await fetchCertificatesAndData();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/super-admin" className="hover:text-primary">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Certificates</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Accredited Diplomas &amp; Credentials
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Audit, verify, generate, and revoke officially accredited certificates of completion
          </p>
        </div>

        <button
          onClick={() => setIsIssueOpen(true)}
          className="px-5 py-2.5 bg-primary text-on-primary font-extrabold text-xs rounded-xl hover:bg-primary-container shadow-xs flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
        >
          <Icon name="verified" size={18} />
          <span>Issue Manual Diploma</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:w-80">
        <Icon
          name="search"
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by diploma #, student name, course..."
          className="w-full bg-surface-container-lowest border border-outline-variant/80 rounded-2xl pl-10 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
        />
      </div>

      {/* Certificates Table */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden">
        {certificates.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/70 border-b border-outline-variant/60 text-outline uppercase font-extrabold tracking-wider text-[10px]">
                <tr>
                  <th className="p-4 pl-6">Certificate #</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Master Curriculum</th>
                  <th className="p-4">Faculty Lead</th>
                  <th className="p-4">Issued Date</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {certificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="p-4 pl-6">
                      <span className="font-mono font-extrabold text-primary text-xs">
                        #{cert.certificateNumber}
                      </span>
                    </td>
                    <td className="p-4">
                      <div>
                        <span className="font-bold text-on-surface block">{cert.user?.name}</span>
                        <span className="font-mono text-[10px] text-outline">{cert.user?.email}</span>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-on-surface max-w-xs truncate">
                      {cert.course?.title}
                    </td>
                    <td className="p-4 text-on-surface">{cert.course?.instructor?.name}</td>
                    <td className="p-4 font-mono text-outline">{cert.issuedAt}</td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/certificate/${cert.certificateNumber}`}
                          target="_blank"
                          className="px-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant hover:border-primary text-outline hover:text-primary font-bold text-[10px] flex items-center gap-1 transition-colors"
                        >
                          <Icon name="open_in_new" size={14} />
                          <span>Verify</span>
                        </Link>
                        <button
                          onClick={() => handleRevoke(cert.id, cert.certificateNumber)}
                          className="p-1 text-outline hover:text-rose-600 rounded-lg cursor-pointer"
                          title="Revoke Certificate"
                        >
                          <Icon name="delete" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-outline text-xs">No certificates issued yet.</div>
        )}
      </div>

      {/* Manual Issue Modal */}
      <Modal
        isOpen={isIssueOpen}
        onClose={() => setIsIssueOpen(false)}
        maxWidth="md"
        title="Issue Accredited Diploma"
        subtitle="Manually grant a verified certificate of completion"
      >
        <form onSubmit={handleIssueCertificate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Select Student
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Target Course Curriculum
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-outline-variant/40 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsIssueOpen(false)}
              className="px-4 py-2 text-xs rounded-xl border border-outline-variant cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-on-primary hover:bg-primary-container shadow-xs cursor-pointer"
            >
              Generate &amp; Award Diploma
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

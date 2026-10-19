'use client';

import React, { useEffect, useState, useRef } from 'react';
import InstructorPortalShell from '@/components/instructor/InstructorPortalShell';
import {
  Landmark,
  ShieldCheck,
  Clock,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Save,
  Loader2,
  AlertCircle,
  SearchCheck,
  UserCheck,
  UploadCloud,
  FileText,
  Eye,
  RefreshCw,
  Trash2,
  CreditCard,
  FileCheck,
  Fingerprint,
  ExternalLink,
  X
} from 'lucide-react';

function normalizePersonName(name: string): string[] {
  const stopWords = new Set(['dr', 'mr', 'mrs', 'ms', 'miss', 'prof', 'shri', 'smt', 'kumari', 'er', 'md', 'mohd']);
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !stopWords.has(t));
}

function checkNameMatchesInstructor(instructorName: string, holderName: string): boolean {
  const instTokens = normalizePersonName(instructorName);
  const holderTokens = normalizePersonName(holderName);
  if (holderTokens.length === 0) return false;
  if (instTokens.length === 0) return true;

  return instTokens.some((it) =>
    holderTokens.some(
      (ht) =>
        ht === it ||
        (it.length >= 3 && ht.startsWith(it)) ||
        (ht.length >= 3 && it.startsWith(ht))
    )
  );
}

function checkValidAccountNumber(acct: string): { valid: boolean; msg: string } {
  const clean = acct.replace(/\s+/g, '');
  if (!clean) return { valid: false, msg: 'Enter 9–18 digit bank account number' };
  if (!/^\d{9,18}$/.test(clean)) {
    return { valid: false, msg: 'Account number must be 9 to 18 numeric digits only' };
  }
  if (/^(\d)\1+$/.test(clean)) {
    return { valid: false, msg: 'Repeating dummy digits (e.g. 000000000) are invalid' };
  }
  if ('123456789012345678'.includes(clean) || '987654321098765432'.includes(clean)) {
    return { valid: false, msg: 'Sequential test numbers (123456789) are invalid' };
  }
  return { valid: true, msg: 'Valid bank account number format' };
}

function formatAadhaar(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 12);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(' ');
}

export default function InstructorBankDetailsPage() {
  const [instructorProfile, setInstructorProfile] = useState<{
    id?: string;
    name: string;
    email: string;
    phone?: string;
  }>({ name: '', email: '' });

  const [bank, setBank] = useState<any>(null);

  const [form, setForm] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    accountType: 'SAVINGS',
    branchName: '',
    upiId: '',
    panNumber: '',
    panDocUrl: '',
    aadhaarNumber: '',
    aadhaarDocUrl: '',
    bankProofUrl: ''
  });

  const [panDocName, setPanDocName] = useState('');
  const [aadhaarDocName, setAadhaarDocName] = useState('');
  const [bankProofName, setBankProofName] = useState('');

  // Live IFSC Directory Verification State
  const [ifscStatus, setIfscStatus] = useState<'IDLE' | 'CHECKING' | 'VERIFIED' | 'INVALID'>('IDLE');
  const [ifscDetails, setIfscDetails] = useState<{
    bank: string;
    branch: string;
    city: string;
    state: string;
  } | null>(null);
  const [ifscError, setIfscError] = useState('');

  // Live PAN Verification State
  const [panStatus, setPanStatus] = useState<'IDLE' | 'CHECKING' | 'VERIFIED' | 'MISMATCH' | 'INVALID'>('IDLE');
  const [panError, setPanError] = useState('');
  const [panDetails, setPanDetails] = useState<{
    holderName: string;
    entityType: string;
    itdStatus: string;
  } | null>(null);

  // Lightbox Preview Modal State
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Hidden File Inputs Refs
  const panInputRef = useRef<HTMLInputElement>(null);
  const aadhaarInputRef = useRef<HTMLInputElement>(null);
  const bankProofInputRef = useRef<HTMLInputElement>(null);

  const loadBank = () => {
    setLoading(true);
    fetch('/api/instructor/bank-details')
      .then((r) => r.json())
      .then((res) => {
        if (res.instructorProfile) {
          setInstructorProfile(res.instructorProfile);
        }
        if (res.bankAccount) {
          setBank(res.bankAccount);
          const initialIfsc = res.bankAccount.ifscCode || '';
          const initialPan = res.bankAccount.panNumber || '';
          setForm((prev) => ({
            ...prev,
            accountHolderName:
              res.bankAccount.accountHolderName || res.instructorProfile?.name || '',
            bankName: res.bankAccount.bankName || '',
            ifscCode: initialIfsc,
            accountType: res.bankAccount.accountType || 'SAVINGS',
            branchName: res.bankAccount.branchName || '',
            upiId: res.bankAccount.upiId || '',
            panNumber: initialPan,
            panDocUrl: res.bankAccount.panDocUrl || '',
            aadhaarNumber: res.bankAccount.aadhaarNumber ? formatAadhaar(res.bankAccount.aadhaarNumber) : '',
            aadhaarDocUrl: res.bankAccount.aadhaarDocUrl || '',
            bankProofUrl: res.bankAccount.bankProofUrl || ''
          }));

          if (res.bankAccount.panDocUrl) setPanDocName('Uploaded_PAN_Card.jpg');
          if (res.bankAccount.aadhaarDocUrl) setAadhaarDocName('Uploaded_Aadhaar_Card.jpg');
          if (res.bankAccount.bankProofUrl) setBankProofName('Uploaded_Bank_Proof.jpg');

          if (initialIfsc && initialIfsc.length === 11) {
            verifyIfscLive(initialIfsc);
          }
          if (initialPan && initialPan.length === 10) {
            verifyPanLive(initialPan);
          }
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBank();
  }, []);

  // Live IFSC Lookup via official Razorpay / RBI IFSC API
  const verifyIfscLive = async (code: string) => {
    const clean = code.trim().toUpperCase();
    if (clean.length < 11) {
      setIfscStatus('IDLE');
      setIfscDetails(null);
      setIfscError('');
      return;
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(clean)) {
      setIfscStatus('INVALID');
      setIfscDetails(null);
      setIfscError(
        'Invalid IFSC format. Must be 4 bank letters + 0 + 6 branch characters (e.g. SBIN0000300).'
      );
      return;
    }

    setIfscStatus('CHECKING');
    setIfscError('');
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${clean}`);
      if (!res.ok) {
        setIfscStatus('INVALID');
        setIfscDetails(null);
        setIfscError(
          `IFSC "${clean}" does not exist in the Reserve Bank of India (RBI) directory.`
        );
        return;
      }
      const data = await res.json();
      setIfscStatus('VERIFIED');
      setIfscDetails({
        bank: data.BANK || '',
        branch: data.BRANCH || '',
        city: data.CITY || '',
        state: data.STATE || ''
      });
      // Auto-populate verified Bank Name and Branch Name from RBI record
      setForm((prev) => ({
        ...prev,
        bankName: data.BANK || prev.bankName,
        branchName: data.BRANCH ? `${data.BRANCH}${data.CITY ? `, ${data.CITY}` : ''}` : prev.branchName
      }));
    } catch {
      setIfscStatus('INVALID');
      setIfscError('Unable to verify IFSC code at the moment. Please check the code and try again.');
    }
  };

  // Live PAN Verification & Surname Ownership Matching
  const verifyPanLive = async (pan: string) => {
    const clean = pan.trim().toUpperCase();
    if (clean.length < 10) {
      setPanStatus('IDLE');
      setPanError('');
      setPanDetails(null);
      return;
    }

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(clean)) {
      setPanStatus('INVALID');
      setPanError('Must be 5 letters + 4 digits + 1 letter (e.g. ABCPS1234F).');
      setPanDetails(null);
      return;
    }

    setPanStatus('CHECKING');
    setPanError('');

    try {
      const res = await fetch('/api/instructor/verify-pan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panNumber: clean })
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setPanStatus(data.status === 'MISMATCH' ? 'MISMATCH' : 'INVALID');
        setPanError(data.error || 'PAN verification failed.');
        setPanDetails(null);
      } else {
        setPanStatus('VERIFIED');
        setPanDetails({
          holderName: data.holderName,
          entityType: data.entityType,
          itdStatus: data.itdStatus
        });
      }
    } catch {
      setPanStatus('INVALID');
      setPanError('Unable to verify PAN at this moment. Please check connection and try again.');
    }
  };

  // Optimized Client-side File Loader & Image Compression
  const handleDocumentSelect = (
    type: 'pan' | 'aadhaar' | 'bankProof',
    file: File | undefined
  ) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError(`File "${file.name}" exceeds 10MB limit. Please upload a smaller file.`);
      return;
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

          if (type === 'pan') {
            setForm((prev) => ({ ...prev, panDocUrl: compressedDataUrl }));
            setPanDocName(file.name);
          } else if (type === 'aadhaar') {
            setForm((prev) => ({ ...prev, aadhaarDocUrl: compressedDataUrl }));
            setAadhaarDocName(file.name);
          } else if (type === 'bankProof') {
            setForm((prev) => ({ ...prev, bankProofUrl: compressedDataUrl }));
            setBankProofName(file.name);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      // PDF or other document
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (type === 'pan') {
          setForm((prev) => ({ ...prev, panDocUrl: dataUrl }));
          setPanDocName(file.name);
        } else if (type === 'aadhaar') {
          setForm((prev) => ({ ...prev, aadhaarDocUrl: dataUrl }));
          setAadhaarDocName(file.name);
        } else if (type === 'bankProof') {
          setForm((prev) => ({ ...prev, bankProofUrl: dataUrl }));
          setBankProofName(file.name);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Real-time Validation Checks
  const isNameMatched = checkNameMatchesInstructor(
    instructorProfile.name,
    form.accountHolderName
  );
  const acctValidation = checkValidAccountNumber(form.accountNumber);
  const isAccountConfirmed =
    acctValidation.valid &&
    form.accountNumber.replace(/\s+/g, '') === form.confirmAccountNumber.replace(/\s+/g, '');
  const isIfscVerified = ifscStatus === 'VERIFIED';
  const isPanVerified = panStatus === 'VERIFIED';
  const rawAadhaar = form.aadhaarNumber.replace(/\D/g, '');
  const isAadhaarValid = rawAadhaar.length === 12 && !/^(\d)\1+$/.test(rawAadhaar);
  const hasPanDoc = Boolean(form.panDocUrl);
  const hasAadhaarDoc = Boolean(form.aadhaarDocUrl);
  const hasBankProof = Boolean(form.bankProofUrl);
  const allDocsUploaded = hasPanDoc && hasAadhaarDoc && hasBankProof;

  const isUpiValid =
    !form.upiId.trim() ||
    /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(form.upiId.trim());

  const allChecksPassed =
    isNameMatched &&
    acctValidation.valid &&
    isAccountConfirmed &&
    isIfscVerified &&
    isPanVerified &&
    isAadhaarValid &&
    allDocsUploaded &&
    isUpiValid &&
    ownershipConfirmed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!allChecksPassed) {
      setError(
        'Please complete all mandatory verification checks and upload required KYC documents (PAN Photo, Aadhaar Photo, Bank Proof) before submitting.'
      );
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/instructor/bank-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          aadhaarNumber: rawAadhaar
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save bank details.');
      } else {
        setBank(data.bankAccount);
        setForm((prev) => ({ ...prev, accountNumber: '', confirmAccountNumber: '' }));
        setOwnershipConfirmed(false);
        setSuccess(data.message || 'Bank account & KYC documents verified and submitted for Admin approval!');
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <InstructorPortalShell title="Bank Account & Payout Verification">
        <div className="py-24 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      </InstructorPortalShell>
    );
  }

  const status = bank?.status || 'NOT_ADDED';

  return (
    <InstructorPortalShell
      title="Bank Account & Payout Verification"
      subtitle="Strict ownership, RBI IFSC lookup, PAN mismatch check & KYC document verification for payouts"
      profile={{
        name: instructorProfile.name,
        email: instructorProfile.email,
        role: 'INSTRUCTOR',
        emailVerified: true
      }}
    >
      {/* Lightbox Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-800">{previewImage.title}</h3>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 flex justify-center max-h-[80vh] overflow-auto">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Add / Update Bank Account Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Banner */}
          {status === 'VERIFIED' && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-emerald-900">
                  Bank Account &amp; KYC Verified • Active for Payouts
                </div>
                <p className="text-xs text-emerald-700 mt-1">
                  Verified by {bank.verifiedByName || 'Administration'}{' '}
                  {bank.verifiedAt ? `on ${new Date(bank.verifiedAt).toLocaleDateString()}` : ''}. Note: Updating details will require re-verification.
                </p>
              </div>
            </div>
          )}

          {status === 'PENDING_VERIFICATION' && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3.5">
              <Clock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-amber-900">
                  Pending Admin Verification &amp; Document Review
                </div>
                <p className="text-xs text-amber-800 mt-1">
                  Your bank account ({bank.bankName} — {bank.accountNumberMasked}, IFSC: {bank.ifscCode}) and uploaded KYC documents (PAN, Aadhaar, Bank Proof) have been submitted and are under review by Super Admin.
                </p>
              </div>
            </div>
          )}

          {status === 'REJECTED' && (
            <div className="p-5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3.5">
              <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-red-900">
                  Bank / KYC Verification Rejected — Please Correct &amp; Resubmit
                </div>
                <p className="text-xs text-red-700 mt-1">
                  <strong>Reason:</strong> {bank.rejectionReason || 'Account details or documents could not be verified.'}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-700 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-violet-600" />
                {status === 'NOT_ADDED'
                  ? 'Add & Verify Payout Bank Account'
                  : 'Update / Resubmit Bank Account Details'}
              </h2>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 px-3 py-1 rounded-full">
                <UserCheck className="w-3.5 h-3.5" />
                Registered Instructor: {instructorProfile.name || 'Instructor'}
              </span>
            </div>

            {/* 1. Account Holder Name & IFSC Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Holder Name (Must match your name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.accountHolderName}
                  onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
                  placeholder={`e.g. ${instructorProfile.name || 'Your Full Name'}`}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 focus:outline-none focus:bg-white ${
                    !form.accountHolderName
                      ? 'border-slate-300'
                      : isNameMatched
                      ? 'border-emerald-500 ring-2 ring-emerald-500/10'
                      : 'border-red-400 ring-2 ring-red-500/10'
                  }`}
                />
                {form.accountHolderName && (
                  <p
                    className={`mt-1.5 text-[11px] font-semibold flex items-center gap-1 ${
                      isNameMatched ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {isNameMatched ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Matches registered Instructor ({instructorProfile.name})</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Ownership Mismatch: Must belong to &quot;{instructorProfile.name}&quot; (Third-party accounts blocked)
                        </span>
                      </>
                    )}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  IFSC Code (11-Char RBI Verified) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={form.ifscCode}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                      setForm({ ...form, ifscCode: val });
                      verifyIfscLive(val);
                    }}
                    placeholder="e.g. SBIN0000300 or HDFC0000001"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 font-mono uppercase focus:outline-none focus:bg-white ${
                      ifscStatus === 'VERIFIED'
                        ? 'border-emerald-500 ring-2 ring-emerald-500/10'
                        : ifscStatus === 'INVALID'
                        ? 'border-red-400 ring-2 ring-red-500/10'
                        : 'border-slate-300'
                    }`}
                  />
                  {ifscStatus === 'CHECKING' && (
                    <Loader2 className="w-4 h-4 animate-spin text-violet-600 absolute right-3 top-3" />
                  )}
                </div>

                {ifscStatus === 'VERIFIED' && ifscDetails && (
                  <div className="mt-1.5 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>RBI Verified:</strong> {ifscDetails.bank} — {ifscDetails.branch} ({ifscDetails.city}, {ifscDetails.state})
                    </div>
                  </div>
                )}

                {ifscStatus === 'INVALID' && ifscError && (
                  <p className="mt-1.5 text-[11px] font-semibold text-red-600 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{ifscError}</span>
                  </p>
                )}
              </div>
            </div>

            {/* 2. Auto-Verified Bank Name & Branch Name */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Bank Name (Auto-verified via IFSC) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  readOnly={ifscStatus === 'VERIFIED'}
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  placeholder="Enter IFSC above to auto-fill"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${
                    ifscStatus === 'VERIFIED'
                      ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950 font-bold cursor-not-allowed'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Branch Name (Auto-verified via IFSC)
                </label>
                <input
                  type="text"
                  readOnly={ifscStatus === 'VERIFIED'}
                  value={form.branchName}
                  onChange={(e) => setForm({ ...form, branchName: e.target.value })}
                  placeholder="Auto-filled from RBI IFSC"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${
                    ifscStatus === 'VERIFIED'
                      ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950 font-semibold cursor-not-allowed'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.accountType}
                  onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-violet-600"
                >
                  <option value="SAVINGS">Savings Account</option>
                  <option value="CURRENT">Current Account</option>
                </select>
              </div>
            </div>

            {/* 3. Bank Account Number & Confirmation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Bank Account Number (9–18 Digits) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  inputMode="numeric"
                  maxLength={18}
                  value={form.accountNumber}
                  onChange={(e) =>
                    setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, '') })
                  }
                  placeholder="Enter 9–18 digit account number"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 font-mono focus:outline-none focus:bg-white ${
                    !form.accountNumber
                      ? 'border-slate-300'
                      : acctValidation.valid
                      ? 'border-emerald-500'
                      : 'border-red-400'
                  }`}
                />
                {form.accountNumber && (
                  <p
                    className={`mt-1 text-[11px] font-medium ${
                      acctValidation.valid ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {acctValidation.msg}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm Bank Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  maxLength={18}
                  value={form.confirmAccountNumber}
                  onChange={(e) =>
                    setForm({ ...form, confirmAccountNumber: e.target.value.replace(/\D/g, '') })
                  }
                  placeholder="Re-enter full account number"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 font-mono focus:outline-none focus:bg-white ${
                    !form.confirmAccountNumber
                      ? 'border-slate-300'
                      : isAccountConfirmed
                      ? 'border-emerald-500'
                      : 'border-red-400'
                  }`}
                />
                {form.confirmAccountNumber && (
                  <p
                    className={`mt-1 text-[11px] font-medium ${
                      isAccountConfirmed ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {isAccountConfirmed
                      ? '✓ Account numbers match'
                      : '✕ Account numbers do not match'}
                  </p>
                )}
              </div>
            </div>

            {/* 4. Strict PAN Verification & Aadhaar Card Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* PAN Number Field with Live Verification & Surname Mismatch Check */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    PAN Card Number (Strict Ownership Check) <span className="text-red-500">*</span>
                  </label>
                  {form.panNumber.length === 10 && panStatus !== 'CHECKING' && (
                    <button
                      type="button"
                      onClick={() => verifyPanLive(form.panNumber)}
                      className="text-[10px] font-bold text-violet-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      Re-verify
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={form.panNumber}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                      setForm({ ...form, panNumber: val });
                      if (val.length === 10) {
                        verifyPanLive(val);
                      } else {
                        setPanStatus('IDLE');
                        setPanError('');
                      }
                    }}
                    placeholder="e.g. ABCPS1234F"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 uppercase font-mono focus:outline-none focus:bg-white ${
                      panStatus === 'VERIFIED'
                        ? 'border-emerald-500 ring-2 ring-emerald-500/10'
                        : panStatus === 'MISMATCH' || panStatus === 'INVALID'
                        ? 'border-red-400 ring-2 ring-red-500/10'
                        : 'border-slate-300'
                    }`}
                  />
                  {panStatus === 'CHECKING' && (
                    <Loader2 className="w-4 h-4 animate-spin text-violet-600 absolute right-3 top-3" />
                  )}
                </div>

                {panStatus === 'VERIFIED' && panDetails && (
                  <div className="mt-1.5 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>PAN Verified &amp; Active:</strong> Registered to{' '}
                      <span className="font-bold">{panDetails.holderName}</span> ({panDetails.entityType}).
                    </div>
                  </div>
                )}

                {panStatus === 'MISMATCH' && panError && (
                  <div className="mt-1.5 p-2 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-800 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>PAN Ownership Mismatch:</strong> {panError}
                    </div>
                  </div>
                )}

                {panStatus === 'INVALID' && panError && (
                  <p className="mt-1.5 text-[11px] font-semibold text-red-600 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{panError}</span>
                  </p>
                )}

                {panStatus === 'IDLE' && form.panNumber.length > 0 && form.panNumber.length < 10 && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Enter 10 characters (4th char &apos;P&apos; for Individual, 5th char must match your surname)
                  </p>
                )}
              </div>

              {/* Aadhaar Number Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Aadhaar Card Number (12 Digits) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={14}
                    value={form.aadhaarNumber}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        aadhaarNumber: formatAadhaar(e.target.value)
                      })
                    }
                    placeholder="XXXX XXXX XXXX"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 font-mono focus:outline-none focus:bg-white ${
                      !form.aadhaarNumber
                        ? 'border-slate-300'
                        : isAadhaarValid
                        ? 'border-emerald-500'
                        : 'border-red-400'
                    }`}
                  />
                  {isAadhaarValid && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3 top-3" />
                  )}
                </div>
                {form.aadhaarNumber && (
                  <p
                    className={`mt-1 text-[11px] font-medium ${
                      isAadhaarValid ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {isAadhaarValid
                      ? '✓ Valid 12-digit Aadhaar Card format'
                      : '✕ Must contain exactly 12 numeric digits'}
                  </p>
                )}
              </div>
            </div>

            {/* Optional UPI ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                UPI ID (Optional for Instant Payouts)
              </label>
              <input
                type="text"
                value={form.upiId}
                onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                placeholder="name@okhdfcbank"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 focus:outline-none focus:bg-white ${
                  isUpiValid ? 'border-slate-300' : 'border-red-400'
                }`}
              />
              {!isUpiValid && (
                <p className="mt-1 text-[11px] text-red-600 font-medium">
                  ✕ Invalid UPI ID format (e.g. yourname@okhdfcbank)
                </p>
              )}
            </div>

            {/* 5. MANDATORY KYC & BANK VERIFICATION DOCUMENTS UPLOAD */}
            <div className="pt-3 border-t border-slate-100 space-y-4">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-violet-600" />
                  Mandatory KYC &amp; Bank Proof Documents (Required)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload clear photos of your documents. Super Admin will verify these documents before enabling course payouts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Document 1: PAN Card Photo */}
                <div
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                    hasPanDoc
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-dashed border-slate-300 bg-slate-50/60 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-amber-600" />
                        1. PAN Card Photo <span className="text-red-500">*</span>
                      </span>
                      {hasPanDoc && (
                        <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Uploaded
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Clear photo of the front side of your PAN Card matching your name.
                    </p>

                    {/* Preview Thumbnail if uploaded */}
                    {hasPanDoc && (
                      <div className="relative rounded-xl overflow-hidden border border-emerald-200 bg-white group">
                        <img
                          src={form.panDocUrl}
                          alt="PAN Card Preview"
                          className="w-full h-24 object-cover cursor-pointer hover:opacity-90 transition"
                          onClick={() => setPreviewImage({ url: form.panDocUrl, title: 'PAN Card Photo Preview' })}
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: form.panDocUrl, title: 'PAN Card Photo Preview' })}
                          className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-xs font-bold transition cursor-pointer"
                        >
                          <Eye className="w-4 h-4" /> View Full
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions: Upload, Replace, Remove */}
                  <div className="pt-3">
                    <input
                      ref={panInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleDocumentSelect('pan', e.target.files?.[0])}
                    />
                    {!hasPanDoc ? (
                      <button
                        type="button"
                        onClick={() => panInputRef.current?.click()}
                        className="w-full py-2.5 px-3 rounded-xl border border-violet-300 bg-white hover:bg-violet-50 text-violet-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>Upload PAN Photo</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => panInputRef.current?.click()}
                          className="flex-1 py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, panDocUrl: '' }));
                            setPanDocName('');
                          }}
                          className="p-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Document 2: Aadhaar Card Photo */}
                <div
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                    hasAadhaarDoc
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-dashed border-slate-300 bg-slate-50/60 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Fingerprint className="w-4 h-4 text-indigo-600" />
                        2. Aadhaar Card Photo <span className="text-red-500">*</span>
                      </span>
                      {hasAadhaarDoc && (
                        <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Uploaded
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Clear photo of your Aadhaar Card (Front side showing full name).
                    </p>

                    {/* Preview Thumbnail if uploaded */}
                    {hasAadhaarDoc && (
                      <div className="relative rounded-xl overflow-hidden border border-emerald-200 bg-white group">
                        <img
                          src={form.aadhaarDocUrl}
                          alt="Aadhaar Card Preview"
                          className="w-full h-24 object-cover cursor-pointer hover:opacity-90 transition"
                          onClick={() => setPreviewImage({ url: form.aadhaarDocUrl, title: 'Aadhaar Card Photo Preview' })}
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: form.aadhaarDocUrl, title: 'Aadhaar Card Photo Preview' })}
                          className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-xs font-bold transition cursor-pointer"
                        >
                          <Eye className="w-4 h-4" /> View Full
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions: Upload, Replace, Remove */}
                  <div className="pt-3">
                    <input
                      ref={aadhaarInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleDocumentSelect('aadhaar', e.target.files?.[0])}
                    />
                    {!hasAadhaarDoc ? (
                      <button
                        type="button"
                        onClick={() => aadhaarInputRef.current?.click()}
                        className="w-full py-2.5 px-3 rounded-xl border border-violet-300 bg-white hover:bg-violet-50 text-violet-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>Upload Aadhaar Photo</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => aadhaarInputRef.current?.click()}
                          className="flex-1 py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, aadhaarDocUrl: '' }));
                            setAadhaarDocName('');
                          }}
                          className="p-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Document 3: Passbook Front Page OR Cancelled Cheque */}
                <div
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                    hasBankProof
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-dashed border-slate-300 bg-slate-50/60 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        3. Passbook / Cheque <span className="text-red-500">*</span>
                      </span>
                      {hasBankProof && (
                        <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Uploaded
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Passbook front page or Cancelled Cheque showing Account No. &amp; IFSC.
                    </p>

                    {/* Preview Thumbnail if uploaded */}
                    {hasBankProof && (
                      <div className="relative rounded-xl overflow-hidden border border-emerald-200 bg-white group">
                        <img
                          src={form.bankProofUrl}
                          alt="Bank Proof Preview"
                          className="w-full h-24 object-cover cursor-pointer hover:opacity-90 transition"
                          onClick={() => setPreviewImage({ url: form.bankProofUrl, title: 'Bank Passbook / Cheque Preview' })}
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ url: form.bankProofUrl, title: 'Bank Passbook / Cheque Preview' })}
                          className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-xs font-bold transition cursor-pointer"
                        >
                          <Eye className="w-4 h-4" /> View Full
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions: Upload, Replace, Remove */}
                  <div className="pt-3">
                    <input
                      ref={bankProofInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleDocumentSelect('bankProof', e.target.files?.[0])}
                    />
                    {!hasBankProof ? (
                      <button
                        type="button"
                        onClick={() => bankProofInputRef.current?.click()}
                        className="w-full py-2.5 px-3 rounded-xl border border-violet-300 bg-white hover:bg-violet-50 text-violet-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>Upload Bank Proof</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => bankProofInputRef.current?.click()}
                          className="flex-1 py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, bankProofUrl: '' }));
                            setBankProofName('');
                          }}
                          className="p-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Live Pre-Submission Verification Checklist */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <SearchCheck className="w-4 h-4 text-violet-600" />
                Mandatory Pre-Submission Verification Checks
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  {
                    ok: isNameMatched,
                    label: `1. Account Holder matches Instructor (${instructorProfile.name || 'You'})`
                  },
                  {
                    ok: isIfscVerified,
                    label: `2. IFSC Code verified in RBI Bank Directory`
                  },
                  {
                    ok: acctValidation.valid && isAccountConfirmed,
                    label: '3. Valid 9–18 digit Account Number & Confirmed Match'
                  },
                  {
                    ok: isPanVerified,
                    label: '4. PAN Number Verified & Surname Matched'
                  },
                  {
                    ok: isAadhaarValid,
                    label: '5. Valid 12-digit Aadhaar Card Number'
                  },
                  {
                    ok: allDocsUploaded,
                    label: '6. All 3 KYC Proof Documents Uploaded'
                  }
                ].map((c, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                      c.ok
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                        : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    {c.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span>{c.label}</span>
                  </div>
                ))}
              </div>

              <label className="flex items-start gap-2.5 pt-2 border-t border-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ownershipConfirmed}
                  onChange={(e) => setOwnershipConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-medium leading-relaxed">
                  I hereby declare that this bank account, PAN card, and Aadhaar belong to me (
                  <strong>{instructorProfile.name || 'Instructor'}</strong>) and all uploaded documents are genuine for receiving course payouts and tax compliance.
                </span>
              </label>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={!allChecksPassed || saving}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm inline-flex items-center gap-2 shadow-md shadow-violet-600/20 cursor-pointer transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>
                  {allChecksPassed
                    ? status === 'REJECTED'
                      ? 'Verified ✓ Resubmit Bank Account & KYC for Approval'
                      : 'Verified ✓ Submit Bank Account & KYC for Admin Approval'
                    : 'Complete All Verification Checks & Document Uploads to Submit'}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Current Masked Bank Account & Verified Documents Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs h-fit space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
              Current Linked Account
            </h2>
            <ShieldCheck className="w-5 h-5 text-violet-600" />
          </div>

          {status === 'NOT_ADDED' ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No bank account has been added yet. Verify your IFSC, Account Holder Name, PAN, and upload KYC documents on the left to enable course payouts.
            </div>
          ) : (
            <div className="space-y-3.5 text-xs">
              <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200">
                <div className="text-[10px] uppercase tracking-widest text-violet-700 font-bold">
                  {bank.bankName} ({bank.accountType})
                </div>
                <div className="mt-2 text-lg font-mono font-extrabold tracking-widest text-slate-900">
                  {bank.accountNumberMasked}
                </div>
                <div className="mt-2 flex items-center justify-between text-slate-700 font-medium">
                  <span>{bank.accountHolderName}</span>
                  <span className="font-mono font-bold text-indigo-700">{bank.ifscCode}</span>
                </div>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Verification Status</span>
                <span
                  className={`font-bold ${
                    status === 'VERIFIED'
                      ? 'text-emerald-600'
                      : status === 'PENDING_VERIFICATION'
                      ? 'text-amber-600'
                      : 'text-red-600'
                  }`}
                >
                  {status}
                </span>
              </div>

              {bank.branchName && (
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Branch</span>
                  <span className="text-slate-800 font-medium">{bank.branchName}</span>
                </div>
              )}

              {bank.panNumber && (
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">PAN Number</span>
                  <span className="text-slate-800 font-mono font-bold">{bank.panNumber}</span>
                </div>
              )}

              {bank.aadhaarNumber && (
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Aadhaar (Masked)</span>
                  <span className="text-slate-800 font-mono font-bold">
                    XXXX XXXX {bank.aadhaarNumber.slice(-4)}
                  </span>
                </div>
              )}

              {bank.upiId && (
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">UPI ID</span>
                  <span className="text-slate-800 font-mono">{bank.upiId}</span>
                </div>
              )}

              {/* Uploaded Documents Thumbnails */}
              {(bank.panDocUrl || bank.aadhaarDocUrl || bank.bankProofUrl) && (
                <div className="pt-2 space-y-2">
                  <span className="text-slate-500 font-bold block text-[11px] uppercase tracking-wider">
                    Uploaded KYC Documents
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {bank.panDocUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ url: bank.panDocUrl, title: 'PAN Card Photo' })}
                        className="p-1.5 rounded-lg border border-slate-200 hover:border-violet-400 bg-slate-50 text-center space-y-1 group transition cursor-pointer"
                      >
                        <img
                          src={bank.panDocUrl}
                          alt="PAN"
                          className="w-full h-12 object-cover rounded-md group-hover:opacity-90"
                        />
                        <span className="text-[10px] text-slate-700 font-bold block truncate">PAN Card</span>
                      </button>
                    )}
                    {bank.aadhaarDocUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ url: bank.aadhaarDocUrl, title: 'Aadhaar Card Photo' })}
                        className="p-1.5 rounded-lg border border-slate-200 hover:border-violet-400 bg-slate-50 text-center space-y-1 group transition cursor-pointer"
                      >
                        <img
                          src={bank.aadhaarDocUrl}
                          alt="Aadhaar"
                          className="w-full h-12 object-cover rounded-md group-hover:opacity-90"
                        />
                        <span className="text-[10px] text-slate-700 font-bold block truncate">Aadhaar</span>
                      </button>
                    )}
                    {bank.bankProofUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ url: bank.bankProofUrl, title: 'Bank Passbook / Cheque' })}
                        className="p-1.5 rounded-lg border border-slate-200 hover:border-violet-400 bg-slate-50 text-center space-y-1 group transition cursor-pointer"
                      >
                        <img
                          src={bank.bankProofUrl}
                          alt="Bank Proof"
                          className="w-full h-12 object-cover rounded-md group-hover:opacity-90"
                        />
                        <span className="text-[10px] text-slate-700 font-bold block truncate">Bank Proof</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </InstructorPortalShell>
  );
}

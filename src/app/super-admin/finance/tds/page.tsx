'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { FinancePageHeader } from '@/components/finance/FinancePageHeader';
import { FinanceMetricCard } from '@/components/finance/FinanceMetricCard';
import { formatINR } from '@/lib/finance-service';

export default function TdsManagementFinancePage() {
  const { showToast } = useApp();
  const [fy, setFy] = useState('2025-2026');
  const [tdsData, setTdsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Certificate Generation Modal
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [selectedInstId, setSelectedInstId] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('Q3');
  const [grossAmount, setGrossAmount] = useState('');
  const [tdsRate, setTdsRate] = useState('2.0');
  const [isGenerating, setIsGenerating] = useState(false);

  // Selected Certificate for View
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  const fetchTds = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/super-admin/finance/tds?fy=${fy}`);
      if (res.ok) {
        const json = await res.json();
        setTdsData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTds();
  }, [fy]);

  const handleGenerateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstId || !grossAmount) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/super-admin/finance/tds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GENERATE_CERTIFICATE',
          instructorId: selectedInstId,
          financialYear: fy,
          quarter: selectedQuarter,
          grossAmount: parseFloat(grossAmount),
          tdsRate: parseFloat(tdsRate)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate certificate');
      showToast({ title: 'Certificate Issued', description: 'Form 16A generated successfully.', type: 'success' });
      setIsGenModalOpen(false);
      setGrossAmount('');
      fetchTds();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEmailCertificate = async (certId: string) => {
    try {
      const res = await fetch('/api/super-admin/finance/tds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'EMAIL_CERTIFICATE', certificateId: certId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to email certificate');
      showToast({ title: 'Certificate Dispatched', description: 'Form 16A dispatched to instructor inbox.', type: 'success' });
      fetchTds();
    } catch (err: any) {
      showToast({ title: 'Dispatch Error', description: err.message, type: 'error' });
    }
  };

  const summary = tdsData || {
    totalTdsDeducted: 0,
    totalTdsDeposited: 0,
    pendingDeposit: 0,
    instructorLedger: [],
    quarters: [],
    certificates: []
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <FinancePageHeader
        title="TDS Management (Section 194J)"
        subtitle="Manage quarterly tax withholding on professional faculty revenue, track Form 16A compliance, verify PAN cards, and deposit challans."
        badge={`FY ${fy}`}
        onRefresh={fetchTds}
        actions={
          <div className="flex items-center gap-2">
            <select
              value={fy}
              onChange={(e) => setFy(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-xs text-on-surface font-bold focus:outline-none focus:border-primary"
            >
              <option value="2025-2026">FY 2025-2026</option>
              <option value="2024-2025">FY 2024-2025</option>
            </select>

            <button
              type="button"
              onClick={() => setIsGenModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
            >
              <Icon name="add" size={16} />
              <span>Issue Form 16A</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FinanceMetricCard
          label="Total TDS Withheld (FY)"
          value={summary.totalTdsDeducted}
          subtext="2% section 194J deducted on faculty share"
          icon="receipt"
          color="amber"
          badge="Withheld"
          badgeType="neutral"
        />

        <FinanceMetricCard
          label="TDS Deposited to Govt (Challan ITNS 281)"
          value={summary.totalTdsDeposited}
          subtext="Certified deposit remittances"
          icon="verified"
          color="emerald"
          badge="Deposited"
          badgeType="positive"
        />

        <FinanceMetricCard
          label="Pending Govt Deposit / Remittance"
          value={summary.pendingDeposit}
          subtext="Payable before 7th of next month"
          icon="pending_actions"
          color="rose"
          badge="Due"
          badgeType="negative"
        />
      </div>

      {/* Quarterly Breakdown Cards */}
      <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs space-y-3">
        <h3 className="text-base font-black text-on-surface tracking-tight">
          Quarterly TDS Compliance Schedule
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {summary.quarters?.map((q: any) => (
            <div key={q.quarter} className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/60 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-outline uppercase">{q.quarter}</span>
                <p className="text-lg font-black text-on-surface mt-1">{formatINR(q.deducted)}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-outline-variant/40 flex items-center justify-between">
                <span className="text-[10px] text-outline">Status:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold border ${
                    q.status === 'DEPOSITED'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : q.status === 'PENDING'
                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      : 'bg-surface-container text-outline border-outline-variant'
                  }`}
                >
                  {q.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructor-Wise TDS Ledger */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-outline-variant/60 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-on-surface tracking-tight">
              Instructor-wise TDS Ledger &amp; PAN Status
            </h3>
            <p className="text-xs text-on-surface-variant">
              TDS applicability under Section 194J (2% for valid PAN, 206AA 10% for non-PAN)
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-on-surface-variant font-medium">
            Fetching TDS ledger records...
          </div>
        ) : !summary.instructorLedger?.length ? (
          <div className="p-12 text-center text-xs text-on-surface-variant">
            No instructor earnings recorded for this financial year.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/50 border-b border-outline-variant/60 text-[10px] font-mono uppercase tracking-wider text-outline">
                <tr>
                  <th className="py-3.5 px-4 font-extrabold">Instructor</th>
                  <th className="py-3.5 px-3 font-extrabold">PAN Card</th>
                  <th className="py-3.5 px-3 font-extrabold text-center">PAN Status</th>
                  <th className="py-3.5 px-3 font-extrabold text-center">TDS Rate</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Gross Credited</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">TDS Withheld</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Deposited</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Pending Deposit</th>
                  <th className="py-3.5 px-4 font-extrabold text-center">Issue 16A</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-medium">
                {summary.instructorLedger.map((inst: any) => (
                  <tr key={inst.instructorId} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-extrabold text-on-surface">{inst.instructorName}</p>
                      <p className="text-[11px] text-outline truncate">{inst.instructorEmail}</p>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-bold text-on-surface">
                      {inst.panNumber}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold border inline-block ${
                          inst.panVerified
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                        }`}
                      >
                        {inst.panVerified ? 'VERIFIED' : 'UNVERIFIED'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center font-mono font-bold text-primary">
                      {inst.applicableRate}%
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-on-surface">
                      {formatINR(inst.grossIncome)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-black text-amber-600">
                      {formatINR(inst.tdsDeducted)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-emerald-600">
                      {formatINR(inst.tdsDeposited)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-600">
                      {formatINR(inst.pendingDeposit)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInstId(inst.instructorId);
                          setGrossAmount(String(inst.grossIncome));
                          setIsGenModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant hover:bg-primary hover:text-on-primary font-bold text-[11px] transition-colors cursor-pointer"
                        title="Generate Form 16A"
                      >
                        Issue 16A
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generated Form 16A Certificates Registry */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-outline-variant/60 flex items-center justify-between">
          <h3 className="text-base font-black text-on-surface tracking-tight">
            Form 16A Certificates Issued Registry
          </h3>
          <span className="text-xs font-mono font-bold text-outline">
            {summary.certificates?.length || 0} Certificates
          </span>
        </div>

        {!summary.certificates?.length ? (
          <div className="p-8 text-center text-xs text-on-surface-variant">
            No Form 16A certificates have been generated yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/50 border-b border-outline-variant/60 text-[10px] font-mono uppercase tracking-wider text-outline">
                <tr>
                  <th className="py-3.5 px-4 font-extrabold">Certificate No</th>
                  <th className="py-3.5 px-3 font-extrabold">Instructor</th>
                  <th className="py-3.5 px-3 font-extrabold">Quarter / FY</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">Gross Credited</th>
                  <th className="py-3.5 px-3 font-extrabold text-right">TDS Withheld</th>
                  <th className="py-3.5 px-3 font-extrabold text-center">Status</th>
                  <th className="py-3.5 px-4 font-extrabold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-medium">
                {summary.certificates.map((cert: any) => (
                  <tr key={cert.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-on-surface">
                      {cert.certificateNumber}
                    </td>
                    <td className="py-3.5 px-3 text-on-surface">
                      {cert.instructor?.name || 'Faculty'}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-outline">
                      {cert.quarter} &bull; {cert.financialYear}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-on-surface">
                      {formatINR(cert.grossAmount)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-amber-600">
                      {formatINR(cert.tdsAmount)}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold bg-primary/10 text-primary border border-primary/20">
                        {cert.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCert(cert);
                            setIsCertModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                          title="View Certificate"
                        >
                          <Icon name="visibility" size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEmailCertificate(cert.id)}
                          className="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-bold text-[11px] hover:bg-primary/90 transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                          title="Send to Instructor Email"
                        >
                          <Icon name="mail" size={13} />
                          <span>Email 16A</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate 16A Modal */}
      <Modal
        isOpen={isGenModalOpen}
        onClose={() => setIsGenModalOpen(false)}
        title="Issue Form 16A TDS Certificate"
        size="md"
      >
        <form onSubmit={handleGenerateCertificate} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Faculty Member *
            </label>
            <select
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-bold focus:outline-none focus:border-primary"
            >
              <option value="">-- Choose Instructor --</option>
              {summary.instructorLedger?.map((inst: any) => (
                <option key={inst.instructorId} value={inst.instructorId}>
                  {inst.instructorName} ({inst.panNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Quarter
              </label>
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-bold focus:outline-none focus:border-primary"
              >
                <option value="Q1">Q1 (Apr - Jun)</option>
                <option value="Q2">Q2 (Jul - Sep)</option>
                <option value="Q3">Q3 (Oct - Dec)</option>
                <option value="Q4">Q4 (Jan - Mar)</option>
                <option value="ANNUAL">Annual Summary</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                TDS Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={tdsRate}
                onChange={(e) => setTdsRate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-mono font-bold focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Gross Credited Income (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              value={grossAmount}
              onChange={(e) => setGrossAmount(e.target.value)}
              required
              placeholder="e.g. 50000"
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface font-mono font-bold focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/60">
            <button
              type="button"
              onClick={() => setIsGenModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-outline-variant font-bold text-on-surface hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 shadow-xs"
            >
              {isGenerating ? 'Generating...' : 'Issue Form 16A Certificate'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Certificate Modal */}
      {selectedCert && (
        <Modal
          isOpen={isCertModalOpen}
          onClose={() => setIsCertModalOpen(false)}
          title={`Form 16A — Certificate ${selectedCert.certificateNumber}`}
          size="md"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="border border-outline-variant/80 rounded-2xl p-4 bg-surface-container-low space-y-3">
              <div className="flex justify-between items-start border-b border-outline-variant/60 pb-3">
                <div>
                  <h3 className="font-black text-sm text-on-surface">FORM NO. 16A</h3>
                  <p className="text-[10px] text-outline">[See rule 31(1)(b)] Certificate of deduction of tax at source under section 194J</p>
                </div>
                <div className="text-right font-mono">
                  <p className="font-bold text-on-surface">{selectedCert.certificateNumber}</p>
                  <p className="text-[10px] text-outline">Period: {selectedCert.quarter} FY {selectedCert.financialYear}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-outline uppercase block">Deductee:</span>
                  <span className="font-bold text-on-surface">{selectedCert.instructor?.name || 'Faculty'}</span>
                  <span className="text-outline block text-[11px]">PAN: {selectedCert.panNumber || 'APPLIED'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-outline uppercase block">Deductor (LMS Entity):</span>
                  <span className="font-bold text-on-surface">Morena Teach Education Platform</span>
                  <span className="text-outline block text-[11px]">TAN: DELM12345F</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-outline-variant/60 overflow-hidden font-mono text-xs">
              <div className="bg-surface-container-low p-2.5 flex justify-between font-bold text-on-surface">
                <span>Tax Breakdown Field</span>
                <span>Value (INR)</span>
              </div>
              <div className="p-3 space-y-1.5 divide-y divide-outline-variant/40">
                <div className="flex justify-between pt-1">
                  <span className="font-sans">Gross Professional Fees Credited:</span>
                  <span className="font-bold">{formatINR(selectedCert.grossAmount)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-sans">Applicable TDS Rate:</span>
                  <span>{selectedCert.tdsRate}%</span>
                </div>
                <div className="flex justify-between pt-2 text-sm font-black text-amber-600">
                  <span className="font-sans">Total Tax Deducted &amp; Deposited:</span>
                  <span>{formatINR(selectedCert.tdsAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';
import { FinancePageHeader } from '@/components/finance/FinancePageHeader';

export default function FinanceCommunicationCenterPage() {
  const { showToast } = useApp();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Compose State
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/super-admin/finance/communications');
      if (res.ok) {
        const json = await res.json();
        setLogs(json.communications || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !subject || !message) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/super-admin/finance/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          recipientName,
          subject,
          message
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch communication');
      showToast({ title: 'Communication Dispatched', description: `Financial notice sent to ${recipientEmail}`, type: 'success' });
      setRecipientEmail('');
      setRecipientName('');
      setSubject('');
      setMessage('');
      fetchLogs();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  const applyTemplate = (type: 'PAYOUT' | 'BANK' | 'FORM16A' | 'INVOICE') => {
    switch (type) {
      case 'PAYOUT':
        setSubject('Instructor Revenue Share Disbursement Advice');
        setMessage(
          'Dear Faculty Partner,\n\nWe are pleased to inform you that your latest revenue share payout has been processed via bank transfer.\n\nPlease verify your registered bank account statement for the credit. The UTR reference is available in your Instructor Studio.\n\nThank you for empowering learners on Morena Teach.'
        );
        break;
      case 'BANK':
        setSubject('Bank Account Re-verification Request');
        setMessage(
          'Dear Faculty Partner,\n\nDuring our routine financial audit, we noticed that your bank account details or IFSC code require re-verification.\n\nPlease navigate to your Instructor Studio -> Bank Details tab and verify your IFSC code and account holder name to prevent disbursement delays.\n\nRegards,\nFinance Team'
        );
        break;
      case 'FORM16A':
        setSubject('Form 16A TDS Certificate Available for Download');
        setMessage(
          'Dear Faculty Partner,\n\nYour quarterly TDS Certificate (Form 16A) under Section 194J has been generated for the recent fiscal period.\n\nYou can download the signed certificate directly from your Instructor Studio or contact accounts@morenateach.com for any queries.'
        );
        break;
      case 'INVOICE':
        setSubject('Official Payment Receipt & Tax Invoice');
        setMessage(
          'Dear Learner,\n\nThank you for your course enrollment on Morena Teach LMS. Attached is the receipt confirmation of your payment.\n\nYour official GST tax invoice has been generated and is safely archived in your student account.\n\nHappy Learning!'
        );
        break;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <FinancePageHeader
        title="Financial Communication Center"
        subtitle="Dispatch automated and custom financial remittance advice, Form 16A notifications, bank verification requests, and student tax invoices."
        badge={`${logs.length} DISPATCHES`}
        onRefresh={fetchLogs}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Form */}
        <div className="lg:col-span-1 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs space-y-4">
          <div className="border-b border-outline-variant/60 pb-3">
            <h3 className="text-base font-black text-on-surface tracking-tight">
              Dispatch Financial Advisory
            </h3>
            <p className="text-xs text-on-surface-variant">
              Quick templates or customized notice
            </p>
          </div>

          {/* Quick Template Buttons */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-outline uppercase font-bold">Quick Templates:</span>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => applyTemplate('PAYOUT')}
                className="p-2 rounded-xl border border-outline-variant hover:bg-surface-container text-left transition-colors"
              >
                💸 Payout Advice
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('BANK')}
                className="p-2 rounded-xl border border-outline-variant hover:bg-surface-container text-left transition-colors"
              >
                🏦 Bank Update
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('FORM16A')}
                className="p-2 rounded-xl border border-outline-variant hover:bg-surface-container text-left transition-colors"
              >
                📜 Form 16A
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('INVOICE')}
                className="p-2 rounded-xl border border-outline-variant hover:bg-surface-container text-left transition-colors"
              >
                🧾 Tax Invoice
              </button>
            </div>
          </div>

          <form onSubmit={handleSend} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-on-surface mb-1">
                Recipient Email *
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
                placeholder="faculty@morenateach.com"
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-on-surface mb-1">
                Recipient Name
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Dr. Rohan Malhotra"
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-on-surface mb-1">
                Subject Line *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                placeholder="e.g. Monthly Revenue Settlement Advice"
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-on-surface mb-1">
                Message Body *
              </label>
              <textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                placeholder="Write message details..."
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Icon name="send" size={14} />
              <span>{isSending ? 'Dispatching...' : 'Dispatch Financial Notice'}</span>
            </button>
          </form>
        </div>

        {/* Audit Log Table */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
            <div>
              <h3 className="text-base font-black text-on-surface tracking-tight">
                Dispatched Financial Communications Log
              </h3>
              <p className="text-xs text-on-surface-variant">
                History of financial emails and automated notifications delivered
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-outline">
              Showing {logs.length} dispatches
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-xs text-on-surface-variant font-medium">
              Loading communications log...
            </div>
          ) : !logs.length ? (
            <div className="p-12 text-center text-xs text-on-surface-variant">
              No previous financial notices logged.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low/50 border-b border-outline-variant/60 text-[10px] font-mono uppercase tracking-wider text-outline">
                  <tr>
                    <th className="py-2.5 px-3 font-extrabold">Recipient</th>
                    <th className="py-2.5 px-3 font-extrabold">Subject</th>
                    <th className="py-2.5 px-3 font-extrabold">Template</th>
                    <th className="py-2.5 px-3 font-extrabold text-center">Status</th>
                    <th className="py-2.5 px-3 font-extrabold text-right">Sent Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40 font-medium">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-on-surface">
                        {log.recipientEmail}
                      </td>
                      <td className="py-2.5 px-3 text-on-surface max-w-xs truncate">
                        {log.subject}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[9px] font-bold bg-primary/10 text-primary border border-primary/20">
                          {log.template}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[11px] text-outline">
                        {new Date(log.sentAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

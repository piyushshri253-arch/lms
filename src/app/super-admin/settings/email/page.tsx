'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

export default function SuperAdminEmailSettingsPage() {
  const { showToast } = useApp();

  const [config, setConfig] = useState<any>({
    smtpHost: '',
    smtpPort: 587,
    smtpEncryption: 'TLS',
    smtpUsername: '',
    smtpPassword: '',
    fromName: 'AADHYARA',
    fromEmail: 'support@aadhyara.com',
    replyTo: '',
    authEnabled: true,
    isEnabled: false,
    hasPassword: false,
    maskedPassword: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Send Test Email Modal
  const [isSendTestOpen, setIsSendTestOpen] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Email Logs
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchLogs();
  }, []);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/super-admin/email-config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
          setIsChangingPassword(!data.config.hasPassword);
        }
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/super-admin/email-config/logs?limit=25');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {} finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...config,
        smtpPassword: isChangingPassword ? config.smtpPassword : '••••••••'
      };

      const res = await fetch('/api/super-admin/email-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast({ title: 'Success', description: 'Platform SMTP configuration saved!', type: 'success' });
        fetchConfig();
      } else {
        showToast({ title: 'Save Failed', description: data.error || 'Failed to save configuration', type: 'error' });
      }
    } catch {
      showToast({ title: 'Error', description: 'Network error saving configuration', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const payload = {
        ...config,
        smtpPassword: isChangingPassword ? config.smtpPassword : '••••••••'
      };

      const res = await fetch('/api/super-admin/email-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        showToast({ title: 'SMTP Test Passed', description: data.message, type: 'success' });
        fetchConfig();
      } else {
        showToast({ title: 'SMTP Test Failed', description: data.message || 'Connection failed', type: 'error' });
      }
    } catch {
      showToast({ title: 'Error', description: 'Connection failed. Please check host and port.', type: 'error' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient.trim()) return;

    setIsSendingTest(true);
    try {
      const payload = {
        ...config,
        smtpPassword: isChangingPassword ? config.smtpPassword : '••••••••',
        recipientEmail: testRecipient
      };

      const res = await fetch('/api/super-admin/email-config/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast({ title: 'Test Email Sent', description: `Verified test email delivered to ${testRecipient}`, type: 'success' });
        setIsSendTestOpen(false);
        setTestRecipient('');
        fetchLogs();
      } else {
        showToast({ title: 'Delivery Failed', description: data.error || 'Unable to send test email', type: 'error' });
      }
    } catch {
      showToast({ title: 'Error', description: 'Network error delivering test email', type: 'error' });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/super-admin" className="hover:text-primary">
              Super Admin
            </Link>
            <span>/</span>
            <Link href="/super-admin/settings" className="hover:text-primary">
              Settings
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Platform Email</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight flex items-center gap-2.5">
            <Icon name="mail" className="text-primary" size={26} />
            Platform Email &amp; SMTP Configuration
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Configure system-wide SMTP credentials for organization approvals, password resets, OTPs, and global broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {config.isEnabled ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SMTP Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 font-bold text-xs border border-amber-500/30">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Not Configured / Inactive
            </span>
          )}
        </div>
      </div>

      {/* Main SMTP Configuration Card */}
      <form onSubmit={handleSave} className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-outline-variant/60 pb-4">
          <div>
            <h3 className="font-extrabold text-base text-on-surface flex items-center gap-2">
              <Icon name="dns" size={20} className="text-primary" />
              <span>Platform SMTP Server Credentials</span>
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Credentials are encrypted using AES-256-GCM and never exposed to the client.
            </p>
          </div>

          <label className="flex items-center gap-2.5 text-xs font-bold text-on-surface cursor-pointer select-none">
            <input
              type="checkbox"
              checked={config.isEnabled}
              onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
              className="rounded border-outline text-primary h-4 w-4"
            />
            <span>Enable Platform SMTP</span>
          </label>
        </div>

        {/* Quick Provider Presets & Gmail Guidance */}
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-on-surface flex items-center gap-1.5">
              <Icon name="tips_and_updates" size={16} className="text-primary" />
              <span>Quick SMTP Presets:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setConfig({ ...config, smtpHost: 'smtp.gmail.com', smtpPort: 587, smtpEncryption: 'TLS', authEnabled: true })}
                className="px-2.5 py-1 rounded-lg bg-surface border border-outline-variant hover:border-primary text-[11px] font-bold text-on-surface cursor-pointer transition-all"
              >
                Gmail / Google Workspace
              </button>
              <button
                type="button"
                onClick={() => setConfig({ ...config, smtpHost: 'smtp.sendgrid.net', smtpPort: 587, smtpEncryption: 'TLS', authEnabled: true, smtpUsername: 'apikey' })}
                className="px-2.5 py-1 rounded-lg bg-surface border border-outline-variant hover:border-primary text-[11px] font-bold text-on-surface cursor-pointer transition-all"
              >
                SendGrid
              </button>
              <button
                type="button"
                onClick={() => setConfig({ ...config, smtpHost: 'email-smtp.us-east-1.amazonaws.com', smtpPort: 587, smtpEncryption: 'TLS', authEnabled: true })}
                className="px-2.5 py-1 rounded-lg bg-surface border border-outline-variant hover:border-primary text-[11px] font-bold text-on-surface cursor-pointer transition-all"
              >
                Amazon SES
              </button>
              <button
                type="button"
                onClick={() => setConfig({ ...config, smtpHost: 'smtp.office365.com', smtpPort: 587, smtpEncryption: 'TLS', authEnabled: true })}
                className="px-2.5 py-1 rounded-lg bg-surface border border-outline-variant hover:border-primary text-[11px] font-bold text-on-surface cursor-pointer transition-all"
              >
                Microsoft 365
              </button>
            </div>
          </div>
          <div className="pt-2 border-t border-primary/10 text-[11px] text-on-surface-variant leading-relaxed">
            <strong className="text-amber-600 dark:text-amber-400">⚠️ Important for Gmail / Google Workspace:</strong> Google rejects standard account passwords with <code>535-5.7.8 Username and Password not accepted</code>. You must enable 2-Step Verification on your Google Account and generate a <strong>16-character App Password</strong> from <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-primary font-bold underline">Google App Passwords</a>.
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              SMTP Host Server
            </label>
            <input
              type="text"
              required
              placeholder="e.g. smtp.sendgrid.net, smtp.gmail.com, mail.yourdomain.com"
              value={config.smtpHost || ''}
              onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              SMTP Port
            </label>
            <input
              type="number"
              required
              placeholder="587"
              value={config.smtpPort || ''}
              onChange={(e) => setConfig({ ...config, smtpPort: Number(e.target.value) })}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Encryption Protocol
            </label>
            <select
              value={config.smtpEncryption || 'TLS'}
              onChange={(e) => setConfig({ ...config, smtpEncryption: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary"
            >
              <option value="TLS">TLS / STARTTLS (Port 587)</option>
              <option value="SSL">SSL / Direct TLS (Port 465)</option>
              <option value="NONE">None / Plain (Port 25 / 2525)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              SMTP Username
            </label>
            <input
              type="text"
              placeholder="e.g. apikey, support@aadhyara.com"
              value={config.smtpUsername || ''}
              onChange={(e) => setConfig({ ...config, smtpUsername: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                SMTP Password / Key
              </label>
              {config.hasPassword && !isChangingPassword && (
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(true);
                    setConfig({ ...config, smtpPassword: '' });
                  }}
                  className="text-[11px] text-primary hover:underline font-bold"
                >
                  Change Password
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={config.hasPassword && !isChangingPassword ? '••••••••' : 'Enter SMTP password'}
                disabled={config.hasPassword && !isChangingPassword}
                value={isChangingPassword ? config.smtpPassword || '' : '••••••••'}
                onChange={(e) => setConfig({ ...config, smtpPassword: e.target.value })}
                className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary disabled:opacity-75 disabled:bg-surface-container-low"
              />
              {isChangingPassword && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-on-surface-variant hover:text-on-surface"
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sender Information */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-outline-variant/40">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Sender Name (From Name)
            </label>
            <input
              type="text"
              required
              placeholder="AADHYARA Master Platform"
              value={config.fromName || ''}
              onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Sender Email (From Email)
            </label>
            <input
              type="email"
              required
              placeholder="noreply@aadhyara.com"
              value={config.fromEmail || ''}
              onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Reply-To Email (Optional)
            </label>
            <input
              type="email"
              placeholder="support@aadhyara.com"
              value={config.replyTo || ''}
              onChange={(e) => setConfig({ ...config, replyTo: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary font-mono"
            />
          </div>
        </div>

        {/* Last Tested Status */}
        {config.lastTestedAt && (
          <div className={`p-3.5 rounded-2xl flex items-center justify-between text-xs border ${
            config.lastTestStatus === 'SUCCESS' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700' : 'bg-rose-500/10 border-rose-500/30 text-rose-700'
          }`}>
            <div className="flex items-center gap-2">
              <Icon name={config.lastTestStatus === 'SUCCESS' ? 'check_circle' : 'error'} size={18} />
              <span>
                <strong>Last Test:</strong> {config.lastTestStatus === 'SUCCESS' ? 'Verified Connected' : config.lastTestError || 'Failed'}
              </span>
            </div>
            <span className="text-[11px] opacity-75">
              {new Date(config.lastTestedAt).toLocaleString()}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-outline-variant/60">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !config.smtpHost}
              className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold border border-outline-variant flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Icon name={isTesting ? 'sync' : 'network_ping'} size={16} className={isTesting ? 'animate-spin' : ''} />
              <span>{isTesting ? 'Testing Handshake...' : 'Test SMTP Connection'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSendTestOpen(true)}
              disabled={!config.smtpHost}
              className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold border border-outline-variant flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Icon name="send" size={16} />
              <span>Send Test Email</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Icon name="save" size={16} />
            <span>{isSaving ? 'Saving Configuration...' : 'Save Platform Configuration'}</span>
          </button>
        </div>
      </form>

      {/* Platform Email Activity Logs */}
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-on-surface flex items-center gap-2">
              <Icon name="history" size={20} className="text-primary" />
              <span>Platform Email Dispatch Activity</span>
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Live audit trail of system notifications, OTP verifications, and delivery statuses.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={isLoadingLogs}
            className="p-2 rounded-xl hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
          >
            <Icon name="refresh" size={18} className={isLoadingLogs ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-outline-variant/60 text-on-surface-variant uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Recipient</th>
                <th className="py-2.5 px-3">Subject &amp; Template</th>
                <th className="py-2.5 px-3">Tenant</th>
                <th className="py-2.5 px-3">Provider</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Dispatched</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 font-medium">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                    No email logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container/30 transition-colors">
                    <td className="py-3 px-3 font-mono text-on-surface">{log.recipientEmail}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-on-surface truncate max-w-xs">{log.subject}</div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono">
                        {log.template}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant">
                      {log.organization?.name || 'Platform (Global)'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-mono text-on-surface-variant">
                        {log.provider || 'SMTP'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                        log.status === 'SENT' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-on-surface-variant font-mono text-[11px]">
                      {new Date(log.sentAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Test Email Modal */}
      <Modal
        isOpen={isSendTestOpen}
        onClose={() => setIsSendTestOpen(false)}
        title="Send Verified Test Email"
        maxWidth="md"
      >
        <form onSubmit={handleSendTestEmail} className="space-y-4">
          <p className="text-xs text-on-surface-variant">
            Enter a destination email address to verify end-to-end delivery through the configured SMTP provider.
          </p>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Destination Email Address
            </label>
            <input
              type="email"
              required
              placeholder="e.g. test@example.com, admin@yourdomain.com"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/60">
            <button
              type="button"
              onClick={() => setIsSendTestOpen(false)}
              className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSendingTest || !testRecipient.trim()}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              <Icon name="send" size={15} />
              <span>{isSendingTest ? 'Sending Test...' : 'Send Test Email'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
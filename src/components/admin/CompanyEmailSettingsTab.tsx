'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

export const CompanyEmailSettingsTab: React.FC = () => {
  const { showToast, currentUser } = useApp();

  const [config, setConfig] = useState<any>({
    smtpHost: '',
    smtpPort: 587,
    smtpEncryption: 'TLS',
    smtpUsername: '',
    smtpPassword: '',
    fromName: currentUser?.organizationName || 'Academy',
    fromEmail: 'support@example.com',
    replyTo: '',
    authEnabled: true,
    isEnabled: false,
    fallbackToPlatform: true,
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

  // Tenant Logs
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchLogs();
  }, []);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/email-config');
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
      const res = await fetch('/api/admin/email-config/logs?limit=20');
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

      const res = await fetch('/api/admin/email-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast({ title: 'Saved', description: 'Company SMTP configuration updated!', type: 'success' });
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

      const res = await fetch('/api/admin/email-config/test', {
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

      const res = await fetch('/api/admin/email-config/send-test', {
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

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-on-surface-variant">
        <Icon name="sync" size={24} className="animate-spin text-primary mx-auto mb-2" />
        Loading email configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Configuration Card */}
      <form onSubmit={handleSave} className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/60 pb-4">
          <div>
            <h3 className="font-extrabold text-base text-on-surface flex items-center gap-2">
              <Icon name="dns" size={20} className="text-primary" />
              <span>Dedicated Company SMTP Configuration</span>
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Send student onboarding, purchase confirmations, and course certificates from your own branded domain.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-bold text-on-surface cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.isEnabled}
                onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
                className="rounded border-outline text-primary h-4 w-4"
              />
              <span>Enable Custom SMTP</span>
            </label>
          </div>
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
            <strong className="text-amber-600 dark:text-amber-400">⚠️ Important for Gmail / Google Workspace:</strong> Google blocks normal account passwords for security. You must enable 2-Step Verification and use a <strong>16-character Google App Password</strong> from <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-primary font-bold underline">Google App Passwords</a>.
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
              placeholder="e.g. smtp.gmail.com, smtp.mailgun.org, smtp.office365.com"
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
              Encryption
            </label>
            <select
              value={config.smtpEncryption || 'TLS'}
              onChange={(e) => setConfig({ ...config, smtpEncryption: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary"
            >
              <option value="TLS">TLS / STARTTLS (587)</option>
              <option value="SSL">SSL / TLS Direct (465)</option>
              <option value="NONE">None (25 / 2525)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              SMTP Username
            </label>
            <input
              type="text"
              placeholder="Username or email"
              value={config.smtpUsername || ''}
              onChange={(e) => setConfig({ ...config, smtpUsername: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
                SMTP Password
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
                placeholder={config.hasPassword && !isChangingPassword ? '••••••••' : 'Enter password'}
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

        {/* Sender Info & Fallback */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-outline-variant/40">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              From Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Coding Academy"
              value={config.fromName || ''}
              onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              From Email
            </label>
            <input
              type="email"
              required
              placeholder="support@youracademy.com"
              value={config.fromEmail || ''}
              onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Reply-To Email
            </label>
            <input
              type="email"
              placeholder="admissions@youracademy.com"
              value={config.replyTo || ''}
              onChange={(e) => setConfig({ ...config, replyTo: e.target.value })}
              className="w-full bg-surface border border-outline-variant rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary font-mono"
            />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/60 flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-on-surface">Platform Fallback Delivery</div>
            <p className="text-[11px] text-on-surface-variant">
              If your custom SMTP is inactive or experiences network failures, automatically dispatch via Platform SMTP.
            </p>
          </div>
          <input
            type="checkbox"
            checked={config.fallbackToPlatform}
            onChange={(e) => setConfig({ ...config, fallbackToPlatform: e.target.checked })}
            className="rounded border-outline text-primary h-4 w-4"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-outline-variant/60">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !config.smtpHost}
              className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold border border-outline-variant flex items-center gap-1.5 disabled:opacity-50"
            >
              <Icon name={isTesting ? 'sync' : 'network_ping'} size={16} className={isTesting ? 'animate-spin' : ''} />
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSendTestOpen(true)}
              disabled={!config.smtpHost}
              className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold border border-outline-variant flex items-center gap-1.5 disabled:opacity-50"
            >
              <Icon name="send" size={16} />
              <span>Send Test Email</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            <Icon name="save" size={16} />
            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>

      {/* Organization Email Logs */}
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-3xl border border-outline-variant shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-on-surface flex items-center gap-2">
              <Icon name="history" size={20} className="text-primary" />
              <span>Organization Email History</span>
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Isolated audit logs for emails sent to your learners and faculty.
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
                <th className="py-2 px-3">Recipient</th>
                <th className="py-2 px-3">Subject</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-on-surface-variant">
                    No emails sent for this organization yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container/30">
                    <td className="py-2.5 px-3 font-mono text-on-surface">{log.recipientEmail}</td>
                    <td className="py-2.5 px-3 font-semibold text-on-surface truncate max-w-xs">{log.subject}</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-on-surface-variant">{log.template}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                        log.status === 'SENT' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-on-surface-variant text-[11px]">
                      {new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
        title="Send Test Email"
        maxWidth="md"
      >
        <form onSubmit={handleSendTestEmail} className="space-y-4">
          <p className="text-xs text-on-surface-variant">
            Test email delivery using your configured SMTP settings.
          </p>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface">
              Recipient Email
            </label>
            <input
              type="email"
              required
              placeholder="e.g. yourname@example.com"
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
              <span>{isSendingTest ? 'Sending...' : 'Send Test'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

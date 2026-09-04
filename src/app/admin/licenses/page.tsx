'use client';

import React, { useState, useEffect } from 'react';
import {
  Key,
  ShieldCheck,
  Laptop,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Copy,
  Check
} from 'lucide-react';

export default function AdminLicensesPage() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, active: 0, expired: 0, revoked: 0, totalActivations: 0 });
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchLicenses();
  }, []);

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/licenses');
      const json = await res.json();
      if (json.licenses) {
        setLicenses(json.licenses);
        setStats(json.stats || {});
      }
    } catch (err) {
      console.error('Failed to fetch licenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleStatusChange = async (licenseId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseId, status: newStatus })
      });
      if (res.ok) {
        fetchLicenses();
      }
    } catch (err) {
      console.error('Failed to update license status:', err);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <Key className="w-8 h-8 text-purple-400" />
            Software License Management & Device Activations
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitor issued software licenses, cryptographic activations, hardware limits, and real-time validation logs.
          </p>
        </div>

        {/* Stats Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold">Total Licenses Issued</div>
            <div className="text-2xl font-black text-white mt-1">{stats.total}</div>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold">Active Licenses</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{stats.active}</div>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold">Active Machines</div>
            <div className="text-2xl font-black text-purple-400 mt-1">{stats.totalActivations}</div>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold">Revoked / Expired</div>
            <div className="text-2xl font-black text-rose-400 mt-1">{stats.revoked + stats.expired}</div>
          </div>
        </div>

        {/* License Table */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Issued Software Licenses</h2>
            <span className="text-xs text-slate-400">{licenses.length} Total Records</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading software licenses...</div>
          ) : licenses.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Key className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold">No software licenses generated yet.</p>
              <p className="text-xs text-slate-500 mt-1">Licenses are automatically issued upon software product purchases.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Software Product</th>
                    <th className="px-6 py-4">License Key</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Device Activations</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {licenses.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{l.product?.name || 'Software Product'}</div>
                        <div className="text-[11px] text-slate-500 font-mono">v{l.product?.version || '1.0.0'} • {l.licenseType}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-mono font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-lg w-max border border-purple-500/20">
                          {l.licenseKey}
                          <button
                            onClick={() => copyToClipboard(l.licenseKey)}
                            className="text-slate-400 hover:text-white transition"
                            title="Copy License Key"
                          >
                            {copiedKey === l.licenseKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200">{l.user?.name || 'Customer'}</div>
                        <div className="text-[11px] text-slate-500">{l.user?.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Laptop className="w-3.5 h-3.5 text-slate-400" />
                          <span>{l.activations?.length || 0} / {l.maxActivations}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          l.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {l.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleStatusChange(l.id, 'REVOKED')}
                            className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold transition"
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(l.id, 'ACTIVE')}
                            className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
                          >
                            Activate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
  );
}

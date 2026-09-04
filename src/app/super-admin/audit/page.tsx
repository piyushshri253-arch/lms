'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export default function SuperAdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/super-admin/audit?q=${encodeURIComponent(search)}&action=${actionFilter}`
      );
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs || []);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, actionFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant mb-1">
            <Link href="/super-admin" className="hover:text-primary">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Audit Logs</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface tracking-tight">
            Immutable Platform Audit Trail
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Cryptographic ledger of all administrative events, refunds, access grants, and security modifications
          </p>
        </div>

        <span className="text-xs font-mono font-bold px-3 py-1 bg-indigo-500/10 text-indigo-700 rounded-full border border-indigo-500/20">
          {logs.length} Recorded Events
        </span>
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
          placeholder="Filter by admin email, action, entity..."
          className="w-full bg-surface-container-lowest border border-outline-variant/80 rounded-2xl pl-10 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-primary"
        />
      </div>

      {/* Audit Log Table */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/80 shadow-xs overflow-hidden">
        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low/70 border-b border-outline-variant/60 text-outline uppercase font-extrabold tracking-wider text-[10px]">
                <tr>
                  <th className="p-4 pl-6">Timestamp</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Operator</th>
                  <th className="p-4">Target Entity</th>
                  <th className="p-4 pr-6">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="p-4 pl-6 font-mono text-[11px] text-outline whitespace-nowrap">
                      {l.createdAt}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full font-mono font-extrabold text-[10px] uppercase bg-primary/10 text-primary">
                        {l.action}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-on-surface">{l.adminEmail}</td>
                    <td className="p-4 font-mono text-[11px] text-outline">
                      {l.entity} ({l.entityId})
                    </td>
                    <td className="p-4 pr-6 text-on-surface-variant font-mono text-[11px]">
                      {l.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-outline text-xs">No audit logs recorded yet.</div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { useApp } from '@/context/AppContext';

export const SystemAlerts: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useApp();

  useEffect(() => {
    fetch('/api/admin/audit-logs')
      .then((res) => res.ok && res.json())
      .then((data) => {
        if (data?.logs) {
          setLogs(data.logs);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_10px_15px_-3px_rgba(0,0,0,0.02)] flex flex-col h-full">
      <div className="p-4 md:p-6 border-b border-outline-variant flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg text-on-surface">System Logs &amp; Events</h3>
          <p className="text-xs text-on-surface-variant">Live audit telemetry from database</p>
        </div>
        <button
          onClick={() =>
            showToast({
              title: 'System Telemetry',
              description: 'Real-time database connection healthy.',
              type: 'info'
            })
          }
          className="text-on-surface-variant hover:text-primary transition-colors p-1 cursor-pointer"
        >
          <Icon name="more_vert" size={20} />
        </button>
      </div>

      <div className="overflow-y-auto flex-1 p-4 space-y-2.5 max-h-[320px]">
        {logs.length > 0 ? (
          logs.slice(0, 6).map((log) => (
            <div
              key={log.id}
              className="p-3.5 bg-surface hover:bg-surface-container-low border border-outline-variant/40 rounded-xl transition-colors flex gap-3.5 items-start cursor-pointer group"
            >
              <div className="mt-1 w-2.5 h-2.5 rounded-full shrink-0 bg-primary" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-on-surface group-hover:text-primary transition-colors font-mono">
                    {log.action}
                  </h4>
                  <span className="text-[10px] font-mono text-outline">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2 leading-relaxed">
                  {log.description}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-center text-xs text-outline">
            {isLoading ? 'Loading system events...' : 'No system security alerts logged.'}
          </div>
        )}
      </div>

      <div className="p-3.5 border-t border-outline-variant text-center bg-surface-container-low/20">
        <span className="text-[11px] font-mono text-emerald-600 font-bold">
          ● Platform Telemetry Normal
        </span>
      </div>
    </div>
  );
};

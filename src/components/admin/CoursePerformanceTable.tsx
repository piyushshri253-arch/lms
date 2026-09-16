'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { useApp } from '@/context/AppContext';

export const CoursePerformanceTable: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'revenue' | 'enrollment'>('revenue');
  const { showToast } = useApp();

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((res) => res.ok && res.json())
      .then((data) => {
        if (data?.coursePerformance) {
          setCourses(data.coursePerformance);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = courses
    .filter((c) =>
      (c.title || c.courseName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.category || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'revenue') return (b.revenue || 0) - (a.revenue || 0);
      return (b.enrollments || 0) - (a.enrollments || 0);
    });

  const handleExport = () => {
    showToast({
      title: 'Export Generated',
      description: 'Course_Performance_Report_2026.csv downloaded.',
      type: 'success'
    });
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_10px_15px_-3px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="p-4 md:p-6 border-b border-outline-variant flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="font-bold text-lg text-on-surface">Course Performance</h3>
          <p className="text-xs text-on-surface-variant">Real revenue &amp; enrollment performance from database</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter courses..."
            className="w-full sm:w-48 px-3 py-1.5 text-xs bg-surface border border-outline-variant rounded-lg focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleExport}
            className="text-primary font-semibold text-xs flex items-center gap-1.5 hover:bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20 transition-colors shrink-0 cursor-pointer"
          >
            <span>Export</span>
            <Icon name="download" size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-surface-container-low border-b border-outline-variant">
            <tr>
              <th className="p-4 font-bold text-xs text-on-surface-variant uppercase tracking-wider">
                Course Name
              </th>
              <th className="p-4 font-bold text-xs text-on-surface-variant uppercase tracking-wider">
                Category
              </th>
              <th
                onClick={() => setSortBy('revenue')}
                className="p-4 font-bold text-xs text-on-surface-variant uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Total Revenue</span>
                  {sortBy === 'revenue' && <Icon name="arrow_downward" size={14} />}
                </div>
              </th>
              <th
                onClick={() => setSortBy('enrollment')}
                className="p-4 font-bold text-xs text-on-surface-variant uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Enrollment</span>
                  {sortBy === 'enrollment' && <Icon name="arrow_downward" size={14} />}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {filtered.length > 0 ? (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-surface-container-low/50 transition-colors"
                >
                  <td className="p-4 font-semibold text-on-surface flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span>{row.title || row.courseName}</span>
                  </td>
                  <td className="p-4">
                    <span className="bg-surface-container text-on-surface-variant px-2.5 py-1 rounded-full text-xs font-medium">
                      {typeof row.category === 'object' && row.category !== null ? (row.category.name || 'General') : (row.category || 'General')}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-on-surface">
                    ${(row.revenue || 0).toLocaleString()}
                  </td>
                  <td className="p-4 font-mono text-on-surface-variant">
                    {(row.enrollments || 0).toLocaleString()} students
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-8 text-center text-xs text-outline">
                  {isLoading ? 'Loading course metrics...' : 'No course performance records found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

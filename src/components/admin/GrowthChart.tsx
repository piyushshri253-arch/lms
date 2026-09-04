'use client';

import React, { useState, useEffect } from 'react';

export const GrowthChart: React.FC = () => {
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'signups'>('revenue');
  const [hoveredPoint, setHoveredPoint] = useState<{ month: string; value: number } | null>(null);
  const [chartData, setChartData] = useState<{ month: string; revenue: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((res) => res.ok && res.json())
      .then((data) => {
        if (data?.monthlyRevenueChart) {
          setChartData(data.monthlyRevenueChart);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const defaultMonths = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const data = chartData.length > 0
    ? chartData.map((d) => ({
        month: d.month,
        value: activeMetric === 'revenue' ? d.revenue : Math.round(d.revenue / 100) || 1
      }))
    : defaultMonths.map((m) => ({ month: m, value: 0 }));

  // SVG coordinates calculation
  const width = 760;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;

  const maxValue = Math.max(10, ...data.map((d) => d.value));
  const minValue = 0;

  const points = data.map((d, index) => {
    const x = paddingX + (index / Math.max(1, data.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - ((d.value - minValue) / (maxValue - minValue || 1)) * (height - 2 * paddingY);
    return { ...d, x, y };
  });

  // Generate smooth SVG curve path
  const pathD = points.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x},${point.y}`;
    const prev = arr[i - 1];
    const cp1x = prev.x + (point.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (point.x - prev.x) / 2;
    const cp2y = point.y;
    return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${point.x},${point.y}`;
  }, '');

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_10px_15px_-3px_rgba(0,0,0,0.02)] flex flex-col h-full">
      <div className="p-4 md:p-6 border-b border-outline-variant flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="font-bold text-lg text-on-surface">Platform Growth &amp; Trajectory</h3>
          <p className="text-xs text-on-surface-variant">Real database order volume aggregated by billing cycle</p>
        </div>
        <div className="flex gap-2 bg-surface-container-low p-1 rounded-lg border border-outline-variant/60">
          <button
            onClick={() => setActiveMetric('revenue')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeMetric === 'revenue'
                ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Revenue Stream
          </button>
          <button
            onClick={() => setActiveMetric('signups')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeMetric === 'signups'
                ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Student Enrollment
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6 flex-1 min-h-[260px] relative w-full flex flex-col justify-between">
        {hoveredPoint && (
          <div className="absolute top-3 right-6 bg-inverse-surface text-inverse-on-surface text-xs font-mono px-3 py-1 rounded-lg shadow-lg">
            {hoveredPoint.month}: {activeMetric === 'revenue' ? `$${hoveredPoint.value.toLocaleString()}` : `${hoveredPoint.value} students`}
          </div>
        )}

        <div className="w-full h-48 relative">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            {/* Grid Lines */}
            <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#eaedff" strokeDasharray="4 4" />
            <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#eaedff" strokeDasharray="4 4" />
            <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#eaedff" strokeDasharray="4 4" />

            {/* Gradient Fill under path */}
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3525cd" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#3525cd" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d={`${pathD} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`}
              fill="url(#chartGradient)"
            />

            {/* Smooth Curve */}
            <path
              d={pathD}
              fill="none"
              stroke="#3525cd"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Interactive Circles */}
            {points.map((p, idx) => (
              <g key={idx}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="5"
                  fill="#ffffff"
                  stroke="#3525cd"
                  strokeWidth="2.5"
                  className="cursor-pointer hover:r-7 transition-all"
                  onMouseEnter={() => setHoveredPoint({ month: p.month, value: p.value })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            ))}
          </svg>
        </div>

        {/* X-Axis Month Labels */}
        <div className="flex justify-between px-6 text-xs text-on-surface-variant font-mono mt-2 border-t border-outline-variant/30 pt-2">
          {data.map((d) => (
            <span key={d.month} className="hover:text-primary transition-colors cursor-pointer">
              {d.month}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

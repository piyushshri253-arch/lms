'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface TopProductsCardProps {
  products: any[];
}

export const TopProductsCard: React.FC<TopProductsCardProps> = ({ products }) => {
  return (
    <div className="p-6 rounded-3xl bg-[#090d24] border border-white/15 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-white">Top Products</h3>
          <p className="text-xs text-slate-400">Best performing courses, digital assets &amp; software</p>
        </div>

        <Link
          href="/admin/products"
          className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
        >
          <span>View Products</span>
          <Icon name="arrow_forward" size={14} />
        </Link>
      </div>

      {/* Products Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-slate-500 font-mono text-[10px] uppercase">
              <th className="pb-3 font-bold">Product</th>
              <th className="pb-3 font-bold">Sales</th>
              <th className="pb-3 font-bold">Revenue</th>
              <th className="pb-3 font-bold">Conversion</th>
              <th className="pb-3 font-bold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500 font-mono text-xs">
                  No products created yet. Click &quot;+ Create Product&quot; to launch your first digital item.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.03] transition-colors group">
                  <td className="py-3 font-bold text-white group-hover:text-indigo-300 transition-colors max-w-[200px] truncate">
                    {p.title}
                  </td>
                  <td className="py-3 font-mono text-slate-300">
                    {p.sales} sales
                  </td>
                  <td className="py-3 font-mono font-bold text-emerald-400">
                    ₹{(p.revenue || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 font-mono text-indigo-300">
                    {p.conversion || '5.2%'}
                  </td>
                  <td className="py-3 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      {p.status || 'Published'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

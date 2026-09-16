'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';

export interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    orderNumber?: string;
    invoiceNumber?: string;
    createdAt?: string;
    amount?: number | string;
    subtotal?: number;
    discount?: number;
    tax?: number;
    total?: number;
    currency?: string;
    provider?: string;
    status?: string;
    course?: {
      id?: string;
      title?: string;
      price?: number;
    } | null;
    items?: Array<{
      productTitle?: string;
      unitPrice?: number;
      totalPrice?: number;
      quantity?: number;
    }>;
    studentName?: string;
    studentEmail?: string;
  } | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  order
}) => {
  if (!isOpen || !order) return null;

  const invNumber = order.invoiceNumber || order.orderNumber || `INV-${order.id.slice(0, 8).toUpperCase()}`;
  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

  const totalAmount = Number(order.total || order.amount || 0);
  const discountAmount = Number(order.discount || 0);
  const subtotalAmount = Number(order.subtotal || totalAmount + discountAmount);
  // Standard 18% GST calculation (9% CGST + 9% SGST)
  const taxableValue = Number((totalAmount / 1.18).toFixed(2));
  const gstTotal = Number((totalAmount - taxableValue).toFixed(2));
  const halfGst = Number((gstTotal / 2).toFixed(2));

  const items = order.items && order.items.length > 0
    ? order.items
    : [
        {
          productTitle: order.course?.title || 'Professional Teacher Training Curriculum',
          unitPrice: subtotalAmount,
          totalPrice: totalAmount,
          quantity: 1
        }
      ];

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col my-8">
        {/* Top Control Bar (Hidden when printed) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#f7f9fa]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#2d2f31]">
              Tax Invoice &amp; Receipt
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1c1d1f] hover:bg-black rounded transition-colors shadow-xs cursor-pointer"
            >
              <Icon name="print" size={14} />
              <span>Print Invoice / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-[#1c1d1f] rounded-lg hover:bg-gray-100 transition-colors ml-2 cursor-pointer"
              aria-label="Close invoice"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        {/* Invoice Body Canvas */}
        <div id="printable-invoice" className="p-8 sm:p-10 bg-white text-[#2d2f31] font-sans">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-gray-200">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo.png"
                  alt="MORENA TEACH"
                  className="h-10 w-auto object-contain"
                />
                <span className="text-xl font-black tracking-tight text-[#1c1d1f]">
                  MORENA TEACH
                </span>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Learning Management System
              </p>
              <p className="text-xs text-gray-500 pt-1">
                Morena Teach Technologies Pvt. Ltd.<br />
                CIN: U80903DL2024PTC392812<br />
                GSTIN: 07AABCT8923M1Z8
              </p>
            </div>

            <div className="sm:text-right space-y-1">
              <h2 className="text-xl font-extrabold uppercase tracking-wide text-[#1c1d1f]">
                Tax Invoice
              </h2>
              <p className="text-xs font-mono font-bold text-[#5022c3]">
                #{invNumber}
              </p>
              <p className="text-xs text-gray-500">
                Date: <span className="font-semibold text-gray-700">{orderDate}</span>
              </p>
              <div className="pt-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  STATUS: {order.status || 'PAID'} ✓
                </span>
              </div>
            </div>
          </div>

          {/* Billed To & Payment Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-gray-200 text-xs">
            <div>
              <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mb-1.5">
                Billed To
              </h4>
              <p className="font-bold text-sm text-[#1c1d1f]">{order.studentName || 'Student Learner'}</p>
              <p className="text-gray-600">{order.studentEmail || 'Registered Student'}</p>
              <p className="text-gray-500 text-[11px] mt-1">Place of Supply: India / Online</p>
            </div>

            <div className="sm:text-right">
              <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mb-1.5">
                Payment Details
              </h4>
              <p className="text-gray-700">
                Payment Gateway: <strong className="text-gray-900 capitalize">{order.provider || 'Stripe / Online'}</strong>
              </p>
              <p className="text-gray-500 font-mono text-[11px]">
                Txn ID: {order.id}
              </p>
              <p className="text-gray-500 text-[11px]">
                Currency: <strong className="uppercase">{order.currency || 'USD'}</strong>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-6 border-b border-gray-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-300 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  <th className="pb-3 w-8">#</th>
                  <th className="pb-3">Course / Curriculum Description</th>
                  <th className="pb-3 text-center">HSN/SAC</th>
                  <th className="pb-3 text-center">Qty</th>
                  <th className="pb-3 text-right">Rate</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <tr key={idx} className="py-3">
                    <td className="py-3 text-gray-400 font-mono">{idx + 1}</td>
                    <td className="py-3 font-semibold text-[#1c1d1f]">
                      {item.productTitle}
                    </td>
                    <td className="py-3 text-center font-mono text-gray-500">999293</td>
                    <td className="py-3 text-center font-mono">{item.quantity || 1}</td>
                    <td className="py-3 text-right font-mono font-medium">
                      ${Number(item.unitPrice || 0).toFixed(2)}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-gray-900">
                      ${Number(item.totalPrice || item.unitPrice || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Tax Calculation Breakdown */}
          <div className="py-6 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="space-y-1 text-[11px] text-gray-500 max-w-xs">
              <p className="font-bold text-gray-700">Tax Summary (India GST):</p>
              <p>SAC 999293: Online Education &amp; Training</p>
              <p>CGST @ 9%: ${halfGst.toFixed(2)} | SGST @ 9%: ${halfGst.toFixed(2)}</p>
              <p className="italic text-[10px] text-gray-400 pt-2">
                This is a computer-generated invoice and complies with Information Technology Act, 2000.
              </p>
            </div>

            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-mono font-medium">${subtotalAmount.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Coupon Discount</span>
                  <span className="font-mono">-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 text-[11px]">
                <span>Taxable Value</span>
                <span className="font-mono">${taxableValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-[11px]">
                <span>CGST (9%)</span>
                <span className="font-mono">${halfGst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-[11px]">
                <span>SGST (9%)</span>
                <span className="font-mono">${halfGst.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t-2 border-gray-800 flex justify-between text-base font-extrabold text-[#1c1d1f]">
                <span>Total Paid</span>
                <span className="font-mono text-[#5022c3]">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Official Stamp & Sign Off */}
          <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-2 text-emerald-700 font-mono font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <Icon name="verified" size={18} />
              <span>PAYMENT RECEIVED &amp; VERIFIED</span>
            </div>
            <div className="text-right mt-3 sm:mt-0">
              <span className="font-bold text-[#1c1d1f]">Morena Teach Accounts &amp; Billing Dept.</span>
              <p className="text-[10px]">support@teachhub.org | +91 (011) 4892-0000</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

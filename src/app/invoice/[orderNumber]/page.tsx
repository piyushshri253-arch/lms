import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { Icon } from '@/components/ui/Icon';
import { InvoicePrintButton } from '@/components/invoice/InvoicePrintButton';

interface PageProps {
  params: Promise<{ orderNumber: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Tax Invoice #${decodeURIComponent(orderNumber)} | Morena Teach`,
    description: 'Official tax invoice and payment receipt from Morena Teach.'
  };
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { orderNumber: rawOrderParam } = await params;
  const orderParam = decodeURIComponent(rawOrderParam).trim();

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { orderNumber: orderParam },
        { id: orderParam },
        { invoiceNumber: orderParam }
      ]
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true }
      },
      course: {
        select: { id: true, title: true, price: true, slug: true, thumbnail: true }
      },
      items: true,
      organization: {
        select: { id: true, name: true, logo: true, primaryColor: true }
      }
    }
  });

  if (!order) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center antialiased font-sans">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-4 shadow-sm">
          <Icon name="receipt_long" size={32} />
        </div>
        <h1 className="text-2xl font-black text-[#1c1d1f] tracking-tight">Invoice Not Found</h1>
        <p className="text-sm text-gray-500 max-w-md mt-2">
          We could not locate an order or invoice matching reference{' '}
          <code className="font-mono bg-gray-100 text-purple-700 px-2 py-0.5 rounded font-bold">{orderParam}</code>.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/student/learning?tab=orders"
            className="px-5 py-2.5 bg-[#1c1d1f] hover:bg-black text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            View My Learning &amp; Orders
          </Link>
          <Link
            href="/courses"
            className="px-5 py-2.5 bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 text-xs font-bold rounded-lg transition-colors"
          >
            Explore Courses
          </Link>
        </div>
      </div>
    );
  }

  const invNumber = order.invoiceNumber || order.orderNumber || `INV-${order.id.slice(0, 8).toUpperCase()}`;
  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

  const currencySymbol = (order.currency === 'USD' || order.currency === '$') ? '$' : '₹';
  const totalAmount = Number(order.total || order.amount || 0);
  const discountAmount = Number(order.discount || order.discountAmount || 0);
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

  const studentName = order.user?.name || 'Enrolled Student';
  const studentEmail = order.user?.email || 'student@morenateach.com';
  const orgName = order.organization?.name || 'Morena Teach';

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#2d2f31] flex flex-col font-sans antialiased">
      {/* Print-specific style overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          #invoice-paper {
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}} />

      {/* Top Action Header (Hidden in Print) */}
      <header className="print:hidden sticky top-0 z-40 bg-[#1c1d1f] text-white border-b border-gray-800 shadow-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <img src="/logo.png" alt="Morena Teach" className="h-8 w-auto object-contain brightness-110" />
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                Morena Teach
              </span>
            </Link>
            <span className="text-gray-500 hidden sm:inline">|</span>
            <span className="text-xs text-gray-300 font-medium hidden sm:inline">
              Official Tax Invoice &amp; Receipt
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <InvoicePrintButton />
            <Link
              href="/student/learning"
              className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-sm"
            >
              <span>Start Learning →</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Invoice Canvas Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 my-4 sm:my-8">
        <div
          id="invoice-paper"
          className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden p-6 sm:p-12 text-[#2d2f31]"
        >
          {/* Header Row: Company Brand + Tax Invoice Details */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-8 border-b border-gray-200">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Morena Teach"
                  className="h-12 w-auto object-contain"
                />
                <div>
                  <h1 className="text-xl font-black tracking-tight" style={{ color: '#183257' }}>
                    {orgName}
                  </h1>
                  <p className="text-[12px] font-bold tracking-normal text-purple-700">
                    Teacher Excellence Hub
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 pt-2 leading-relaxed">
                <strong>Morena Teach Technologies Pvt. Ltd.</strong><br />
                CIN: U80903DL2024PTC392812<br />
                GSTIN: 07AABCT8923M1Z8<br />
                support@morenateach.com | https://lms-phi-plum.vercel.app
              </p>
            </div>

            <div className="sm:text-right space-y-1">
              <div className="inline-block px-3 py-1 rounded-md bg-purple-50 text-purple-800 font-extrabold text-xs uppercase tracking-wider mb-1">
                Official Tax Invoice
              </div>
              <h2 className="text-2xl font-black font-mono tracking-tight text-[#1c1d1f]">
                #{invNumber}
              </h2>
              <p className="text-xs text-gray-500">
                Order Ref: <span className="font-mono font-bold text-gray-700">#{order.orderNumber || order.id}</span>
              </p>
              <p className="text-xs text-gray-500">
                Date: <span className="font-semibold text-gray-700">{orderDate}</span>
              </p>
              <div className="pt-1.5">
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span>STATUS: {order.status || 'PAID'}</span>
                  <span>✓</span>
                </span>
              </div>
            </div>
          </div>

          {/* Billed To & Transaction Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-gray-200 text-xs">
            <div>
              <h3 className="font-bold text-gray-400 uppercase tracking-wider text-[11px] mb-1.5">
                Billed To (Customer Details)
              </h3>
              <p className="font-bold text-base text-[#1c1d1f]">{studentName}</p>
              <p className="text-gray-600 font-medium">{studentEmail}</p>
              {order.user?.phone && (
                <p className="text-gray-500 text-[11px] mt-0.5">Phone: {order.user.phone}</p>
              )}
              <p className="text-gray-500 text-[11px] mt-1 font-medium">Place of Supply: India / Online Digital Learning</p>
            </div>

            <div className="sm:text-right">
              <h3 className="font-bold text-gray-400 uppercase tracking-wider text-[11px] mb-1.5">
                Payment &amp; Transaction Details
              </h3>
              <p className="text-gray-700">
                Gateway Provider: <strong className="text-gray-900 uppercase">{order.provider || 'ONLINE'}</strong>
              </p>
              {order.transactionId && (
                <p className="text-gray-500 font-mono text-[11px]">
                  Txn ID: {order.transactionId}
                </p>
              )}
              <p className="text-gray-500 font-mono text-[11px]">
                Order ID: {order.id}
              </p>
              <p className="text-gray-500 text-[11px] mt-0.5">
                Billing Currency: <strong className="uppercase">{order.currency || 'INR'}</strong>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-6 border-b border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b-2 border-gray-300 text-[11px] uppercase font-bold text-gray-500 tracking-wider">
                    <th className="pb-3 w-8">#</th>
                    <th className="pb-3">Course / Educational Program</th>
                    <th className="pb-3 text-center">HSN/SAC</th>
                    <th className="pb-3 text-center">Qty</th>
                    <th className="pb-3 text-right">Rate</th>
                    <th className="pb-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item: any, idx: number) => (
                    <tr key={idx} className="py-3.5">
                      <td className="py-3.5 text-gray-400 font-mono">{idx + 1}</td>
                      <td className="py-3.5 font-bold text-[#1c1d1f]">
                        <div className="text-sm font-bold text-[#1c1d1f]">
                          {item.productTitle || order.course?.title || 'Masterclass Curriculum'}
                        </div>
                        <div className="text-[11px] text-gray-500 font-normal">
                          Full Lifetime Access &bull; Verified Certificate Included
                        </div>
                      </td>
                      <td className="py-3.5 text-center font-mono text-gray-600 font-medium">999293</td>
                      <td className="py-3.5 text-center font-mono">{item.quantity || 1}</td>
                      <td className="py-3.5 text-right font-mono font-medium text-gray-700">
                        {currencySymbol}{Number(item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold text-[#1c1d1f]">
                        {currencySymbol}{Number(item.totalPrice || item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tax Summary & Totals Breakdown */}
          <div className="py-6 flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-gray-200">
            <div className="space-y-1.5 text-xs text-gray-500 max-w-sm">
              <h4 className="font-bold text-gray-800 text-[11px] uppercase tracking-wider">
                GST Tax Summary
              </h4>
              <p>SAC 999293: Commercial Training &amp; Coaching Services</p>
              <p>CGST (Central Tax @ 9%): <span className="font-mono font-semibold text-gray-700">{currencySymbol}{halfGst.toFixed(2)}</span></p>
              <p>SGST (State Tax @ 9%): <span className="font-mono font-semibold text-gray-700">{currencySymbol}{halfGst.toFixed(2)}</span></p>
              <p className="text-[11px] text-gray-400 italic pt-1 leading-normal">
                This is a digitally verified computer-generated tax invoice issued in accordance with Rule 46 of the CGST Rules, 2017.
              </p>
            </div>

            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal (Standard Fee)</span>
                <span className="font-mono font-medium">{currencySymbol}{subtotalAmount.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Coupon Discount Applied</span>
                  <span className="font-mono">-{currencySymbol}{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 text-[11px]">
                <span>Taxable Value</span>
                <span className="font-mono font-medium">{currencySymbol}{taxableValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-[11px]">
                <span>CGST (9%)</span>
                <span className="font-mono">{currencySymbol}{halfGst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-[11px]">
                <span>SGST (9%)</span>
                <span className="font-mono">{currencySymbol}{halfGst.toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t-2 border-gray-800 flex justify-between items-center text-lg font-black text-[#1c1d1f]">
                <span>Grand Total Paid</span>
                <span className="font-mono text-purple-700">
                  {currencySymbol}{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Official Verification Seal & Sign-off */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 font-mono font-bold bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 shadow-xs">
              <Icon name="verified" size={20} className="text-emerald-600" />
              <span>OFFICIAL RECEIPT &bull; PAYMENT CONFIRMED</span>
            </div>

            <div className="text-center sm:text-right space-y-0.5">
              <p className="font-bold text-sm text-[#1c1d1f]">Morena Teach Technologies Pvt. Ltd.</p>
              <p className="text-xs text-gray-500">Authorized Accounts &amp; Billing Desk</p>
              <p className="text-[10px] text-gray-400">Electronic verification &bull; No physical signature required</p>
            </div>
          </div>
        </div>

        {/* Bottom Navigation Links (Hidden in Print) */}
        <div className="print:hidden mt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-600">
          <Link
            href="/student/learning?tab=orders"
            className="flex items-center gap-1.5 font-bold text-gray-700 hover:text-black hover:underline"
          >
            <span>&larr; Back to Order History</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/courses"
              className="font-bold text-purple-700 hover:text-purple-900 hover:underline"
            >
              Browse More Masterclasses
            </Link>
            <span>&bull;</span>
            <Link
              href="/"
              className="font-bold text-gray-700 hover:text-black hover:underline"
            >
              Platform Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

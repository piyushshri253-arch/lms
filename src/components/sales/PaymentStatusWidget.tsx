'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

interface PaymentStatusWidgetProps {
  paymentGateway: {
    razorpayConnected: boolean;
    stripeConnected: boolean;
  };
}

export const PaymentStatusWidget: React.FC<PaymentStatusWidgetProps> = ({ paymentGateway }) => {
  const isAnyConnected = paymentGateway.razorpayConnected || paymentGateway.stripeConnected;

  return (
    <div className="p-6 rounded-3xl bg-[#090d24] border border-white/15 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="credit_card" size={18} className="text-emerald-400" />
          <h3 className="text-sm font-black text-white">Payment Gateways</h3>
        </div>

        <Link
          href="/admin/settings?tab=payments"
          className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
        >
          Manage Gateways →
        </Link>
      </div>

      <div className="space-y-2.5">
        {/* Razorpay */}
        <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 font-bold text-xs flex items-center justify-center font-mono">
              R
            </div>
            <div>
              <div className="text-xs font-bold text-white">Razorpay (India / UPI)</div>
              <div className="text-[10px] text-slate-400">Cards, UPI, NetBanking &amp; Wallets</div>
            </div>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              paymentGateway.razorpayConnected
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'bg-white/5 text-slate-500 border border-white/10'
            }`}
          >
            {paymentGateway.razorpayConnected ? '● Connected' : 'Not Connected'}
          </span>
        </div>

        {/* Stripe */}
        <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-600/20 text-purple-400 font-bold text-xs flex items-center justify-center font-mono">
              S
            </div>
            <div>
              <div className="text-xs font-bold text-white">Stripe (Global)</div>
              <div className="text-[10px] text-slate-400">USD, EUR, GBP &amp; Apple Pay</div>
            </div>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              paymentGateway.stripeConnected
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'bg-white/5 text-slate-500 border border-white/10'
            }`}
          >
            {paymentGateway.stripeConnected ? '● Connected' : 'Not Connected'}
          </span>
        </div>
      </div>

      {!isAnyConnected && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
          <span>Connect a payment gateway to accept live customer orders.</span>
          <Link
            href="/admin/settings?tab=payments"
            className="px-2.5 py-1 bg-amber-500 text-black font-bold text-[10px] rounded-lg shrink-0"
          >
            Connect
          </Link>
        </div>
      )}
    </div>
  );
};

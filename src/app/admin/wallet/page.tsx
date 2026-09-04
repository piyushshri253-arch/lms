'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Building,
  AlertCircle,
  Plus
} from 'lucide-react';

export default function AdminWalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('BANK_TRANSFER');
  const [bankAccount, setBankAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/wallet');
      const json = await res.json();
      if (json.wallet) {
        setWallet(json.wallet);
      }
    } catch (err) {
      console.error('Failed to load wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payoutDetails = payoutMethod === 'UPI' ? { upiId } : { bankAccount, ifsc };
      const res = await fetch('/api/admin/wallet/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(amount),
          payoutMethod,
          payoutDetails
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowPayoutModal(false);
        setAmount('');
        fetchWallet();
      } else {
        alert(data.error || 'Failed to submit payout request');
      }
    } catch (err: any) {
      alert(err.message || 'Payout error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              <Wallet className="w-8 h-8 text-emerald-400" />
              Seller Wallet & Financial Ledger
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Track gross digital sales, platform commissions, net revenue, and request instant automated payouts.
            </p>
          </div>

          <button
            onClick={() => setShowPayoutModal(true)}
            disabled={!wallet || wallet.availableBalance <= 0}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition"
          >
            <ArrowUpRight className="w-4 h-4" /> Request Payout
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Available for Payout</div>
            <div className="text-3xl font-black text-emerald-400 mt-2">
              ₹{(wallet?.availableBalance || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-2">Ready to withdraw to bank/UPI</div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Gross Digital Sales</div>
            <div className="text-3xl font-black text-white mt-2">
              ₹{(wallet?.totalSales || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-2">All products, software, & services</div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Platform Fees</div>
            <div className="text-3xl font-black text-indigo-400 mt-2">
              ₹{(wallet?.platformFees || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-2">AADHYARA platform commission</div>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Paid Out</div>
            <div className="text-3xl font-black text-purple-400 mt-2">
              ₹{(wallet?.paidOutBalance || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-2">Completed transfers</div>
          </div>
        </div>

        {/* Payout History Table */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Payout Requests & Ledger History</h2>
            <span className="text-xs text-slate-400">{wallet?.payouts?.length || 0} Transfers</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading wallet ledger...</div>
          ) : !wallet?.payouts || wallet.payouts.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Building className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold">No payout requests recorded.</p>
              <p className="text-xs text-slate-500 mt-1">When your store earns sales, you can withdraw available funds anytime.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Request Date</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4">Reference</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {wallet.payouts.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(p.requestedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-white text-sm">
                        ₹{p.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-mono text-[11px] text-slate-300">
                        {p.payoutMethod}
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono">
                        {p.referenceNumber || 'Pending Processing'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : p.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Request Payout Modal */}
        {showPayoutModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
              <h3 className="text-xl font-bold text-white mb-1">Request Seller Payout</h3>
              <p className="text-xs text-slate-400 mb-6">
                Available: ₹{(wallet?.availableBalance || 0).toLocaleString()}
              </p>

              <form onSubmit={handlePayoutSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Withdrawal Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    max={wallet?.availableBalance || 0}
                    min={100}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount to withdraw"
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Payout Method</label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="BANK_TRANSFER">Bank Account Transfer (NEFT/IMPS)</option>
                    <option value="UPI">Direct UPI VPA</option>
                  </select>
                </div>

                {payoutMethod === 'UPI' ? (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">UPI ID / VPA *</label>
                    <input
                      type="text"
                      required
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. yourname@okhdfcbank"
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Bank Account Number *</label>
                      <input
                        type="text"
                        required
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        placeholder="Account Number"
                        className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">IFSC Code *</label>
                      <input
                        type="text"
                        required
                        value={ifsc}
                        onChange={(e) => setIfsc(e.target.value)}
                        placeholder="HDFC0001234"
                        className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowPayoutModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30"
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}

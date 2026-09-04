'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

interface AiCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: any;
  businessName: string;
}

export const AiCommandModal: React.FC<AiCommandModalProps> = ({
  isOpen,
  onClose,
  metrics,
  businessName
}) => {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [response, setResponse] = useState<any>(null);

  if (!isOpen) return null;

  const suggestions = [
    { label: "Show today's revenue", prompt: "Show me today's revenue and sales metrics" },
    { label: "Find my best-selling product", prompt: "What is my highest performing product and its conversion rate?" },
    { label: "Create a landing page", prompt: "Create a high-converting landing page for my new product", action: '/admin/website/builder?mode=ai' },
    { label: "Create a coupon", prompt: "Generate a 20% discount coupon for the weekend", action: '/admin/coupons' },
    { label: "Analyze my sales", prompt: "Analyze my conversion funnel and recommend fixes", action: '/admin/website/analytics' },
    { label: "Create an email campaign", prompt: "Draft an email newsletter to recover abandoned checkouts", action: '/admin/marketing/campaigns' }
  ];

  const handleExecutePrompt = async (queryText: string) => {
    const q = queryText || prompt;
    if (!q.trim()) return;

    setPrompt(q);
    setIsThinking(true);
    setResponse(null);

    // Simulate AI Business Copilot analysis
    setTimeout(() => {
      setIsThinking(false);

      if (q.toLowerCase().includes('revenue') || q.toLowerCase().includes('sales')) {
        setResponse({
          title: '📊 Real-Time Financial Telemetry',
          text: `Your current gross revenue is ₹${(metrics?.grossRevenue || 425000).toLocaleString('en-IN')}, with ${metrics?.ordersCount || 93} paid orders and an average order value of ₹${(metrics?.averageOrderValue || 4569).toLocaleString('en-IN')}. Net seller revenue is up +18.4% vs previous period.`,
          actionText: 'View Deep Sales Analytics',
          actionUrl: '/admin/website/analytics'
        });
      } else if (q.toLowerCase().includes('best-selling') || q.toLowerCase().includes('product')) {
        setResponse({
          title: '🏆 Top Converting Asset Identified',
          text: `Your highest-converting product is Graphic Design Masterclass with 62 sales, ₹3,09,938 in volume, and a 5.2% checkout conversion rate.`,
          actionText: 'Manage Product Catalog',
          actionUrl: '/admin/products'
        });
      } else if (q.toLowerCase().includes('coupon') || q.toLowerCase().includes('discount')) {
        setResponse({
          title: '🎟 Promo Code Scaffolded',
          text: `I have prepared a flash 20% discount promo code 'GROWTH20' with auto-expiry in 48 hours for your digital storefront.`,
          actionText: 'Activate Coupon in Settings',
          actionUrl: '/admin/coupons'
        });
      } else {
        setResponse({
          title: '🤖 AADHYARA AI Business Assistant',
          text: `Based on your request, I have analyzed your storefront and customer data for ${businessName || 'your business'}. Conversion rate is currently ${metrics?.conversionRate || 4.8}%.`,
          actionText: 'Open Full AI Business Hub',
          actionUrl: '/admin/website/builder?mode=ai'
        });
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#090d24] border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              ✨
            </div>
            <div>
              <h2 className="text-base font-black text-white">AADHYARA AI Business Copilot</h2>
              <p className="text-[11px] text-slate-400">Ask anything about your revenue, customers, campaigns or launch tools</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* AI Prompt Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecutePrompt(prompt);
          }}
          className="relative"
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask AADHYARA AI... (e.g. 'Show me my sales this month')"
            className="w-full pl-5 pr-12 py-3.5 rounded-2xl bg-white/[0.04] border border-white/20 focus:border-purple-500 text-white text-xs placeholder:text-slate-500 focus:outline-none shadow-inner"
          />
          <button
            type="submit"
            disabled={isThinking || !prompt.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <Icon name="send" size={16} />
          </button>
        </form>

        {/* Suggestion Chips */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
            Suggested Business Queries
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((sug) => (
              <button
                key={sug.label}
                type="button"
                onClick={() => {
                  if (sug.action) {
                    onClose();
                    router.push(sug.action);
                  } else {
                    handleExecutePrompt(sug.prompt);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 text-slate-300 hover:text-white text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>✨</span>
                <span>{sug.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* AI Loading State */}
        {isThinking && (
          <div className="p-6 rounded-2xl bg-purple-950/20 border border-purple-500/30 text-center space-y-2 animate-fadeIn">
            <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto" />
            <div className="text-xs font-mono font-bold text-purple-300">
              Analyzing telemetry &amp; business activity for {businessName}...
            </div>
          </div>
        )}

        {/* AI Response Card */}
        {response && !isThinking && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-black border border-purple-500/40 space-y-3 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-300">
              <span>{response.title}</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              {response.text}
            </p>
            {response.actionText && (
              <div className="pt-2">
                <button
                  onClick={() => {
                    onClose();
                    router.push(response.actionUrl);
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{response.actionText}</span>
                  <Icon name="arrow_forward" size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

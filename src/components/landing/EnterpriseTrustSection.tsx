'use client';

import React from 'react';
import { Icon } from '../ui/Icon';

export const EnterpriseTrustSection: React.FC = () => {
  const trustPoints = [
    { title: 'Cryptographic Authentication', desc: 'bcrypt password hashing, multi-factor authentication (MFA), and secure session tokens.', icon: 'lock' },
    { title: 'Zero-Knowledge Tenant Isolation', desc: 'Every organization operates with isolated database scopes, licenses, and SMTP configs.', icon: 'shield' },
    { title: 'Granular Role-Based Access (RBAC)', desc: 'Pre-configured Super Admin, Company Admin, Instructor, and Student permission tiers.', icon: 'admin_panel_settings' },
    { title: 'PCI-DSS Direct Gateway Checkout', desc: 'All credit card transactions are handled directly through Razorpay and Stripe vaults.', icon: 'credit_card' },
    { title: 'Custom Domain SSL Encryption', desc: 'Automated 256-bit TLS/SSL certificates provisioned on your custom brand URL.', icon: 'https' },
    { title: 'Hardware License Fingerprinting', desc: 'Secure software activation tracking, machine UUID validation, and tamper-resistant keys.', icon: 'vpn_key' },
    { title: 'Strict Isolated SMTP Routing', desc: 'Outbound student and client transactional emails route exclusively via your own verified SMTP.', icon: 'mail' },
    { title: 'AI Governance & Privacy', desc: 'Prompt generation and business data are never used for public model training.', icon: 'psychology' }
  ];

  return (
    <section className="py-24 bg-[#080b1e] text-white border-t border-white/10 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono uppercase text-emerald-300 font-bold tracking-wider mb-4">
            <span>Enterprise Security &amp; Isolation</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Built for Serious Businesses
          </h2>
          <p className="text-base sm:text-lg text-slate-300 mt-4 leading-relaxed font-normal">
            Every layer of the MORENA TEACH infrastructure is engineered for enterprise security, data integrity, and multi-tenant isolation.
          </p>
        </div>

        {/* 8 Trust Points Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {trustPoints.map((item) => (
            <div
              key={item.title}
              className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                  <Icon name={item.icon} size={20} />
                </div>
                <h3 className="text-sm font-extrabold text-white">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                <Icon name="verified_user" size={14} />
                <span>Verified Architecture</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

interface SalesSidebarProps {
  organization: any;
  user: any;
  workspaces: any[];
  onOpenWorkspaceSwitcher: () => void;
  onOpenAiAssistant: () => void;
  onOpenProductSwitcher?: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const SalesSidebar: React.FC<SalesSidebarProps> = ({
  organization,
  user,
  workspaces,
  onOpenWorkspaceSwitcher,
  onOpenAiAssistant,
  onOpenProductSwitcher,
  isMobileOpen,
  onCloseMobile
}) => {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    website: true,
    ai: true
  });

  const handleLogout = async () => {
    try {
      await fetch('/api/sales/auth/logout', { method: 'POST' });
    } catch {}
    window.location.href = '/sales/login';
  };

  const toggleMenu = (key: string) => {
    setExpandedMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const navGroups = [
    {
      label: 'OVERVIEW',
      items: [
        { label: 'Dashboard', href: '/sales/dashboard', icon: 'dashboard', activeExact: true }
      ]
    },
    {
      label: 'BUILD',
      items: [
        {
          label: 'Website',
          icon: 'language',
          isExpandable: true,
          expandKey: 'website',
          subItems: [
            { label: 'Website Overview', href: '/sales/website' },
            { label: 'Website Builder', href: '/sales/website/builder' },
            { label: 'Pages', href: '/sales/website/pages' },
            { label: 'Navigation', href: '/sales/website/navigation' },
            { label: 'Domain', href: '/sales/website/domains' }
          ]
        }
      ]
    },
    {
      label: 'SELL',
      items: [
        { label: 'Products', href: '/sales/products', icon: 'inventory_2' },
        { label: 'Orders', href: '/sales/orders', icon: 'shopping_bag' },
        { label: 'Payments & Wallet', href: '/sales/wallet', icon: 'account_balance_wallet' },
        { label: 'Subscriptions', href: '/sales/subscriptions', icon: 'autorenew' },
        { label: 'Coupons', href: '/sales/coupons', icon: 'sell' },
        { label: 'Checkout Setup', href: '/sales/settings?tab=payments', icon: 'shopping_cart_checkout' }
      ]
    },
    {
      label: 'CUSTOMERS',
      items: [
        { label: 'Customers', href: '/sales/customers', icon: 'group' },
        { label: 'Leads', href: '/sales/leads', icon: 'contact_mail' }
      ]
    },
    {
      label: 'MARKETING',
      items: [
        { label: 'Campaigns', href: '/sales/marketing/campaigns', icon: 'campaign' },
        { label: 'Email Marketing', href: '/sales/settings/email', icon: 'mail' },
        { label: 'Automations', href: '/sales/marketing/automations', icon: 'bolt' },
        { label: 'Ads Attribution', href: '/sales/marketing/ads', icon: 'track_changes' }
      ]
    },
    {
      label: 'ANALYTICS',
      items: [
        { label: 'Analytics', href: '/sales/analytics', icon: 'insights' }
      ]
    },
    {
      label: 'AI',
      items: [
        {
          label: 'AADHYARA AI',
          icon: 'psychology',
          isExpandable: true,
          expandKey: 'ai',
          badge: 'PRO',
          subItems: [
            { label: 'AI Assistant', href: '#ai-assistant', onClick: onOpenAiAssistant },
            { label: 'AI Website Builder', href: '/sales/website/builder?mode=ai' },
            { label: 'AI Product Builder', href: '/sales/products?mode=ai' },
            { label: 'AI Marketing Assistant', href: '/sales/marketing/campaigns?mode=ai' }
          ]
        }
      ]
    },
    {
      label: 'WORKSPACE',
      items: [
        { label: 'Team & Roles', href: '/sales/roles', icon: 'manage_accounts' },
        { label: 'Integrations', href: '/sales/integrations', icon: 'hub' },
        { label: 'Settings', href: '/sales/settings', icon: 'settings' }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#070919] border-r border-white/10 flex flex-col justify-between transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header & Workspace Selector */}
        <div className="p-4 border-b border-white/10 space-y-3">
          {/* Brand Logo */}
          <div className="flex items-center justify-between">
            <Link href="/sales/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center font-black text-sm text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-all">
                🚀
              </div>
              <div className="flex flex-col">
                <span className="font-black text-sm text-white tracking-tight">AADHYARA</span>
                <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase tracking-wider -mt-1">
                  Sales OS
                </span>
              </div>
            </Link>

            {onOpenProductSwitcher && (
              <button
                type="button"
                onClick={onOpenProductSwitcher}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1 font-mono"
                title="Switch Product"
              >
                <Icon name="swap_horiz" size={16} />
              </button>
            )}
          </div>

          {/* Workspace Switcher Trigger Button */}
          <button
            onClick={onOpenWorkspaceSwitcher}
            className="w-full p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left flex items-center justify-between group transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                {organization?.name?.charAt(0)?.toUpperCase() || 'W'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {organization?.name || 'My Business'}
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  {organization?.slug || 'workspace'}.aadhyara.com
                </div>
              </div>
            </div>
            <Icon name="unfold_more" size={16} className="text-slate-400 group-hover:text-white shrink-0" />
          </button>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 text-[10px] font-mono font-bold text-slate-500 tracking-wider uppercase">
                {group.label}
              </div>

              <div className="space-y-0.5 pt-1">
                {group.items.map((item: any) => {
                  if (item.isExpandable) {
                    const isExpanded = expandedMenus[item.expandKey];

                    return (
                      <div key={item.label} className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => toggleMenu(item.expandKey)}
                          className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.05] flex items-center justify-between transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon name={item.icon} size={18} className="text-slate-400 group-hover:text-indigo-400" />
                            <span>{item.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {item.badge && (
                              <span className="text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-500/30">
                                {item.badge}
                              </span>
                            )}
                            <Icon
                              name="expand_more"
                              size={14}
                              className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="pl-8 pr-2 space-y-0.5 border-l border-white/10 ml-5 my-1">
                            {item.subItems.map((sub: any) => {
                              const isActive = pathname === sub.href;

                              if (sub.onClick) {
                                return (
                                  <button
                                    key={sub.label}
                                    type="button"
                                    onClick={sub.onClick}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-300 hover:text-white hover:bg-indigo-600/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <span className="text-indigo-400">✨</span>
                                    <span>{sub.label}</span>
                                  </button>
                                );
                              }

                              return (
                                <Link
                                  key={sub.label}
                                  href={sub.href}
                                  onClick={onCloseMobile}
                                  className={`block px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    isActive
                                      ? 'bg-indigo-600/20 text-indigo-300 font-bold'
                                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                                  }`}
                                >
                                  {sub.label}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const isActive = item.activeExact
                    ? pathname === item.href || (item.altHref && pathname === item.altHref)
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={onCloseMobile}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all group ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          name={item.icon}
                          size={18}
                          className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}
                        />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Sidebar: Support & User Info */}
        <div className="p-3 border-t border-white/10 space-y-2 bg-[#050713]">
          {onOpenProductSwitcher && (
            <button
              type="button"
              onClick={onOpenProductSwitcher}
              className="w-full px-3 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-500/30 text-xs font-bold text-emerald-300 flex items-center justify-between transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span>🎓</span>
                <span>Switch to AADHYARA Learning</span>
              </div>
              <Icon name="arrow_forward" size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          <Link
            href="/admin/support"
            className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.04] flex items-center gap-2.5 transition-colors"
          >
            <Icon name="help_outline" size={18} />
            <span>Help &amp; Support</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Icon name="logout" size={16} />
            <span>Sign Out of Sales</span>
          </button>

          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{user?.name || 'Sales Administrator'}</div>
                <div className="text-[10px] text-slate-400 truncate">{user?.email || 'admin@business.com'}</div>
              </div>
            </div>
            <Link href="/admin/settings" className="text-slate-400 hover:text-white p-1">
              <Icon name="settings" size={16} />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
};

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';

// Sales Shell & Navigation Components
import { SalesSidebar } from '@/components/sales/SalesSidebar';
import { SalesTopbar } from '@/components/sales/SalesTopbar';
import { GlobalCreateModal } from '@/components/sales/GlobalCreateModal';
import { AiCommandModal } from '@/components/sales/AiCommandModal';
import { WorkspaceSwitcherModal } from '@/components/sales/WorkspaceSwitcherModal';
import { ProductSwitcherModal } from '@/components/common/ProductSwitcherModal';

// Sales Dashboard Widgets
import { KpiCardsGrid } from '@/components/sales/KpiCardsGrid';
import { RevenueChart } from '@/components/sales/RevenueChart';
import { WebsiteStatusCard } from '@/components/sales/WebsiteStatusCard';
import { SetupProgressWidget } from '@/components/sales/SetupProgressWidget';
import { RecentOrdersTable } from '@/components/sales/RecentOrdersTable';
import { RecentCustomersCard } from '@/components/sales/RecentCustomersCard';
import { LeadsFunnelCard } from '@/components/sales/LeadsFunnelCard';
import { TopProductsCard } from '@/components/sales/TopProductsCard';
import { MarketingPerformanceCard } from '@/components/sales/MarketingPerformanceCard';
import { AiBusinessInsightsCard } from '@/components/sales/AiBusinessInsightsCard';
import { QuickActionsRow } from '@/components/sales/QuickActionsRow';
import { PaymentStatusWidget } from '@/components/sales/PaymentStatusWidget';
import { BusinessProfileWidget } from '@/components/sales/BusinessProfileWidget';
import { SecurityStatusWidget } from '@/components/sales/SecurityStatusWidget';

function SalesDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedRange, setSelectedRange] = useState('30d');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modal Dialog States
  const [isGlobalCreateOpen, setIsGlobalCreateOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isWorkspaceSwitcherOpen, setIsWorkspaceSwitcherOpen] = useState(false);
  const [isProductSwitcherOpen, setIsProductSwitcherOpen] = useState(false);

  const fetchDashboardData = async (range = selectedRange) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sales/dashboard?range=${range}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load sales dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedRange);
  }, [selectedRange]);

  const handleRangeChange = (range: string) => {
    setSelectedRange(range);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = data?.user?.name || currentUser?.name || 'Partner';
  const orgName = data?.organization?.name || 'My Business';

  return (
    <div className="min-h-screen bg-[#060814] text-white flex select-none antialiased">
      {/* 1. Left Persistent Sidebar */}
      <SalesSidebar
        organization={data?.organization}
        user={data?.user}
        workspaces={data?.workspaces || []}
        onOpenWorkspaceSwitcher={() => setIsWorkspaceSwitcherOpen(true)}
        onOpenAiAssistant={() => setIsAiModalOpen(true)}
        onOpenProductSwitcher={() => setIsProductSwitcherOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* 2. Top Navigation Bar */}
        <SalesTopbar
          organization={data?.organization}
          user={data?.user}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenAiAssistant={() => setIsAiModalOpen(true)}
          onOpenGlobalCreate={() => setIsGlobalCreateOpen(true)}
        />

        {/* 3. Main Dashboard Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Skeleton Loader during initial fetch */}
          {isLoading && !data ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-14 bg-white/5 rounded-3xl" />
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-28 bg-white/5 rounded-3xl" />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-72 bg-white/5 rounded-3xl" />
                <div className="h-72 bg-white/5 rounded-3xl" />
              </div>
            </div>
          ) : (
            <>
              {/* Header Greeting & Date Range Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>{getGreeting()}, {userName.split(' ')[0]}</span>
                    <span>👋</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Here&apos;s what&apos;s happening with <strong className="text-white">{orgName}</strong> today.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Date Range Selector */}
                  <div className="flex items-center rounded-xl bg-white/[0.04] border border-white/10 p-1 text-xs font-mono font-bold">
                    {[
                      { id: 'today', label: 'Today' },
                      { id: '7d', label: '7 days' },
                      { id: '30d', label: 'Last 30 days' },
                      { id: '3m', label: '3 months' },
                      { id: '12m', label: '12 months' }
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleRangeChange(r.id)}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          selectedRange === r.id
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>

                  {/* Secondary Create with AI */}
                  <button
                    type="button"
                    onClick={() => setIsAiModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>✨</span>
                    <span>Create with AI</span>
                  </button>

                  {/* Primary + Create Button */}
                  <button
                    type="button"
                    onClick={() => setIsGlobalCreateOpen(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    <Icon name="add" size={16} />
                    <span>+ Create</span>
                  </button>
                </div>
              </div>

              {/* AI Command Bar */}
              <div
                onClick={() => setIsAiModalOpen(true)}
                className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-black border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer group hover:border-purple-500/50 transition-all shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold">
                    ✨
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-purple-200 transition-colors">
                      Ask AADHYARA AI... &ldquo;Show me my sales this month&rdquo;
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Query metrics, draft promo campaigns, or generate new website landing pages instantly.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-purple-300 font-bold self-end sm:self-auto font-mono">
                  <span>Open Copilot</span>
                  <Icon name="arrow_forward" size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Setup Checklist (For New or Incomplete Workspaces) */}
              {data?.checklist && data.checklist.completedCount < data.checklist.totalCount && (
                <SetupProgressWidget checklist={data.checklist} />
              )}

              {/* 5 Key Performance Indicator Cards */}
              <KpiCardsGrid metrics={data?.metrics} />

              {/* Row 1: Revenue Overview Chart + Branded Website Telemetry */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  <RevenueChart
                    chartData={data?.chartData || []}
                    totalRevenue={data?.metrics?.grossRevenue || 0}
                    netRevenue={data?.metrics?.netRevenue || 0}
                    refunds={data?.metrics?.refunds || 0}
                  />
                </div>
                <div className="lg:col-span-5">
                  <WebsiteStatusCard
                    organization={data?.organization}
                    metrics={data?.metrics}
                  />
                </div>
              </div>

              {/* Row 2: Recent Orders + Recent Customers */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  <RecentOrdersTable orders={data?.recentOrders || []} />
                </div>
                <div className="lg:col-span-5">
                  <RecentCustomersCard customers={data?.recentCustomers || []} />
                </div>
              </div>

              {/* Row 3: Leads Funnel + Top Products */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6">
                  <LeadsFunnelCard
                    visitors={data?.metrics?.visitorsCount || 12450}
                    leads={data?.metrics?.leadsCount || 842}
                    qualified={data?.metrics?.qualifiedLeadsCount || 214}
                    customers={data?.metrics?.ordersCount || 93}
                  />
                </div>
                <div className="lg:col-span-6">
                  <TopProductsCard products={data?.topProducts || []} />
                </div>
              </div>

              {/* Row 4: Marketing Performance & AI Business Insights */}
              <div className="space-y-6">
                <AiBusinessInsightsCard
                  insights={data?.aiInsights || []}
                  onOpenAiAssistant={() => setIsAiModalOpen(true)}
                />
                <MarketingPerformanceCard marketing={data?.marketing} />
              </div>

              {/* Row 5: Quick Actions Launchpad */}
              <QuickActionsRow onOpenAiAssistant={() => setIsAiModalOpen(true)} />

              {/* Row 6: Gateways, Business Profile & Security Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PaymentStatusWidget paymentGateway={data?.organization?.paymentGateway || { razorpayConnected: false, stripeConnected: false }} />
                <BusinessProfileWidget organization={data?.organization} />
                <SecurityStatusWidget />
              </div>
            </>
          )}
        </main>
      </div>

      {/* Interactive Modals */}
      <GlobalCreateModal
        isOpen={isGlobalCreateOpen}
        onClose={() => setIsGlobalCreateOpen(false)}
      />

      <AiCommandModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        metrics={data?.metrics}
        businessName={data?.organization?.name}
      />

      <WorkspaceSwitcherModal
        isOpen={isWorkspaceSwitcherOpen}
        onClose={() => setIsWorkspaceSwitcherOpen(false)}
        currentWorkspace={data?.organization}
        workspaces={data?.workspaces || []}
      />

      <ProductSwitcherModal
        isOpen={isProductSwitcherOpen}
        onClose={() => setIsProductSwitcherOpen(false)}
        currentProduct="SALES"
      />
    </div>
  );
}

export default function SalesDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060814] flex items-center justify-center text-white text-xs font-mono">
          Loading AADHYARA Sales Command Center...
        </div>
      }
    >
      <SalesDashboardContent />
    </Suspense>
  );
}

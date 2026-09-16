'use client';

import React, { useState } from 'react';
import { AdminProvider } from '@/context/AdminContext';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { MobileNav } from '@/components/layout/MobileNav';

export function AdminLayoutClient({
  children
}: {
  children: React.ReactNode;
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <AdminProvider>
      <div className="bg-surface text-on-surface font-body-md min-h-screen flex antialiased">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <React.Suspense fallback={<div className="w-[280px] h-screen bg-surface-container-lowest" />}>
          <AdminSidebar />
        </React.Suspense>
      </div>

      {/* Mobile Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative w-[280px] h-full">
            <React.Suspense fallback={<div className="w-[280px] h-full bg-surface-container-lowest" />}>
              <AdminSidebar onClose={() => setIsMobileSidebarOpen(false)} />
            </React.Suspense>
          </div>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <AdminHeader onMenuToggle={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-12 max-w-container-max mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Bottom Mobile Bar */}
      <MobileNav />
    </div>
    </AdminProvider>
  );
}

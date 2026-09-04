'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { SuperAdminSidebar } from '@/components/layout/SuperAdminSidebar';
import { SuperAdminHeader } from '@/components/layout/SuperAdminHeader';

export default function SuperAdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // If on super admin login page, don't show admin chrome
  if (pathname === '/super-admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-background text-on-background antialiased font-body-md">
      <SuperAdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <SuperAdminHeader />
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

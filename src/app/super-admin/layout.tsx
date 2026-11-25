import React from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { SuperAdminSidebar } from '@/components/layout/SuperAdminSidebar';
import { SuperAdminHeader } from '@/components/layout/SuperAdminHeader';

export const dynamic = 'force-dynamic';

export default async function SuperAdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const currentPath = headersList.get('x-pathname') || '/super-admin';

  // If on super admin login page, don't show admin chrome
  if (currentPath.startsWith('/super-admin/login')) {
    return <>{children}</>;
  }

  // Strict Server-Side Super Admin verification:
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/super-admin/login?callbackUrl=${encodeURIComponent(currentPath)}`);
  }

  // Non-Super-Admin accounts (Finance Admin, Tech Support, Course Admin, etc.) are strictly prohibited from Super Admin!
  if (user.role !== 'SUPER_ADMIN') {
    redirect('/admin');
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

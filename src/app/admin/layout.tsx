import React from 'react';
import { headers } from 'next/headers';
import { requireAdmin } from '@/lib/auth';
import { AdminLayoutClient } from '@/components/layout/AdminLayoutClient';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const currentPath = headersList.get('x-pathname') || '/admin';

  // Dedicated Admin Login page does not require existing admin session or dashboard chrome
  if (currentPath.startsWith('/admin/login')) {
    return <>{children}</>;
  }

  // Server Component authentication & authorization check:
  await requireAdmin(currentPath);

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}

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

  // Server Component authentication & authorization check:
  // Immediately redirects unauthenticated users to /login?callbackUrl=...
  // and non-admin users to /unauthorized before ANY page HTML or data is rendered.
  await requireAdmin(currentPath);

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}

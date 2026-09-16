import React from 'react';
import { UdemyNavbar } from '@/components/layout/UdemyNavbar';
import { UdemyFooter } from '@/components/landing/UdemyFooter';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white text-[#2d2f31] min-h-screen flex flex-col font-sans antialiased">
      <UdemyNavbar />
      <div className="flex-1 w-full bg-white">{children}</div>
      <UdemyFooter />
    </div>
  );
}

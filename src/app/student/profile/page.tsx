'use client';

import React, { Suspense } from 'react';
import { UdemyNavbar } from '@/components/layout/UdemyNavbar';
import { UdemyFooter } from '@/components/landing/UdemyFooter';
import { UdemyUserSettings } from '@/components/user/UdemyUserSettings';

export default function StudentProfilePage() {
  return (
    <div className="bg-white text-[#2d2f31] min-h-screen flex flex-col font-sans antialiased">
      <UdemyNavbar />

      {/* Main Settings Body */}
      <div className="flex-1 w-full bg-white">
        <Suspense
          fallback={
            <div className="max-w-[1080px] mx-auto py-16 px-4 flex items-center justify-center text-sm text-[#6a6f73]">
              <div className="w-5 h-5 border-2 border-[#5022c3] border-t-transparent rounded-full animate-spin mr-3" />
              Loading account settings...
            </div>
          }
        >
          <UdemyUserSettings initialTab="account-security" />
        </Suspense>
      </div>

      <UdemyFooter />
    </div>
  );
}

import React, { Suspense } from 'react';
import { UdemyUserSettings } from '@/components/user/UdemyUserSettings';

export const metadata = {
  title: 'Privacy | T.E.A.C.H',
  description: 'Modify your privacy settings here.'
};

export default function EditPrivacyPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[1080px] mx-auto py-16 px-4 flex items-center justify-center text-sm text-[#6a6f73]">
          <div className="w-5 h-5 border-2 border-[#5022c3] border-t-transparent rounded-full animate-spin mr-3" />
          Loading privacy settings...
        </div>
      }
    >
      <UdemyUserSettings initialTab="privacy" />
    </Suspense>
  );
}

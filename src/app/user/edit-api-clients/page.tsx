import React, { Suspense } from 'react';
import { UdemyUserSettings } from '@/components/user/UdemyUserSettings';

export const metadata = {
  title: 'API clients | T.E.A.C.H',
  description: 'Create and manage API credentials for custom LMS integrations.'
};

export default function EditApiClientsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[1080px] mx-auto py-16 px-4 flex items-center justify-center text-sm text-[#6a6f73]">
          <div className="w-5 h-5 border-2 border-[#5022c3] border-t-transparent rounded-full animate-spin mr-3" />
          Loading API clients...
        </div>
      }
    >
      <UdemyUserSettings initialTab="api-clients" />
    </Suspense>
  );
}

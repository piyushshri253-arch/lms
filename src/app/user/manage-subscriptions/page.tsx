import React, { Suspense } from 'react';
import { UdemyUserSettings } from '@/components/user/UdemyUserSettings';

export const metadata = {
  title: 'Subscriptions | T.E.A.C.H',
  description: 'Manage your T.E.A.C.H Personal Plan or course subscriptions.'
};

export default function ManageSubscriptionsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[1080px] mx-auto py-16 px-4 flex items-center justify-center text-sm text-[#6a6f73]">
          <div className="w-5 h-5 border-2 border-[#5022c3] border-t-transparent rounded-full animate-spin mr-3" />
          Loading subscriptions...
        </div>
      }
    >
      <UdemyUserSettings initialTab="subscriptions" />
    </Suspense>
  );
}

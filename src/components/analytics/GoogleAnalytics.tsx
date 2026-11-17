'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import Script from 'next/script';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-V7L4HC4X0P';

export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    
    // Track client-side page views on route changes
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('config', GA_MEASUREMENT_ID, {
        page_path: url,
      });
    }
  }, [pathname, searchParams]);

  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `
        }}
      />
    </>
  );
}

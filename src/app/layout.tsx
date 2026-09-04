import type { Metadata } from 'next';
import { Geist, Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { RoleSwitcher } from '@/components/layout/RoleSwitcher';
import { SuperAdminSupportBanner } from '@/components/layout/SuperAdminSupportBanner';
import { AiSupportFloatingBot } from '@/components/ai/AiSupportFloatingBot';

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
  display: 'swap'
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'AADHYARA — Learning. Built Better.',
  description: 'Enterprise multi-tenant B2B SaaS LMS platform for organizations, institutes, and creators to build, monetize, and scale online academies.',
  openGraph: {
    title: 'AADHYARA — Learning. Built Better.',
    description: 'Enterprise multi-tenant B2B SaaS LMS platform with complete tenant isolation and dedicated organization workspaces.',
    siteName: 'AADHYARA',
    type: 'website'
  },
  icons: {
    icon: '/favicon.ico'
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} ${inter.variable} h-full antialiased`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="min-h-screen bg-background text-on-background flex flex-col selection:bg-primary/20 selection:text-primary">
        <AppProvider>
          <SuperAdminSupportBanner />
          {children}
          <AiSupportFloatingBot />
          <RoleSwitcher />
          <ToastContainer />
        </AppProvider>
      </body>
    </html>
  );
}

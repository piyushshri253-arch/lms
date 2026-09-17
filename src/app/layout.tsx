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
  title: 'Morena Teach — Teacher Excellence Hub',
  description: 'Teacher Excellence hub — Master in-demand skills and certified educator masterclasses.',
  openGraph: {
    title: 'Morena Teach — Teacher Excellence Hub',
    description: 'Premier online academy for professional training, masterclasses, and certified education.',
    siteName: 'Morena Teach',
    type: 'website'
  },
  icons: {
    icon: '/logo.png'
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
      <body className="min-h-screen bg-white text-[#2d2f31] flex flex-col antialiased">
        <AppProvider>
          {children}
          <ToastContainer />
        </AppProvider>
      </body>
    </html>
  );
}

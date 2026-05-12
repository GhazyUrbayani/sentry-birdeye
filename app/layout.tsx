import type { Metadata } from 'next';
import './globals.css';
import { MouseGradient } from '@/components/MouseGradient/MouseGradient';

export const metadata: Metadata = {
  title: 'SENTRY — Pre-Trade Intelligence (Solana)',
  description: 'Pre-trade intelligence agent for Solana tokens: real-time scans, risk grading, and alerts.',
  metadataBase: process.env['NEXT_PUBLIC_APP_URL'] ? new URL(process.env['NEXT_PUBLIC_APP_URL']) : undefined,
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="font-sans">
      <body className="min-h-screen text-white antialiased">
        <MouseGradient />
        {children}
      </body>
    </html>
  );
}


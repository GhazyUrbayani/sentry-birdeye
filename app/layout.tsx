import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SENTRY — Pre-Trade Intelligence (Solana)',
  description: 'Pre-trade intelligence agent for Solana tokens: real-time scans, risk grading, and alerts.',
  metadataBase: process.env['NEXT_PUBLIC_APP_URL'] ? new URL(process.env['NEXT_PUBLIC_APP_URL']) : undefined,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="font-sans">
      <body className="min-h-screen text-white antialiased">{children}</body>
    </html>
  );
}


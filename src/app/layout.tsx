import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Binance Lifetime PnL & Portfolio Terminal',
  description: 'Historical FX-adjusted lifetime PnL, cost basis, spot holdings, and cash flow analytics platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CryptoTrack',
  },
};

export const viewport: Viewport = {
  themeColor: '#0b0e14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-[#0b0e14]">
      <body className="min-h-screen bg-[#0b0e14] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}

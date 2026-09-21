import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Binance Lifetime PnL & Portfolio Terminal',
  description: 'Historical FX-adjusted lifetime PnL, cost basis, spot holdings, and cash flow analytics platform',
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

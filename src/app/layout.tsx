import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/components/providers/WalletProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
};

export const metadata: Metadata = {
  title: 'MemoryOS — Decentralized Personal AI Memory Companion',
  description:
    'Store notes, files, and URLs client-side encrypted on the 0G decentralized network. Query a secure AI companion grounded strictly in your memories.',
  keywords: ['decentralized storage', 'web3', 'AI memory companion', 'ECIES encryption', '0G Storage', 'privacy'],
  authors: [{ name: 'MemoryOS Foundation' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full scroll-smooth">
      <body
        className={`${inter.variable} ${outfit.variable} font-sans bg-[#02020a] text-gray-100 antialiased h-full overflow-hidden`}
      >
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}

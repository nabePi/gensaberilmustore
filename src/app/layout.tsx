import type { Metadata, Viewport } from 'next';
import { Fredoka, Source_Sans_3 } from 'next/font/google';
import type { ReactNode } from 'react';

import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import './globals.css';

const sourceSans = Source_Sans_3({
  variable: '--font-source-sans-3',
  subsets: ['latin'],
  weight: 'variable',
  display: 'swap',
});

const fredoka = Fredoka({
  variable: '--font-fredoka',
  subsets: ['latin'],
  weight: 'variable',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s - ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'toko buku islam',
    'buku islami',
    'produk muslim',
    'perlengkapan keluarga muslim',
    'GenSa Berilmu',
  ],
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: '#95271b',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`${sourceSans.variable} ${fredoka.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans text-sm">
        {children}
      </body>
    </html>
  );
}

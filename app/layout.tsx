import './globals.css';

import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';

import {
  ORGANIZATION_NAME,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_LOGO_PATH,
  SITE_LONG_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_LONG_DESCRIPTION,
  keywords: [...SITE_KEYWORDS],
  authors: [{ name: `${ORGANIZATION_NAME} Team` }],
  creator: ORGANIZATION_NAME,
  publisher: 'Mik',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    alternateLocale: ['en_US'],
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_LONG_DESCRIPTION,
    images: [
      {
        url: SITE_LOGO_PATH,
        width: 512,
        height: 512,
        alt: 'Mik Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_LOGO_PATH],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

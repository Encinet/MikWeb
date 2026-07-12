import './globals.css';

import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';

import {
  ORGANIZATION_NAME,
  SITE_DESCRIPTION,
  SITE_FAVICON_PATH,
  SITE_KEYWORDS,
  SITE_LOGO_PATH,
  SITE_LONG_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from '@/site/config/site-config';

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
  icons: {
    icon: [{ url: SITE_LOGO_PATH, sizes: 'any', type: 'image/svg+xml' }],
    shortcut: SITE_FAVICON_PATH,
    apple: [{ url: SITE_LOGO_PATH, sizes: 'any', type: 'image/svg+xml' }],
  },
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
    alternateLocale: ['zh_TW', 'zh_HK', 'zh_Hant', 'en_US'],
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_LONG_DESCRIPTION,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: SITE_TITLE,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/opengraph-image'],
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
      <head>
        <meta name="theme-color" content="#101816" />
        <meta name="color-scheme" content="dark light" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Mik Server" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href={SITE_LOGO_PATH} />
      </head>
      <body className="app-body">
        {children}
        <Analytics />
      </body>
    </html>
  );
}

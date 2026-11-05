import './globals.css';

import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import type { CSSProperties } from 'react';
import {
  ORGANIZATION_NAME,
  SITE_APPLE_ICON_PATH,
  SITE_DESCRIPTION,
  SITE_FAVICON_PATH,
  SITE_KEYWORDS,
  SITE_LOGO_PATH,
  SITE_LONG_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from '@/shared/config/site-config';
import {
  getAccentInitializationScript,
  getAccentProperties,
  getDailyAccentColor,
} from '@/site/theme/lib/accent-color';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_LONG_DESCRIPTION,
  keywords: [...SITE_KEYWORDS],
  authors: [{ name: `${ORGANIZATION_NAME} Team` }],
  creator: ORGANIZATION_NAME,
  publisher: 'Mik',
  appleWebApp: {
    title: SITE_NAME,
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: SITE_FAVICON_PATH, sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
      { url: SITE_LOGO_PATH, sizes: 'any', type: 'image/svg+xml' },
    ],
    apple: [{ url: SITE_APPLE_ICON_PATH, sizes: '180x180', type: 'image/png' }],
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
    alternateLocale: ['en_US'],
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
  const defaultPalette = getAccentProperties(getDailyAccentColor());

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      style={defaultPalette as CSSProperties}
      suppressHydrationWarning
    >
      <head>
        <script>{getAccentInitializationScript()}</script>
      </head>
      <body className="app-body">
        {children}
        <Analytics />
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import {
  ORGANIZATION_NAME,
  SITE_APPLE_ICON_PATH,
  SITE_FAVICON_PATH,
  SITE_LOGO_PATH,
  SITE_NAME,
  SITE_URL,
} from '@/shared/config/site-config';

/** Shared site identity only; each route supplies its own localized content. */
export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
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
};

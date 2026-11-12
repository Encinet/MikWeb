import { Analytics } from '@vercel/analytics/next';
import type { CSSProperties } from 'react';
import { Suspense } from 'react';
import { getAuthNavigationInitializationScript } from '@/modules/auth/lib/auth-navigation-hint';
import { SITE_HOSTNAME, SITE_NAME } from '@/shared/config/site-config';
import { DEFAULT_ACCENT_COLOR } from '@/shared/config/theme-config';
import type { AppLocale } from '@/shared/i18n/routing';
import { ServerInsertedScript } from '@/shared/ui/server-inserted-script';
import { BrowserSupportNotice } from '@/site/browser-support/ui/browser-support-notice';
import { ShareThumbnailMetadata } from '@/site/seo/share-thumbnail-metadata';
import { getAccentInitializationScript, getAccentProperties } from '@/site/theme/lib/accent-color';

export default async function SiteDocument({
  children,
  locale,
}: Readonly<{
  children: React.ReactNode;
  locale: AppLocale;
}>) {
  const defaultPalette = getAccentProperties(DEFAULT_ACCENT_COLOR);

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      style={
        {
          ...defaultPalette,
          '--site-name': JSON.stringify(SITE_NAME),
          '--site-host': JSON.stringify(SITE_HOSTNAME),
        } as CSSProperties
      }
      suppressHydrationWarning
    >
      {/* biome-ignore lint/style/noHeadElement: Shared root document owns the native head and pre-paint initialization. */}
      <head>
        <Suspense>
          <ShareThumbnailMetadata />
        </Suspense>
        <ServerInsertedScript code={getAccentInitializationScript()} />
        <ServerInsertedScript code={getAuthNavigationInitializationScript()} />
      </head>
      <body className="app-body">
        <BrowserSupportNotice locale={locale} />
        {children}
        {process.env.VERCEL === '1' ? <Analytics /> : null}
      </body>
    </html>
  );
}

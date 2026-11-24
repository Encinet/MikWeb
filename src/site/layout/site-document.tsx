import { Analytics } from '@vercel/analytics/next';
import type { CSSProperties } from 'react';
import { Suspense } from 'react';

import { getAuthNavigationInitializationScript } from '@/modules/auth/lib/auth-navigation-hint';
import { SITE_HOSTNAME, SITE_NAME } from '@/shared/config/site-config';
import { DEFAULT_ACCENT_COLOR } from '@/shared/config/theme-config';
import { getLocalePreferenceScript } from '@/shared/i18n/locale-preference-script';
import type { AppLocale } from '@/shared/i18n/routing';
import { getBrowserSupportScript } from '@/site/browser-support/lib/browser-support-script';
import { BrowserSupportNotice } from '@/site/browser-support/ui/browser-support-notice';
import { ShareThumbnailMetadata } from '@/site/seo/share-thumbnail-metadata';
import { getAccentInitializationScript, getAccentProperties } from '@/site/theme/lib/accent-color';

function InitializationScript({ code }: { code: string }) {
  // The browser runs these repository-owned scripts while parsing the document head.
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export default async function SiteDocument({
  children,
  locale,
  rememberLocale = false,
}: Readonly<{
  children: React.ReactNode;
  locale: AppLocale;
  rememberLocale?: boolean;
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
      <head>
        <Suspense>
          <ShareThumbnailMetadata />
        </Suspense>
        <InitializationScript code={getAccentInitializationScript()} />
        <InitializationScript code={getAuthNavigationInitializationScript()} />
        {rememberLocale ? <InitializationScript code={getLocalePreferenceScript(locale)} /> : null}
        <InitializationScript code={getBrowserSupportScript()} />
      </head>
      <body className="app-body">
        <BrowserSupportNotice locale={locale} />
        {children}
        {process.env.VERCEL === '1' ? <Analytics /> : null}
      </body>
    </html>
  );
}

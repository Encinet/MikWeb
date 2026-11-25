import { Analytics } from '@vercel/analytics/next';
import { headers } from 'next/headers';
import type { CSSProperties } from 'react';
import { Suspense } from 'react';

import { getAuthNavigationInitializationScript } from '@/modules/auth/lib/auth-navigation-hint';
import { CSP_NONCE_HEADER } from '@/shared/config/document-security';
import { SITE_HOSTNAME, SITE_NAME } from '@/shared/config/site-config';
import { getLocalePreferenceScript } from '@/shared/i18n/locale-preference-script';
import type { AppLocale } from '@/shared/i18n/routing';
import { getBrowserSupportScript } from '@/site/browser-support/lib/browser-support-script';
import { BrowserSupportNotice } from '@/site/browser-support/ui/browser-support-notice';
import { ShareThumbnailMetadata } from '@/site/seo/share-thumbnail-metadata';
import { getAccentInitializationScript } from '@/site/theme/lib/accent-color';
import { DEFAULT_ACCENT_PROPERTIES } from '@/site/theme/lib/default-accent';

const documentStyle = {
  ...DEFAULT_ACCENT_PROPERTIES,
  '--site-name': JSON.stringify(SITE_NAME),
  '--site-host': JSON.stringify(SITE_HOSTNAME),
} as CSSProperties;
const accentScript = getAccentInitializationScript();
const authNavigationScript = getAuthNavigationInitializationScript();
const browserSupportScript = getBrowserSupportScript();

export async function getDocumentNonce(): Promise<string | undefined> {
  return (await headers()).get(CSP_NONCE_HEADER) ?? undefined;
}

export default function SiteDocument({
  children,
  locale,
  nonce,
  variant,
}: Readonly<{
  children: React.ReactNode;
  locale: AppLocale;
  nonce: string | undefined;
  variant: 'site' | 'standalone';
}>) {
  const isSite = variant === 'site';
  const startupScripts = {
    accent: accentScript,
    authNavigation: isSite ? authNavigationScript : null,
    localePreference: isSite ? getLocalePreferenceScript(locale) : null,
    browserSupport: browserSupportScript,
  };

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      style={documentStyle}
      suppressHydrationWarning
    >
      <head>
        <Suspense>
          <ShareThumbnailMetadata />
        </Suspense>
        {Object.entries(startupScripts).map(([name, code]) =>
          code === null ? null : (
            <script
              key={name}
              data-mikweb-bootstrap=""
              nonce={nonce}
              dangerouslySetInnerHTML={{ __html: code }}
            />
          ),
        )}
      </head>
      <body className="app-body">
        <BrowserSupportNotice locale={locale} />
        {children}
        {process.env.VERCEL === '1' ? <Analytics /> : null}
      </body>
    </html>
  );
}

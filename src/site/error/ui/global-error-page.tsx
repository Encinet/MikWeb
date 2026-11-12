'use client';

import { useSyncExternalStore } from 'react';
import { resolveLocalePreference } from '@/shared/i18n/locale-preference';
import { LOCALE_COOKIE_NAME, routing } from '@/shared/i18n/routing';
import { getErrorContent } from '@/site/error/lib/error-content';
import { ErrorView } from '@/site/error/ui/error-view';
import { formatPageTitle } from '@/site/seo/page-title';

const subscribe = () => () => {};
const getServerLocale = () => routing.defaultLocale;

function getBrowserLocale() {
  let cookie: string | undefined;
  try {
    cookie = document.cookie
      .split(';')
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${LOCALE_COOKIE_NAME}=`))
      ?.slice(LOCALE_COOKIE_NAME.length + 1);
    if (cookie) cookie = decodeURIComponent(cookie);
  } catch {
    /* Use the URL or browser preference when cookies are unavailable. */
  }
  return resolveLocalePreference({
    locale: location.pathname.split('/')[1],
    cookie,
    acceptLanguage: navigator.languages.join(','),
  });
}

export function GlobalErrorPage({ retry }: { retry: () => void }) {
  const locale = useSyncExternalStore(subscribe, getBrowserLocale, getServerLocale);
  return (
    <html lang={locale}>
      <body style={{ margin: 0, minHeight: '100svh', display: 'flex' }}>
        <title>{formatPageTitle(getErrorContent(locale).title)}</title>
        <meta name="robots" content="noindex" />
        <ErrorView locale={locale} retry={retry} />
      </body>
    </html>
  );
}

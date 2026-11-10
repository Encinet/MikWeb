import 'server-only';

import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { resolveLocalePreference } from './locale-preference';
import { isRoutingLocale, LOCALE_COOKIE_NAME } from './routing';

/** Unknown or missing language values silently reuse the current request's preferences. */
export const getRequestLocale = cache(async (preferred?: string) => {
  if (preferred && isRoutingLocale(preferred)) return preferred;
  const [requestHeaders, cookieStore] = await Promise.all([headers(), cookies()]);
  return resolveLocalePreference({
    locale: requestHeaders.get('x-next-intl-locale'),
    cookie: cookieStore.get(LOCALE_COOKIE_NAME)?.value,
    acceptLanguage: requestHeaders.get('accept-language'),
  });
});

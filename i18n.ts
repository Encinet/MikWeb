import { getRequestConfig } from 'next-intl/server';

import { isRoutingLocale, routing } from './src/shared/i18n/routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isRoutingLocale(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});

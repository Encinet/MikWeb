import * as rootParams from 'next/root-params';
import { getRequestConfig } from 'next-intl/server';

import { getRequestLocale } from './src/shared/i18n/request-locale';

export default getRequestConfig(async ({ locale: override }) => {
  const requested = override ?? (await rootParams.locale());
  const locale = await getRequestLocale(requested);

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});

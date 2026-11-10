import { defineRouting } from 'next-intl/routing';

export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

export const routing = defineRouting({
  locales: ['zh-CN', 'en'],
  defaultLocale: 'zh-CN',
  localePrefix: 'always',
  localeCookie: { name: LOCALE_COOKIE_NAME },
});

export type AppLocale = (typeof routing.locales)[number];

export function isRoutingLocale(value: string): value is AppLocale {
  return routing.locales.some((locale) => locale === value);
}

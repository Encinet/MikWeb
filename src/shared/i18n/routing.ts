import { defineRouting } from 'next-intl/routing';

export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

export const routing = defineRouting({
  locales: ['zh-CN', 'en'],
  defaultLocale: 'zh-CN',
  localePrefix: 'always',
  localeCookie: { name: LOCALE_COOKIE_NAME },
});

export type AppLocale = (typeof routing.locales)[number];

// Language choices use their native names in every UI language.
export const LOCALE_NAMES = {
  'zh-CN': { label: '中文', name: '简体中文' },
  en: { label: 'English', name: 'English' },
} as const satisfies Record<AppLocale, { label: string; name: string }>;

export function isRoutingLocale(value: string): value is AppLocale {
  return routing.locales.some((locale) => locale === value);
}

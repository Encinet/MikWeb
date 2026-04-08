import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['zh-CN', 'en'],
  defaultLocale: 'zh-CN',
  localePrefix: 'always',
});

export type AppLocale = (typeof routing.locales)[number];

export function isRoutingLocale(value: string): value is AppLocale {
  return routing.locales.some((locale) => locale === value);
}

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);

import 'server-only';

import { notFound } from 'next/navigation';

import type { AppLocale } from '@/i18n/routing';
import { isRoutingLocale } from '@/i18n/routing';

export function requireRouteLocale(rawLocale: string): AppLocale {
  if (!isRoutingLocale(rawLocale)) {
    notFound();
  }

  return rawLocale;
}

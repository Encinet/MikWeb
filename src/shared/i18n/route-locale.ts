import 'server-only';

import { notFound } from 'next/navigation';

import type { AppLocale } from '@/shared/i18n/routing';
import { isRoutingLocale } from '@/shared/i18n/routing';

export function requireRouteLocale(rawLocale: string): AppLocale {
  if (!isRoutingLocale(rawLocale)) {
    notFound();
  }

  return rawLocale;
}

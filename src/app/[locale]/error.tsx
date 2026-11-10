'use client';

import { useLocale } from 'next-intl';
import { isRoutingLocale, routing } from '@/shared/i18n/routing';
import { ErrorView } from '@/site/error/ui/error-view';

export default function PageError({ retry }: { retry: () => void }) {
  const locale = useLocale();
  return (
    <ErrorView locale={isRoutingLocale(locale) ? locale : routing.defaultLocale} retry={retry} />
  );
}

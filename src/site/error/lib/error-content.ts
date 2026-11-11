import type { AppLocale } from '@/shared/i18n/routing';
// Generated from the canonical catalogs before dev/build; checked by check:i18n.
import errorMessages from '@/site/error/lib/error-messages.generated.json';

export function getErrorContent(locale: AppLocale) {
  return errorMessages[locale];
}

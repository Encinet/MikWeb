import type { AppLocale } from '@/shared/i18n/routing';

export interface EchoQuote {
  'zh-CN': string;
  en: string;
  [locale: string]: string | undefined;
}

export function getEchoText(quote: EchoQuote, locale: AppLocale): string {
  return quote[locale] || quote['zh-CN'] || quote.en || '';
}

import type { AppLocale } from '@/shared/i18n/routing';

export interface EchoQuote {
  'zh-CN': string;
  en: string;
}

export function getEchoText(quote: EchoQuote, locale: AppLocale): string {
  return quote[locale] || quote['zh-CN'] || quote.en || '';
}

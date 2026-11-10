import type { AppLocale } from '@/shared/i18n/routing';
import en from '../../../../messages/en.json';
import zhCN from '../../../../messages/zh-CN.json';

const errorContent = { en: en.pageError, 'zh-CN': zhCN.pageError };

export function getErrorContent(locale: AppLocale) {
  return errorContent[locale];
}

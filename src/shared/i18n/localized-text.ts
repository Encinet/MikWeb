import { isRecord } from '@/shared/lib/is-record';

export type LocalizedText = Record<string, string>;

export function isLocalizedText(value: unknown): value is LocalizedText {
  return isRecord(value) && Object.values(value).every((text) => typeof text === 'string');
}

export function getLocalizedText(content: LocalizedText | undefined, locale: string): string {
  return content?.[locale] || content?.en || content?.['zh-CN'] || '';
}

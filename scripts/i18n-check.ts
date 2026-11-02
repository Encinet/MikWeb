import type { MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import { isStructurallySame, parse } from '@formatjs/icu-messageformat-parser';
import enMessages from '../messages/en.json';
import zhMessages from '../messages/zh-CN.json';
import type { AppLocale } from '../src/shared/i18n/routing';

function flattenMessages(
  value: unknown,
  path = '',
  result = new Map<string, MessageFormatElement[]>(),
) {
  if (typeof value === 'string') {
    if (!value.trim()) throw new Error(`Empty translation: ${path}`);
    try {
      result.set(path, parse(value));
    } catch (cause) {
      throw new Error(`Invalid ICU message: ${path}`, { cause });
    }
    return result;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Expected a translation or namespace: ${path}`);
  }
  const entries = Object.entries(value);
  if (!entries.length) throw new Error(`Empty translation namespace: ${path}`);
  for (const [key, child] of entries) {
    if (key.includes('.'))
      throw new Error(`Translation keys must not contain dots: ${path}.${key}`);
    flattenMessages(child, path ? `${path}.${key}` : key, result);
  }
  return result;
}

const catalogs = {
  'zh-CN': zhMessages,
  en: enMessages,
} satisfies Record<AppLocale, unknown>;
const reference = flattenMessages(catalogs['zh-CN']);
const errors: string[] = [];

for (const [locale, messages] of Object.entries(catalogs)) {
  const current = flattenMessages(messages);
  for (const [key, message] of reference) {
    const translated = current.get(key);
    if (translated === undefined) errors.push(`${locale}: missing ${key}`);
    else {
      const comparison = isStructurallySame(message, translated);
      if (!comparison.success) {
        errors.push(`${locale}: ${key}: ${comparison.error?.message}`);
      }
    }
  }
  for (const key of current.keys()) {
    if (!reference.has(key)) errors.push(`${locale}: unexpected ${key}`);
  }
  console.log(`[i18n:check] ${locale}: ${current.size} messages`);
}

if (errors.length) throw new Error(errors.join('\n'));

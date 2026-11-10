import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveLocalePreference } from '@/shared/i18n/locale-preference';
import { routing } from '@/shared/i18n/routing';

test('documents outside a locale root honor routing, saved preferences, and weighted browser languages', () => {
  assert.equal(
    resolveLocalePreference({ locale: 'en', cookie: 'zh-CN', acceptLanguage: 'zh' }),
    'en',
  );
  assert.equal(
    resolveLocalePreference({ locale: 'invalid', cookie: 'en', acceptLanguage: 'zh-CN' }),
    'en',
  );
  assert.equal(resolveLocalePreference({ acceptLanguage: 'en-US,en;q=0.9,zh;q=0.8' }), 'en');
  assert.equal(resolveLocalePreference({ acceptLanguage: 'zh-TW;q=0.9,en;q=0.8' }), 'zh-CN');
  assert.equal(resolveLocalePreference({ acceptLanguage: 'zh;q=0.1,en-GB;q=0.9' }), 'en');
  assert.equal(resolveLocalePreference({ acceptLanguage: 'zh;q=0,en;q=0.5' }), 'en');
  assert.equal(resolveLocalePreference({ acceptLanguage: 'invalid_!,zh;q=no,en;q=0.7' }), 'en');
  assert.equal(
    resolveLocalePreference({ cookie: 'unsupported', acceptLanguage: 'fr-FR' }),
    routing.defaultLocale,
  );
  assert.equal(resolveLocalePreference({}), routing.defaultLocale);
});

test('unknown language values silently retain saved settings or use the configured default', () => {
  for (const locale of [undefined, null, '', 'fr', 'invalid_!']) {
    assert.equal(resolveLocalePreference({ locale, cookie: 'en' }), 'en');
    assert.equal(resolveLocalePreference({ locale, cookie: 'zh-CN' }), 'zh-CN');
    assert.equal(resolveLocalePreference({ locale }), routing.defaultLocale);
  }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { resolveLocalePreference } from '@/shared/i18n/locale-preference';
import { getLocalePreferenceScript } from '@/shared/i18n/locale-preference-script';
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

test('only the displayed top-level document records its locale and it avoids redundant writes', () => {
  const script = getLocalePreferenceScript('en');
  const window = { top: {} };
  let stored = 'unrelated=1; NEXT_LOCALE=zh-CN';
  const writes: string[] = [];
  const activationListeners: (() => void)[] = [];
  const document = {
    prerendering: true,
    get cookie() {
      return stored;
    },
    set cookie(value: string) {
      writes.push(value);
      stored = value.split(';')[0];
    },
    addEventListener(type: string, callback: () => void, options: { once: boolean }) {
      assert.equal(type, 'prerenderingchange');
      assert.equal(options.once, true);
      activationListeners.push(callback);
    },
  };
  runInNewContext(script, { window, document });
  assert.equal(activationListeners.length, 0, 'iframes must not remember their language');
  window.top = window;
  runInNewContext(script, { window, document });
  assert.deepEqual(writes, [], 'speculative documents must not remember their language');
  assert.equal(activationListeners.length, 1);
  activationListeners[0]();
  assert.deepEqual(writes, ['NEXT_LOCALE=en; Path=/; SameSite=Lax']);
  document.prerendering = false;
  runInNewContext(script, { window, document });
  assert.equal(writes.length, 1);
});

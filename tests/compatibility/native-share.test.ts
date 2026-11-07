import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canNativeShare, isShareCancellation } from '@/shared/lib/native-share';
import { createBrowserEnvironment } from '../support/browser-environment';

test('link sharing works without canShare while file sharing requires explicit support', async () => {
  const environment = createBrowserEnvironment();
  let opened = 0;
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: async () => {
      opened++;
    },
  });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
  try {
    assert.equal(canNativeShare({ url: 'https://mcmik.top/en' }), true);
    assert.equal(
      canNativeShare({ files: [new File(['image'], 'a.jpg', { type: 'image/jpeg' })] }),
      false,
    );
    assert.equal(opened, 0);
  } finally {
    await environment.close();
  }
});

test('a throwing capability check is treated as unavailable without crashing rendering', async () => {
  const environment = createBrowserEnvironment();
  Object.defineProperty(navigator, 'share', { configurable: true, value: async () => {} });
  Object.defineProperty(navigator, 'canShare', {
    configurable: true,
    value: () => {
      throw new Error('Disabled by platform');
    },
  });
  try {
    assert.equal(canNativeShare({ url: 'https://mcmik.top/en' }), false);
  } finally {
    await environment.close();
  }
});

test('cancellation is recognized by name across DOM realms without suppressing real failures', () => {
  assert.equal(isShareCancellation({ name: 'AbortError' }), true);
  assert.equal(isShareCancellation(new DOMException('Cancelled', 'AbortError')), true);
  assert.equal(isShareCancellation(new Error('Unavailable')), false);
  assert.equal(isShareCancellation(null), false);
  assert.equal(isShareCancellation('AbortError'), false);
});

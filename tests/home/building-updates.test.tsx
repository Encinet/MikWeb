import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { NextIntlClientProvider } from 'next-intl';
import { act } from 'react';
import type { Building } from '@/modules/building/model/building-types';
import { HomeBuildingUpdates } from '@/modules/home/ui/home-building-updates';
import messages from '../../messages/en.json';
import { createBrowserEnvironment } from '../support/browser-environment';

test('home building errors retry through the server and accept the next rendered card snapshot', async () => {
  const env = createBrowserEnvironment();
  // happy-dom has no layout engine; provide non-zero layout metrics for next/image.
  const imagePrototype = env.window.HTMLImageElement.prototype;
  const previousHeight = Object.getOwnPropertyDescriptor(imagePrototype, 'height');
  const sheet = document.createElement('style');
  sheet.textContent = '.home-world-map { position: relative; height: 200px; }';
  document.head.append(sheet);
  Object.defineProperty(imagePrototype, 'height', {
    configurable: true,
    get: () => 200,
  });
  let refreshes = 0;
  const router = {
    bfcacheId: 'home-test',
    back() {},
    forward() {},
    refresh() {
      refreshes++;
    },
    hmrRefresh() {},
    push() {},
    replace() {},
    prefetch() {},
  };
  const building: Building = {
    id: 'a'.repeat(32),
    name: { en: 'Latest build' },
    description: {},
    coordinates: { world: 'world', x: 0, y: 0, z: 0 },
    builders: [],
    buildType: 'original',
    images: [],
    buildDate: '2026-11-12',
  };
  const render = (unavailable: boolean, buildings: Building[] = []) =>
    act(async () => {
      env.root.render(
        <AppRouterContext.Provider value={router}>
          <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <HomeBuildingUpdates buildings={buildings} unavailable={unavailable} />
          </NextIntlClientProvider>
        </AppRouterContext.Provider>,
      );
    });
  try {
    await render(true);
    const retry = env.container.querySelector<HTMLButtonElement>('.home-building-retry');
    assert.ok(retry);
    await act(async () => retry.click());
    assert.equal(refreshes, 1);
    await render(false, [building]);
    assert.equal(env.container.querySelector('.home-building-retry'), null);
    assert.equal(
      env.container.querySelector('.home-building-preview strong')?.textContent,
      'Latest build',
    );
    await render(false);
    assert.equal(env.container.querySelector('.home-building-retry'), null);
    assert.equal(env.container.querySelector('.home-building-preview'), null);
  } finally {
    if (previousHeight) Object.defineProperty(imagePrototype, 'height', previousHeight);
    else Reflect.deleteProperty(imagePrototype, 'height');
    await env.close();
  }
});

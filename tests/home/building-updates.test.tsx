import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextIntlClientProvider } from 'next-intl';
import { act } from 'react';
import { getRecentBuildingUpdates, sortBuildings } from '@/modules/building/lib/building-catalog';
import type { Building } from '@/modules/building/model/building-types';
import { BuildingsProvider } from '@/modules/building/model/buildings-provider';
import {
  HomeBuildingUpdates,
  HomeBuildingUpdatesRecovery,
} from '@/modules/home/ui/home-building-updates';
import { dataApiUrl } from '@/shared/api/data-api-url';
import messages from '../../messages/en.json';
import { createBrowserEnvironment } from '../support/browser-environment';

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

test('recent cards match the archive for tied instants, small catalogs and legacy dates', () => {
  for (const dates of [
    [],
    ['2025-01-01'],
    ['2025-01-01', '2026-01-01'],
    ['2025-01-01', '2026-01-01T08:00:00+08:00', '2026-01-01T00:00:00Z', '2026-01-01'],
    ['2025-01-01', 'unknown', '2026-01-01', '2026-06-01'],
  ]) {
    const catalog = dates.map((buildDate, i) => ({ ...building, id: String(i), buildDate }));
    assert.deepEqual(
      getRecentBuildingUpdates(catalog),
      sortBuildings(catalog, 'date-desc', 'en').slice(0, 2),
    );
    assert.deepEqual(
      catalog.map(({ buildDate }) => buildDate),
      dates,
    );
  }
});

test('home building errors retry only the public catalog and successful snapshots need no fetch', async () => {
  const env = createBrowserEnvironment();
  // happy-dom has no layout engine; provide non-zero layout metrics for next/image.
  const imagePrototype = env.window.HTMLImageElement.prototype;
  const previousHeight = Object.getOwnPropertyDescriptor(imagePrototype, 'height');
  const sheet = document.createElement('style');
  sheet.textContent =
    '.home-world-map, .home-building-preview__image { position: relative; height: 200px; }';
  document.head.append(sheet);
  Object.defineProperty(imagePrototype, 'height', {
    configurable: true,
    get: () => 200,
  });
  const originalFetch = globalThis.fetch;
  const pending: ((response: Response) => void)[] = [];
  globalThis.fetch = Object.assign(async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), dataApiUrl('/buildings'));
    assert.equal(init?.cache, 'reload');
    return new Promise<Response>((resolve) => pending.push(resolve));
  }, originalFetch);
  const render = (unavailable: boolean, buildings: Building[] = []) =>
    act(async () => {
      env.root.render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
          {unavailable ? (
            <BuildingsProvider
              initialSnapshot={{ buildings: [], error: 'unavailable', updatedAt: null }}
            >
              <HomeBuildingUpdatesRecovery />
            </BuildingsProvider>
          ) : (
            <HomeBuildingUpdates buildings={buildings} />
          )}
        </NextIntlClientProvider>,
      );
    });
  try {
    const cover = `https://images.example.test/buildings/${building.id}/${'b'.repeat(64)}.webp`;
    await render(false, [{ ...building, images: [cover] }]);
    const image = env.container.querySelector('.home-building-preview img');
    assert.equal(image?.getAttribute('src'), `${cover}?w=640`);
    assert.equal(image?.getAttribute('srcset'), null);
    await render(true);
    assert.equal(pending.length, 0);
    const retry = env.container.querySelector<HTMLButtonElement>('.home-building-retry');
    assert.ok(retry);
    await act(async () => retry.click());
    assert.equal(pending.length, 1);
    assert.ok(retry.disabled);
    await act(async () => pending[0](Response.json({}, { status: 503 })));
    assert.equal(retry.disabled, false);
    await act(async () => retry.click());
    await act(async () =>
      pending[1](
        Response.json({
          imageBaseUrl: null,
          buildings: [
            { ...building, id: 'c'.repeat(32), name: { en: 'Oldest' }, buildDate: '2025-01-01' },
            building,
            { ...building, id: 'b'.repeat(32), name: { en: 'Second' }, buildDate: '2026-01-01' },
          ],
        }),
      ),
    );
    assert.equal(env.container.querySelector('.home-building-retry'), null);
    assert.deepEqual(
      Array.from(
        env.container.querySelectorAll('.home-building-preview strong'),
        (element) => element.textContent,
      ),
      ['Latest build', 'Second'],
    );
    await render(false);
    assert.equal(env.container.querySelector('.home-building-retry'), null);
    assert.equal(env.container.querySelector('.home-building-preview'), null);
    assert.equal(pending.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousHeight) Object.defineProperty(imagePrototype, 'height', previousHeight);
    else Reflect.deleteProperty(imagePrototype, 'height');
    await env.close();
  }
});

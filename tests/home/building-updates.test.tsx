import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextIntlClientProvider } from 'next-intl';
import { act } from 'react';
import type { LocalizedBuilding } from '@/modules/building/model/building-types';
import { toHomeBuildingPreview } from '@/modules/home/model/home-building-preview';
import {
  HomeBuildingUpdates,
  HomeBuildingUpdatesRecovery,
} from '@/modules/home/ui/home-building-updates';
import { dataApiUrl } from '@/shared/api/data-api-url';
import messages from '../../messages/en.json';
import { createBrowserEnvironment } from '../support/browser-environment';

const building: LocalizedBuilding = {
  id: 'a'.repeat(32),
  name: 'Latest build',
  description: 'Description',
  coordinates: { world: 'world', x: 0, y: 0, z: 0 },
  builders: [{ name: 'Builder', uuid: '00000000-0000-4000-8000-000000000001', weight: 1 }],
  buildType: 'original',
  images: [],
  buildDate: '2026-11-12',
};

test('home previews include only fields rendered by the cards', () => {
  const cover = `https://images.example/gallery/buildings/${building.id}/${'b'.repeat(64)}.webp`;
  assert.deepEqual(toHomeBuildingPreview({ ...building, images: [cover] }), {
    id: building.id,
    name: 'Latest build',
    images: [cover],
    coordinates: building.coordinates,
    builderNames: ['Builder'],
  });
});

test('home building errors retry only the two newest localized buildings and rendered previews need no fetch', async () => {
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
    assert.equal(String(input), dataApiUrl('/buildings?locale=en&limit=2'));
    assert.equal(init?.cache, 'reload');
    return new Promise<Response>((resolve) => pending.push(resolve));
  }, originalFetch);
  const render = (unavailable: boolean, buildings: LocalizedBuilding[] = []) =>
    act(async () => {
      env.root.render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
          {unavailable ? (
            <HomeBuildingUpdatesRecovery locale="en" />
          ) : (
            <HomeBuildingUpdates buildings={buildings.map(toHomeBuildingPreview)} />
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
            building,
            { ...building, id: 'b'.repeat(32), name: 'Second', buildDate: '2026-01-01' },
          ],
          total: 3,
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

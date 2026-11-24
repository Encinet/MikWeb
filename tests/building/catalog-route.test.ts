import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { dataApiUrl } from '@/shared/api/data-api-url';

const bunTestModule: string = 'bun:test';
const { mock } = (await import(bunTestModule)) as {
  mock: { module: (specifier: string, factory: () => unknown) => void };
};
mock.module('server-only', () => ({}));
mock.module('next/cache', () => ({ cacheLife: () => undefined }));
const { GET } = await import('@/app/api/buildings/route');
const { getBuilding } = await import('@/modules/building/server/building-queries');

const imageBaseUrl = 'https://images.example/gallery';
const building = {
  id: 'a'.repeat(32),
  name: { en: 'Building' },
  description: { en: 'Description' },
  coordinates: { world: 'world', x: 0, y: 64, z: 0 },
  builders: [{ name: 'Builder', uuid: '00000000-0000-4000-8000-000000000001', weight: 1 }],
  buildType: 'original',
  images: [`${'b'.repeat(64)}.webp`],
  buildDate: '2026-11-01',
};

test('only a valid catalog is cacheable and only an initial build failure redirects', async () => {
  const previousFetch = globalThis.fetch;
  const previousPhase = process.env.NEXT_PHASE;
  const catalog = { imageBaseUrl, buildings: [building] };
  let payload: unknown = catalog;
  globalThis.fetch = Object.assign(async () => Response.json(payload), previousFetch);
  try {
    delete process.env.NEXT_PHASE;
    const response = await GET();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), catalog);
    assert.match(response.headers.get('cache-control') ?? '', /\bmax-age=[1-9]/);

    payload = { error: 'unavailable' };
    await assert.rejects(GET(), /Invalid building catalog/);

    process.env.NEXT_PHASE = PHASE_PRODUCTION_BUILD;
    const fallback = await GET();
    assert.equal(fallback.status, 307);
    assert.equal(fallback.headers.get('location'), dataApiUrl('/buildings'));
    assert.equal(fallback.headers.get('cache-control'), 'no-store');
  } finally {
    globalThis.fetch = previousFetch;
    if (previousPhase === undefined) delete process.env.NEXT_PHASE;
    else process.env.NEXT_PHASE = previousPhase;
  }
});

test('building detail resolves image URLs from its single response', async () => {
  const previousFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = Object.assign(async (input: RequestInfo | URL) => {
    requests.push(String(input));
    return Response.json({ imageBaseUrl, building });
  }, previousFetch);
  try {
    const detail = await getBuilding(building.id);
    assert.deepEqual(detail.images, [`${imageBaseUrl}/buildings/${building.id}/${building.images[0]}`]);
    assert.deepEqual(requests, [dataApiUrl(`/buildings/${building.id}`)]);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

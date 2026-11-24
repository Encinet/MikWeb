import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { isLocalizedBuildingCatalogResponse } from '@/modules/building/model/building-api';
import { dataApiUrl } from '@/shared/api/data-api-url';

const bunTestModule: string = 'bun:test';
const { mock } = (await import(bunTestModule)) as {
  mock: { module: (specifier: string, factory: () => unknown) => void };
};
mock.module('server-only', () => ({}));
mock.module('next/cache', () => ({ cacheLife: () => undefined }));
const { GET, generateStaticParams } = await import('@/app/api/buildings/[locale]/route');
const { getLocalizedBuilding, readBuildingCatalog } = await import('@/modules/building/server/building-queries');

const imageBaseUrl = 'https://images.example/gallery';
const building = {
  id: 'a'.repeat(32),
  name: { en: 'Building', 'zh-CN': '建筑' },
  description: { en: 'Description' },
  coordinates: { world: 'world', x: 0, y: 64, z: 0 },
  builders: [{ name: 'Builder', uuid: '00000000-0000-4000-8000-000000000001', weight: 1 }],
  buildType: 'original',
  images: [`${'b'.repeat(64)}.webp`],
  buildDate: '2026-11-01',
  tags: [{ en: 'Tower', 'zh-CN': '塔' }, { 'zh-CN': '木材' }],
  source: { originalAuthor: 'Builder', notes: { en: 'Source notes', 'zh-CN': '' } },
};

function getCatalog(locale: string) {
  return GET(new Request(`https://site.example/api/buildings/${locale}`), {
    params: Promise.resolve({ locale }),
  });
}

test('each supported locale serves a cacheable catalog from the shared upstream URL', async () => {
  const previousFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = Object.assign(async (input: RequestInfo | URL) => {
    requests.push(String(input));
    return Response.json({ imageBaseUrl, buildings: [building] });
  }, previousFetch);
  try {
    assert.deepEqual(generateStaticParams(), [{ locale: 'zh-CN' }, { locale: 'en' }]);
    for (const { locale } of generateStaticParams()) {
      const response = await getCatalog(locale);
      const payload: unknown = await response.json();
      assert.equal(response.status, 200);
      assert.match(response.headers.get('cache-control') ?? '', /\bmax-age=[1-9]/);
      assert.ok(isLocalizedBuildingCatalogResponse(payload));
      assert.deepEqual(payload, {
        imageBaseUrl,
        buildings: [
          {
            ...building,
            name: building.name[locale],
            description: 'Description',
            tags: [building.tags[0][locale], '木材'],
            source: { originalAuthor: 'Builder', notes: 'Source notes' },
          },
        ],
      });
    }
    assert.equal((await getCatalog('fr')).status, 404);
    assert.deepEqual(requests, [dataApiUrl('/buildings'), dataApiUrl('/buildings')]);
    assert.equal(isLocalizedBuildingCatalogResponse({ imageBaseUrl, buildings: [building] }), false);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('bounded catalog reads request only the requested number of buildings', async () => {
  const previousFetch = globalThis.fetch;
  const requests: string[] = [];
  const catalog = {
    imageBaseUrl,
    buildings: [building, { ...building, id: 'b'.repeat(32) }],
    total: 3,
  };
  globalThis.fetch = Object.assign(async (input: RequestInfo | URL) => {
    requests.push(String(input));
    return Response.json(catalog);
  }, previousFetch);
  try {
    assert.deepEqual(await readBuildingCatalog({ limit: 2 }), catalog);
    await assert.rejects(readBuildingCatalog({ limit: 1 }), /Invalid building catalog/);
    assert.deepEqual(requests, [dataApiUrl('/buildings?limit=2'), dataApiUrl('/buildings?limit=1')]);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('only an initial build failure redirects to the same locale on the public data service', async () => {
  const previousFetch = globalThis.fetch;
  const previousPhase = process.env.NEXT_PHASE;
  globalThis.fetch = Object.assign(async () => Response.json({ error: 'unavailable' }), previousFetch);
  try {
    delete process.env.NEXT_PHASE;
    await assert.rejects(getCatalog('zh-CN'), /Invalid building catalog/);

    process.env.NEXT_PHASE = PHASE_PRODUCTION_BUILD;
    const fallback = await getCatalog('zh-CN');
    assert.equal(fallback.status, 307);
    assert.equal(fallback.headers.get('location'), dataApiUrl('/buildings?locale=zh-CN'));
    assert.equal(fallback.headers.get('cache-control'), 'no-store');
  } finally {
    globalThis.fetch = previousFetch;
    if (previousPhase === undefined) delete process.env.NEXT_PHASE;
    else process.env.NEXT_PHASE = previousPhase;
  }
});

test('building detail localizes text and resolves image URLs from its single response', async () => {
  const previousFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = Object.assign(async (input: RequestInfo | URL) => {
    requests.push(String(input));
    return Response.json({ imageBaseUrl, building });
  }, previousFetch);
  try {
    const detail = await getLocalizedBuilding(building.id, 'zh-CN');
    assert.equal(detail.name, '建筑');
    assert.equal(detail.description, 'Description');
    assert.deepEqual(detail.tags, ['塔', '木材']);
    assert.equal(detail.source?.notes, 'Source notes');
    assert.deepEqual(detail.images, [`${imageBaseUrl}/buildings/${building.id}/${building.images[0]}`]);
    assert.deepEqual(requests, [dataApiUrl(`/buildings/${building.id}`)]);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

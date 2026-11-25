import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dataApiUrl } from '@/shared/api/data-api-url';

const bunTestModule: string = 'bun:test';
const { mock } = (await import(bunTestModule)) as {
  mock: { module: (specifier: string, factory: () => unknown) => void };
};
mock.module('server-only', () => ({}));
mock.module('next/cache', () => ({ cacheLife: () => undefined }));
const { getLocalizedBuilding, readBuildingCatalog } = await import('@/modules/building/server/building-queries');

const imageBaseUrl = 'https://images.example/gallery';
const building = {
  id: 'a'.repeat(32),
  name: { en: 'Building', 'zh-CN': '建筑' },
  description: { en: 'Description' },
  coordinates: { world: 'world', x: 0, y: 64, z: 0 },
  builders: [{ name: 'Builder', uuid: '00000000-0000-4000-8000-000000000001', weight: 1 }],
  buildType: 'original',
  images: [{ webp: 'b'.repeat(64), jxl: 'd'.repeat(64) }],
  buildDate: '2026-11-01',
  tags: [{ en: 'Tower', 'zh-CN': '塔' }, { 'zh-CN': '木材' }],
  source: { originalAuthor: 'Builder', notes: { en: 'Source notes', 'zh-CN': '' } },
};

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
    const prefix = `${imageBaseUrl}/buildings/${building.id}/`;
    assert.deepEqual(detail.images, [{
      webp: `${prefix}${building.images[0].webp}.webp`,
      jxl: `${prefix}${building.images[0].jxl}.jxl`,
    }]);
    assert.deepEqual(requests, [dataApiUrl(`/buildings/${building.id}`)]);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';

const bunTestModule: string = 'bun:test';
const { mock } = (await import(bunTestModule)) as {
  mock: { module: (specifier: string, factory: () => unknown) => void };
};
mock.module('server-only', () => ({}));
mock.module('next/cache', () => ({ cacheLife: () => undefined }));
const sectionRoute = await import('@/app/api/wiki/section/[locale]/[id]/route');
const searchIndexRoute = await import('@/app/api/wiki/search-index/[locale]/route');

test('public endpoints return only public content regardless of cookies or requested audience', async () => {
  for (const locale of ['en', 'zh-CN']) {
    const request = (path: string) =>
      new Request(`https://example.test/api/wiki/${path}?audience=staff`, {
        headers: { cookie: '__Host-mik_sid=claimed-staff-session' },
      });
    const getSection = (id: string) =>
      sectionRoute.GET(request(`section/${locale}/${id}`), {
        params: Promise.resolve({ locale, id }),
      });
    const section = await getSection('getting-started');
    assert.equal(section.status, 200);
    const payload = await section.json();
    assert.deepEqual(Object.keys(payload).sort(), ['compiled', 'id', 'outline']);
    assert.equal(payload.id, 'getting-started');
    assert.ok(payload.compiled.includes('function'));
    assert.ok(Array.isArray(payload.outline));
    const privateSection = await getSection('moderator');
    assert.equal(privateSection.status, 404);
    assert.equal((await privateSection.text()).includes('/tpforce'), false);
    const index = await searchIndexRoute.GET(request(`search-index/${locale}`), {
      params: Promise.resolve({ locale }),
    });
    assert.equal(index.status, 200);
    const indexText = await index.text();
    assert.equal(indexText.includes('/tpforce'), false);
    assert.equal(indexText.includes('"sectionId":"moderator"'), false);
    assert.ok(index.headers.get('cache-control')?.includes('must-revalidate'));
  }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';

const bunTestModule: string = 'bun:test';
const { mock } = (await import(bunTestModule)) as {
  mock: { module: (specifier: string, factory: () => unknown) => void };
};
mock.module('server-only', () => ({}));
mock.module('next/cache', () => ({ cacheLife: () => undefined }));
const { wikiSectionRequest, wikiSearchIndexRequest } = await import(
  '@/modules/wiki/server/public-wiki-request'
);

test('public endpoints return only public content regardless of cookies or requested audience', async () => {
  for (const locale of ['en', 'zh-CN']) {
    const request = (path: string, section = '') =>
      new Request(
        `https://example.test/api/wiki/${path}?locale=${locale}&section=${section}&audience=staff`,
        { headers: { cookie: '__Host-mik_sid=claimed-staff-session' } },
      );
    const section = await wikiSectionRequest(request('section', 'getting-started'));
    assert.equal(section.status, 200);
    const payload = await section.json();
    assert.deepEqual(Object.keys(payload).sort(), ['compiled', 'id', 'outline']);
    assert.equal(payload.id, 'getting-started');
    assert.ok(payload.compiled.includes('function'));
    assert.ok(Array.isArray(payload.outline));
    const privateSection = await wikiSectionRequest(request('section', 'moderator'));
    assert.equal(privateSection.status, 404);
    assert.equal((await privateSection.text()).includes('/tpforce'), false);
    const index = await wikiSearchIndexRequest(request('search-index'));
    assert.equal(index.status, 200);
    const indexText = await index.text();
    assert.equal(indexText.includes('/tpforce'), false);
    assert.equal(indexText.includes('"sectionId":"moderator"'), false);
    assert.ok(index.headers.get('cache-control')?.includes('must-revalidate'));
  }
  for (const locale of ['../en', 'EN', 'fr', '']) {
    const request = new Request(
      `https://example.test/api/wiki/section?locale=${locale}&section=rules`,
    );
    assert.equal((await wikiSectionRequest(request)).status, 400);
    assert.equal((await wikiSearchIndexRequest(request)).status, 400);
  }
});

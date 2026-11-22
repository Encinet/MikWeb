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

test('only a valid catalog is cacheable and only an initial build failure redirects', async () => {
  const previousFetch = globalThis.fetch;
  const previousPhase = process.env.NEXT_PHASE;
  let payload: unknown = [];
  globalThis.fetch = Object.assign(async () => Response.json(payload), previousFetch);
  try {
    delete process.env.NEXT_PHASE;
    const empty = await GET();
    assert.equal(empty.status, 200);
    assert.deepEqual(await empty.json(), []);
    assert.match(empty.headers.get('cache-control') ?? '', /\bmax-age=[1-9]/);

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

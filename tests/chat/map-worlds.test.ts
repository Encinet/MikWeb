import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadMapWorlds } from '@/modules/map/lib/load-map-worlds';

test('map catalogs share requests, expire, and allow retries after a failed or invalid response', async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  let now = originalNow();
  let requests = 0;
  let respond: (response: Response) => void = () => undefined;
  globalThis.fetch = (() => {
    requests++;
    return new Promise<Response>((resolve) => {
      respond = resolve;
    });
  }) as typeof fetch;
  Date.now = () => now;
  const worlds = [{ name: 'world', displayName: 'Main world', type: 'overworld' }];
  try {
    const first = loadMapWorlds();
    const second = loadMapWorlds();
    assert.equal(first, second);
    assert.equal(requests, 1);
    respond(Response.json({ worlds }));
    assert.deepEqual(await first, worlds);
    assert.deepEqual(await loadMapWorlds(), worlds);
    assert.equal(requests, 1);

    now += 300_001;
    const failure = assert.rejects(loadMapWorlds(), /map_unavailable/);
    respond(new Response(null, { status: 503 }));
    await failure;
    assert.equal(requests, 2);
    const invalid = assert.rejects(loadMapWorlds());
    respond(Response.json({ worlds: [{ name: '<invalid>' }] }));
    await invalid;
    const retry = loadMapWorlds();
    respond(Response.json({ worlds: [] }));
    assert.deepEqual(await retry, []);
    assert.equal(requests, 4);
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
  }
});

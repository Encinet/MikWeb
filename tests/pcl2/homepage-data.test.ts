import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPcl2Time } from '@/modules/pcl2/lib/pcl2-time-zone';
import en from '../../messages/en.json';
import zh from '../../messages/zh-CN.json';

const bunTestModule: string = 'bun:test';
const { mock } = (await import(bunTestModule)) as {
  mock: { module: (specifier: string, factory: () => unknown) => void };
};
mock.module('next-intl/server', () => ({
  getMessages: async ({ locale }: { locale: string }) => (locale === 'en' ? en : zh),
}));
const { loadPcl2HomepageData } = await import('@/modules/pcl2/server/pcl2-homepage-data');

test('overlapping launcher requests share public reads but use their own origin, language and time zone', async () => {
  const originalFetch = globalThis.fetch;
  const gate = Promise.withResolvers<void>();
  const paths: string[] = [];
  let online = 1;
  globalThis.fetch = Object.assign(async (input: RequestInfo | URL) => {
    const path = new URL(String(input)).pathname;
    paths.push(path);
    await gate.promise;
    if (path === '/api/players') return Response.json({ online, players: [] });
    if (path === '/api/buildings') return Response.json({ imageBaseUrl: null, buildings: [] });
    return Response.json([]);
  }, originalFetch);
  const english = new Request('https://one.example/en/pcl2/version?timezone=UTC');
  const chinese = new Request('https://two.example/zh-CN/pcl2/source?timezone=Asia%2FSingapore');
  try {
    const first = loadPcl2HomepageData(english, 'en');
    const second = loadPcl2HomepageData(chinese, 'zh-CN');
    gate.resolve();
    const [one, two] = await Promise.all([first, second]);
    assert.deepEqual(paths.sort(), [
      '/api/announcements',
      '/api/bans',
      '/api/buildings',
      '/api/players',
    ]);
    assert.equal(one.messages, en.pcl2.homepage);
    assert.equal(two.messages, zh.pcl2.homepage);
    assert.equal(one.siteOrigin, 'https://one.example');
    assert.equal(two.siteOrigin, 'https://two.example');
    assert.equal(one.timeZone, 'UTC');
    assert.equal(two.timeZone, 'Asia/Singapore');
    assert.equal(one.onlinePlayers.online, 1);
    assert.equal(two.onlinePlayers.online, 1);
    assert.equal(one.buildingCount, 0);
    assert.equal(two.buildingCount, 0);
    online = 2;
    const next = await loadPcl2HomepageData(english, 'en');
    assert.equal(paths.length, 8);
    assert.equal(next.onlinePlayers.online, 2);
  } finally {
    gate.resolve();
    globalThis.fetch = originalFetch;
  }
});

test('cached launcher time zones keep DST, alias and UTC fallback formatting', () => {
  assert.equal(formatPcl2Time('2026-03-08T06:59:00Z', 'America/New_York'), '2026/3/8 01:59');
  assert.equal(formatPcl2Time('2026-03-08T07:00:00Z', 'America/New_York'), '2026/3/8 03:00');
  assert.equal(formatPcl2Time('2026-03-08T07:00:00Z', 'US/Eastern'), '2026/3/8 03:00');
  assert.equal(formatPcl2Time('2026-03-08T07:00:00Z', 'unknown'), '2026/3/8 07:00');
});

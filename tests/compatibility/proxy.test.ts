import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getRewrittenUrl, unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { NextRequest } from 'next/server';
import proxy, { config } from '@/proxy';
import { routing } from '@/shared/i18n/routing';

test('Proxy matches documents and excludes public assets and data endpoints', () => {
  const matches = (url: string, headers?: Record<string, string>) =>
    unstable_doesMiddlewareMatch({ config, nextConfig: {}, url, headers });
  for (const url of [
    '/api/wiki/section/en/rules',
    '/api/mcp',
    '/_next/image',
    '/opengraph-image',
    '/brand/mik/logo.svg',
    '/vendor/cap/cap.wasm',
    '/robots.txt',
  ]) {
    assert.equal(matches(url), false, url);
  }
  for (const url of ['/', '/wiki', '/EN/map', '/zh-cn', '/_not-found']) {
    assert.equal(matches(url), true, url);
  }
  for (const locale of routing.locales) {
    const pcl2 = `/${locale}/pcl2`;
    assert.equal(matches(pcl2, { rsc: '1' }), true, `${pcl2} RSC`);
    assert.equal(matches(`/${locale}`), true, `/${locale}`);
    for (const path of ['wiki?section=rules', 'buildings', 'buildings/example', 'chat', 'account']) {
      const url = `/${locale}/${path}`;
      assert.equal(matches(url), true, url);
    }
    for (const path of [
      'manifest.webmanifest',
      'pcl2/source',
      'pcl2/version',
      'opengraph-image',
      'opengraph/wiki',
      'thumbnails/home',
      'buildings/example/opengraph-image',
      'buildings/example/thumbnail',
    ]) {
      const url = `/${locale}/${path}`;
      assert.equal(matches(url), false, url);
    }
  }
});

test('Proxy keeps launcher XML rewriting', () => {
  const url = 'https://example.test/en/pcl2';
  const launcher = proxy(new NextRequest(`${url}?tz=UTC`));
  assert.equal(getRewrittenUrl(launcher), `${url}/source?tz=UTC`);
  const raw = proxy(new NextRequest(`${url}?raw`, { headers: { accept: 'text/html' } }));
  assert.equal(getRewrittenUrl(raw), `${url}/source?raw`);
  for (const accept of ['application/xml', 'text/xml, */*;q=0.5']) {
    const xml = proxy(new NextRequest(url, { headers: { accept, 'sec-fetch-dest': 'empty' } }));
    assert.equal(getRewrittenUrl(xml), `${url}/source`);
  }

  const browserHeaders: Record<string, string>[] = [
    { accept: 'text/html' },
    { accept: '*/*', 'user-agent': 'ExampleBot' },
    { accept: '*/*', 'sec-fetch-dest': 'empty' },
  ];
  for (const headers of browserHeaders) {
    const browser = proxy(new NextRequest(url, { headers }));
    assert.equal(getRewrittenUrl(browser), null);
  }
});

test('unprefixed URLs still honor the saved language and retain query parameters', () => {
  const response = proxy(
    new NextRequest('https://example.test/wiki?section=rules', {
      headers: { cookie: 'NEXT_LOCALE=en', 'accept-language': 'zh-CN' },
    }),
  );
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://example.test/en/wiki?section=rules');
});

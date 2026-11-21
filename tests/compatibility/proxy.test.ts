import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getRewrittenUrl, unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { NextRequest } from 'next/server';
import proxy, { config } from '@/proxy';
import { routing } from '@/shared/i18n/routing';

test('Proxy skips ordinary APIs and public images, but handles locale and MCP routes', () => {
  const matches = (url: string) => unstable_doesMiddlewareMatch({ config, nextConfig: {}, url });
  for (const url of [
    '/api/wiki/section/en/rules',
    '/_next/image',
    '/_not-found',
    '/opengraph-image',
  ]) {
    assert.equal(matches(url), false, url);
  }
  for (const url of ['/', '/api/mcp']) {
    assert.equal(matches(url), true, url);
  }
  for (const locale of routing.locales) {
    for (const path of ['pcl2', 'buildings/example']) {
      const url = `/${locale}/${path}`;
      assert.equal(matches(url), true, url);
    }
    for (const path of [
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

test('Proxy keeps launcher XML rewriting and MCP preflight behavior', () => {
  const launcher = proxy(new NextRequest('https://example.test/en/pcl2?raw'));
  assert.equal(getRewrittenUrl(launcher), 'https://example.test/en/pcl2/source?raw');

  const browser = proxy(
    new NextRequest('https://example.test/en/pcl2', { headers: { accept: 'text/html' } }),
  );
  assert.equal(browser.headers.get('x-middleware-rewrite'), null);

  const preflight = proxy(new NextRequest('https://example.test/api/mcp', { method: 'OPTIONS' }));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import proxy from '@/proxy';

test('public localized image routes bypass locale cookies so CDN responses can be cached', () => {
  for (const path of [
    '/zh-CN/opengraph-image',
    '/en/opengraph/map',
    `/zh-CN/buildings/${'a'.repeat(32)}/opengraph-image`,
    `/api/buildings/${'a'.repeat(32)}/images/0`,
  ]) {
    const response = proxy(new NextRequest(`https://mcmik.top${path}`));
    assert.equal(response.headers.get('x-middleware-next'), '1', path);
    assert.equal(response.headers.has('set-cookie'), false, path);
    assert.equal(response.headers.has('link'), false, path);
  }
});

test('HTML pages still use locale middleware and launcher XML routing is preserved', () => {
  const html = proxy(
    new NextRequest('https://mcmik.top/en/buildings', {
      headers: { accept: 'text/html' },
    }),
  );
  assert.ok(html.headers.get('link')?.includes('hreflang="zh-CN"'));
  const launcher = proxy(new NextRequest('https://mcmik.top/zh-CN/pcl2'));
  assert.equal(launcher.headers.get('x-middleware-rewrite'), 'https://mcmik.top/zh-CN/pcl2/source');
  const crawler = proxy(
    new NextRequest('https://mcmik.top/zh-CN/pcl2', {
      headers: { 'user-agent': 'facebookexternalhit', accept: '*/*' },
    }),
  );
  assert.notEqual(
    crawler.headers.get('x-middleware-rewrite'),
    'https://mcmik.top/zh-CN/pcl2/source',
  );
});

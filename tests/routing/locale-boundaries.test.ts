import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getRewrittenUrl,
  unstable_getResponseFromNextConfig,
} from 'next/experimental/testing/server';
import nextConfig from '../../next.config';

test('unmatched non-locale paths fall through to the global 404 before locale routing', async () => {
  // The config helper does not serve filesystem routes; existing assets are checked in HTTP QA.
  for (const path of [
    '/sw.js',
    '/missing-icon.png',
    '/images/missing.png',
    '/fr/missing.json',
    '/english/missing.png',
    '/zh-CN-old/missing.png',
    '/api-example/missing.png',
    '/_not-found',
  ]) {
    const response = await unstable_getResponseFromNextConfig({
      url: `https://example.test${path}`,
      nextConfig,
    });
    const destination = getRewrittenUrl(response);
    assert.ok(destination, path);
    assert.equal(new URL(destination).pathname, '/', path);
  }
});

test('locale pages and infrastructure routes keep their existing routing', async () => {
  for (const path of [
    '/',
    '/en',
    '/zh-CN',
    '/en/buildings/example',
    '/zh-CN/wiki',
    '/en/manifest.webmanifest',
    '/api',
    '/api/auth/me',
    '/api/mcp',
    '/_next/static/chunks/example.js',
    '/_vercel/insights/script.js',
  ]) {
    const response = await unstable_getResponseFromNextConfig({
      url: `https://example.test${path}`,
      nextConfig,
    });
    assert.equal(getRewrittenUrl(response), null, path);
  }
});

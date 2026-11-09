import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AuthAccount } from '@/modules/auth/model/auth-types';

// Keep Bun's test-only mock API scoped here, without adding Bun globals to app types.
const bunTestModule: string = 'bun:test';
const { mock } = (await import(bunTestModule)) as {
  mock: { module: (specifier: string, factory: () => unknown) => void };
};

let sessionId = '';
mock.module('server-only', () => ({}));
mock.module('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name === '__Host-mik_sid' ? { value: sessionId } : undefined),
  }),
}));

const { staffWikiRequest } = await import('@/modules/wiki/server/staff-wiki-request');

const account: AuthAccount = {
  playerUuid: 'wiki-staff-player',
  currentName: 'Staff',
  role: 'moderator',
  updatedAt: '2026-11-09T00:00:00Z',
  passkeyCount: 1,
};

function request(locale = 'zh-CN', origin = 'https://example.test') {
  return new Request(`https://example.test/api/wiki/staff?locale=${locale}`, {
    method: 'POST',
    headers: { origin, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' },
    // These claims must never grant access or replace the HttpOnly session.
    body: JSON.stringify({ role: 'custodian', authenticated: true, sessionId: 'forged' }),
  });
}

test('staff endpoint verifies the real session and rejects public roles, forged claims, and failed verification', async () => {
  const originalFetch = globalThis.fetch;
  const originalSecret = process.env.MIKWEB_AUTH_CLIENT_SECRET;
  process.env.MIKWEB_AUTH_CLIENT_SECRET = 'wiki-test-secret';
  let upstreamPayload: unknown = { authenticated: false };
  let upstreamStatus = 200;
  let requests = 0;
  globalThis.fetch = Object.assign(async (input: RequestInfo | URL, init?: RequestInit) => {
    requests++;
    assert.equal(new URL(String(input)).pathname, '/auth/me');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('X-Mik-Session'), sessionId);
    assert.equal(headers.get('X-Mikweb-Auth'), 'wiki-test-secret');
    assert.equal(init?.body, '{}');
    assert.equal(init?.cache, 'no-store');
    return Response.json(upstreamPayload, { status: upstreamStatus });
  }, originalFetch);
  try {
    for (const role of [null, 'default', 'member', 'admin'] as const) {
      sessionId = role ? 'actual-cookie-session' : '';
      upstreamPayload = role
        ? { authenticated: true, account: { ...account, role } }
        : { authenticated: false };
      const response = await staffWikiRequest(request());
      assert.equal(response.status, role === null ? 401 : role === 'admin' ? 502 : 403);
      assert.equal((await response.text()).includes('compiled'), false);
      assert.ok(response.headers.get('Cache-Control')?.includes('no-store'));
    }
    for (const role of ['moderator', 'custodian'] as const) {
      upstreamPayload = { authenticated: true, account: { ...account, role } };
      for (const locale of ['zh-CN', 'en']) {
        const response = await staffWikiRequest(request(locale));
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('Vary'), 'Cookie');
        const bundle = await response.json();
        assert.deepEqual(Object.keys(bundle.compiled), ['moderator']);
        assert.ok(
          bundle.sections.every((section: { access: string }) => section.access === 'staff'),
        );
        assert.equal(JSON.stringify(bundle).includes('sourcePath'), false);
      }
    }
    upstreamStatus = 503;
    upstreamPayload = { error: 'unavailable' };
    assert.equal((await staffWikiRequest(request())).status, 503);
    upstreamStatus = 200;
    upstreamPayload = { authenticated: true };
    assert.equal((await staffWikiRequest(request())).status, 502);
    const before = requests;
    assert.equal((await staffWikiRequest(request('invalid'))).status, 400);
    assert.equal((await staffWikiRequest(request('en', 'https://untrusted.test'))).status, 403);
    assert.equal(requests, before);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalSecret === undefined) delete process.env.MIKWEB_AUTH_CLIENT_SECRET;
    else process.env.MIKWEB_AUTH_CLIENT_SECRET = originalSecret;
  }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { joinPageData } from './join-fixture';

const bunTestModule: string = 'bun:test';
const { mock } = (await import(bunTestModule)) as {
  mock: { module: (name: string, factory: () => unknown) => void };
};
mock.module('server-only', () => ({}));
const { joinCodeRequest } = await import('@/modules/join/server/join-code-request');
const { createTotp } = await import('@/modules/join/server/join-totp');
const { getJoinPageData } = await import('@/modules/join/server/join-page-data');
const { getJoinCaptchaConfig } = await import('@/modules/join/server/join-captcha');
const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
const secondSecret = 'MFRGGZDFMZTWQ2LKNNWG23TPOBYXE3DE';
const keys = [
  'CAP_API_ENDPOINT',
  'CAP_SECRET_KEY',
  'QQ_GROUP_1_TOTP_SECRET',
  'QQ_GROUP_2_TOTP_SECRET',
  'MATRIX_JOIN_URL',
  'QQ_GROUP_1_NUMBER',
  'QQ_GROUP_2_NUMBER',
  'QQ_GROUP_1_JOIN_URL',
  'QQ_GROUP_2_JOIN_URL',
];

function request(group: unknown, origin = 'https://example.test', token = 'test-token') {
  return new Request('https://example.test/api/join/code', {
    method: 'POST',
    headers: {
      origin,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ group, token }),
  });
}

async function configured(run: () => Promise<void>) {
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  process.env.CAP_API_ENDPOINT = 'https://cap.example.test/test-site/';
  process.env.CAP_SECRET_KEY = 'server-only-cap-secret';
  process.env.QQ_GROUP_1_TOTP_SECRET = secret;
  process.env.QQ_GROUP_2_TOTP_SECRET = secondSecret;
  process.env.MATRIX_JOIN_URL = joinPageData.matrixUrl ?? '';
  for (const group of joinPageData.groups) {
    process.env[`QQ_GROUP_${group.id}_NUMBER`] = group.number ?? '';
    process.env[`QQ_GROUP_${group.id}_JOIN_URL`] = group.joinUrl ?? '';
  }
  const previousFetch = globalThis.fetch;
  const previousNow = Date.now;
  Date.now = () => 1234567890000;
  globalThis.fetch = Object.assign(async (input: RequestInfo | URL, options?: RequestInit) => {
    assert.equal(String(input), 'https://cap.example.test/test-site/siteverify');
    assert.deepEqual(JSON.parse(String(options?.body)), {
      secret: 'server-only-cap-secret',
      response: 'test-token',
    });
    assert.equal(options?.redirect, 'error');
    assert.equal(options?.cache, 'no-store');
    return Response.json({ success: true });
  }, previousFetch);
  try {
    await run();
  } finally {
    globalThis.fetch = previousFetch;
    Date.now = previousNow;
    for (const [key, value] of previous) {
      if (value === undefined) Reflect.deleteProperty(process.env, key);
      else process.env[key] = value;
    }
  }
}

test('join codes require a server-verified Cap token and are never cached', async () =>
  configured(async () => {
    const response = await joinCodeRequest(request('1'));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    const body = await response.json();
    assert.match(body.code, /^\d{6}$/);
    assert.equal(body.code, (await createTotp(secret, body.serverTime)).code);
    assert.ok(body.expiresAt > body.serverTime);
    assert.equal(body.expiresAt - body.serverTime, 60000);
    assert.doesNotMatch(
      JSON.stringify(body),
      new RegExp(`${secret}|${secondSecret}|server-only-cap-secret`),
    );
  }));

test('public join information comes from runtime environment without exposing secrets', async () =>
  configured(async () => {
    const first = await getJoinPageData();
    assert.deepEqual(first, joinPageData);
    assert.deepEqual(getJoinCaptchaConfig(), joinPageData.captcha);
    assert.doesNotMatch(
      JSON.stringify(first),
      new RegExp(`${secret}|${secondSecret}|server-only-cap-secret`),
    );

    process.env.MATRIX_JOIN_URL = 'https://matrix.to/#/#updated:example.test';
    process.env.QQ_GROUP_1_NUMBER = '987654321';
    process.env.QQ_GROUP_1_JOIN_URL = 'https://qm.qq.com/q/updated';
    const updated = await getJoinPageData();
    assert.equal(updated.matrixUrl, 'https://matrix.to/#/#updated:example.test');
    assert.equal(updated.groups[0].number, '987654321');
    assert.equal(updated.groups[0].joinUrl, 'https://qm.qq.com/q/updated');
  }));

test('missing and unsafe configured links are not sent to the browser', async () =>
  configured(async () => {
    for (const value of [
      undefined,
      '',
      'javascript:alert(1)',
      'http://example.test',
      'https://user:password@example.test',
    ]) {
      if (value === undefined) delete process.env.MATRIX_JOIN_URL;
      else process.env.MATRIX_JOIN_URL = value;
      process.env.QQ_GROUP_1_JOIN_URL = value ?? '';
      const data = await getJoinPageData();
      assert.equal(data.matrixUrl, null);
      assert.equal(data.groups.length, 1);
      assert.equal(data.groups[0].id, '2');
      assert.equal(data.groups[0].joinUrl, joinPageData.groups[1].joinUrl);
    }
  }));

test('invalid groups and cross-origin submissions do not issue codes', async () =>
  configured(async () => {
    for (const group of [undefined, '3', 1, { id: '1' }])
      assert.equal((await joinCodeRequest(request(group))).status, 400);
    assert.equal((await joinCodeRequest(request('1', 'https://other.test'))).status, 403);
  }));

test('missing configuration and duplicate secrets are handled', async () =>
  configured(async () => {
    assert.equal((await joinCodeRequest(request('2'))).status, 200);
    delete process.env.QQ_GROUP_1_TOTP_SECRET;
    assert.equal((await joinCodeRequest(request('1'))).status, 503);
    process.env.QQ_GROUP_1_TOTP_SECRET = secondSecret;
    assert.equal((await joinCodeRequest(request('1'))).status, 503);
    process.env.QQ_GROUP_1_TOTP_SECRET = `${secondSecret
      .toLowerCase()
      .match(/.{1,4}/g)
      ?.join('-')}====`;
    assert.equal((await joinCodeRequest(request('1'))).status, 503);
    process.env.QQ_GROUP_1_TOTP_SECRET = secret;
    assert.equal((await joinCodeRequest(request('1'))).status, 200);
  }));

test('clients cannot select a time, counter, secret or generation options', async () =>
  configured(async () => {
    const fields: Record<string, unknown> = {
      time: 0,
      timestamp: 4102444800000,
      nowMs: 4102444800000,
      serverTime: 0,
      counter: 1234,
      period: 300,
      digits: 8,
      algorithm: 'SHA-256',
      secret,
      secretKey: 'QQ_GROUP_2_TOTP_SECRET',
      options: { nowMs: 0, period: 300 },
      ['__proto__']: null,
    };
    for (const [key, value] of Object.entries(fields)) {
      const response = await joinCodeRequest(
        new Request('https://example.test/api/join/code', {
          method: 'POST',
          headers: {
            origin: 'https://example.test',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ group: '1', token: 'test-token', [key]: value }),
        }),
      );
      assert.equal(response.status, 400, key);
      assert.deepEqual(await response.json(), { error: 'invalid_request' });
    }
    for (const query of ['time=0', 'nowMs=4102444800000', 'group=2', 'period=300&digits=8']) {
      const response = await joinCodeRequest(
        new Request(`https://example.test/api/join/code?${query}`, {
          method: 'POST',
          headers: {
            origin: 'https://example.test',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ group: '1' }),
        }),
      );
      assert.equal(response.status, 400, query);
    }
  }));

test('malformed requests and weak or invalid keys return no secrets or error details', async () =>
  configured(async () => {
    const make = (body: string) =>
      new Request('https://example.test/api/join/code', {
        method: 'POST',
        headers: {
          origin: 'https://example.test',
          'Content-Type': 'application/json',
        },
        body,
      });
    for (const value of ['null', '[]', '"1"', '{', '{"group":"1","__proto__":{"group":"2"}}']) {
      const response = await joinCodeRequest(make(value));
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: 'invalid_request' });
    }
    assert.equal((await joinCodeRequest(make(' '.repeat(4097)))).status, 413);
    const wrongMethod = await joinCodeRequest(new Request('https://example.test/api/join/code'));
    assert.equal(wrongMethod.status, 405);
    assert.equal(wrongMethod.headers.get('Allow'), 'POST');
    for (const key of ['A'.repeat(16), 'invalid-secret!', ' ']) {
      process.env.QQ_GROUP_1_TOTP_SECRET = key;
      const response = await joinCodeRequest(request('1'));
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { error: 'unavailable' });
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
    }
  }));

test('migrated TOTP generation preserves RFC 6238 vectors', async () => {
  for (const [seconds, expected] of [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ] as const) {
    assert.equal((await createTotp(secret, seconds * 1000, { digits: 8 })).code, expected);
  }
});

test('missing, empty and oversized Cap tokens never reach the verifier or issue codes', async () =>
  configured(async () => {
    let calls = 0;
    globalThis.fetch = Object.assign(async () => {
      calls++;
      return Response.json({ success: true });
    }, globalThis.fetch);
    const missing = new Request('https://example.test/api/join/code', {
      method: 'POST',
      headers: {
        origin: 'https://example.test',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ group: '1' }),
    });
    assert.equal((await joinCodeRequest(missing)).status, 400);
    for (const token of ['', 'has whitespace', 'x'.repeat(2049)]) {
      const response = await joinCodeRequest(request('1', 'https://example.test', token));
      assert.equal(response.status, 403);
      assert.deepEqual(await response.json(), { error: 'captcha_failed' });
    }
    assert.equal(calls, 0);
  }));

test('Cap failures, malformed success and outages fail closed without leaking provider errors', async () =>
  configured(async () => {
    for (const [status, body, expected] of [
      [403, { success: false, error: 'private provider detail' }, 403],
      [200, { success: false }, 403],
      [200, { success: 'true' }, 403],
      [200, [true], 403],
      [500, { success: true }, 503],
    ] as const) {
      globalThis.fetch = Object.assign(
        async () => Response.json(body, { status }),
        globalThis.fetch,
      );
      const response = await joinCodeRequest(request('1'));
      assert.equal(response.status, expected);
      assert.deepEqual(await response.json(), {
        error: expected === 403 ? 'captcha_failed' : 'captcha_unavailable',
      });
    }
    globalThis.fetch = Object.assign(async () => {
      throw new Error('private secret');
    }, globalThis.fetch);
    assert.deepEqual(await (await joinCodeRequest(request('1'))).json(), {
      error: 'captcha_unavailable',
    });
  }));

test('every issuance is checked with Cap, including concurrent replay and cross-group replay', async () =>
  configured(async () => {
    const consumed = new Set<string>();
    let calls = 0;
    globalThis.fetch = Object.assign(async (_input: RequestInfo | URL, options?: RequestInit) => {
      calls++;
      const { response: token } = JSON.parse(String(options?.body));
      if (consumed.has(token)) return Response.json({ success: false }, { status: 403 });
      consumed.add(token);
      return Response.json({ success: true });
    }, globalThis.fetch);
    const responses = await Promise.all([
      joinCodeRequest(request('1')),
      joinCodeRequest(request('1')),
    ]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 403]);
    assert.equal((await joinCodeRequest(request('2'))).status, 403);
    assert.equal(calls, 3);
  }));

test('incomplete or unsafe Cap configuration disables both the widget and code issuance', async () =>
  configured(async () => {
    for (const [key, value] of [
      ['CAP_SECRET_KEY', ''],
      ['CAP_API_ENDPOINT', 'https://cap.example.test/'],
      ['CAP_API_ENDPOINT', 'http://cap.example.test/test-site/'],
      ['CAP_API_ENDPOINT', 'https://user:password@cap.example.test/test-site/'],
      ['CAP_API_ENDPOINT', 'https://cap.example.test/test-site/?secret=wrong'],
    ]) {
      const previous = process.env[key];
      process.env[key] = value;
      assert.equal(getJoinPageData().captcha, null);
      const response = await joinCodeRequest(request('1'));
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { error: 'captcha_unavailable' });
      process.env[key] = previous;
    }
  }));

test('verified requests at every point in a step return the current code and its QQ acceptance deadline', async () =>
  configured(async () => {
    const boundary = 1234567890000;
    let calls = 0;
    globalThis.fetch = Object.assign(async () => {
      calls++;
      return Response.json({ success: true });
    }, globalThis.fetch);
    for (const offset of [0, 19000, 25000, 29999]) {
      const now = boundary + offset;
      Date.now = () => now;
      const response = await joinCodeRequest(request('1'));
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.serverTime, now);
      assert.equal(body.code, (await createTotp(secret, now)).code);
      assert.equal(body.expiresAt, boundary + 60000);
      assert.ok(body.expiresAt - now > 30000);
      assert.ok(body.expiresAt - now <= 60000);
      // The code belongs to the preceding step at the final millisecond QQ accepts it.
      assert.equal(body.code, (await createTotp(secret, body.expiresAt - 30001)).code);
    }
    assert.equal(calls, 4);
  }));

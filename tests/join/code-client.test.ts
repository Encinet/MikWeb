import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JoinCodeRequestError, requestJoinCode } from '@/modules/join/lib/request-join-code';
import { isJoinCode } from '@/modules/join/model/join-code';

test('join request timeouts cover body consumption and provide a recoverable error', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = Object.assign(async (_url: RequestInfo | URL, options?: RequestInit) => {
    const signal = options?.signal;
    return {
      ok: true,
      json: () =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
        }),
    } as Response;
  }, previous);
  try {
    await assert.rejects(
      requestJoinCode('1', 'test-token', {
        signal: new AbortController().signal,
        timeoutMs: 10,
      }),
      (error) => error instanceof JoinCodeRequestError && error.code === 'request_timeout',
    );
  } finally {
    globalThis.fetch = previous;
  }
});

test('a consumed Cap token is never retried automatically, even after a network failure', async () => {
  const previous = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = Object.assign(async () => {
    requests++;
    return Response.json({ error: 'captcha_failed' }, { status: 403 });
  }, previous);
  try {
    await assert.rejects(
      requestJoinCode('1', 'test-token', { signal: new AbortController().signal }),
      (error) => error instanceof JoinCodeRequestError && error.code === 'captcha_failed',
    );
    assert.equal(requests, 1);
  } finally {
    globalThis.fetch = previous;
  }
});

test('server processing time preserves code lifetime while network time is subtracted', async () => {
  const previous = globalThis.fetch;
  const originalClock = Object.getOwnPropertyDescriptor(performance, 'now');
  let now = 1000;
  Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
  globalThis.fetch = Object.assign(async () => {
    now += 10500;
    return Response.json({
      code: '123456',
      serverTime: 30000,
      expiresAt: 60000,
      period: 30,
      processingTimeMs: 10000,
    });
  }, previous);
  try {
    const result = await requestJoinCode('1', 'test-token', {
      signal: new AbortController().signal,
    });
    assert.equal(result.deadline - now, 29500);
  } finally {
    globalThis.fetch = previous;
    if (originalClock) Object.defineProperty(performance, 'now', originalClock);
    else Reflect.deleteProperty(performance, 'now');
  }
});

test('a response cannot extend a TOTP code beyond its configured period', () => {
  assert.equal(
    isJoinCode({ code: '123456', serverTime: 1000, expiresAt: 32000, period: 30 }),
    false,
  );
  assert.equal(
    isJoinCode({ code: '123456', serverTime: 1000, expiresAt: 31000, period: 30 }),
    true,
  );
});

test('device sleep during a request cannot preserve an expired code when the monotonic clock pauses', async () => {
  const previous = globalThis.fetch;
  const previousNow = Date.now;
  const originalClock = Object.getOwnPropertyDescriptor(performance, 'now');
  let wallTime = 1_000_000;
  Date.now = () => wallTime;
  Object.defineProperty(performance, 'now', { configurable: true, value: () => 1000 });
  globalThis.fetch = Object.assign(async () => {
    wallTime += 60_000;
    return Response.json({
      code: '123456',
      serverTime: 30000,
      expiresAt: 60000,
      period: 30,
      processingTimeMs: 0,
    });
  }, previous);
  try {
    await assert.rejects(
      requestJoinCode('1', 'test-token', { signal: new AbortController().signal }),
      (error) => error instanceof JoinCodeRequestError && error.code === 'code_expired',
    );
  } finally {
    globalThis.fetch = previous;
    Date.now = previousNow;
    if (originalClock) Object.defineProperty(performance, 'now', originalClock);
    else Reflect.deleteProperty(performance, 'now');
  }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authRequest } from '@/modules/auth/lib/auth-request';
import { withRequestTimeout } from '@/shared/lib/request-timeout';

test('authentication works without AbortSignal.any or timeout and releases completed request listeners', async () => {
  const descriptors = new Map(
    ['any', 'timeout'].map((key) => [key, Object.getOwnPropertyDescriptor(AbortSignal, key)]),
  );
  const originalFetch = globalThis.fetch;
  const observed: { signal: AbortSignal | null } = { signal: null };
  for (const key of descriptors.keys())
    Object.defineProperty(AbortSignal, key, { configurable: true, value: undefined });
  globalThis.fetch = (async (_input, options) => {
    observed.signal = options?.signal ?? null;
    return Response.json({ confirmed: true });
  }) as typeof fetch;
  try {
    const parent = new AbortController();
    assert.deepEqual(await authRequest('/api/auth/test', { signal: parent.signal }), {
      confirmed: true,
    });
    assert.ok(observed.signal);
    assert.notEqual(observed.signal, parent.signal);
    parent.abort(new Error('Cancelled after completion'));
    assert.equal(observed.signal.aborted, false);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(AbortSignal, key, descriptor);
      else Reflect.deleteProperty(AbortSignal, key);
    }
  }
});

test('request timeouts remain active while the response body is being consumed', async () => {
  await assert.rejects(
    withRequestTimeout(10, async (signal) => {
      await Promise.resolve();
      return new Promise<void>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
    }),
    { name: 'TimeoutError' },
  );
});

test('parent cancellation propagates the original reason, including already cancelled requests', async () => {
  const parent = new AbortController();
  const reason = new Error('Navigation cancelled');
  const pending = withRequestTimeout(
    1000,
    (signal) =>
      new Promise<void>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }),
    parent.signal,
  );
  parent.abort(reason);
  await assert.rejects(pending, (error) => error === reason);
  await assert.rejects(
    withRequestTimeout(
      1000,
      async (signal) => {
        assert.equal(signal.aborted, true);
        throw signal.reason;
      },
      parent.signal,
    ),
    (error) => error === reason,
  );
});

test('completed requests and failures clear timers and detach cancellation listeners', async () => {
  const parent = new AbortController();
  const observed: { completed: AbortSignal | null; failed: AbortSignal | null } = {
    completed: null,
    failed: null,
  };
  await withRequestTimeout(
    5,
    async (signal) => {
      observed.completed = signal;
    },
    parent.signal,
  );
  const failure = new Error('Network failed');
  await assert.rejects(
    withRequestTimeout(
      5,
      async (signal) => {
        observed.failed = signal;
        throw failure;
      },
      parent.signal,
    ),
    (error) => error === failure,
  );
  parent.abort();
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.ok(observed.completed);
  assert.ok(observed.failed);
  assert.equal(observed.completed.aborted, false);
  assert.equal(observed.failed.aborted, false);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act } from 'react';
import { AuthProvider } from '@/modules/auth/model/auth-provider';
import { useAuth } from '@/modules/auth/model/use-auth';
import { loadMapWorlds } from '@/modules/map/lib/load-map-worlds';
import { fetchValidatedJson } from '@/shared/api/fetch-validated-json';
import { OWNER } from '../chat/fixtures';
import { createBrowserEnvironment } from '../support/browser-environment';

async function withoutStaticTimeout(run: () => Promise<void>) {
  const descriptor = Object.getOwnPropertyDescriptor(AbortSignal, 'timeout');
  const originalFetch = globalThis.fetch;
  Object.defineProperty(AbortSignal, 'timeout', { configurable: true, value: undefined });
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
    if (descriptor) Object.defineProperty(AbortSignal, 'timeout', descriptor);
    else Reflect.deleteProperty(AbortSignal, 'timeout');
  }
}

test('validated requests support older browsers and time out while reading the body', async () => {
  await withoutStaticTimeout(async () => {
    globalThis.fetch = Object.assign(async (_input: RequestInfo | URL, init?: RequestInit) => {
      assert.ok(init?.signal);
      return new Response(
        new ReadableStream({
          start(controller) {
            init.signal?.addEventListener('abort', () => controller.error(init.signal?.reason), {
              once: true,
            });
          },
        }),
      );
    }, globalThis.fetch);
    const options = {
      url: '/test/catalog',
      validate: (value: unknown): value is string[] => Array.isArray(value),
      timeoutMs: 10,
      fallbackErrorMessage: 'unavailable',
    };
    const result = await fetchValidatedJson(options);
    assert.equal(result.status, 'network-error');
    if (result.status === 'network-error') {
      assert.ok(result.cause instanceof DOMException);
      assert.equal(result.cause.name, 'TimeoutError');
    }
    globalThis.fetch = Object.assign(async () => Response.json(['recovered']), globalThis.fetch);
    assert.deepEqual(await fetchValidatedJson(options), {
      status: 'success',
      data: ['recovered'],
    });
  });
});

function SessionProbe() {
  const auth = useAuth();
  return (
    <>
      <output>{auth.authenticated ? auth.account?.currentName : 'signed-out'}</output>
      <button type="button" onClick={() => void auth.logout()}>
        Logout
      </button>
    </>
  );
}

test('session verification and logout work without AbortSignal.timeout', async () => {
  await withoutStaticTimeout(async () => {
    const environment = createBrowserEnvironment();
    const requests: string[] = [];
    globalThis.fetch = Object.assign(async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(String(input));
      assert.equal(init?.method, 'POST');
      assert.ok(init?.signal);
      return input === '/api/auth/me'
        ? Response.json({
            authenticated: true,
            account: {
              playerUuid: OWNER,
              currentName: 'Player',
              role: 'default',
              updatedAt: '2026-11-03T00:00:00.000Z',
              passkeyCount: 0,
            },
          })
        : new Response(null, { status: 204 });
    }, globalThis.fetch);
    try {
      await act(async () =>
        environment.root.render(
          <AuthProvider>
            <SessionProbe />
          </AuthProvider>,
        ),
      );
      assert.equal(environment.container.querySelector('output')?.textContent, 'Player');
      await act(async () => environment.container.querySelector('button')?.click());
      assert.equal(environment.container.querySelector('output')?.textContent, 'signed-out');
      assert.deepEqual(requests, ['/api/auth/me', '/api/auth/logout']);
    } finally {
      await environment.close();
    }
  });
});

test('map menus retry failures and share successful requests without newer AbortSignal APIs', async () => {
  await withoutStaticTimeout(async () => {
    const worlds = [{ name: 'world', displayName: 'World', type: 'overworld' }];
    let requests = 0;
    globalThis.fetch = Object.assign(async (_input: RequestInfo | URL, init?: RequestInit) => {
      assert.ok(init?.signal);
      requests++;
      return requests === 1 ? new Response(null, { status: 503 }) : Response.json({ worlds });
    }, globalThis.fetch);
    await assert.rejects(loadMapWorlds(), /map_unavailable/);
    assert.deepEqual(await Promise.all([loadMapWorlds(), loadMapWorlds()]), [worlds, worlds]);
    assert.deepEqual(await loadMapWorlds(), worlds);
    assert.equal(requests, 2);
  });
});

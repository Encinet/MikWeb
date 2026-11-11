import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { NextIntlClientProvider } from 'next-intl';
import { act } from 'react';
import {
  getAuthNavigationInitializationScript,
  rememberAuthNavigation,
} from '@/modules/auth/lib/auth-navigation-hint';
import { AuthProvider } from '@/modules/auth/model/auth-provider';
import type { AuthState } from '@/modules/auth/model/auth-state-context';
import type { AuthAccount } from '@/modules/auth/model/auth-types';
import { useAuth } from '@/modules/auth/model/use-auth';
import { SiteHeaderAccount } from '@/site/header/ui/site-header-account';
import messages from '../../messages/en.json';
import { OWNER } from '../chat/fixtures';
import { createBrowserEnvironment } from '../support/browser-environment';

const account: AuthAccount = {
  playerUuid: OWNER,
  currentName: 'Player',
  role: 'member',
  updatedAt: '2026-11-12T00:00:00.000Z',
  passkeyCount: 1,
};
const signedIn = () => Response.json({ authenticated: true, account });
const signedOut = () => Response.json({ authenticated: false });

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function SessionProbe({ onState }: { onState: (state: AuthState) => void }) {
  onState(useAuth());
  return <SiteHeaderAccount />;
}

function createSessionEnvironment() {
  const environment = createBrowserEnvironment();
  const originalFetch = globalThis.fetch;
  let state: AuthState;
  return {
    ...environment,
    state: () => state,
    hint: () => environment.window.document.documentElement.getAttribute('data-auth-navigation'),
    restoreHint() {
      runInNewContext(getAuthNavigationInitializationScript(), {
        window: environment.window,
        document: environment.window.document,
      });
    },
    mockFetch(fetcher: (input: RequestInfo | URL) => Promise<Response>) {
      globalThis.fetch = Object.assign(fetcher, originalFetch);
    },
    async mount() {
      await act(async () =>
        environment.root.render(
          <NextIntlClientProvider locale="en" messages={messages} timeZone="Asia/Singapore">
            <AuthProvider>
              <SessionProbe
                onState={(next) => {
                  state = next;
                }}
              />
            </AuthProvider>
          </NextIntlClientProvider>,
        ),
      );
    },
    async close() {
      await environment.close();
      globalThis.fetch = originalFetch;
    },
  };
}

test('pre-paint initialization restores only a recent display hint, never an identity', async () => {
  const env = createSessionEnvironment();
  try {
    rememberAuthNavigation(true);
    const storage = env.window.localStorage;
    assert.equal(storage.length, 1);
    const key = storage.key(0);
    assert.ok(key);
    assert.ok(/^\d+$/.test(storage.getItem(key) ?? ''));
    env.restoreHint();
    assert.equal(env.hint(), 'signed-in');
    for (const value of [
      'invalid',
      '0',
      String(Date.now() + 60_000),
      String(Date.now() - 8 * 86400_000),
    ]) {
      storage.setItem(key, value);
      env.restoreHint();
      assert.equal(env.hint(), 'signed-out');
    }
    storage.clear();
    env.restoreHint();
    assert.equal(env.hint(), 'signed-out');
  } finally {
    await env.close();
  }
});

test('blocked browser storage keeps navigation usable and does not break verification', async () => {
  const env = createSessionEnvironment();
  Object.defineProperty(env.window, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('Storage disabled');
    },
  });
  env.mockFetch(async () => signedIn());
  try {
    env.restoreHint();
    assert.equal(env.hint(), 'signed-out');
    await env.mount();
    assert.equal(env.hint(), 'signed-in');
    assert.equal(env.state().authenticated, true);
    await act(async () => env.state().logout());
    assert.equal(env.hint(), 'signed-out');
    assert.equal(env.state().authenticated, false);
  } finally {
    await env.close();
  }
});

test('a navigation hint leaves identity unverified and the account entry mounted throughout refresh', async () => {
  const env = createSessionEnvironment();
  let response = deferredResponse();
  env.mockFetch(async () => response.promise);
  try {
    rememberAuthNavigation(true);
    env.restoreHint();
    await env.mount();
    assert.equal(env.hint(), 'signed-in');
    assert.equal(env.state().account, null);
    assert.equal(env.state().authenticated, false);
    assert.equal(env.state().verified, false);
    const entry = env.container.querySelector('[data-auth-audience="signed-in"]');
    assert.ok(entry);
    assert.equal(entry.getAttribute('href'), '/en/account');
    await act(async () => response.resolve(signedIn()));
    assert.equal(env.state().account?.currentName, 'Player');
    assert.equal(env.state().verified, true);
    assert.equal(env.container.querySelector('[data-auth-audience="signed-in"]'), entry);

    response = deferredResponse();
    let refresh!: Promise<AuthAccount | null>;
    await act(async () => {
      refresh = env
        .state()
        .refresh()
        .catch(() => null);
    });
    assert.equal(env.state().isLoading, true);
    assert.equal(env.state().account?.currentName, 'Player');
    assert.equal(env.container.querySelector('[data-auth-audience="signed-in"]'), entry);
    await act(async () => {
      response.resolve(new Response(null, { status: 503 }));
      await refresh;
    });
    assert.equal(env.hint(), 'signed-in');
    assert.equal(env.state().account?.currentName, 'Player');

    env.mockFetch(async () => signedOut());
    await act(async () => {
      await env.state().refresh();
    });
    assert.equal(env.hint(), 'signed-out');
    assert.equal(env.state().account, null);
    assert.equal(env.window.localStorage.getItem('mik-auth-navigation'), null);
  } finally {
    await env.close();
  }
});

test('successful logout clears the hint and ignores an older in-flight verification', async () => {
  const env = createSessionEnvironment();
  env.mockFetch(async () => signedIn());
  try {
    await env.mount();
    const response = deferredResponse();
    env.mockFetch(async (input) =>
      input === '/api/auth/me' ? response.promise : new Response(null, { status: 204 }),
    );
    let refresh!: Promise<AuthAccount | null>;
    await act(async () => {
      refresh = env.state().refresh();
      await env.state().logout();
    });
    assert.equal(env.hint(), 'signed-out');
    await act(async () => {
      response.resolve(signedIn());
      await refresh;
    });
    assert.equal(env.state().authenticated, false);
    assert.equal(env.hint(), 'signed-out');
    assert.equal(env.window.localStorage.getItem('mik-auth-navigation'), null);
  } finally {
    await env.close();
  }
});

test('cross-tab account changes revoke verified identity immediately and restore navigation from storage', async () => {
  const env = createSessionEnvironment();
  env.mockFetch(async () => signedIn());
  try {
    await env.mount();
    const response = deferredResponse();
    env.mockFetch(async () => response.promise);
    env.window.localStorage.removeItem('mik-auth-navigation');
    await act(async () => {
      env.window.dispatchEvent(
        new env.window.StorageEvent('storage', { key: 'mik-account-change' }),
      );
    });
    assert.equal(env.hint(), 'signed-out');
    assert.equal(env.state().account, null);
    assert.equal(env.state().verified, false);
    assert.equal(env.state().isLoading, true);
    await act(async () => response.resolve(signedOut()));
    assert.equal(env.state().verified, true);
    assert.equal(env.hint(), 'signed-out');
  } finally {
    await env.close();
  }
});

test('new authentication wins over an earlier page-load verification', async () => {
  const env = createSessionEnvironment();
  const response = deferredResponse();
  env.mockFetch(async () => response.promise);
  try {
    await env.mount();
    await act(async () => env.state().acceptAuthentication(account));
    assert.equal(env.hint(), 'signed-in');
    await act(async () => response.resolve(signedOut()));
    assert.equal(env.state().authenticated, true);
    assert.equal(env.hint(), 'signed-in');
  } finally {
    await env.close();
  }
});

test('initial verification broadcasts an expired session once so existing tabs can clear identity', async () => {
  const env = createSessionEnvironment();
  env.mockFetch(async () => signedOut());
  try {
    rememberAuthNavigation(true);
    env.restoreHint();
    await env.mount();
    assert.equal(env.hint(), 'signed-out');
    assert.equal(env.state().authenticated, false);
    assert.ok(env.window.localStorage.getItem('mik-account-change'));

    // A receiver re-verifies without sending the same account change back to every tab.
    env.window.localStorage.setItem('mik-account-change', 'other-tab-change');
    await act(async () => {
      env.window.dispatchEvent(
        new env.window.StorageEvent('storage', { key: 'mik-account-change' }),
      );
    });
    assert.equal(env.window.localStorage.getItem('mik-account-change'), 'other-tab-change');
    assert.equal(env.state().authenticated, false);
  } finally {
    await env.close();
  }
});

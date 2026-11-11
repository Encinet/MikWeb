import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { NextIntlClientProvider } from 'next-intl';
import { act } from 'react';
import type { AuthState } from '@/modules/auth/model/auth-state-context';
import { AuthStateContext } from '@/modules/auth/model/auth-state-context';
import { AccountLayout } from '@/modules/auth/ui/account-layout';
import messages from '../../messages/en.json';
import { OWNER } from '../chat/fixtures';
import { createBrowserEnvironment } from '../support/browser-environment';

test('account access distinguishes failed verification from sign-out and preserves content while refreshing', async () => {
  const env = createBrowserEnvironment();
  let retries = 0;
  const router = {
    bfcacheId: 'account-test',
    back() {},
    forward() {},
    refresh() {},
    hmrRefresh() {},
    push() {},
    replace() {},
    prefetch() {},
  };
  const initial: AuthState = {
    account: null,
    authenticated: false,
    verified: false,
    isLoading: true,
    refresh: async () => {
      retries++;
      return null;
    },
    acceptAuthentication() {},
    async logout() {},
  };
  const render = (changes: Partial<AuthState>) =>
    act(async () =>
      env.root.render(
        <AppRouterContext value={router}>
          <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <AuthStateContext value={{ ...initial, ...changes }}>
              <AccountLayout>
                <div data-private-account>Account details</div>
              </AccountLayout>
            </AuthStateContext>
          </NextIntlClientProvider>
        </AppRouterContext>,
      ),
    );
  try {
    await render({});
    assert.ok(env.container.querySelector('[role="status"]'));
    assert.equal(env.container.querySelector('[data-private-account]'), null);

    await render({ isLoading: false });
    assert.ok(env.container.querySelector('[role="alert"]'));
    assert.equal(env.container.textContent?.includes('Not signed in'), false);
    assert.equal(env.container.querySelector('a[href="/en/login"]'), null);
    const retry = env.container.querySelector<HTMLButtonElement>('.account-empty-state button');
    assert.ok(retry);
    await act(async () => retry.click());
    assert.equal(retries, 1);

    await render({
      verified: true,
      authenticated: true,
      isLoading: true,
      account: {
        playerUuid: OWNER,
        currentName: 'Player',
        role: 'member',
        updatedAt: '2026-11-12T00:00:00.000Z',
        passkeyCount: 1,
      },
    });
    assert.ok(env.container.querySelector('[data-private-account]'));
    assert.equal(
      env.container.querySelector('.account-workspace__inner')?.getAttribute('aria-busy'),
      'true',
    );

    await render({ verified: true, isLoading: false });
    assert.ok(env.container.textContent?.includes('Not signed in'));
    assert.ok(env.container.querySelector('a[href="/en/login"]'));
    assert.equal(env.container.querySelector('[data-private-account]'), null);
  } finally {
    await env.close();
  }
});

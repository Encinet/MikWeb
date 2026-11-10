import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act } from 'react';
import { AuthProvider } from '@/modules/auth/model/auth-provider';
import type { AuthAccount, AuthSession } from '@/modules/auth/model/auth-types';
import {
  isAccountSecurityResponse,
  isAuthMeResponse,
  isMemberRole,
  isStaffRole,
} from '@/modules/auth/model/auth-types';
import { useAuth } from '@/modules/auth/model/use-auth';
import { OWNER } from '../chat/fixtures';
import { createBrowserEnvironment } from '../support/browser-environment';

const account: AuthAccount = {
  playerUuid: OWNER,
  currentName: 'Newcomer',
  role: 'default',
  updatedAt: '2026-11-03T00:00:00.000Z',
  passkeyCount: 0,
};

function AuthStateProbe() {
  const state = useAuth();
  return (
    <output data-authenticated={state.authenticated} data-verified={state.verified}>
      {state.account?.role}
    </output>
  );
}

test('all player roles can verify a website account while member and staff grants stay distinct', () => {
  for (const role of ['default', 'member', 'moderator', 'custodian']) {
    assert.ok(isAuthMeResponse({ authenticated: true, account: { ...account, role } }));
  }
  for (const role of ['', 'admin', null, {}, true]) {
    assert.equal(isAuthMeResponse({ authenticated: true, account: { ...account, role } }), false);
  }
  assert.equal(isMemberRole('default'), false);
  assert.equal(isStaffRole('default'), false);
  assert.equal(isMemberRole('member'), true);
  assert.equal(isStaffRole('member'), false);
  assert.equal(isStaffRole('moderator'), true);
  assert.equal(isStaffRole('custodian'), true);
});

test('newcomers can load their account security response', () => {
  const session: AuthSession = {
    id: 'session',
    current: true,
    issuedAt: account.updatedAt,
    lastSeenAt: account.updatedAt,
    idleExpiresAt: '2026-12-03T00:00:00.000Z',
    absoluteExpiresAt: '2027-02-03T00:00:00.000Z',
    authMethod: 'minecraft-challenge',
  };
  assert.ok(isAccountSecurityResponse({ account, session, sessions: [session], passkeys: [] }));
});

test('session refresh accepts default accounts and keeps the authenticated navigation state', async () => {
  const environment = createBrowserEnvironment();
  const previousFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = Object.assign(async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(input, '/api/auth/me');
    assert.equal(init?.method, 'POST');
    requests++;
    return Response.json({ authenticated: true, account });
  }, previousFetch);
  try {
    await act(async () => {
      environment.root.render(
        <AuthProvider>
          <AuthStateProbe />
        </AuthProvider>,
      );
    });
    const output = environment.container.querySelector('output');
    assert.equal(output?.textContent, 'default');
    assert.equal(output?.dataset.authenticated, 'true');
    assert.equal(output?.dataset.verified, 'true');
    assert.equal(requests, 1);
  } finally {
    await environment.close();
    globalThis.fetch = previousFetch;
  }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act } from 'react';
import type { AuthState } from '@/modules/auth/model/auth-state-context';
import { AuthStateContext } from '@/modules/auth/model/auth-state-context';
import type { AuthAccount } from '@/modules/auth/model/auth-types';
import { useWikiStaffContent } from '@/modules/wiki/model/use-wiki-staff-content';
import type { WikiContentBundle } from '@/modules/wiki/model/wiki-content-types';
import { createWikiContentBundle } from '@/modules/wiki/server/create-wiki-content-bundle';
import { loadWikiSectionDocuments } from '@/modules/wiki/server/load-wiki-documents';
import { createBrowserEnvironment } from '../support/browser-environment';

const account: AuthAccount = {
  playerUuid: 'first-staff',
  currentName: 'Staff',
  role: 'moderator',
  updatedAt: '2026-11-09T00:00:00Z',
  passkeyCount: 1,
};

function authState(current: AuthAccount | null, verified = true): AuthState {
  return {
    account: current,
    authenticated: current !== null,
    verified,
    isLoading: !verified,
    refresh: async () => current,
    acceptAuthentication: () => undefined,
    logout: async () => undefined,
  };
}

function Probe() {
  const staff = useWikiStaffContent('zh-CN');
  return (
    <output>{staff.bundle ? 'private-content' : staff.loading ? 'loading' : 'public-only'}</output>
  );
}

test('private content requires verified staff and clears on logout, demotion, and account changes', async () => {
  const environment = createBrowserEnvironment();
  const previousFetch = globalThis.fetch;
  let resolvePending: ((value: Response) => void) | undefined;
  let requests = 0;
  const bundle = {
    sections: [],
    sectionGroups: [],
    content: {},
    compiled: {},
    outlines: {},
    searchIndex: [],
  } satisfies WikiContentBundle;
  globalThis.fetch = Object.assign(async () => {
    requests++;
    return new Promise<Response>((resolve) => {
      resolvePending = resolve;
    });
  }, previousFetch);
  const render = async (state: AuthState) =>
    act(async () => {
      environment.root.render(
        <AuthStateContext.Provider value={state}>
          <Probe />
        </AuthStateContext.Provider>,
      );
    });
  try {
    await render(authState(null));
    await render(authState({ ...account, role: 'member' }));
    await render(authState(account, false));
    assert.equal(requests, 0);
    await render(authState(account));
    assert.equal(requests, 1);
    await act(async () => {
      resolvePending?.(Response.json(bundle));
    });
    assert.equal(environment.container.textContent, 'private-content');
    // Routine session refreshes keep the verified owner and do not reload private content.
    await render({ ...authState(account), isLoading: true });
    assert.equal(environment.container.textContent, 'private-content');
    await render(authState(account));
    assert.equal(requests, 1);
    assert.equal(environment.container.textContent, 'private-content');
    await render(authState({ ...account, role: 'member' }));
    assert.equal(environment.container.textContent, 'public-only');
    await render(authState(account));
    const resolveOldAccount = resolvePending;
    await render(authState({ ...account, playerUuid: 'second-staff' }));
    await act(async () => {
      resolveOldAccount?.(Response.json(bundle));
    });
    assert.equal(environment.container.textContent, 'loading');
    await act(async () => {
      resolvePending?.(Response.json(bundle));
    });
    assert.equal(environment.container.textContent, 'private-content');
    await render(authState(null));
    assert.equal(environment.container.textContent, 'public-only');
  } finally {
    await environment.close();
    globalThis.fetch = previousFetch;
  }
});

test('public content bundles compile without staff strings after an authenticated load', async () => {
  await createWikiContentBundle('zh-CN', await loadWikiSectionDocuments('zh-CN', 'staff'));
  const publicBundle = await createWikiContentBundle(
    'zh-CN',
    await loadWikiSectionDocuments('zh-CN'),
  );
  assert.equal(publicBundle.compiled.moderator, undefined);
  assert.equal(JSON.stringify(publicBundle).includes('/tpforce'), false);
});

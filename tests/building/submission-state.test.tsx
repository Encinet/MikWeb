import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextIntlClientProvider } from 'next-intl';
import { act } from 'react';
import { AuthStateContext } from '@/modules/auth/model/auth-state-context';
import type { AuthAccount } from '@/modules/auth/model/auth-types';
import type { BuildingSubmission } from '@/modules/building-submission/model/building-submission-types';
import { useBuildingSubmissionForm } from '@/modules/building-submission/model/use-building-submission-form';
import { clearFetchValidatedJsonBrowserCache } from '@/shared/api/fetch-validated-json';
import messages from '../../messages/en.json';
import { createBrowserEnvironment } from '../support/browser-environment';

const account: AuthAccount = {
  playerUuid: '00000000-0000-4000-8000-000000000001',
  currentName: 'Builder',
  role: 'member',
  updatedAt: '2026-11-10',
  passkeyCount: 0,
};
const submission: BuildingSubmission = {
  id: 'a'.repeat(32),
  status: 'pending',
  submitterUuid: account.playerUuid,
  submitterName: account.currentName,
  submitterRole: account.role,
  payload: {
    name: { en: 'Building' },
    description: { en: 'Description' },
    coordinates: { world: 'world', x: 0, y: 64, z: 0 },
    builders: [],
    buildType: 'original',
    images: [],
    buildDate: '2026-11-10',
  },
  images: [],
  createdAt: '2026-11-10',
  updatedAt: '2026-11-10',
};
function Consumer({
  onState,
}: {
  onState: (state: ReturnType<typeof useBuildingSubmissionForm>) => void;
}) {
  onState(useBuildingSubmissionForm());
  return null;
}

for (const role of ['member', 'moderator', 'custodian'] as const) {
  test(`${role} submission only allows staff to remove themselves`, async () => {
    const environment = createBrowserEnvironment();
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async () => Response.json({ submissions: [] })) as typeof fetch;
    const currentAccount = { ...account, role };
    let state: ReturnType<typeof useBuildingSubmissionForm> | undefined;
    const current = () => {
      assert.ok(state);
      return state;
    };
    clearFetchValidatedJsonBrowserCache();
    try {
      await act(async () =>
        environment.root.render(
          <NextIntlClientProvider locale="en" messages={messages} timeZone="Asia/Singapore">
            <AuthStateContext
              value={{
                account: currentAccount,
                authenticated: true,
                verified: true,
                isLoading: false,
                refresh: async () => currentAccount,
                acceptAuthentication: () => undefined,
                logout: async () => undefined,
              }}
            >
              <Consumer onState={(value) => (state = value)} />
            </AuthStateContext>
          </NextIntlClientProvider>,
        ),
      );
      assert.equal(current().builders[0].uuid, account.playerUuid);
      assert.equal(current().builders[0].locked, role === 'member');
      await act(async () => {
        current().setBuilders((builders) => [
          ...builders,
          { uuid: '00000000-0000-4000-8000-000000000002', name: 'Other', weight: 1 },
        ]);
      });
      await act(async () => current().clearOptionalBuilders());
      assert.deepEqual(
        current().builders.map((builder) => builder.uuid),
        [account.playerUuid],
      );
      await act(async () => {
        current().setBuilders((builders) => builders.filter((builder) => builder.locked));
      });
      assert.equal(current().builders.length, role === 'member' ? 1 : 0);
      await act(async () => current().resetForm(currentAccount));
      assert.equal(current().builders[0].uuid, account.playerUuid);
      assert.equal(current().builders[0].locked, role === 'member');
    } finally {
      globalThis.fetch = previousFetch;
      clearFetchValidatedJsonBrowserCache();
      await environment.close();
    }
  });
}

test('submission history keeps the newest refresh when older same-account requests finish later', async () => {
  const environment = createBrowserEnvironment();
  const previousFetch = globalThis.fetch;
  const requests: ((response: Response) => void)[] = [];
  globalThis.fetch = (() =>
    new Promise<Response>((resolve) => requests.push(resolve))) as typeof fetch;
  let state: ReturnType<typeof useBuildingSubmissionForm> | undefined;
  const current = () => {
    assert.ok(state);
    return state;
  };
  clearFetchValidatedJsonBrowserCache();
  try {
    await act(async () =>
      environment.root.render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Asia/Singapore">
          <AuthStateContext
            value={{
              account,
              authenticated: true,
              verified: true,
              isLoading: false,
              refresh: async () => account,
              acceptAuthentication: () => undefined,
              logout: async () => undefined,
            }}
          >
            <Consumer
              onState={(value) => {
                state = value;
              }}
            />
          </AuthStateContext>
        </NextIntlClientProvider>,
      ),
    );
    assert.equal(requests.length, 1);
    let refresh: Promise<void> | undefined;
    await act(async () => {
      refresh = current().loadSubmissions({ force: true });
    });
    await act(async () => {
      requests[1](Response.json({ submissions: [submission] }));
      await refresh;
    });
    assert.equal(current().submissions.length, 1);
    await act(async () => {
      requests[0](Response.json({ submissions: [] }));
    });
    assert.equal(
      current().submissions.length,
      1,
      'late initial data cannot replace the refreshed history',
    );
    assert.equal(current().isLoadingSubmissions, false);
  } finally {
    globalThis.fetch = previousFetch;
    clearFetchValidatedJsonBrowserCache();
    await environment.close();
  }
});

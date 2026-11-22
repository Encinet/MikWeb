import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act } from 'react';
import type { PlayerStatusResponse } from '@/modules/player/lib/player-status-api';
import { PlayerStatusProvider } from '@/modules/player/model/player-status-provider';
import { usePlayerStatus } from '@/modules/player/model/use-player-status';
import { clearFetchValidatedJsonBrowserCache } from '@/shared/api/fetch-validated-json';
import { createBrowserEnvironment } from '../support/browser-environment';

function PlayerConsumer({
  observe,
}: {
  observe: (status: ReturnType<typeof usePlayerStatus>) => void;
}) {
  observe(usePlayerStatus());
  return null;
}

function player(uuid: string, name: string, joinedAt: string) {
  return { uuid, name, joined_at: joinedAt };
}

test('identical polls keep the player context stable and changes to names, join times and order reach readers', async () => {
  const env = createBrowserEnvironment();
  const previousFetch = globalThis.fetch;
  const snapshots: ReturnType<typeof usePlayerStatus>[] = [];
  const first = player('one', 'Alex', 'first');
  const second = player('two', 'Steve', 'second');
  let response: PlayerStatusResponse = { online: 2, players: [first, second] };
  let timer: (() => void) | undefined;
  Object.defineProperties(env.window, {
    setTimeout: {
      value: (callback: () => void) => {
        timer = callback;
        return 1;
      },
    },
    clearTimeout: {
      value: () => {
        timer = undefined;
      },
    },
  });
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  globalThis.fetch = Object.assign(async () => Response.json(response), previousFetch);
  const poll = async () => {
    clearFetchValidatedJsonBrowserCache();
    assert.ok(timer);
    await act(async () => timer?.());
  };
  try {
    await act(async () =>
      env.root.render(
        <PlayerStatusProvider>
          <PlayerConsumer observe={(status) => snapshots.push(status)} />
        </PlayerStatusProvider>,
      ),
    );
    await poll();
    const renders = snapshots.length;
    await poll();
    assert.equal(snapshots.length, renders);
    response = { online: 2, players: [{ ...first, name: 'Renamed' }, second] };
    await poll();
    assert.equal(snapshots.at(-1)?.players[0].name, 'Renamed');
    response = { online: 2, players: [player('one', 'Renamed', 'later'), second] };
    await poll();
    assert.equal(snapshots.at(-1)?.players[0].joinedAt, 'later');
    response = { online: 2, players: [...response.players].reverse() };
    await poll();
    assert.equal(snapshots.at(-1)?.players[0].uuid, 'two');
    response = { online: -1, players: [] };
    await poll();
    assert.equal(snapshots.at(-1)?.isOnline, false);
    const offlineRenders = snapshots.length;
    await poll();
    assert.equal(snapshots.length, offlineRenders);
  } finally {
    await env.close();
    globalThis.fetch = previousFetch;
    clearFetchValidatedJsonBrowserCache();
  }
});

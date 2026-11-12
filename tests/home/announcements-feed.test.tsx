import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Activity, act } from 'react';
import type { AnnouncementItem } from '@/modules/announcement/model/announcement-types';
import { useAnnouncementsFeed } from '@/modules/announcement/model/use-announcements-feed';
import { dataApiUrl } from '@/shared/api/data-api-url';
import {
  clearFetchValidatedJsonBrowserCache,
  writeFetchValidatedJsonBrowserCache,
} from '@/shared/api/fetch-validated-json';
import { createBrowserEnvironment } from '../support/browser-environment';

const older = { timestamp: '2026-11-11T00:00:00Z', content: 'Older announcement' };
const latest = { timestamp: '2026-11-12T00:00:00Z', content: 'Latest announcement' };

function FeedConsumer({
  onState,
}: {
  onState: (state: ReturnType<typeof useAnnouncementsFeed>) => void;
}) {
  onState(useAnnouncementsFeed({ fallbackErrorMessage: 'Unavailable' }));
  return null;
}

function createFeedEnvironment() {
  const env = createBrowserEnvironment();
  const previousFetch = globalThis.fetch;
  const previousNow = Date.now;
  let now = previousNow();
  let visibility = 'visible';
  let online = true;
  let nextId = 0;
  let response: () => Promise<Response> = async () => Response.json([older]);
  const requests: { url: string; cache: RequestCache | undefined }[] = [];
  const timers = new Map<number, { callback: () => void; at: number }>();
  let state: ReturnType<typeof useAnnouncementsFeed> | undefined;

  Object.defineProperties(env.window, {
    setTimeout: {
      configurable: true,
      value: (callback: () => void, delay: number) => {
        const id = ++nextId;
        timers.set(id, { callback, at: now + delay });
        return id;
      },
    },
    clearTimeout: { configurable: true, value: (id: number) => timers.delete(id) },
  });
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibility,
  });
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online });
  Date.now = () => now;
  globalThis.fetch = Object.assign(async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: String(input), cache: init?.cache });
    return response();
  }, previousFetch);

  return {
    ...env,
    requests,
    timers,
    current() {
      assert.ok(state);
      return state;
    },
    respond(data: AnnouncementItem[] | (() => Promise<Response>)) {
      response = typeof data === 'function' ? data : async () => Response.json(data);
    },
    render: (mode: 'visible' | 'hidden' = 'visible') =>
      act(async () => {
        env.root.render(
          <Activity mode={mode}>
            <FeedConsumer
              onState={(value) => {
                state = value;
              }}
            />
          </Activity>,
        );
      }),
    async advance(milliseconds: number) {
      now += milliseconds;
      const ready = [...timers].filter(([, timer]) => timer.at <= now);
      await act(async () => {
        for (const [id, timer] of ready) {
          if (timers.delete(id)) timer.callback();
        }
      });
    },
    async visibility(value: 'visible' | 'hidden') {
      visibility = value;
      await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    },
    async online(value: boolean) {
      online = value;
      await act(async () =>
        env.window.dispatchEvent(new env.window.Event(value ? 'online' : 'offline')),
      );
    },
    async close() {
      await env.close();
      Date.now = previousNow;
      globalThis.fetch = previousFetch;
      clearFetchValidatedJsonBrowserCache();
    },
  };
}

test('announcement polling bypasses old browser snapshots and updates the mounted feed', async () => {
  const env = createFeedEnvironment();
  writeFetchValidatedJsonBrowserCache({
    key: dataApiUrl('/announcements'),
    data: [{ ...older, content: 'Cached announcement' }],
    ttlMs: 300_000,
  });
  try {
    await env.render();
    assert.deepEqual(env.current().announcements, [older]);
    assert.equal(env.current().isLoading, false);
    env.respond([older, latest]);
    await env.advance(30_000);
    assert.deepEqual(env.current().announcements, [latest, older]);
    assert.equal(env.requests.length, 2);
    assert.ok(
      env.requests.every(
        (request) => request.url === dataApiUrl('/announcements') && request.cache === 'no-store',
      ),
    );
  } finally {
    await env.close();
  }
});

test('hidden and offline feeds pause; returning, restoring and reconnecting refresh automatically', async () => {
  const env = createFeedEnvironment();
  try {
    await env.render();
    await env.visibility('hidden');
    await env.advance(60_000);
    assert.equal(env.requests.length, 1);
    assert.equal(env.timers.size, 0);
    env.respond([latest]);
    await env.visibility('visible');
    await act(async () => {
      env.window.dispatchEvent(new env.window.Event('focus'));
      env.window.dispatchEvent(new env.window.Event('pageshow'));
    });
    assert.equal(env.requests.length, 2, 'paired resume events share one refresh');
    assert.deepEqual(env.current().announcements, [latest]);
    await env.online(false);
    await env.advance(60_000);
    assert.equal(env.requests.length, 2);
    await env.online(true);
    assert.equal(env.requests.length, 3);
    await env.advance(5000);
    await act(async () => env.window.dispatchEvent(new env.window.Event('pageshow')));
    assert.equal(env.requests.length, 4);
    await env.advance(5000);
    await act(async () => env.window.dispatchEvent(new env.window.Event('focus')));
    assert.equal(env.requests.length, 5);
  } finally {
    await env.close();
  }
});

test('failed refreshes retain readable announcements and the next poll recovers', async () => {
  const env = createFeedEnvironment();
  try {
    await env.render();
    env.respond(async () => new Response('{}', { status: 503 }));
    await env.advance(30_000);
    assert.deepEqual(env.current().announcements, [older]);
    assert.equal(env.current().errorMessage, null);
    assert.equal(env.current().isLoading, false);
    env.respond([latest]);
    await env.advance(30_000);
    assert.deepEqual(env.current().announcements, [latest]);
    assert.equal(env.requests.length, 3);
  } finally {
    await env.close();
  }
});

test('an initial failure retries automatically and a successful empty feed clears old announcements', async () => {
  const env = createFeedEnvironment();
  env.respond(async () => new Response('{}', { status: 503 }));
  try {
    await env.render();
    assert.equal(env.current().errorMessage, 'Unavailable');
    assert.equal(env.current().isLoading, false);
    env.respond([older]);
    await env.advance(30_000);
    assert.deepEqual(env.current().announcements, [older]);
    assert.equal(env.current().errorMessage, null);
    env.respond([]);
    await env.advance(30_000);
    assert.deepEqual(env.current().announcements, []);
    assert.equal(env.current().errorMessage, null);
  } finally {
    await env.close();
  }
});

test('opening the feed shares pending work and late responses cannot overwrite a restored page', async () => {
  const env = createFeedEnvironment();
  let release: ((response: Response) => void) | undefined;
  try {
    await env.render();
    env.respond(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    await act(async () => env.current().refresh());
    await act(async () => env.current().refresh());
    await env.advance(60_000);
    assert.equal(env.requests.length, 2, 'refreshes never overlap');
    assert.deepEqual(env.current().announcements, [older]);
    assert.equal(env.current().isLoading, false);
    await env.render('hidden');
    assert.equal(env.timers.size, 0);
    await env.advance(60_000);
    await act(async () => {
      env.window.dispatchEvent(new env.window.Event('focus'));
      env.current().refresh();
    });
    assert.equal(env.requests.length, 2, 'inactive pages have no polling or resume listeners');
    env.respond([latest]);
    await env.render('visible');
    assert.equal(env.requests.length, 3);
    await act(async () => {
      assert.ok(release);
      release(Response.json([older]));
    });
    assert.deepEqual(env.current().announcements, [latest]);
    assert.equal(env.timers.size, 1);
  } finally {
    await env.close();
  }
});

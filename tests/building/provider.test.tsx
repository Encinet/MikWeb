import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Activity, act } from 'react';
import type { BuildingCatalogSnapshot } from '@/modules/building/model/building-types';
import { BuildingsProvider } from '@/modules/building/model/buildings-provider';
import { useBuildings } from '@/modules/building/model/use-buildings';
import { clearFetchValidatedJsonBrowserCache } from '@/shared/api/fetch-validated-json';
import { createBrowserEnvironment } from '../support/browser-environment';

function Consumer({ onState }: { onState: (state: ReturnType<typeof useBuildings>) => void }) {
  onState(useBuildings());
  return null;
}

test('leaving during a refresh clears its loading state and permits a new refresh on return', async () => {
  const environment = createBrowserEnvironment();
  const previousFetch = globalThis.fetch;
  const requests: ((response: Response) => void)[] = [];
  const snapshot = { buildings: [], error: null, updatedAt: null };
  let state: ReturnType<typeof useBuildings> | undefined;
  const current = () => {
    assert.ok(state);
    return state;
  };
  const render = (mode: 'visible' | 'hidden') =>
    act(async () =>
      environment.root.render(
        <Activity mode={mode}>
          <BuildingsProvider initialSnapshot={snapshot}>
            <Consumer
              onState={(value) => {
                state = value;
              }}
            />
          </BuildingsProvider>
        </Activity>,
      ),
    );
  globalThis.fetch = (() =>
    new Promise<Response>((resolve) => requests.push(resolve))) as typeof fetch;
  clearFetchValidatedJsonBrowserCache();
  try {
    await render('visible');
    let first: Promise<void> | undefined;
    await act(async () => {
      first = current().fetchBuildings({ force: true });
    });
    assert.equal(current().isLoading, true);
    await render('hidden');
    await act(async () => {
      requests[0](new Response(null, { status: 503 }));
      await first;
    });
    await render('visible');
    assert.equal(current().isLoading, false);
    let second: Promise<void> | undefined;
    await act(async () => {
      second = current().fetchBuildings();
    });
    assert.equal(requests.length, 2, 'the old promise must not block another refresh');
    await act(async () => {
      requests[1](Response.json([]));
      await second;
    });
    assert.equal(current().isLoading, false);
    assert.equal(current().error, null);
    assert.notEqual(current().lastUpdatedAt, null);
  } finally {
    globalThis.fetch = previousFetch;
    clearFetchValidatedJsonBrowserCache();
    await environment.close();
  }
});

test('server-seeded catalogs need no browser request, and newer refreshes win over stale responses', async () => {
  const environment = createBrowserEnvironment();
  const previousFetch = globalThis.fetch;
  const requests: ((response: Response) => void)[] = [];
  let state: ReturnType<typeof useBuildings> | undefined;
  const current = () => {
    assert.ok(state);
    return state;
  };
  globalThis.fetch = (() =>
    new Promise<Response>((resolve) => requests.push(resolve))) as typeof fetch;
  clearFetchValidatedJsonBrowserCache();
  try {
    await act(async () =>
      environment.root.render(
        <BuildingsProvider initialSnapshot={{ buildings: [], error: null, updatedAt: Date.now() }}>
          <Consumer
            onState={(value) => {
              state = value;
            }}
          />
        </BuildingsProvider>,
      ),
    );
    await act(async () => current().fetchBuildings());
    assert.equal(requests.length, 0);
    assert.equal(current().lastUpdatedAt !== null, true);
    let first: Promise<void> | undefined;
    let second: Promise<void> | undefined;
    await act(async () => {
      first = current().fetchBuildings({ force: true });
    });
    await act(async () => {
      second = current().fetchBuildings({ force: true });
    });
    assert.equal(requests.length, 2);
    await act(async () => {
      requests[1](Response.json([]));
      await second;
    });
    assert.equal(current().error, null);
    assert.equal(current().isLoading, false);
    await act(async () => {
      requests[0](new Response(null, { status: 503 }));
      await first;
    });
    assert.equal(current().error, null, 'older failure cannot replace the successful refresh');
  } finally {
    globalThis.fetch = previousFetch;
    clearFetchValidatedJsonBrowserCache();
    await environment.close();
  }
});

test('a fresh server snapshot replaces mounted data and invalidates an older browser request', async () => {
  const environment = createBrowserEnvironment();
  const previousFetch = globalThis.fetch;
  let resolveRequest: ((response: Response) => void) | undefined;
  let state: ReturnType<typeof useBuildings> | undefined;
  const current = () => {
    assert.ok(state);
    return state;
  };
  const render = (snapshot: BuildingCatalogSnapshot) =>
    act(async () =>
      environment.root.render(
        <BuildingsProvider initialSnapshot={snapshot}>
          <Consumer
            onState={(value) => {
              state = value;
            }}
          />
        </BuildingsProvider>,
      ),
    );
  globalThis.fetch = (() =>
    new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    })) as typeof fetch;
  clearFetchValidatedJsonBrowserCache();
  try {
    const initial = { buildings: [], error: null, updatedAt: Date.now() - 1000 };
    await render(initial);
    let request: Promise<void> | undefined;
    await act(async () => {
      request = current().fetchBuildings({ force: true });
    });
    assert.equal(current().isLoading, true);
    const refreshed: BuildingCatalogSnapshot = {
      buildings: [
        {
          id: 'a'.repeat(32),
          name: { en: 'New building' },
          description: { en: 'Refreshed from the server' },
          coordinates: { world: 'world', x: 0, y: 64, z: 0 },
          builders: [],
          buildType: 'original',
          images: [],
          buildDate: '2026-11-10',
        },
      ],
      error: null,
      updatedAt: Date.now(),
    };
    await render(refreshed);
    assert.deepEqual(current().buildings, refreshed.buildings);
    assert.equal(current().lastUpdatedAt, refreshed.updatedAt);
    assert.equal(current().isLoading, false);
    await act(async () => {
      assert.ok(resolveRequest);
      resolveRequest(new Response(null, { status: 503 }));
      await request;
    });
    assert.equal(current().error, null, 'a superseded request cannot overwrite server data');
    assert.deepEqual(current().buildings, refreshed.buildings);
    await render({ ...initial });
    assert.equal(
      current().lastUpdatedAt,
      refreshed.updatedAt,
      'older server payloads cannot roll data back',
    );
    await render({ buildings: [], error: 'unavailable', updatedAt: null });
    assert.equal(
      current().lastUpdatedAt,
      refreshed.updatedAt,
      'a failed server refresh keeps usable data',
    );
    assert.deepEqual(current().buildings, refreshed.buildings);
  } finally {
    globalThis.fetch = previousFetch;
    clearFetchValidatedJsonBrowserCache();
    await environment.close();
  }
});

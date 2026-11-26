import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextIntlClientProvider } from 'next-intl';
import { Activity, act, type ComponentProps } from 'react';
import { isLocalizedBuildingCatalogResponse } from '@/modules/building/model/building-api';
import { BuildingsProvider } from '@/modules/building/model/buildings-provider';
import { useBuildings } from '@/modules/building/model/use-buildings';
import { dataApiUrl } from '@/shared/api/data-api-url';
import { clearFetchValidatedJsonBrowserCache } from '@/shared/api/fetch-validated-json';
import type { AppLocale } from '@/shared/i18n/routing';
import { createBrowserEnvironment } from '../support/browser-environment';

function Consumer({ onState }: { onState: (state: ReturnType<typeof useBuildings>) => void }) {
  onState(useBuildings());
  return null;
}

function TestBuildingsProvider({
  locale = 'en',
  ...props
}: ComponentProps<typeof BuildingsProvider> & { locale?: AppLocale }) {
  return (
    <NextIntlClientProvider locale={locale} timeZone="UTC">
      <BuildingsProvider {...props} />
    </NextIntlClientProvider>
  );
}

const emptyCatalog = { imageBaseUrl: null, buildings: [] };
const imageBaseUrl = 'https://images.example/gallery';
const building = {
  id: 'a'.repeat(32),
  name: 'Building',
  description: 'Description',
  coordinates: { world: 'world', x: 0, y: 64, z: 0 },
  builders: [{ name: 'Builder', uuid: '00000000-0000-4000-8000-000000000001', weight: 1 }],
  buildType: 'original',
  images: [
    { webp: 'b'.repeat(64), jxl: 'd'.repeat(64), thumbnailWebp: 'f'.repeat(64), jxlPreviewBytes: 0 },
    { webp: 'c'.repeat(64), jxl: 'e'.repeat(64), thumbnailWebp: 'a'.repeat(64), jxlPreviewBytes: 100 },
  ],
  buildDate: '2026-11-10',
  tags: ['Tower'],
  source: { notes: 'Source notes' },
};

test('the archive reuses its server catalog and can retry a client load', async () => {
  const serverCatalog = { imageBaseUrl, buildings: [building] };
  assert.ok(isLocalizedBuildingCatalogResponse(serverCatalog));
  const env = createBrowserEnvironment();
  const previousFetch = globalThis.fetch;
  const requests: [string, RequestCache | undefined][] = [];
  let latest: ReturnType<typeof useBuildings> | undefined;
  const current = () => {
    assert.ok(latest);
    return latest;
  };
  const mount = (initialCatalog?: ComponentProps<typeof BuildingsProvider>['initialCatalog']) =>
    act(async () => {
      env.root.render(
        <TestBuildingsProvider initialCatalog={initialCatalog}>
          <Consumer
            onState={(value) => {
              latest = value;
            }}
          />
        </TestBuildingsProvider>,
      );
    });
  clearFetchValidatedJsonBrowserCache();
  globalThis.fetch = Object.assign(async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push([String(input), init?.cache]);
    return requests.length === 1
      ? Response.json({}, { status: 503 })
      : Response.json(serverCatalog);
  }, previousFetch);
  try {
    await mount(serverCatalog);
    assert.equal(current().isLoading, false);
    assert.equal(current().buildings[0]?.id, building.id);
    assert.equal(requests.length, 0);
    await act(async () => env.root.render(null));

    await mount();
    const url = dataApiUrl('/buildings?locale=en');
    assert.deepEqual(requests, [[url, 'default']]);
    assert.equal(current().isLoading, false);
    assert.ok(current().error);
    await act(async () => current().fetchBuildings({ force: true }));
    assert.deepEqual(requests, [
      [url, 'default'],
      [url, 'reload'],
    ]);
    assert.equal(current().error, null);
    const prefix = `${imageBaseUrl}/buildings/${building.id}/`;
    const expectedImages = building.images.map(({ webp, jxl, thumbnailWebp, jxlPreviewBytes }) => ({
      webp: `${prefix}${webp}.webp`,
      jxl: `${prefix}${jxl}.jxl`,
      thumbnailWebp: `${prefix}${thumbnailWebp}.webp`,
      jxlPreviewBytes,
    }));
    assert.deepEqual(current().buildings[0].images, expectedImages);
    assert.equal(current().buildings[0].name, 'Building');
    assert.equal(current().buildings[0].description, 'Description');
    assert.deepEqual(current().buildings[0].tags, ['Tower']);
    assert.equal(current().buildings[0].source?.notes, 'Source notes');
    await act(async () => env.root.render(null));
    await mount();
    assert.equal(requests.length, 2);
    assert.deepEqual(current().buildings[0].images, expectedImages);
  } finally {
    await env.close();
    globalThis.fetch = previousFetch;
    clearFetchValidatedJsonBrowserCache();
  }
});

test('switching languages isolates pending requests and cached catalogs', async () => {
  const env = createBrowserEnvironment();
  const previousFetch = globalThis.fetch;
  const requests: string[] = [];
  const pending: ((response: Response) => void)[] = [];
  let state: ReturnType<typeof useBuildings> | undefined;
  const current = () => {
    assert.ok(state);
    return state;
  };
  const render = (locale: AppLocale) =>
    act(async () =>
      env.root.render(
        <TestBuildingsProvider locale={locale}>
          <Consumer onState={(value) => { state = value; }} />
        </TestBuildingsProvider>,
      ),
    );
  globalThis.fetch = Object.assign((input: RequestInfo | URL) => {
    requests.push(String(input));
    return new Promise<Response>((resolve) => pending.push(resolve));
  }, previousFetch);
  clearFetchValidatedJsonBrowserCache();
  try {
    await render('en');
    await render('zh-CN');
    assert.deepEqual(requests, [dataApiUrl('/buildings?locale=en'), dataApiUrl('/buildings?locale=zh-CN')]);
    await act(async () => pending[0](Response.json({ imageBaseUrl, buildings: [building] })));
    assert.equal(current().isLoading, true);
    assert.deepEqual(current().buildings, []);
    await act(async () =>
      pending[1](Response.json({ imageBaseUrl, buildings: [{ ...building, name: '建筑' }] })),
    );
    assert.equal(current().buildings[0].name, '建筑');
    await render('en');
    assert.equal(current().buildings[0].name, 'Building');
    await render('zh-CN');
    assert.equal(current().buildings[0].name, '建筑');
    assert.equal(requests.length, 2);
  } finally {
    await env.close();
    globalThis.fetch = previousFetch;
    clearFetchValidatedJsonBrowserCache();
  }
});

test('the archive can resume an interrupted catalog load when shown again', async () => {
  const environment = createBrowserEnvironment();
  const previousFetch = globalThis.fetch;
  const requests: ((response: Response) => void)[] = [];
  let state: ReturnType<typeof useBuildings> | undefined;
  const current = () => {
    assert.ok(state);
    return state;
  };
  const render = (mode: 'visible' | 'hidden') =>
    act(async () =>
      environment.root.render(
        <Activity mode={mode}>
          <TestBuildingsProvider>
            <Consumer
              onState={(value) => {
                state = value;
              }}
            />
          </TestBuildingsProvider>
        </Activity>,
      ),
    );
  globalThis.fetch = (() =>
    new Promise<Response>((resolve) => requests.push(resolve))) as typeof fetch;
  clearFetchValidatedJsonBrowserCache();
  try {
    await render('visible');
    assert.equal(requests.length, 1);
    assert.equal(current().isLoading, true);
    await render('hidden');
    await act(async () => requests[0](Response.json({}, { status: 503 })));
    await render('visible');
    assert.equal(requests.length, 2, 'the old promise must not block another load');
    assert.equal(current().isLoading, true);
    await act(async () => requests[1](Response.json(emptyCatalog)));
    assert.equal(current().isLoading, false);
    assert.equal(current().error, null);
    await act(async () => current().fetchBuildings());
    assert.equal(requests.length, 2);
  } finally {
    globalThis.fetch = previousFetch;
    clearFetchValidatedJsonBrowserCache();
    await environment.close();
  }
});

test('late responses from an older retry cannot overwrite a newer retry', async () => {
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
        <TestBuildingsProvider>
          <Consumer
            onState={(value) => {
              state = value;
            }}
          />
        </TestBuildingsProvider>,
      ),
    );
    assert.equal(requests.length, 1);
    await act(async () => requests[0](Response.json({}, { status: 503 })));
    assert.ok(current().error);
    let first: Promise<void> | undefined;
    let second: Promise<void> | undefined;
    await act(async () => {
      first = current().fetchBuildings({ force: true });
    });
    await act(async () => {
      second = current().fetchBuildings({ force: true });
    });
    assert.equal(requests.length, 3);
    await act(async () => {
      requests[2](Response.json(emptyCatalog));
      await second;
    });
    assert.equal(current().error, null);
    assert.equal(current().isLoading, false);
    await act(async () => {
      requests[1](new Response(null, { status: 503 }));
      await first;
    });
    assert.equal(current().error, null, 'older failure cannot replace the successful refresh');
  } finally {
    globalThis.fetch = previousFetch;
    clearFetchValidatedJsonBrowserCache();
    await environment.close();
  }
});

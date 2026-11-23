import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadSponsors } from '@/modules/sponsor/lib/sponsor-api';
import type { Sponsor, SponsorOrder } from '@/modules/sponsor/model/sponsor-types';
import { createSponsorWall } from '@/modules/sponsor/model/sponsor-wall-data';
import { clearFetchValidatedJsonBrowserCache } from '@/shared/api/fetch-validated-json';

import { createBrowserEnvironment } from '../support/browser-environment';

const latestOrder: SponsorOrder = {
  amount: '100.01',
  at: '2026-11-22T01:12:23.000Z',
  message: 'Good luck!',
};
const sponsors: Sponsor[] = [
  {
    uuid: '069a79f4-44e9-4726-a5be-fca4e82d3858',
    name: 'Zoe',
    totalAmount: '128.01',
    orders: [latestOrder, { amount: '28.00', at: '2024-02-29T11:35:00Z' }],
  },
  {
    uuid: '11111111-2222-4333-8444-555566667777',
    name: 'Amy',
    totalAmount: '0.00',
    orders: [{ amount: '0.00', at: '2023-12-31T21:15:30.000Z' }],
  },
];

const errorMessage = 'Sponsor list unavailable';

test('the sponsor wall sorts sponsors and public messages by most recent order', () => {
  const entries: Sponsor[] = [
    {
      ...sponsors[1],
      orders: [
        { ...sponsors[1].orders[0], message: 'Welcome back!' },
        { ...latestOrder, at: '2026-11-22T01:12:23.5Z', message: 'See you in game!' },
        { ...latestOrder, at: '2026-11-22T01:12:23.50005Z', message: 'Thanks!' },
        { ...latestOrder, at: '2026-11-22T01:12:23.5000Z', message: 'Hello!' },
      ],
    },
    {
      ...sponsors[1],
      uuid: '22222222-3333-4444-8555-666677778888',
      name: 'Lin',
      totalAmount: '200.00',
    },
    {
      ...sponsors[0],
      orders: [latestOrder, { amount: '0.00', at: '2026-11-23T00:00:00Z', message: ' \n ' }],
    },
  ];

  const original = structuredClone(entries);
  const wall = createSponsorWall(entries);
  assert.deepEqual(entries, original);
  assert.deepEqual(
    wall.map(({ latestOrderAt }) => latestOrderAt),
    ['2026-11-23T00:00:00Z', '2026-11-22T01:12:23.50005Z', sponsors[1].orders[0].at],
  );
  assert.deepEqual(
    wall.map(({ name, messages }) => [name, messages.map(({ at, text }) => [at, text])]),
    [
      ['Zoe', [['2026-11-22T01:12:23.000Z', 'Good luck!']]],
      [
        'Amy',
        [
          ['2026-11-22T01:12:23.50005Z', 'Thanks!'],
          ['2026-11-22T01:12:23.5Z', 'See you in game!'],
          ['2026-11-22T01:12:23.5000Z', 'Hello!'],
          ['2023-12-31T21:15:30.000Z', 'Welcome back!'],
        ],
      ],
      ['Lin', []],
    ],
  );
});

test('sponsors and orders retain API order and can use the last complete snapshot', async (t) => {
  const environment = createBrowserEnvironment();
  try {
    const request = t.mock.method(globalThis, 'fetch', async () =>
      Response.json(sponsors, { headers: { 'X-Sponsor-Data': 'stale' } }),
    );
    const snapshot = { status: 'success', data: sponsors };
    assert.deepEqual(await loadSponsors(errorMessage, false), snapshot);
    assert.deepEqual(await loadSponsors(errorMessage, false), snapshot);
    assert.equal(request.mock.callCount(), 1);

    request.mock.mockImplementation(async () =>
      Response.json([], { headers: { 'X-Sponsor-Data': 'complete' } }),
    );
    assert.deepEqual(await loadSponsors(errorMessage, true), {
      status: 'success',
      data: [],
    });
    assert.equal(request.mock.callCount(), 2);
  } finally {
    clearFetchValidatedJsonBrowserCache();
    await environment.close();
  }
});

test('partial results are unavailable even with valid rows or an empty list and are not cached', async (t) => {
  const environment = createBrowserEnvironment();
  try {
    const request = t.mock.method(globalThis, 'fetch', async () =>
      Response.json(sponsors, { headers: { 'X-Sponsor-Data': 'partial' } }),
    );
    const unavailable = { status: 'invalid-data', error: errorMessage };
    assert.deepEqual(await loadSponsors(errorMessage, false), unavailable);

    request.mock.mockImplementation(async () =>
      Response.json([{ ...sponsors[0], totalAmount: undefined }], {
        headers: { 'X-Sponsor-Data': 'partial' },
      }),
    );
    assert.deepEqual(await loadSponsors(errorMessage, false), unavailable);

    request.mock.mockImplementation(async () =>
      Response.json([], { headers: { 'X-Sponsor-Data': 'partial' } }),
    );
    assert.deepEqual(await loadSponsors(errorMessage, false), unavailable);

    request.mock.mockImplementation(async () =>
      Response.json(sponsors, { headers: { 'X-Sponsor-Data': 'complete' } }),
    );
    assert.deepEqual(await loadSponsors(errorMessage, false), {
      status: 'success',
      data: sponsors,
    });
    assert.equal(request.mock.callCount(), 4);
  } finally {
    clearFetchValidatedJsonBrowserCache();
    await environment.close();
  }
});

test('sponsors reject invalid records and accept snapshots without the freshness header', async (t) => {
  const valid = sponsors[0];
  const request = t.mock.method(globalThis, 'fetch', async () => Response.json([valid]));
  assert.deepEqual(await loadSponsors(errorMessage, false), {
    status: 'success',
    data: [valid],
  });

  for (const payload of [
    valid,
    [{ ...valid, uuid: '' }],
    [{ ...valid, totalAmount: undefined }],
    [{ ...valid, totalAmount: 'unknown' }],
    [{ ...valid, totalAmount: '128.1' }],
    [{ ...valid, orders: undefined }],
    [{ ...valid, orders: [] }],
    [{ ...valid, orders: [{ ...latestOrder, amount: 100.01 }] }],
    [{ ...valid, orders: [{ ...latestOrder, amount: '100.001' }] }],
    [{ ...valid, orders: [{ ...latestOrder, at: 1795309943 }] }],
    [{ ...valid, orders: [{ ...latestOrder, at: '2026-02-29T01:12:23.000Z' }] }],
    [{ ...valid, orders: [{ ...latestOrder, at: '2026-11-22T24:00:00.000Z' }] }],
    [{ ...valid, orders: [{ ...latestOrder, at: '2026-11-22T01:12:23+00:00' }] }],
    [{ ...valid, orders: [{ ...latestOrder, message: null }] }],
  ]) {
    request.mock.mockImplementation(async () => Response.json(payload));
    assert.deepEqual(await loadSponsors(errorMessage, true), {
      status: 'invalid-data',
      error: errorMessage,
    });
  }
});

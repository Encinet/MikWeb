import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isBuilding } from '@/modules/building/model/building-validation';
import type { PlayerStatusResponse } from '@/modules/player/lib/player-status-api';
import { isPlayerStatusResponse, toPlayerStatus } from '@/modules/player/lib/player-status-api';
import { isApiErrorPayload } from '@/shared/api/api-error-payload';
import { getLocalizedText, isLocalizedText } from '@/shared/i18n/localized-text';

test('localized content rejects JSON arrays and preserves the language fallback order', () => {
  for (const value of [null, [], ['title'], { en: 42 }, 'title']) {
    assert.equal(isLocalizedText(value), false);
  }
  const text = { 'zh-CN': '建筑', en: 'Building' };
  assert.equal(isLocalizedText(text), true);
  assert.equal(getLocalizedText(text, 'zh-CN'), '建筑');
  assert.equal(getLocalizedText(text, 'fr'), 'Building');
  assert.equal(getLocalizedText({ 'zh-CN': '建筑' }, 'en'), '建筑');
  assert.equal(getLocalizedText(undefined, 'en'), '');
});

test('the building contract accepts filenames and optional attribution', () => {
  const input = {
    id: 'a'.repeat(32),
    name: { en: 'Building' },
    description: { en: 'Description' },
    coordinates: { world: 'world', x: 0, y: 64, z: 0 },
    builders: [{ name: 'Player', uuid: '00000000-0000-4000-8000-000000000001', weight: 1 }],
    buildType: 'original',
    images: [],
    buildDate: '2026-11-12',
  };
  assert.equal(isBuilding(input), true);
  assert.equal(isBuilding({
    ...input,
    images: [{ webp: 'b'.repeat(64), jxl: 'd'.repeat(64) }],
    source: { notes: { en: 'Credit' } },
  }), true);
  for (const change of [
    { builders: [] },
    { buildDate: '2026-02-30' },
    { id: 'A'.repeat(32) },
    { images: ['blob:https://example.test/preview'] },
    { images: [{ webp: 'b'.repeat(64) }] },
    { images: [{ webp: `${'b'.repeat(64)}.webp`, jxl: 'd'.repeat(64) }] },
    { source: {} },
    { source: { originalLink: 'ftp://example.test/source' } },
  ]) {
    assert.equal(isBuilding({ ...input, ...change }), false);
  }
});

test('API errors validate optional messages before exposing them to callers', () => {
  assert.equal(isApiErrorPayload({ error: 'unavailable' }), true);
  assert.equal(isApiErrorPayload({ error: 'unavailable', message: 'Try again' }), true);
  for (const value of [[], null, { error: 503 }, { error: 'unavailable', message: {} }]) {
    assert.equal(isApiErrorPayload(value), false);
  }
});

test('player responses convert wire field names without mutating shared cached data', () => {
  const response: PlayerStatusResponse = {
    online: 1,
    peak_online: 10,
    players: [{ name: 'Player', uuid: 'player-id', joined_at: '2026-11-12T00:00:00Z' }],
  };
  assert.equal(isPlayerStatusResponse(response), true);
  const status = toPlayerStatus(response);
  assert.deepEqual(status, {
    online: 1,
    peakOnline: 10,
    players: [{ name: 'Player', uuid: 'player-id', joinedAt: '2026-11-12T00:00:00Z' }],
  });
  status.players[0].name = 'Changed';
  assert.equal(response.players[0].name, 'Player');
  assert.equal('joined_at' in status.players[0], false);
});

test('player validation preserves the offline sentinel and rejects invalid counters', () => {
  assert.equal(isPlayerStatusResponse({ online: -1, players: [] }), true);
  assert.equal(isPlayerStatusResponse({ online: 0, players: [] }), true);
  for (const online of [-2, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(isPlayerStatusResponse({ online, players: [] }), false);
  }
  const invalidPeak = {
    online: 0,
    peak_online: -2,
    players: [],
  };
  assert.equal(isPlayerStatusResponse(invalidPeak), false);
  assert.equal(
    isPlayerStatusResponse({ online: 1, players: [{ name: 'Player', uuid: 'id' }] }),
    false,
  );
});

test('Mik Data fallback retains player counts when the plugin peak is unavailable', () => {
  for (const online of [-1, 0, 3]) {
    const response: PlayerStatusResponse = {
      online,
      peak_online: -1,
      players: [],
    };
    assert.equal(isPlayerStatusResponse(response), true);
    const status = toPlayerStatus(response);
    assert.equal(status.online, online);
    assert.equal(status.peakOnline, undefined);
  }
});

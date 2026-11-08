import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findChatCoordinates } from '@/modules/chat/lib/chat-coordinates';
import {
  chatSearchFilterCount,
  emptyChatSearch,
  matchesChatSearch,
} from '@/modules/chat/model/chat-search';
import type { MapWorld } from '@/modules/map/model/map-world';
import { coordinateMapWorld, mapPositionUrl } from '@/modules/map/model/map-world';
import { message, OTHER, OWNER, PEER, player } from './fixtures';

test('search combines author, source, conversation, and literal text without interpreting regex syntax', () => {
  const item = message({ content: [{ text: 'Use [x] at spawn' }] });
  const criteria = { ...emptyChatSearch(), query: '[x]', author: PEER, source: 'game' as const };
  assert.equal(
    matchesChatSearch(item, 'Use [x] at spawn', 'Alex', criteria, OWNER, 'public'),
    true,
  );
  assert.equal(
    matchesChatSearch(
      item,
      'Use [x] at spawn',
      'Alex',
      { ...criteria, author: OTHER },
      OWNER,
      'public',
    ),
    false,
  );
  assert.equal(
    matchesChatSearch(
      item,
      'Use [x] at spawn',
      'Alex',
      { ...criteria, source: 'web' },
      OWNER,
      'public',
    ),
    false,
  );
  assert.equal(
    matchesChatSearch(item, 'Use [x] at spawn', 'Alex', criteria, OWNER, 'staff'),
    false,
  );
});

test('date filtering includes the full end date and rejects reversed and invalid ranges', () => {
  const criteria = { ...emptyChatSearch(), after: '2026-11-03', before: '2026-11-03' };
  const late = message({ createdAt: new Date(2026, 10, 3, 23, 59, 59, 999).getTime() });
  assert.equal(matchesChatSearch(late, '', '', criteria, OWNER, 'public'), true);
  assert.equal(
    matchesChatSearch(
      { ...late, createdAt: new Date(2026, 10, 4).getTime() },
      '',
      '',
      criteria,
      OWNER,
      'public',
    ),
    false,
  );
  assert.equal(
    matchesChatSearch(late, '', '', { ...criteria, after: '2026-11-05' }, OWNER, 'public'),
    false,
  );
  assert.equal(
    matchesChatSearch(late, '', '', { ...criteria, after: '2026-02-30' }, OWNER, 'public'),
    false,
  );
});

test('mentions show only messages addressed to this account, with all-conversation support', () => {
  const criteria = { ...emptyChatSearch('all'), mentionsOnly: true };
  const mention = message({ mentioned: true, channel: 'private', targetUuid: OWNER });
  assert.equal(matchesChatSearch(mention, '', '', criteria, OWNER, 'public'), true);
  assert.equal(chatSearchFilterCount(criteria), 1);
  assert.equal(
    matchesChatSearch({ ...mention, mentioned: false }, '', '', criteria, OWNER, 'public'),
    false,
  );
  assert.equal(
    matchesChatSearch({ ...mention, sender: player(OWNER) }, '', '', criteria, OWNER, 'public'),
    false,
  );
  assert.equal(
    matchesChatSearch(mention, '', '', { ...criteria, scope: 'current' }, OWNER, 'public'),
    false,
  );
});

test('the mentions filter combines with text, author, source and date conditions', () => {
  const criteria = {
    ...emptyChatSearch(),
    mentionsOnly: true,
    query: 'spawn',
    author: PEER,
    source: 'game' as const,
    after: '2026-11-03',
    before: '2026-11-03',
  };
  const mention = message({ mentioned: true, createdAt: new Date(2026, 10, 3, 12).getTime() });
  assert.equal(
    matchesChatSearch(mention, 'Meet at spawn', 'Alex', criteria, OWNER, 'public'),
    true,
  );
  assert.equal(chatSearchFilterCount(criteria), 5);
  const rejected = [
    { ...mention, mentioned: false },
    { ...mention, sender: player(OWNER) },
    { ...mention, source: { kind: 'web' as const } },
    { ...mention, createdAt: new Date(2026, 10, 4).getTime() },
  ];
  for (const candidate of rejected)
    assert.equal(
      matchesChatSearch(candidate, 'Meet at spawn', 'Alex', criteria, OWNER, 'public'),
      false,
    );
  assert.equal(
    matchesChatSearch(mention, 'Meet at the gate', 'Alex', criteria, OWNER, 'public'),
    false,
  );
});

test('explicit coordinates preserve signs, decimals, dimensions and exact text offsets', () => {
  for (const text of [
    '主世界:120, 64, -300',
    '主世界 120, 64, -300',
    'x: 120 y: 64 z: -300',
    '(120 64 -300)',
    '120 64 -300',
    '/tp 120 64 -300',
  ]) {
    const found = findChatCoordinates(text);
    assert.equal(found.length, 1, text);
    assert.deepEqual([found[0].x, found[0].y, found[0].z], [120, 64, -300]);
    assert.equal(text.slice(found[0].start, found[0].end), found[0].label);
  }
  assert.deepEqual(findChatCoordinates('下界: 1, 64, -2')[0].world, {
    kind: 'dimension',
    dimension: 'the_nether',
  });
  assert.deepEqual(findChatCoordinates('末地 1 64 -2')[0].world, {
    kind: 'dimension',
    dimension: 'the_end',
  });
  assert.equal(findChatCoordinates('(1.5, -64, -2.25)')[0].z, -2.25);
  assert.deepEqual(findChatCoordinates('世界:glass 120 64 -300')[0].world, {
    kind: 'name',
    name: 'glass',
  });
});

test('multiple coordinates do not overlap or turn dates, versions, and ordinary numbers into locations', () => {
  assert.equal(findChatCoordinates('A (1, 64, 2), B (-3, 70, 4)').length, 2);
  for (const text of [
    '2026-11-03',
    'version 1.21.4',
    'There are 3 players and 12 buildings at 4 pm',
    'a123,456,789',
    '(30000001, 64, 1)',
  ])
    assert.deepEqual(findChatCoordinates(text), [], text);
});

test('map URLs encode a selected world and preserve X/Z without guessing a dimension', () => {
  const url = new URL(mapPositionUrl('custom world&zoom=99', -120.5, 300));
  assert.equal(url.origin, 'https://map.mcmik.top');
  assert.equal(url.searchParams.get('world'), 'custom world&zoom=99');
  assert.equal(url.searchParams.get('zoom'), '3');
  assert.equal(url.searchParams.get('x'), '-120.5');
  assert.equal(url.searchParams.get('z'), '300');
});

test('coordinate world hints require an exact name or a unique known dimension', () => {
  const worlds: MapWorld[] = [
    { name: 'world', displayName: 'Main world', type: 'overworld' },
    { name: 'glass', displayName: 'Glass', type: 'custom' },
    { name: 'hell', displayName: 'Nether', type: 'the_nether' },
  ];
  assert.equal(coordinateMapWorld(worlds, { kind: 'name', name: 'glass' }), 'glass');
  const overworld = { kind: 'dimension', dimension: 'overworld' } as const;
  assert.equal(coordinateMapWorld(worlds, overworld), 'world');
  assert.equal(coordinateMapWorld(worlds, { kind: 'dimension', dimension: 'the_nether' }), 'hell');
  assert.equal(coordinateMapWorld(worlds, { kind: 'name', name: 'missing-custom-world' }), null);
  assert.equal(coordinateMapWorld(worlds, { kind: 'dimension', dimension: 'the_end' }), null);
  assert.equal(coordinateMapWorld(worlds, null), null);
  const anotherOverworld = { name: 'survival', displayName: 'Survival', type: 'overworld' };
  assert.equal(coordinateMapWorld([...worlds, anotherOverworld], overworld), null);
  assert.equal(
    coordinateMapWorld([...worlds, anotherOverworld], { kind: 'name', name: 'world' }),
    'world',
  );
  for (const name of ['nether', 'overworld']) {
    const hint = findChatCoordinates(`world:${name} 120 64 -300`)[0].world;
    assert.equal(coordinateMapWorld(worlds, hint), null);
  }
});

import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import {
  clearHistoryThrough,
  loadChatWorkspace,
  loadHistory,
  readHistorySummary,
  resetHistory,
  saveChatWorkspace,
  saveHistory,
  saveHistorySync,
  setStaffHistoryPermission,
  syncHistoryAccount,
} from '@/modules/chat/lib/chat-history';
import {
  deleteChatHistoryDatabase,
  openChatHistoryDatabase,
} from '@/modules/chat/lib/chat-history-database';
import type { HistorySyncPosition } from '@/modules/chat/model/chat-history-sync';
import { advanceHistorySync } from '@/modules/chat/model/chat-history-sync';
import type { ChatServerEvent } from '@/modules/chat/model/chat-protocol';
import { chatServerEventSchema } from '@/modules/chat/model/chat-protocol';
import { createBrowserEnvironment } from '../support/browser-environment';
import { message, OTHER, OWNER, STREAM } from './fixtures';

const position = (after: string): HistorySyncPosition => ({
  databaseId: STREAM,
  visibilityScope: OTHER,
  after,
});
const page = (
  overrides: Partial<Extract<ChatServerEvent, { type: 'history' }>> = {},
): Extract<ChatServerEvent, { type: 'history' }> => ({
  type: 'history',
  requestId: '0123456789abcdef',
  channel: 'public',
  messages: [],
  hasMore: false,
  nextBefore: '1',
  head: '150',
  databaseId: STREAM,
  visibilityScope: OTHER,
  ...overrides,
});
const archived = (id: string, sequence: number) =>
  message({ id, sequence, expiresAt: Date.now() + 86_400_000 });

let browser: ReturnType<typeof createBrowserEnvironment>;
beforeEach(() => {
  browser = createBrowserEnvironment();
});
afterEach(async () => {
  await browser.close();
  await deleteChatHistoryDatabase(() => assert.fail('Leaked history connection'));
});

test('sync freezes its first head, resumes a partial backfill, and detects database or visibility changes', () => {
  const partial = advanceHistorySync(position('10'), page({ hasMore: true, nextBefore: '100' }));
  assert.ok(partial);
  assert.deepEqual(partial, { ...position('10'), head: '150', before: '100' });
  const complete = advanceHistorySync(partial, page({ head: '160' }));
  assert.deepEqual(complete, position('150'));
  assert.equal(advanceHistorySync(partial, page({ databaseId: OWNER })), null);
  assert.equal(advanceHistorySync(partial, page({ visibilityScope: OWNER })), null);
  assert.equal(advanceHistorySync(partial, page({ head: '99' })), null);
  assert.equal(chatServerEventSchema.safeParse(page({ head: 'invalid' })).success, false);
});

test('all pages and their resume positions survive reload without the former 1000-message cap', async () => {
  const lease = await syncHistoryAccount(OWNER);
  let previous: HistorySyncPosition | undefined;
  const ids = new Set<string>();
  for (let start = 0; start < 1205; start += 100) {
    const messages = Array.from({ length: Math.min(100, 1205 - start) }, (_, index) =>
      archived(`archived-${start + index}`, start + index + 1),
    );
    for (const record of messages) ids.add(record.id);
    const next = position(String(start + messages.length));
    assert.equal(await saveHistorySync(lease, 'public', messages, previous, next, ids), 'saved');
    previous = next;
  }
  const snapshot = await loadHistory(lease);
  assert.equal(snapshot.messages.length, 1205);
  assert.equal(snapshot.historicalIds.size, 1205);
  assert.deepEqual(snapshot.syncPositions.public, position('1205'));
});

test('competing tabs and stale accounts cannot advance progress without the matching cached page', async () => {
  const lease = await syncHistoryAccount(OWNER);
  const first = archived('first', 1),
    stale = archived('stale', 2);
  assert.equal(
    await saveHistorySync(lease, 'public', [first], undefined, position('1'), new Set([first.id])),
    'saved',
  );
  assert.equal(
    await saveHistorySync(lease, 'public', [stale], undefined, position('2'), new Set([stale.id])),
    'conflict',
  );
  let snapshot = await loadHistory(lease);
  assert.deepEqual(
    snapshot.messages.map((record) => record.id),
    ['first'],
  );
  assert.deepEqual(snapshot.syncPositions.public, position('1'));
  await resetHistory(OWNER);
  assert.equal(
    await saveHistorySync(lease, 'public', [stale], position('1'), position('2'), new Set()),
    'stale',
  );
  snapshot = await loadHistory(lease);
  assert.equal(snapshot.messages.length, 0);
});

test('live arrivals keep their unread status when a history page contains the same message', async () => {
  const lease = await syncHistoryAccount(OWNER);
  const live = archived('live', 1),
    old = archived('old', 2);
  await saveHistory(lease, live);
  await saveHistorySync(
    lease,
    'public',
    [live, old],
    undefined,
    position('2'),
    new Set([live.id, old.id]),
  );
  const snapshot = await loadHistory(lease);
  assert.equal(snapshot.historicalIds.has(live.id), false);
  assert.equal(snapshot.historicalIds.has(old.id), true);
  assert.equal(snapshot.readPositions.get('public'), null);
});

test('local messages survive a year and remain readable after the server deadline', async () => {
  const originalNow = Date.now;
  let now = originalNow();
  Date.now = () => now;
  try {
    const lease = await syncHistoryAccount(OWNER);
    const live = message({ id: 'live' });
    const history = message({ id: 'history', sequence: 2, expiresAt: now + 86_400_000 });
    await saveHistory(lease, live);
    await saveHistorySync(
      lease,
      'public',
      [history],
      undefined,
      position('2'),
      new Set([history.id]),
    );
    now += 366 * 24 * 60 * 60 * 1000;
    assert.deepEqual(
      (await loadHistory(lease)).messages.map((record) => record.id),
      ['live', 'history'],
    );
    const reopened = await syncHistoryAccount(OWNER);
    assert.equal((await loadHistory(reopened)).messages.length, 2);
  } finally {
    Date.now = originalNow;
  }
});

test('cleanup combines message type and date, preserves workspace and progress, and prevents stale writes or backfills from restoring data', async () => {
  const lease = await syncHistoryAccount(OWNER);
  await setStaffHistoryPermission(OWNER, true);
  const now = Date.now();
  const cutoff = now - 30 * 86_400_000;
  const records = [
    message({ id: 'old-public', createdAt: cutoff, sequence: 1 }),
    message({
      id: 'old-private',
      channel: 'private',
      targetUuid: OWNER,
      createdAt: cutoff,
      sequence: 2,
    }),
    message({ id: 'old-staff', channel: 'staff', createdAt: cutoff, sequence: 3 }),
    message({
      id: 'recent-private',
      channel: 'private',
      targetUuid: OWNER,
      createdAt: cutoff + 1,
      sequence: 4,
    }),
  ];
  for (const record of records) await saveHistory(lease, record);
  await saveChatWorkspace(lease, { type: 'draft', key: 'public', text: 'Keep draft', at: now });
  await saveHistorySync(lease, 'private', [], undefined, position('4'), new Set());
  const cleanup = { channel: 'private' as const, through: cutoff };
  assert.deepEqual(await readHistorySummary(lease, cleanup), {
    total: 4,
    matching: 1,
    oldestAt: cutoff,
  });
  const cleaned = await clearHistoryThrough(OWNER, cleanup);
  assert.ok(cleaned);
  assert.notEqual(cleaned.epoch, lease.epoch);
  assert.equal((await loadChatWorkspace(cleaned))?.drafts.public.text, 'Keep draft');
  assert.deepEqual((await loadHistory(cleaned)).syncPositions.private, position('4'));
  assert.equal(await readHistorySummary(lease, cleanup), null);
  await saveHistory(lease, records[1]);
  await saveHistory(cleaned, records[1]);
  await saveHistorySync(cleaned, 'private', [records[1]], position('4'), position('5'), new Set());
  const snapshot = await loadHistory(cleaned);
  assert.deepEqual(
    snapshot.messages.map((record) => record.id),
    ['old-public', 'old-staff', 'recent-private'],
  );
  assert.deepEqual(snapshot.syncPositions.private, position('5'));
  assert.equal((await readHistorySummary(cleaned, { channel: 'all', through: now }))?.total, 3);
  assert.equal(
    (await readHistorySummary(cleaned, { channel: 'staff', through: cutoff }))?.matching,
    1,
  );
  const all = await resetHistory(OWNER);
  assert.ok(all);
  for (const record of records) await saveHistory(all, record);
  assert.deepEqual((await loadHistory(all)).messages, []);
  assert.deepEqual((await loadChatWorkspace(all))?.drafts, {});
});

test('a failed page write rolls back both the messages and the sync checkpoint', async () => {
  const lease = await syncHistoryAccount(OWNER);
  const db = await openChatHistoryDatabase();
  const prototype = Object.getPrototypeOf(
    db.transaction('messages').objectStore('messages'),
  ) as IDBObjectStore;
  const original = prototype.put;
  prototype.put = function (value: unknown, key?: IDBValidKey) {
    const request = original.call(this, value, key);
    if (this.name === 'messages') this.transaction.abort();
    return request;
  };
  try {
    await assert.rejects(
      saveHistorySync(
        lease,
        'public',
        [archived('failed-write', 1)],
        undefined,
        position('1'),
        new Set(),
      ),
    );
  } finally {
    prototype.put = original;
  }
  const snapshot = await loadHistory(lease);
  assert.equal(snapshot.messages.length, 0);
  assert.equal(snapshot.syncPositions.public, undefined);
});

test('staff revocation removes cached staff messages and the cursor that would otherwise skip a later grant', async () => {
  const lease = await syncHistoryAccount(OWNER);
  await setStaffHistoryPermission(OWNER, true);
  const record = { ...archived('secret', 1), channel: 'staff' as const };
  assert.equal(
    await saveHistorySync(lease, 'staff', [record], undefined, position('1'), new Set([record.id])),
    'saved',
  );
  await setStaffHistoryPermission(OWNER, false);
  assert.equal(
    await saveHistorySync(lease, 'staff', [record], position('1'), position('2'), new Set()),
    'forbidden',
  );
  const snapshot = await loadHistory(lease);
  assert.equal(snapshot.messages.length, 0);
  assert.equal(snapshot.syncPositions.staff, undefined);
});

import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import {
  clearHistoryThrough,
  clearRevokedHistory,
  currentHistoryLease,
  loadChatWorkspace,
  loadHistory,
  readHistoryBatch,
  readHistorySummary,
  readHistoryWindow,
  readUnreadSummary,
  resetHistory,
  saveChatWorkspace,
  saveHistory,
  saveHistorySync,
  saveReadPosition,
  setStaffHistoryPermission,
  syncHistoryAccount,
} from '@/modules/chat/lib/history/chat-history';
import {
  deleteChatHistoryDatabase,
  openChatHistoryDatabase,
} from '@/modules/chat/lib/history/chat-history-database';
import { searchChatHistory } from '@/modules/chat/lib/history/chat-history-search';
import type { ChatServerEvent } from '@/modules/chat/model/chat-protocol';
import { chatServerEventSchema } from '@/modules/chat/model/chat-protocol';
import { messageCursor } from '@/modules/chat/model/chat-reading';
import { emptyChatSearch } from '@/modules/chat/model/chat-search';
import type { HistorySyncPosition } from '@/modules/chat/model/history/chat-history-sync';
import { ChatLiveProgress } from '@/modules/chat/model/history/chat-live-progress';
import { ChatHistoryRunner } from '@/modules/chat/model/history/chat-history-runner';
import { advanceHistorySync } from '@/modules/chat/model/history/chat-history-sync';
import { createBrowserEnvironment } from '../support/browser-environment';
import { message, OWNER, order } from './fixtures';

const token = (value: string) => value.padStart(91, 'a');
const position = (value: string): HistorySyncPosition => ({ checkpoint: token(value) });
const page = (
  overrides: Partial<Extract<ChatServerEvent, { type: 'history' }>> = {},
): Extract<ChatServerEvent, { type: 'history' }> => ({
  type: 'history',
  requestId: '0123456789abcdef',
  channel: 'public',
  messages: [],
  checkpoint: token('150'),
  reset: false,
  ...overrides,
});
const archived = (id: string, sequence: number) =>
  message({ id, order: order(sequence), expiresAt: Date.now() + 86_400_000 });

let browser: ReturnType<typeof createBrowserEnvironment>;
beforeEach(() => {
  browser = createBrowserEnvironment();
});
afterEach(async () => {
  await browser.close();
  await deleteChatHistoryDatabase(() => assert.fail('Leaked history connection'));
});

test('opaque checkpoints advance only after the last page and reset drops an obsolete checkpoint', () => {
  const partial = advanceHistorySync(position('10'), page({ nextPage: token('100') }));
  assert.deepEqual(partial, { ...position('10'), page: token('100') });
  assert.deepEqual(advanceHistorySync(partial, page()), position('150'));
  assert.deepEqual(advanceHistorySync(partial, page({ reset: true, nextPage: token('90') })), {
    page: token('90'),
  });
  assert.equal(chatServerEventSchema.safeParse(page({ checkpoint: 'invalid' })).success, false);
  assert.equal(chatServerEventSchema.safeParse(page({ nextPage: token('90'), checkpoint: undefined })).success, true);
  assert.equal(chatServerEventSchema.safeParse(page({ checkpoint: undefined })).success, false);
  assert.equal(chatServerEventSchema.safeParse(page({ nextPage: token('90'), aligned: true })).success, false);
});

test('only a final page covered by this subscription can skip the catch-up request', async () => {
  for (const aligned of [true, undefined] as const) {
    const requests: (HistorySyncPosition | undefined)[] = [];
    const partial = { page: token('90') };
    const replies = [page({ nextPage: partial.page, checkpoint: undefined }), page({ aligned }), page()];
    await new ChatHistoryRunner({
      current: () => true,
      read: async (cursor) => { requests.push(cursor); return replies.shift()!; },
      accept: (response) => response.messages,
      commit: async () => 'saved',
      reload: async () => undefined,
      state: () => {}, advanced: () => {}, stale: () => {},
    }).run();
    assert.deepEqual(requests, aligned ? [undefined, partial] : [undefined, partial, position('150')]);
  }
});

test('all pages persist while initial reads stay bounded and older records remain addressable', async () => {
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
  assert.equal(snapshot.messages.length, 1000);
  assert.equal(snapshot.historicalIds.size, 1000);
  let before: string | undefined;
  const restored = new Set<string>();
  for (;;) {
    const batch = await readHistoryBatch(lease, before);
    for (const record of batch.messages) restored.add(record.id);
    if (!batch.hasMore) break;
    before = batch.messages[0].order;
  }
  assert.equal(restored.size, 1205);
  assert.ok(
    (await readHistoryWindow(lease, 'public', undefined, 'archived-0')).messages.some(
      (record) => record.id === 'archived-0',
    ),
  );
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
    const history = message({ id: 'history', order: order(2), expiresAt: now + 86_400_000 });
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
    message({ id: 'old-public', createdAt: cutoff, order: order(1) }),
    message({
      id: 'old-private',
      channel: 'private',
      targetUuid: OWNER,
      createdAt: cutoff,
      order: order(2),
    }),
    message({ id: 'old-staff', channel: 'staff', createdAt: cutoff, order: order(3) }),
    message({
      id: 'recent-private',
      channel: 'private',
      targetUuid: OWNER,
      createdAt: cutoff + 1,
      order: order(4),
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

test('read markers follow server order even when timestamps move backwards', async () => {
  const lease = await syncHistoryAccount(OWNER);
  const first = message({ id: 'first', createdAt: 2000, order: order(1) });
  const later = message({ id: 'later', createdAt: 1000, order: order(2) });
  await saveHistory(lease, first);
  await saveReadPosition(lease, 'public', messageCursor(first));
  await saveHistory(lease, later);
  const snapshot = await loadHistory(lease);
  assert.deepEqual(
    snapshot.messages.map((record) => record.id),
    ['first', 'later'],
  );
  assert.equal(snapshot.unread.get('public')?.count, 1);
});
test('unread summaries include live messages outside the loaded window and overlapping backfills preserve them', async () => {
  const lease = await syncHistoryAccount(OWNER);
  const records = Array.from({ length: 1105 }, (_, index) =>
    message({ id: `live-${index}`, order: order(index + 1) }),
  );
  for (const record of records) await saveHistory(lease, record);
  let snapshot = await loadHistory(lease);
  assert.equal(snapshot.messages.length, 1000);
  assert.equal(snapshot.unread.get('public')?.count, 1105);
  await saveReadPosition(lease, 'public', messageCursor(records[549]));
  assert.deepEqual(await readUnreadSummary(lease, 'public'), { count: 555, firstId: 'live-550' });
  await saveHistorySync(
    lease,
    'public',
    records.slice(1000),
    undefined,
    position('1105'),
    new Set(records.map((record) => record.id)),
  );
  snapshot = await loadHistory(lease);
  assert.equal(snapshot.unread.get('public')?.count, 555);
});
test('paged archive search finds records outside memory and checks cancellation, permissions and cleanup leases', async () => {
  const lease = await syncHistoryAccount(OWNER);
  await setStaffHistoryPermission(OWNER, true);
  const records = Array.from({ length: 1205 }, (_, index) =>
    message({
      id: `search-${index}`,
      order: order(index + 1),
      content: [{ text: index === 0 ? 'unique needle' : 'ordinary' }],
    }),
  );
  await saveHistorySync(
    lease,
    'public',
    records,
    undefined,
    position('1205'),
    new Set(records.map((record) => record.id)),
  );
  await saveHistory(
    lease,
    message({
      id: 'secret',
      channel: 'staff',
      order: order(2000),
      content: [{ text: 'unique needle' }],
    }),
  );
  const query = {
    lease,
    criteria: { ...emptyChatSearch('all'), query: 'unique needle' },
    conversation: 'public',
    staff: false,
    templates: {},
  };
  assert.deepEqual(
    (await searchChatHistory(query)).messages.map((record) => record.id),
    ['search-0'],
  );
  assert.deepEqual((await searchChatHistory(query, () => false)).messages, []);
  await resetHistory(OWNER);
  assert.deepEqual((await searchChatHistory(query)).messages, []);
});

test('live checkpoints wait for disk and a failed write preserves the previous cursor', async () => {
  const progress = new ChatLiveProgress();
  let finish!: (saved: boolean) => void;
  progress.track(new Promise(resolve => { finish = resolve; }));
  let committed = false;
  progress.checkpoint(async () => { committed = true; }, error => assert.fail(String(error)));
  await Promise.resolve();
  assert.equal(committed, false);
  finish(false);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(committed, false);
  assert.equal(await progress.needsCatchup(async () => 'first', 1), false);
  assert.equal(await progress.needsCatchup(async () => 'second', 30_001), false);
  assert.equal(await progress.needsCatchup(async () => 'second', 60_001), true);
});

test('unchanged checkpoints use a read-only transaction and still verify permissions, cursor and epoch', async () => {
  const lease = await syncHistoryAccount(OWNER);
  const sync = position('one');
  await setStaffHistoryPermission(OWNER, true);
  assert.equal(await saveHistorySync(lease, 'staff', [], undefined, sync, new Set()), 'saved');
  const db = await openChatHistoryDatabase();
  const transaction = db.transaction.bind(db);
  const modes: (IDBTransactionMode | undefined)[] = [];
  db.transaction = (stores, mode, options) => {
    modes.push(mode);
    return transaction(stores, mode, options);
  };
  try {
    const unchanged = (at: HistorySyncPosition) => saveHistorySync(lease, 'staff', [], at, at, new Set());
    assert.equal(await unchanged(sync), 'saved');
    assert.equal(await unchanged(position('older')), 'conflict');
    assert.deepEqual(modes, ['readonly', 'readonly']);
    const next = position('two');
    assert.equal(await saveHistorySync(lease, 'staff', [], sync, next, new Set()), 'saved');
    assert.equal(await saveHistorySync(lease, 'staff', [], sync, next, new Set()), 'saved');
    assert.equal(await unchanged(sync), 'conflict');
    await setStaffHistoryPermission(OWNER, false);
    assert.equal(await unchanged(sync), 'forbidden');
    await resetHistory(OWNER);
    assert.equal(await unchanged(sync), 'stale');
  } finally {
    db.transaction = transaction;
  }
});

test('revocation clears the matching cache after disconnect and leaves a replacement epoch usable', async () => {
  const old = await syncHistoryAccount(OWNER);
  await saveHistorySync(old, 'public', [archived('old', 1)], undefined, position('one'), new Set());
  await clearRevokedHistory(old);
  assert.equal(await currentHistoryLease(OWNER), null);
  const fresh = await syncHistoryAccount(OWNER);
  assert.notEqual(fresh.epoch, old.epoch);
  await saveHistorySync(fresh, 'public', [archived('fresh', 2)], undefined, position('two'), new Set());
  await clearRevokedHistory(old);
  assert.deepEqual((await loadHistory(fresh)).messages.map(row => row.id), ['fresh']);
});

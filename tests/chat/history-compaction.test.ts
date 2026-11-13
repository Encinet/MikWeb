import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  loadChatWorkspace,
  loadHistory,
  readHistoryWindow,
  readUnreadSummary,
  saveHistory,
  syncHistoryAccount,
} from '@/modules/chat/lib/history/chat-history';
import {
  decodeMessageData,
  encodeMessageData,
  readStoredMessage,
} from '@/modules/chat/lib/history/chat-history-codec';
import {
  deleteChatHistoryDatabase,
  openChatHistoryDatabase,
} from '@/modules/chat/lib/history/chat-history-database';
import { CHAT_HISTORY_DATABASE_VERSION } from '@/modules/chat/lib/history/chat-history-schema';
import { searchChatHistory } from '@/modules/chat/lib/history/chat-history-search';
import { messageCursor } from '@/modules/chat/model/chat-reading';
import { emptyChatSearch } from '@/modules/chat/model/chat-search';
import { message, OTHER, OWNER, order, PEER, player } from './fixtures';
import {
  initialState,
  openStored,
  orderedRecord,
  seed,
  storedData,
} from './history-database-fixtures';

afterEach(async () => {
  await deleteChatHistoryDatabase(() => assert.fail('A compaction test leaked an open database'));
});

test('v5 compacts all records and previews while preserving unread history, checkpoints, player cutoffs, and workspace', async () => {
  const now = Date.now();
  const records = [
    message({ id: 'live', createdAt: now, mentioned: true, content: [{ text: '保留这条 🌳' }] }),
    message({ id: 'past', createdAt: now, order: order(2), sender: player(OTHER, 'Steve') }),
    message({
      id: 'incoming',
      createdAt: now,
      order: order(3),
      channel: 'private',
      targetUuid: OWNER,
    }),
    message({
      id: 'outgoing',
      createdAt: now,
      order: order(4),
      channel: 'private',
      targetUuid: PEER,
      targetName: 'Alex',
      sender: player(OWNER, 'Me'),
    }),
    message({ id: 'staff', createdAt: now, order: order(5), channel: 'staff' }),
  ];
  const state = {
    ...initialState(),
    workspaceEpoch: 'keep-workspace',
    clearedThrough: { staff: now - 10 },
    clearedPlayersThrough: { [OTHER]: { staff: now - 10 } },
    readPositions: new Map([
      ['public', null],
      [`private:${PEER}`, null],
      ['staff', null],
    ]),
    syncPositions: { public: { checkpoint: 'A'.repeat(91) } },
    latest: [records[1], records[3], records[4]],
    workspace: {
      ...initialState().workspace,
      drafts: { public: { text: 'Keep this draft', updatedAt: now } },
      threads: {
        [`private:${PEER}`]: {
          name: 'Alex',
          updatedAt: now,
          pinned: true,
          closed: true,
          closedThrough: messageCursor(records[3]),
        },
      },
    },
  };
  await seed(
    5,
    records.map((record) => orderedRecord(record, record.id === 'past')),
    state,
  );
  const db = await openChatHistoryDatabase();
  assert.equal(db.version, CHAT_HISTORY_DATABASE_VERSION);
  const stored = await storedData();
  assert.deepEqual(stored.state, { ...state, latest: state.latest.map(encodeMessageData) });
  assert.deepEqual(
    stored.messages
      .map(readStoredMessage)
      .sort((a, b) => (a?.order ?? '').localeCompare(b?.order ?? '')),
    records,
  );
  const tx = db.transaction('messages');
  const store = tx.objectStore('messages');
  assert.equal(store.indexNames.contains('ownerBucketTime'), false);
  await new Promise<void>((resolve, reject) => {
    const unread = store.index('unreadOrder').count();
    unread.onsuccess = () => assert.equal(unread.result, 3);
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
  });
  const lease = await syncHistoryAccount(OWNER);
  assert.equal(lease.epoch, state.epoch);
  assert.equal(lease.workspaceEpoch, state.workspaceEpoch);
  assert.deepEqual(lease.clearedThrough, state.clearedThrough);
  assert.deepEqual(lease.clearedPlayersThrough, state.clearedPlayersThrough);
  const snapshot = await loadHistory(lease);
  assert.deepEqual(snapshot.messages, records);
  assert.deepEqual(snapshot.latest, state.latest);
  assert.deepEqual(snapshot.historicalIds, new Set(['past']));
  assert.deepEqual(snapshot.syncPositions, state.syncPositions);
  assert.deepEqual(snapshot.readPositions, state.readPositions);
  assert.deepEqual(snapshot.unread.get('public'), { count: 1, firstId: 'live' });
  assert.deepEqual(await readUnreadSummary(lease, `private:${PEER}`), {
    count: 1,
    firstId: 'incoming',
  });
  assert.deepEqual(await loadChatWorkspace(lease), state.workspace);
  assert.deepEqual(
    (await readHistoryWindow(lease, `private:${PEER}`)).messages,
    records.slice(2, 4),
  );
  assert.deepEqual(
    (
      await searchChatHistory({
        lease,
        criteria: { ...emptyChatSearch('all'), query: '保留' },
        conversation: 'public',
        staff: true,
        templates: {},
      })
    ).messages,
    [records[0]],
  );
  const next = message({ id: 'next', createdAt: now + 1, order: order(6) });
  await saveHistory(lease, next);
  assert.deepEqual((await loadHistory(lease)).messages, [...records, next]);
  const after = await storedData();
  const previews = (after.state as { latest: unknown[] }).latest.map(decodeMessageData);
  assert.equal(previews.find((record) => record?.channel === 'public')?.id, 'next');
});

for (const failure of ['invalid-message', 'missing-header', 'invalid-preview']) {
  test(`a failed v5 compaction rolls back every record, state, index, and version (${failure})`, async () => {
    const first = orderedRecord(message({ id: 'a' }));
    const second = orderedRecord(message({ id: 'b', order: order(2) }));
    const invalid =
      failure === 'invalid-message'
        ? { ...second, message: { kind: 'unknown' } }
        : failure === 'missing-header'
          ? { ...second, order: undefined }
          : second;
    const state = {
      ...initialState(),
      latest: failure === 'invalid-preview' ? [{ kind: 'unknown' }] : [first.message],
    };
    await seed(5, [first, invalid], state);
    const before = await storedData();
    await assert.rejects(openChatHistoryDatabase(), Error);
    await assert.rejects(openChatHistoryDatabase(), Error);
    assert.deepEqual(await storedData(), before);
    const db = await openStored();
    try {
      const messages = db.transaction('messages').objectStore('messages');
      assert.equal(messages.indexNames.length, 6);
      assert.deepEqual(messages.index('ownerOrder').keyPath, ['owner', 'order']);
      assert.equal(messages.indexNames.contains('ownerBucketTime'), true);
    } finally {
      db.close();
    }
  });
}

test('a v5 database held by an old tab remains intact after a blocked upgrade and upgrades after closing', async () => {
  await seed(5, [orderedRecord(message())]);
  const before = await storedData();
  const other = await openStored();
  try {
    await assert.rejects(openChatHistoryDatabase(), /history_blocked/);
  } finally {
    other.close();
  }
  assert.deepEqual(await storedData(), before);
  assert.equal((await openChatHistoryDatabase()).version, CHAT_HISTORY_DATABASE_VERSION);
});

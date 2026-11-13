import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  loadChatWorkspace,
  loadHistory,
  readHistoryWindow,
  saveHistory,
  syncHistoryAccount,
} from '@/modules/chat/lib/chat-history';
import {
  deleteChatHistoryDatabase,
  openChatHistoryDatabase,
} from '@/modules/chat/lib/chat-history-database';
import { message, OWNER, PEER } from './fixtures';
import {
  initialState,
  legacyMessage,
  legacyRecord,
  openStored,
  STREAM,
  seed,
  storedData,
} from './history-database-fixtures';

afterEach(async () => {
  await deleteChatHistoryDatabase(() => assert.fail('A migration test leaked an open database'));
});

for (const version of [2, 3, 4]) {
  test(`v${version} migrates messages, unread cursors, closed threads, and drafts without resetting the account`, async () => {
    const now = Date.now();
    const first = legacyMessage(1, { id: 'first', createdAt: now - 1 });
    const second = legacyMessage(2, {
      id: 'second',
      createdAt: now,
      channel: 'private',
      targetUuid: OWNER,
    });
    const state = {
      ...initialState(),
      workspaceEpoch: 'keep-workspace-epoch',
      clearedThrough: { staff: now - 10 },
      readPositions: new Map([
        ['public', { messageId: first.id, ...first }],
        [`private:${PEER}`, null],
      ]),
      syncPositions: { public: { databaseId: STREAM, visibilityScope: STREAM, after: '42' } },
      workspace: {
        drafts: { public: { text: 'Keep my draft', updatedAt: now } },
        threads: {
          [`private:${PEER}`]: {
            name: 'Alex',
            updatedAt: now,
            pinned: true,
            closed: true,
            closedThrough: { messageId: second.id, ...second },
          },
        },
        preferences: { density: 'compact', showActivity: false, membersVisible: true },
      },
    };
    const record = legacyRecord(first);
    if (version === 2) {
      // The v2 player representation predates the sender/source objects.
      Object.assign(record, {
        message: {
          ...first,
          kind: 'player',
          senderUuid: PEER,
          senderName: 'Alex',
          source: 'game',
          sender: undefined,
        },
      });
    }
    await seed(version, [record, legacyRecord(second)], state);
    assert.equal((await openChatHistoryDatabase()).version, 5);
    const lease = await syncHistoryAccount(OWNER);
    assert.equal(lease.epoch, 'keep-epoch');
    assert.equal(lease.workspaceEpoch, 'keep-workspace-epoch');
    assert.equal(lease.persist, true);
    assert.deepEqual(lease.clearedThrough, { staff: now - 10 });
    const snapshot = await loadHistory(lease);
    assert.deepEqual(
      snapshot.messages.map((record) => record.id),
      ['first', 'second'],
    );
    assert.equal(snapshot.messages[0].kind, 'user');
    assert.deepEqual(snapshot.syncPositions, {});
    assert.equal(snapshot.latest.length, 2);
    assert.equal(snapshot.readPositions.get('public')?.order, snapshot.messages[0].order);
    assert.equal(snapshot.unread.get(`private:${PEER}`)?.count, 1);
    const workspace = await loadChatWorkspace(lease);
    assert.equal(workspace?.drafts.public.text, 'Keep my draft');
    assert.equal(workspace?.preferences.density, 'compact');
    assert.equal(workspace?.threads[`private:${PEER}`].pinned, true);
    assert.equal(
      workspace?.threads[`private:${PEER}`].closedThrough?.order,
      snapshot.messages[1].order,
    );
    // New traffic remains writable and sorts after the migrated history.
    await saveHistory(lease, message({ id: 'new', order: 'ffffffff-ffff-7000-8000-000000000001' }));
    assert.deepEqual(
      (await loadHistory(lease)).messages.map((record) => record.id),
      ['first', 'second', 'new'],
    );
  });
}

test('v1 from the current protocol upgrades without rewriting any records or state', async () => {
  const record = message();
  await seed(1, [{ ...record, key: 'keep', owner: OWNER, message: record }]);
  const before = await storedData();
  assert.equal((await openChatHistoryDatabase()).version, 5);
  assert.deepEqual(await storedData(), { ...before, version: 5 });
});

test('equal legacy timestamps and sequences retain distinct orders and exact read boundaries', async () => {
  const now = Date.now();
  const first = legacyMessage(1, { id: 'a', createdAt: now });
  const second = { ...legacyMessage(1, { id: 'b', createdAt: now }), streamId: OWNER };
  await seed(4, [legacyRecord(first), legacyRecord(second)], {
    ...initialState(),
    readPositions: new Map([['public', { messageId: first.id, ...first }]]),
  });
  const lease = await syncHistoryAccount(OWNER);
  const snapshot = await loadHistory(lease);
  const [a, b] = snapshot.messages;
  assert.ok(a.order < b.order);
  assert.equal(snapshot.unread.get('public')?.count, 1);
  assert.deepEqual(
    (await readHistoryWindow(lease, 'public', b.order)).messages.map((message) => message.id),
    ['a'],
  );
});

for (const unindexed of [false, true]) {
  test(`a failed v4 conversion rolls back the version, indexes, messages, and drafts (${unindexed ? 'unindexed' : 'invalid'} record)`, async () => {
    const first = legacyMessage(1, { id: 'a' });
    const invalid = {
      ...legacyRecord(legacyMessage(2, { id: 'b' })),
      ...(unindexed ? { sequence: undefined } : { message: { kind: 'unknown' } }),
    };
    await seed(4, [legacyRecord(first), invalid]);
    const before = await storedData();
    await assert.rejects(openChatHistoryDatabase(), Error);
    await assert.rejects(openChatHistoryDatabase(), Error);
    assert.deepEqual(await storedData(), before);
  });
}

test('a blocked v4 upgrade rejects promptly and its late upgrade leaves the original data intact', async () => {
  await seed(4, [legacyRecord(legacyMessage(1))]);
  const before = await storedData();
  const other = await openStored();
  try {
    await assert.rejects(openChatHistoryDatabase(), /history_blocked/);
  } finally {
    other.close();
  }
  assert.deepEqual(await storedData(), before);
  assert.equal((await openChatHistoryDatabase()).version, 5);
});

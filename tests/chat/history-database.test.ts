import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  deleteChatHistoryDatabase,
  openChatHistoryDatabase,
} from '@/modules/chat/lib/chat-history-database';
import { openStored, seed, storedData } from './history-database-fixtures';

afterEach(async () => {
  await deleteChatHistoryDatabase(() => assert.fail('A test leaked an open database'));
});

test('new databases use the current schema and cached connections reopen after a version change', async () => {
  const first = await openChatHistoryDatabase();
  assert.equal(first.version, 5);
  assert.equal(await openChatHistoryDatabase(), first);
  const changed = await openStored(6);
  changed.close();
  await assert.rejects(openChatHistoryDatabase(), Error);
});

for (const version of [6, 7]) {
  test(`unsupported database v${version} preserves all data until explicit deletion`, async () => {
    await seed(version, [{ key: 'keep', message: { kind: 'unknown', text: 'Keep me' } }]);
    const before = await storedData();
    await assert.rejects(openChatHistoryDatabase(), Error);
    await assert.rejects(openChatHistoryDatabase(), Error);
    assert.deepEqual(await storedData(), before);
    await deleteChatHistoryDatabase(() => assert.fail('Unexpected blocked deletion'));
    assert.equal((await openChatHistoryDatabase()).version, 5);
    assert.deepEqual((await storedData()).messages, []);
  });
}

test('a blocked deletion remains pending and resumes when the other connection closes', async () => {
  await seed(1);
  const other = await openStored();
  let blocked = () => {};
  const waiting = new Promise<void>((resolve) => {
    blocked = resolve;
  });
  let complete = false;
  const deleting = deleteChatHistoryDatabase(blocked).then(() => {
    complete = true;
  });
  try {
    await waiting;
    assert.equal(complete, false);
    assert.equal(other.version, 1);
  } finally {
    other.close();
  }
  await deleting;
  assert.equal(complete, true);
  assert.equal((await openChatHistoryDatabase()).version, 5);
});

test('an unsupported version held by another tab still returns an error and a late open cannot change it', async () => {
  await seed(6, [{ key: 'keep', text: 'Keep this record' }]);
  const before = await storedData();
  const other = await openStored();
  try {
    await assert.rejects(openChatHistoryDatabase(), Error);
  } finally {
    other.close();
  }
  assert.deepEqual(await storedData(), before);
});

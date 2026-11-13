import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  deleteChatHistoryDatabase,
  openChatHistoryDatabase,
} from '@/modules/chat/lib/chat-history-database';
import { OWNER } from './fixtures';

function openStored(version?: number, initialize?: (db: IDBDatabase) => void) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('mik-chat', version);
    request.onupgradeneeded = () => initialize?.(request.result);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function seed(version: number, messages: unknown[] = [], supportedSchema = true) {
  const db = await openStored(version, (db) => {
    db.createObjectStore('state');
    const store = db.createObjectStore('messages', { keyPath: 'key' });
    if (supportedSchema) {
      store.createIndex('ownerTime', ['owner', 'createdAt', 'order']);
      store.createIndex('ownerBucketTime', ['owner', 'bucket', 'createdAt', 'order']);
    }
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['state', 'messages'], 'readwrite');
    tx.objectStore('state').put({ owner: OWNER, draft: 'Keep my draft' }, 'current');
    messages.forEach((message, index) => {
      tx.objectStore('messages').put({ key: index, message });
    });
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

async function storedData() {
  const db = await openStored();
  try {
    return await new Promise<{ version: number; state: unknown; messages: unknown[] }>(
      (resolve, reject) => {
        const tx = db.transaction(['state', 'messages'], 'readonly');
        const state = tx.objectStore('state').get('current');
        const messages = tx.objectStore('messages').getAll();
        tx.oncomplete = () =>
          resolve({ version: db.version, state: state.result, messages: messages.result });
        tx.onabort = () => reject(tx.error);
      },
    );
  } finally {
    db.close();
  }
}

afterEach(async () => {
  await deleteChatHistoryDatabase(() => assert.fail('A test leaked an open database'));
});

test('new databases use the current schema and cached connections reopen after a version change', async () => {
  const first = await openChatHistoryDatabase();
  assert.equal(first.version, 1);
  assert.equal(await openChatHistoryDatabase(), first);
  const changed = await openStored(5);
  changed.close();
  await assert.rejects(openChatHistoryDatabase(), Error);
});

for (const version of [2, 5]) {
  test(`unsupported database v${version} preserves all data until explicit deletion`, async () => {
    await seed(version, [{ kind: 'unknown', text: 'Keep me' }]);
    const before = await storedData();
    await assert.rejects(openChatHistoryDatabase(), Error);
    await assert.rejects(openChatHistoryDatabase(), Error);
    assert.deepEqual(await storedData(), before);
    await deleteChatHistoryDatabase(() => assert.fail('Unexpected blocked deletion'));
    assert.equal((await openChatHistoryDatabase()).version, 1);
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
  assert.equal((await openChatHistoryDatabase()).version, 1);
});

test('an unsupported version held by another tab still returns an error and a late open cannot change it', async () => {
  await seed(2, [{ text: 'Keep this record' }]);
  const before = await storedData();
  const other = await openStored();
  try {
    await assert.rejects(openChatHistoryDatabase(), Error);
  } finally {
    other.close();
  }
  assert.deepEqual(await storedData(), before);
});

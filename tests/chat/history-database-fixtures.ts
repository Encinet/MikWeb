import { emptyChatWorkspace } from '@/modules/chat/model/workspace/chat-workspace';
import { message, OWNER } from './fixtures';

export function openStored(version?: number, initialize?: (db: IDBDatabase) => void) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('mik-chat', version);
    request.onupgradeneeded = () => initialize?.(request.result);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export const STREAM = '44444444-4444-4444-8444-444444444444';
export function legacyMessage(sequence: number, overrides = {}) {
  const { order: _, ...record } = message(overrides);
  return { ...record, streamId: STREAM, sequence };
}
export function legacyRecord(record: ReturnType<typeof legacyMessage>) {
  return {
    key: `${OWNER}:${record.id}`,
    owner: OWNER,
    createdAt: record.createdAt,
    sequence: record.sequence,
    bucket: 'conversation',
    channel: record.channel,
    message: record,
    historical: false,
  };
}
export function initialState() {
  return {
    owner: OWNER,
    epoch: 'keep-epoch',
    persist: true,
    staff: true,
    readPositions: new Map(),
    workspace: emptyChatWorkspace(),
  };
}

export async function seed(
  version: number,
  messages: unknown[] = [],
  state: unknown = initialState(),
) {
  const db = await openStored(version, (db) => {
    db.createObjectStore('state');
    const store = db.createObjectStore('messages', { keyPath: 'key' });
    if (version === 1) {
      store.createIndex('ownerOrder', ['owner', 'order']);
      store.createIndex('conversationOrder', ['owner', 'conversation', 'order']);
      store.createIndex('unreadOrder', ['owner', 'conversation', 'unread', 'order']);
      store.createIndex('ownerTime', ['owner', 'createdAt', 'order']);
      store.createIndex('ownerBucketTime', ['owner', 'bucket', 'createdAt', 'order']);
      store.createIndex('ownerChannelTime', ['owner', 'channel', 'createdAt', 'order']);
    } else {
      store.createIndex('ownerTime', ['owner', 'createdAt', 'sequence']);
      store.createIndex('ownerBucketTime', ['owner', 'bucket', 'createdAt', 'sequence']);
      if (version >= 4)
        store.createIndex('ownerChannelTime', ['owner', 'channel', 'createdAt', 'sequence']);
    }
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['state', 'messages'], 'readwrite');
    tx.objectStore('state').put(state, 'current');
    for (const record of messages) tx.objectStore('messages').put(record);
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

export async function storedData() {
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

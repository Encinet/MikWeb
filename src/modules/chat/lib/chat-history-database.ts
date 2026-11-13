import { CHAT_HISTORY_DATABASE_NAME } from '@/modules/chat/lib/chat-history-presence';

const INDEXES = {
  ownerOrder: ['owner', 'order'],
  conversationOrder: ['owner', 'conversation', 'order'],
  unreadOrder: ['owner', 'conversation', 'unread', 'order'],
  ownerTime: ['owner', 'createdAt', 'order'],
  ownerBucketTime: ['owner', 'bucket', 'createdAt', 'order'],
  ownerChannelTime: ['owner', 'channel', 'createdAt', 'order'],
};
let database: Promise<IDBDatabase> | undefined;
let deletion: Promise<void> | undefined;
export function openChatHistoryDatabase(): Promise<IDBDatabase> {
  if (deletion) return deletion.then(() => openChatHistoryDatabase());
  if (database) return database;
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(CHAT_HISTORY_DATABASE_NAME, 1);
    let abandoned = false;
    request.onupgradeneeded = () => {
      if (abandoned) {
        request.transaction?.abort();
        return;
      }
      const db = request.result;
      db.createObjectStore('state');
      const messages = db.createObjectStore('messages', { keyPath: 'key' });
      for (const [name, keys] of Object.entries(INDEXES)) messages.createIndex(name, keys);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      abandoned = true;
      reject(new Error('history_blocked'));
    };
    request.onsuccess = () => {
      const db = request.result;
      if (abandoned) {
        db.close();
        return;
      }
      if (!db.objectStoreNames.contains('state') || !db.objectStoreNames.contains('messages')) {
        db.close();
        reject(new Error('history_schema_unavailable'));
        return;
      }
      const tx = db.transaction(['state', 'messages'], 'readonly');
      const messages = tx.objectStore('messages');
      if (
        tx.objectStore('state').keyPath !== null ||
        messages.keyPath !== 'key' ||
        !Object.entries(INDEXES).every(
          ([name, keys]) =>
            messages.indexNames.contains(name) &&
            JSON.stringify(messages.index(name).keyPath) === JSON.stringify(keys),
        )
      ) {
        db.close();
        reject(new Error('history_schema_unavailable'));
        return;
      }
      db.onversionchange = () => {
        db.close();
        if (database === opening) database = undefined;
      };
      resolve(db);
    };
  });
  database = opening;
  void opening.catch(() => {
    if (database === opening) database = undefined;
  });
  return opening;
}
export function deleteChatHistoryDatabase(onBlocked: () => void): Promise<void> {
  if (deletion) return deletion;
  const previous = database;
  database = undefined;
  const deleting = (async () => {
    const db = await previous?.catch(() => undefined);
    db?.close();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(CHAT_HISTORY_DATABASE_NAME);
      request.onblocked = onBlocked;
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  })();
  deletion = deleting;
  const complete = () => {
    if (deletion === deleting) deletion = undefined;
  };
  void deleting.then(complete, complete);
  return deleting;
}

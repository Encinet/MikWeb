import { CHAT_HISTORY_DATABASE_NAME } from '@/modules/chat/lib/chat-history-presence';
import { upgradeChatHistoryMessage } from '@/modules/chat/lib/chat-history-upgrade';
import { UnsupportedChatHistoryError } from '@/modules/chat/model/chat-history-compatibility';

const DATABASE_VERSION = 4;
const INDEXES = {
  ownerTime: ['owner', 'createdAt', 'sequence'],
  ownerBucketTime: ['owner', 'bucket', 'createdAt', 'sequence'],
  ownerChannelTime: ['owner', 'channel', 'createdAt', 'sequence'],
};
let database: Promise<IDBDatabase> | undefined;
let deletion: Promise<void> | undefined;

function hasSupportedSchema(db: IDBDatabase, tx?: IDBTransaction, legacy = false): boolean {
  if (!db.objectStoreNames.contains('state') || !db.objectStoreNames.contains('messages'))
    return false;
  const transaction = tx ?? db.transaction(['state', 'messages'], 'readonly');
  const messages = transaction.objectStore('messages');
  return (
    transaction.objectStore('state').keyPath === null &&
    messages.keyPath === 'key' &&
    Object.entries(INDEXES)
      .filter(([name]) => !legacy || name !== 'ownerChannelTime')
      .every(
        ([name, keys]) =>
          messages.indexNames.contains(name) &&
          JSON.stringify(messages.index(name).keyPath) === JSON.stringify(keys),
      )
  );
}

/** Unknown versions and failed conversions abort the entire upgrade, preserving the old database. */
export function openChatHistoryDatabase(): Promise<IDBDatabase> {
  if (deletion) return deletion.then(() => openChatHistoryDatabase());
  if (database) return database;
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(CHAT_HISTORY_DATABASE_NAME, DATABASE_VERSION);
    let failure: Error | undefined;
    let abandoned = false;
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const tx = request.transaction;
      if (!tx) return;
      if (abandoned) {
        tx.abort();
        return;
      }
      if (event.oldVersion === 0) {
        db.createObjectStore('state');
        const messages = db.createObjectStore('messages', { keyPath: 'key' });
        for (const [name, keys] of Object.entries(INDEXES)) messages.createIndex(name, keys);
        return;
      }
      if (![2, 3].includes(event.oldVersion) || !hasSupportedSchema(db, tx, true)) {
        failure = new UnsupportedChatHistoryError();
        tx.abort();
        return;
      }
      tx.objectStore('messages').createIndex('ownerChannelTime', INDEXES.ownerChannelTime);
      const cursorRequest = tx.objectStore('messages').openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        try {
          const record = cursor.value as Record<string, unknown>;
          const message = upgradeChatHistoryMessage(record?.message);
          cursor.update({
            ...record,
            message,
            channel: message.channel,
          });
          cursor.continue();
        } catch (error) {
          failure = error instanceof Error ? error : new UnsupportedChatHistoryError();
          tx.abort();
        }
      };
    };
    request.onerror = () =>
      reject(
        failure ??
          (request.error?.name === 'VersionError'
            ? new UnsupportedChatHistoryError()
            : request.error),
      );
    request.onblocked = (event) => {
      // IDB open requests cannot be cancelled; close/abort any late result after rejecting.
      abandoned = true;
      reject(
        ![0, 2, 3].includes(event.oldVersion)
          ? new UnsupportedChatHistoryError()
          : new Error('history_blocked'),
      );
    };
    request.onsuccess = () => {
      const db = request.result;
      if (abandoned || !hasSupportedSchema(db)) {
        db.close();
        if (!abandoned) reject(new UnsupportedChatHistoryError());
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

/** Only called after explicit confirmation. A blocked delete stays pending until other tabs close. */
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

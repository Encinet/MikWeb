import { migrateChatHistoryDatabase } from '@/modules/chat/lib/chat-history-migrations';
import { CHAT_HISTORY_DATABASE_NAME } from '@/modules/chat/lib/chat-history-presence';
import {
  CHAT_HISTORY_DATABASE_VERSION,
  hasChatHistorySchema,
} from '@/modules/chat/lib/chat-history-schema';

let database: Promise<IDBDatabase> | undefined;
let deletion: Promise<void> | undefined;

export function openChatHistoryDatabase(): Promise<IDBDatabase> {
  if (deletion) return deletion.then(() => openChatHistoryDatabase());
  if (database) return database;
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(CHAT_HISTORY_DATABASE_NAME, CHAT_HISTORY_DATABASE_VERSION);
    let abandoned = false;
    let failure: Error | undefined;
    request.onupgradeneeded = (event) => {
      if (abandoned) {
        request.transaction?.abort();
        return;
      }
      const tx = request.transaction;
      if (!tx) return;
      try {
        migrateChatHistoryDatabase(request.result, tx, event.oldVersion);
      } catch (error) {
        failure = error instanceof Error ? error : new Error('history_schema_unavailable');
        tx.abort();
      }
    };
    request.onerror = () => reject(failure ?? request.error);
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
      if (!hasChatHistorySchema(db)) {
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

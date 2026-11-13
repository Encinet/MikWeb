import { encodeMessageData, storedMessage } from '@/modules/chat/lib/history/chat-history-codec';
import { chatMessageSchema } from '@/modules/chat/model/chat-protocol';
import { isRecord } from '@/shared/lib/is-record';

const ORDERED_INDEXES = {
  ownerOrder: ['owner', 'order'],
  conversationOrder: ['owner', 'conversation', 'order'],
  unreadOrder: ['owner', 'conversation', 'unread', 'order'],
  ownerTime: ['owner', 'createdAt', 'order'],
  ownerBucketTime: ['owner', 'bucket', 'createdAt', 'order'],
  ownerChannelTime: ['owner', 'channel', 'createdAt', 'order'],
};

export function hasOrderedChatHistorySchema(db: IDBDatabase, tx: IDBTransaction): boolean {
  if (!db.objectStoreNames.contains('state') || !db.objectStoreNames.contains('messages'))
    return false;
  const messages = tx.objectStore('messages');
  return (
    tx.objectStore('state').keyPath === null &&
    messages.keyPath === 'key' &&
    Object.entries(ORDERED_INDEXES).every(
      ([name, keys]) =>
        messages.indexNames.contains(name) &&
        JSON.stringify(messages.index(name).keyPath) === JSON.stringify(keys),
    )
  );
}

/** Rewrite in place inside the upgrade transaction; any invalid record aborts the entire upgrade. */
export function compactChatHistory(tx: IDBTransaction, complete: () => void) {
  const state = tx.objectStore('state');
  const messages = tx.objectStore('messages');
  // Drop old indexes before rewriting records to avoid maintaining obsolete entries per update.
  // The version-change transaction restores them as well if any conversion fails.
  for (const name of [...messages.indexNames]) messages.deleteIndex(name);
  const check = state.get('current');
  check.onsuccess = () => {
    try {
      const active: unknown = check.result;
      if (active !== undefined && !isRecord(active)) throw new Error('history_schema_unavailable');
      if (active && active.latest !== undefined) {
        if (!Array.isArray(active.latest)) throw new Error('history_schema_unavailable');
        state.put(
          {
            ...active,
            latest: active.latest.map((value) => encodeMessageData(chatMessageSchema.parse(value))),
          },
          'current',
        );
      }
      // Object-store order stays stable while records change their representation.
      const request = messages.openCursor();
      request.onsuccess = () => {
        try {
          const cursor = request.result;
          if (!cursor) {
            complete();
            return;
          }
          const record: unknown = cursor.value;
          if (
            !isRecord(record) ||
            typeof record.owner !== 'string' ||
            typeof record.key !== 'string'
          )
            throw new Error('history_schema_unavailable');
          const message = chatMessageSchema.parse(record.message);
          if (
            record.createdAt !== message.createdAt ||
            record.order !== message.order ||
            record.channel !== message.channel
          )
            throw new Error('history_schema_unavailable');
          const compact = storedMessage(record.owner, message, record.historical === true);
          compact.key = record.key;
          // Preserve the old unread index exactly; read positions remain untouched.
          if (record.unread !== 1) delete compact.unread;
          cursor.update(compact);
          cursor.continue();
        } catch {
          tx.abort();
        }
      };
    } catch {
      tx.abort();
    }
  };
}

/** The active schema only; historical formats belong to migrations/. */
export const CHAT_HISTORY_DATABASE_VERSION = 6;

const INDEXES = {
  ownerOrder: ['owner', 'data.o'],
  conversationOrder: ['owner', 'conversation', 'data.o'],
  unreadOrder: ['owner', 'conversation', 'unread', 'data.o'],
  ownerTime: ['owner', 'data.t', 'data.o'],
  ownerChannelTime: ['owner', 'data.c', 'data.t', 'data.o'],
};

export function hasChatHistorySchema(db: IDBDatabase, transaction?: IDBTransaction): boolean {
  if (!db.objectStoreNames.contains('state') || !db.objectStoreNames.contains('messages'))
    return false;
  const tx = transaction ?? db.transaction(['state', 'messages'], 'readonly');
  const messages = tx.objectStore('messages');
  return (
    tx.objectStore('state').keyPath === null &&
    messages.keyPath === 'key' &&
    Object.entries(INDEXES).every(
      ([name, keys]) =>
        messages.indexNames.contains(name) &&
        JSON.stringify(messages.index(name).keyPath) === JSON.stringify(keys),
    )
  );
}

/** Called only inside a version-change transaction, after any record conversion. */
export function createChatHistorySchema(db: IDBDatabase, tx: IDBTransaction) {
  if (!db.objectStoreNames.contains('state')) db.createObjectStore('state');
  const messages = db.objectStoreNames.contains('messages')
    ? tx.objectStore('messages')
    : db.createObjectStore('messages', { keyPath: 'key' });
  for (const name of [...messages.indexNames]) messages.deleteIndex(name);
  for (const [name, keys] of Object.entries(INDEXES)) messages.createIndex(name, keys);
}

/** The active schema only; historical formats belong to chat-history-migrations. */
export const CHAT_HISTORY_DATABASE_VERSION = 5;

const INDEXES = {
  ownerOrder: ['owner', 'order'],
  conversationOrder: ['owner', 'conversation', 'order'],
  unreadOrder: ['owner', 'conversation', 'unread', 'order'],
  ownerTime: ['owner', 'createdAt', 'order'],
  ownerBucketTime: ['owner', 'bucket', 'createdAt', 'order'],
  ownerChannelTime: ['owner', 'channel', 'createdAt', 'order'],
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
  for (const [name, keys] of Object.entries(INDEXES)) {
    if (messages.indexNames.contains(name)) messages.deleteIndex(name);
    messages.createIndex(name, keys);
  }
}

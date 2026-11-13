export const CHAT_HISTORY_DATABASE_NAME = 'mik-chat';

/** Fresh visitors have nothing to clear and need no history parser or migrations. */
export async function hasStoredChatHistory(): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return false;
  if (typeof indexedDB.databases !== 'function') return true;
  try {
    return (await indexedDB.databases()).some(
      (database) => database.name === CHAT_HISTORY_DATABASE_NAME,
    );
  } catch {
    // If enumeration is restricted, keep the existing cleanup path for safety.
    return true;
  }
}

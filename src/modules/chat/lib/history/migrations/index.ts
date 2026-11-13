import { createChatHistorySchema } from '@/modules/chat/lib/history/chat-history-schema';
import {
  compactChatHistory,
  hasOrderedChatHistorySchema,
} from '@/modules/chat/lib/history/migrations/compact';
import {
  hasLegacyChatHistorySchema,
  upgradeLegacyChatHistory,
} from '@/modules/chat/lib/history/migrations/legacy';

/** The sole upgrade entry point. Normal reads and writes only use the active schema. */
export function migrateChatHistoryDatabase(
  db: IDBDatabase,
  tx: IDBTransaction,
  oldVersion: number,
) {
  if (oldVersion === 0) {
    createChatHistorySchema(db, tx);
    return;
  }
  if ([1, 5].includes(oldVersion) && hasOrderedChatHistorySchema(db, tx)) {
    compactChatHistory(tx, () => createChatHistorySchema(db, tx));
    return;
  }
  if ([2, 3, 4].includes(oldVersion) && hasLegacyChatHistorySchema(db, tx, oldVersion)) {
    // Keep the sequence index alive until its cursor finishes converting every record.
    upgradeLegacyChatHistory(tx, () =>
      compactChatHistory(tx, () => createChatHistorySchema(db, tx)),
    );
    return;
  }
  throw new Error('history_schema_unavailable');
}

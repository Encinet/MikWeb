import type { ChatMessage } from '@/modules/chat/model/chat-protocol';
import { messageConversation } from '@/modules/chat/model/chat-protocol';

export const CHAT_HISTORY_LIMIT = 1000;

export interface ChatReadCursor {
  messageId: string;
  createdAt: number;
}

/** Null means this conversation has arrived but has never been read on this browser. */
export type ChatReadPositions = Map<string, ChatReadCursor | null>;

export interface ChatUnread {
  count: number;
  firstId: string;
}

export function messageCursor(message: ChatMessage): ChatReadCursor {
  return { messageId: message.id, createdAt: message.createdAt };
}

export function compareCursors(a: ChatReadCursor, b: ChatReadCursor): number {
  return a.createdAt - b.createdAt || a.messageId.localeCompare(b.messageId);
}

export function advanceReadPosition(
  positions: ChatReadPositions,
  conversation: string,
  cursor: ChatReadCursor | null,
): ChatReadPositions {
  const previous = positions.get(conversation);
  if (
    positions.has(conversation) &&
    (!cursor || (previous && compareCursors(previous, cursor) >= 0))
  )
    return positions;
  return new Map(positions).set(conversation, cursor);
}

export function readStoredPositions(value: unknown): ChatReadPositions {
  const result: ChatReadPositions = new Map();
  if (!(value instanceof Map)) return result;
  for (const [key, cursor] of value) {
    if (
      typeof key !== 'string' ||
      !/^(?:public|staff|private:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.test(
        key,
      )
    )
      continue;
    if (cursor === null) result.set(key, null);
    else if (
      cursor &&
      typeof cursor === 'object' &&
      typeof cursor.messageId === 'string' &&
      cursor.messageId.length > 0 &&
      cursor.messageId.length <= 128 &&
      Number.isSafeInteger(cursor.createdAt) &&
      cursor.createdAt >= 0
    )
      result.set(key, { messageId: cursor.messageId, createdAt: cursor.createdAt });
    if (result.size >= CHAT_HISTORY_LIMIT) break;
  }
  return result;
}

export function unreadMessages(
  messages: ChatMessage[],
  owner: string,
  positions: ChatReadPositions,
): Map<string, ChatUnread> {
  const result = new Map<string, ChatUnread>();
  for (const message of messages) {
    if (message.senderUuid === owner) continue;
    const key = messageConversation(message, owner);
    // Records without a cursor are the baseline from a previously saved history.
    if (!positions.has(key)) continue;
    const cursor = positions.get(key);
    if (cursor && compareCursors(messageCursor(message), cursor) <= 0) continue;
    const previous = result.get(key);
    result.set(key, {
      count: (previous?.count ?? 0) + 1,
      firstId: previous?.firstId ?? message.id,
    });
  }
  return result;
}
